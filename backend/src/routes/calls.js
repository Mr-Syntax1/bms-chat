import express from 'express';
import ably from '../config/ably.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { Room } from '../models/Room.js';
import { GroupCall } from '../models/GroupCall.js';

export const callsRouter = express.Router();

// ---------------------------------------------------------------------------
// ثابت‌ها
// ---------------------------------------------------------------------------
const CALL_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const INVITE_TTL = 2 * 60 * 1000;
const GROUP_STALE_MS = 5 * 60 * 1000;
const GROUP_ABSENT_MS = 20 * 1000;
const GROUP_JOIN_GRACE_MS = 8000;
const GROUP_CLEANUP_INTERVAL = 3000;
const RATE_WINDOW = 60 * 1000;
const RATE_MAX = 20;
const GROUP_RATE_WINDOW = 60 * 1000;
const GROUP_RATE_MAX = 900;

const deny = (res, status, message) => res.status(status).json({ error: message });

// ---------------------------------------------------------------------------
// احراز هویت
// ---------------------------------------------------------------------------
function requireAuth(req, res, next) {
  let token = null;
  const header = req.headers.authorization;
  if (header) {
    const [scheme, value, ...rest] = header.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && value && rest.length === 0) token = value;
  }
  if (!token) token = req.cookies?.token || null;
  if (!token) return deny(res, 401, 'کاربر لاگین نیست');

  try {
    const decoded = verifyToken(token);
    if (!decoded || decoded.id === undefined || decoded.id === null) {
      return deny(res, 401, 'توکن نامعتبر است');
    }
    req.user = { id: String(decoded.id), username: decoded.username ?? 'Unknown' };
    return next();
  } catch {
    return deny(res, 401, 'توکن نامعتبر یا منقضی است');
  }
}

// ---------------------------------------------------------------------------
// Rate limit
// ---------------------------------------------------------------------------
const rateBuckets = new Map();
const groupRateBuckets = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const hits = (rateBuckets.get(req.user.id) || []).filter((t) => now - t < RATE_WINDOW);

  if (hits.length >= RATE_MAX) {
    rateBuckets.set(req.user.id, hits);
    return deny(res, 429, 'تعداد درخواست‌ها زیاد است، کمی صبر کنید');
  }
  hits.push(now);
  rateBuckets.set(req.user.id, hits);
  return next();
}

function groupRateLimit(req, res, next) {
  const now = Date.now();
  const key = `${req.user.id}`;
  const hits = (groupRateBuckets.get(key) || []).filter((t) => now - t < GROUP_RATE_WINDOW);

  if (hits.length >= GROUP_RATE_MAX) {
    groupRateBuckets.set(key, hits);
    return deny(res, 429, 'تعداد درخواست‌ها زیاد است، کمی صبر کنید');
  }
  hits.push(now);
  groupRateBuckets.set(key, hits);
  return next();
}

// ---------------------------------------------------------------------------
// دعوت‌های فعال
// ---------------------------------------------------------------------------
const pendingCalls = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, rec] of pendingCalls) {
    if (now - rec.createdAt > INVITE_TTL) pendingCalls.delete(id);
  }
  for (const [userId, hits] of rateBuckets) {
    const fresh = hits.filter((t) => now - t < RATE_WINDOW);
    if (fresh.length) rateBuckets.set(userId, fresh);
    else rateBuckets.delete(userId);
  }
  for (const [userId, hits] of groupRateBuckets) {
    const fresh = hits.filter((t) => now - t < GROUP_RATE_WINDOW);
    if (fresh.length) groupRateBuckets.set(userId, fresh);
    else groupRateBuckets.delete(userId);
  }
  pruneStaleParticipants().catch((err) => console.error('[Calls] Group cleanup error:', err.message));
}, GROUP_CLEANUP_INTERVAL).unref();

async function getCallPresenceIds(callId) {
  try {
    const result = await ably.channels.get(`private:group-webrtc-${callId}`).presence.get({ limit: 1000 });
    const items = result?.items ?? result ?? [];
    return new Set(items.map((member) => String(member.clientId)));
  } catch (error) {
    console.warn('[Calls] Group presence lookup failed:', error.message);
    return null;
  }
}

async function publishMemberLeft(callId, userIds) {
  if (!callId || !userIds?.length) return;
  const channel = ably.channels.get(`private:group-webrtc-${callId}`);
  await Promise.all(userIds.map((userId) => channel
    .publish('group-member-left', { callId, userId: String(userId) })
    .catch(() => { })));
}

