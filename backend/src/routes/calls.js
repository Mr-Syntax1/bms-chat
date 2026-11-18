import express from 'express';
import ably from '../config/ably.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';

export const callsRouter = express.Router();

// ---------------------------------------------------------------------------
// ثابت‌ها
// ---------------------------------------------------------------------------
const CALL_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const INVITE_TTL = 2 * 60 * 1000;
const RATE_WINDOW = 60 * 1000;
const RATE_MAX = 20;

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
}, 60 * 1000).unref();

async function canCallUser(callerId, targetId) {
  return true;
}

// 👇 تابع کمکی برای ساخت نام کانال WebRTC (باید دقیقاً با فرانت‌اند هماهنگ باشد) 👇
function getWebRTCChannelName(id1, id2) {
  // مرتب‌سازی IDها تضمین می‌کند که کانال برای هر دو طرف یکسان باشد
  const sorted = [String(id1), String(id2)].sort();
  return `private:webrtc-${sorted[0]}-${sorted[1]}`;
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