function staleCandidates(call, presenceIds) {
  const now = Date.now();
  const joinCutoff = now - GROUP_JOIN_GRACE_MS;
  const absentCutoff = new Date(now - GROUP_ABSENT_MS);
  const silentCutoff = new Date(now - GROUP_STALE_MS);
  const presenceKnown = presenceIds !== null;

  return (call.participants || []).filter((participant) => {
    const joinedAt = participant.joinedAt ? new Date(participant.joinedAt).getTime() : 0;
    if (joinedAt > joinCutoff) return false;

    if (!participant.lastSeen) return false;
    if (new Date(participant.lastSeen) < silentCutoff) return true;
    if (!presenceKnown) return false;
    if (presenceIds.has(String(participant.userId))) return false;
    return new Date(participant.lastSeen) < absentCutoff;
  });
}

async function pruneStaleParticipants() {
  const now = Date.now();
  const absentCutoff = new Date(now - GROUP_ABSENT_MS);
  const candidates = await GroupCall.find({ active: true, 'participants.lastSeen': { $lt: absentCutoff } })
    .select('callId roomName participants')
    .lean();

  const touchedRooms = new Set();

  for (const call of candidates) {
    const presenceIds = await getCallPresenceIds(call.callId);
    const stale = staleCandidates(call, presenceIds);
    if (!stale.length) continue;
    const staleIds = stale.map((participant) => participant.userId);
    await GroupCall.updateOne(
      { _id: call._id, active: true },
      { $pull: { participants: { userId: { $in: staleIds } } } },
    );
    await publishMemberLeft(call.callId, staleIds);
    touchedRooms.add(call.roomName);
  }

  const emptied = await GroupCall.find({ active: true, participants: { $size: 0 } })
    .select('_id callId roomName')
    .lean();
  if (emptied.length) {
    await GroupCall.updateMany(
      { _id: { $in: emptied.map((call) => call._id) }, active: true, participants: { $size: 0 } },
      { $set: { active: false } },
    );
    emptied.forEach((call) => touchedRooms.add(call.roomName));
  }

  for (const roomName of touchedRooms) {
    const live = await GroupCall.findOne({ roomName, active: true }).lean();
    await publishRoomCallState(roomName, live ? await loadGroupCall(live) : null);
  }
}

async function resolveActiveGroupCall(roomName) {
  let call = await GroupCall.findOne({ roomName, active: true });
  if (!call) return null;

  const now = Date.now();
  const absentCutoff = now - GROUP_ABSENT_MS;
  const staleCandidatesDue = (call.participants || []).some(
    (participant) => !participant.lastSeen || new Date(participant.lastSeen).getTime() < absentCutoff,
  );

  if (staleCandidatesDue) {
    const presenceIds = await getCallPresenceIds(call.callId);
    const stale = staleCandidates(call, presenceIds);
    if (stale.length) {
      const staleIds = stale.map((participant) => participant.userId);
      call = await GroupCall.findOneAndUpdate(
        { _id: call._id, active: true },
        { $pull: { participants: { userId: { $in: staleIds } } } },
        { new: true },
      ) || await GroupCall.findById(call._id);
      await publishMemberLeft(call?.callId, staleIds);
    }
  }

  if (!call || call.participants.length === 0) {
    if (call) {
      await GroupCall.updateOne({ _id: call._id, active: true }, { $set: { active: false } });
      await publishRoomCallState(call.roomName, null);
    }
    return null;
  }
  return call;
}

async function canCallUser(callerId, targetId) {
  return true;
}

// 👇 تابع کمکی برای ساخت نام کانال WebRTC (باید دقیقاً با فرانت‌اند هماهنگ باشد) 👇
function getWebRTCChannelName(id1, id2) {
  // مرتب‌سازی IDها تضمین می‌کند که کانال برای هر دو طرف یکسان باشد
  const sorted = [String(id1), String(id2)].sort();
  return `private:webrtc-${sorted[0]}-${sorted[1]}`;
}

// 👇 نام کانال اتاق (هم‌نام با encodeChannelPart فرانت‌اند) 👇
const SAFE_CHAR_RE = /[A-Za-z0-9_.-]/;

function encodeChannelPart(value) {
  let out = '';
  for (const ch of String(value)) {
    if (SAFE_CHAR_RE.test(ch)) {
      out += ch;
    } else {
      for (const byte of Buffer.from(ch, 'utf8')) {
        out += `=${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      }
    }
  }
  return out;
}

function getRoomChannelName(roomName) {
  return `presence:room-${encodeChannelPart(roomName)}`;
}

// اعلام تغییر وضعیت تماس گروهی به همه‌ی اعضای اتاق (بدون پاپ‌آپ؛ فقط برای بنر)
async function publishRoomCallState(roomName, session) {
  if (!roomName) return;
  try {
    await ably.channels.get(getRoomChannelName(roomName)).publish('group-call-updated', {
      roomName,
      session: session
        ? {
          callId: session.callId,
          roomName: session.roomName,
          callType: session.callType,
          participantCount: session.participants?.length ?? 0,
        }
        : null,
    });
  } catch (error) {
    console.warn('[Calls] Room call state publish failed:', error.message);
  }
}

// ---------------------------------------------------------------------------
// POST /api/calls/signal
// body: { type: 'invite' | 'cancel' | 'end' | 'reject', targetUserId, callId, callType?, reason? }
// ---------------------------------------------------------------------------
callsRouter.post('/signal', requireAuth, rateLimit, async (req, res) => {
  const { type, targetUserId, callId, callType, reason } = req.body ?? {};

  // ✅ تغییر ۱: پذیرش end و reject
  if (!['invite', 'cancel', 'end', 'reject'].includes(type)) {
    return deny(res, 400, 'نوع درخواست نامعتبر است');
  }
  if (typeof callId !== 'string' || !CALL_ID_RE.test(callId)) {
    return deny(res, 400, 'شناسه‌ی تماس نامعتبر است');
  }

  const target = typeof targetUserId === 'number' ? String(targetUserId) : targetUserId;
  if (typeof target !== 'string' || !USER_ID_RE.test(target)) {
    return deny(res, 400, 'شناسه‌ی کاربر مقصد نامعتبر است');
  }

  const me = req.user;
  if (target === me.id) {
    return deny(res, 400, 'نمی‌توانید با خودتان تماس بگیرید');
  }

  const notificationChannel = `private:notifications-${target}`;

  try {
    if (type === 'invite') {
      if (pendingCalls.has(callId)) {
        return deny(res, 409, 'این تماس قبلاً ثبت شده است');
      }
      if (!(await canCallUser(me.id, target))) {
        return deny(res, 403, 'امکان تماس با این کاربر وجود ندارد');
      }

      pendingCalls.set(callId, { callerId: me.id, targetId: target, createdAt: Date.now() });

      try {
        const caller = await User.findById(me.id).select('avatarIndex').lean();
        await ably.channels.get(notificationChannel).publish('incoming-call', {
          callId,
          callerId: me.id,
          callerName: me.username,
          callerAvatarIndex: caller?.avatarIndex ?? null,
          callType: callType === 'video' ? 'video' : 'audio',
        });
      } catch (err) {
        pendingCalls.delete(callId);
        throw err;
      }
    }
    else if (type === 'cancel') {
      const record = pendingCalls.get(callId);
      if (!record || record.callerId !== me.id || record.targetId !== target) {
        return deny(res, 404, 'تماسی برای لغو پیدا نشد');
      }
      pendingCalls.delete(callId);

      await ably.channels.get(notificationChannel).publish('call-cancelled', {
        callId,
        callerId: me.id,
      });
    }
    // ✅ تغییر ۲: مدیریت end و reject برای بستن تماس در طرف مقابل
    else if (type === 'end' || type === 'reject') {
      // پاک کردن از لیست انتظار (اگر هنوز در حال زنگ خوردن بوده)
      pendingCalls.delete(callId);

      const webrtcChannel = getWebRTCChannelName(me.id, target);
      const eventName = type === 'end' ? 'call-end' : 'call-reject';

      await ably.channels.get(webrtcChannel).publish(eventName, {
        callId,
        from: me.id,
        reason: reason || (type === 'end' ? 'local-ended' : 'rejected'),
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[Calls] Signal error:', error.message);
    return deny(res, 500, 'ارسال سیگنال تماس با خطا مواجه شد');
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function serializeParticipants(participants, users) {
  const userById = new Map(users.map((user) => [user._id.toString(), user]));
  return participants.flatMap(({ userId, joinedAt }) => {
    const user = userById.get(userId.toString());
    return user ? [{
      id: user._id.toString(),
      username: user.username,
      avatarIndex: user.avatarIndex ?? null,
      joinedAt,
    }] : [];
  });
}

async function loadGroupCall(call) {
  const userIds = call.participants.map((participant) => participant.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('username avatarIndex').lean();
  return {
    callId: call.callId,
    roomName: call.roomName,
    callType: call.callType,
    createdBy: call.createdBy.toString(),
    active: call.active,
    participants: serializeParticipants(call.participants, users),
  };
}


callsRouter.get('/group/active', requireAuth, groupRateLimit, async (req, res) => {
  const roomName = typeof req.query.roomName === 'string' ? req.query.roomName.trim() : '';
  if (!roomName || roomName.length > 100) return deny(res, 400, 'نام اتاق نامعتبر است');
  if (!mongoose.isValidObjectId(req.user.id)) return deny(res, 401, 'کاربر نامعتبر است');

  try {
    const room = await Room.findOne({ name: roomName }).select('name isPrivate members').lean();
    if (!room) return deny(res, 404, 'اتاق پیدا نشد');
    if (room.isPrivate || !room.members?.some((member) => member.toString() === req.user.id)) {
      return deny(res, 403, 'دسترسی به این اتاق وجود ندارد');
    }
    const call = await resolveActiveGroupCall(room.name);
    return res.json({ success: true, session: call ? await loadGroupCall(call) : null });
  } catch (error) {
    console.error('[Calls] Active group lookup error:', error.message);
    return deny(res, 500, 'دریافت تماس فعال با خطا مواجه شد');
  }
});

callsRouter.post('/group/start', requireAuth, groupRateLimit, async (req, res) => {
  const { roomName, callType } = req.body ?? {};
  if (typeof roomName !== 'string' || !roomName.trim() || roomName.trim().length > 100) {
    return deny(res, 400, 'نام اتاق نامعتبر است');
  }
  if (!['audio', 'video'].includes(callType)) {
    return deny(res, 400, 'نوع تماس نامعتبر است');
  }
  if (!mongoose.isValidObjectId(req.user.id)) return deny(res, 401, 'کاربر نامعتبر است');

  try {
    const room = await Room.findOne({ name: roomName.trim() }).lean();
    if (!room) return deny(res, 404, 'اتاق پیدا نشد');
    const isMember = room.members?.some((member) => member.toString() === req.user.id);
    if (room.isPrivate || !isMember) return deny(res, 403, 'دسترسی به این اتاق وجود ندارد');

    const existing = await GroupCall.findOne({ roomName: room.name, active: true }).lean();
    if (existing) return deny(res, 409, 'تماس گروهی فعالی در این اتاق وجود دارد');

    let call;
    try {
      call = await GroupCall.create({
        roomName: room.name,
        callType,
        createdBy: req.user.id,
        participants: [{ userId: req.user.id }],
      });
    } catch (error) {
      if (error?.code === 11000) return deny(res, 409, 'تماس گروهی فعالی در این اتاق وجود دارد');
      throw error;
    }

    const session = await loadGroupCall(call);
    await publishRoomCallState(room.name, session);

    return res.status(201).json({ success: true, session, participants: session.participants });
  } catch (error) {
    console.error('[Calls] Group start error:', error.message);
    return deny(res, 500, 'شروع تماس گروهی با خطا مواجه شد');
  }
});

callsRouter.post('/group/join', requireAuth, groupRateLimit, async (req, res) => {
  const { callId, roomName } = req.body ?? {};
  if (typeof callId !== 'string' || !UUID_RE.test(callId)) return deny(res, 400, 'شناسه تماس نامعتبر است');
  if (typeof roomName !== 'string' || !roomName.trim() || roomName.trim().length > 100) {
    return deny(res, 400, 'نام اتاق نامعتبر است');
  }
  if (!mongoose.isValidObjectId(req.user.id)) return deny(res, 401, 'کاربر نامعتبر است');

  try {
    const room = await Room.findOne({ name: roomName.trim() }).select('name isPrivate members').lean();
    if (!room) return deny(res, 404, 'اتاق پیدا نشد');
    if (room.isPrivate || !room.members?.some((member) => member.toString() === req.user.id)) {
      return deny(res, 403, 'دسترسی به این اتاق وجود ندارد');
    }

    const user = await User.findById(req.user.id).select('username avatarIndex').lean();
    if (!user) return deny(res, 401, 'کاربر پیدا نشد');

    const updated = await GroupCall.findOneAndUpdate(
      {
        callId,
        roomName: room.name,
        active: true,
        'participants.userId': { $ne: req.user.id },
      },
      { $push: { participants: { userId: req.user.id, joinedAt: new Date(), lastSeen: new Date() } } },
      { new: true },
    );
    const call = updated || await GroupCall.findOne({ callId, roomName: room.name, active: true });
    if (!call) return deny(res, 404, 'تماس گروهی فعال پیدا نشد');

    if (updated) {
      try {
        await ably.channels.get(`private:group-webrtc-${call.callId}`).publish('group-member-joined', {
          callId: call.callId,
          userId: req.user.id,
          username: user.username,
          avatarIndex: user.avatarIndex ?? null,
        });
      } catch (error) {
        await GroupCall.updateOne({ _id: call._id, active: true }, { $pull: { participants: { userId: req.user.id } } });
        throw error;
      }
    }

    const session = await loadGroupCall(call);
    if (updated) await publishRoomCallState(call.roomName, session);
    return res.json({ success: true, session, participants: session.participants });
  } catch (error) {
    console.error('[Calls] Group join error:', error.message);
    return deny(res, 500, 'ورود به تماس گروهی با خطا مواجه شد');
  }
});

callsRouter.post('/group/heartbeat', requireAuth, groupRateLimit, async (req, res) => {
  const { callId } = req.body ?? {};
  if (typeof callId !== 'string' || !UUID_RE.test(callId)) return deny(res, 400, 'شناسه تماس نامعتبر است');
  if (!mongoose.isValidObjectId(req.user.id)) return deny(res, 401, 'کاربر نامعتبر است');

  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const result = await GroupCall.updateOne(
      { callId, active: true, 'participants.userId': userId },
      { $set: { 'participants.$.lastSeen': new Date() } },
    );
    if (!result.matchedCount) return deny(res, 404, 'تماس فعال پیدا نشد');
    return res.json({ success: true });
  } catch (error) {
    console.error('[Calls] Group heartbeat error:', error.message);
    return deny(res, 500, 'به‌روزرسانی وضعیت تماس با خطا مواجه شد');
  }
});

callsRouter.post('/group/leave', requireAuth, groupRateLimit, async (req, res) => {
  const { callId, roomName } = req.body ?? {};
  if (typeof callId !== 'string' || !UUID_RE.test(callId)) return deny(res, 400, 'شناسه تماس نامعتبر است');
  if (typeof roomName !== 'string' || !roomName.trim() || roomName.trim().length > 100) {
    return deny(res, 400, 'نام اتاق نامعتبر است');
  }
  if (!mongoose.isValidObjectId(req.user.id)) return deny(res, 401, 'کاربر نامعتبر است');

  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    let call = await GroupCall.findOneAndUpdate(
      { callId, roomName: roomName.trim(), active: true, 'participants.userId': userId },
      { $pull: { participants: { userId } } },
      { new: true },
    );

    if (!call) {
      call = await GroupCall.findOne({ callId, roomName: roomName.trim() });
      if (!call) return deny(res, 404, 'تماس گروهی پیدا نشد');
      return res.json({ success: true, session: await loadGroupCall(call) });
    }

    try {
      await ably.channels.get(`private:group-webrtc-${call.callId}`).publish('group-member-left', {
        callId: call.callId,
        userId: req.user.id,
      });
    } catch (error) {
      console.warn('[Calls] Group leave notify failed:', error.message);
    }

    if (call.participants.length === 0) {
      await GroupCall.updateOne({ _id: call._id, active: true, participants: { $size: 0 } }, { $set: { active: false } });
      call.active = false;
    }

    const session = await loadGroupCall(call);
    await publishRoomCallState(call.roomName, call.active ? session : null);
    return res.json({ success: true, session });
  } catch (error) {
    console.error('[Calls] Group leave error:', error.message);
    return deny(res, 500, 'خروج از تماس گروهی با خطا مواجه شد');
  }
});


// ===================================
// game backend
// ===================================
router.post('/livekit/token', authMiddleware, async (req, res) => {
  const { roomId } = req.body;

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: req.user.id }
  );

  at.addGrant({ room: roomId, roomJoin: true });

  res.json({ token: await at.toJwt() });
});