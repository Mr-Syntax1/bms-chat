import express from 'express';
import ably from '../config/ably.js'; // تغییر به ably
import { verifyToken } from '../utils/jwt.js';

export const callsRouter = express.Router();

const CALL_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const INVITE_TTL = 2 * 60 * 1000;
const RATE_WINDOW = 60 * 1000;
const RATE_MAX = 20;

const deny = (res, status, message) => res.status(status).json({ error: message });

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
    if (!decoded || decoded.id === undefined || decoded.id === null) return deny(res, 401, 'توکن نامعتبر است');
    req.user = { id: String(decoded.id), username: decoded.username ?? 'Unknown' };
    return next();
  } catch {
    return deny(res, 401, 'توکن نامعتبر یا منقضی است');
  }
}

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
  return true; // طبق منطق شما
}

callsRouter.post('/signal', requireAuth, rateLimit, async (req, res) => {
  const { type, targetUserId, callId, callType } = req.body ?? {};

  if (type !== 'invite' && type !== 'cancel') return deny(res, 400, 'نوع درخواست نامعتبر است');
  if (typeof callId !== 'string' || !CALL_ID_RE.test(callId)) return deny(res, 400, 'شناسه‌ی تماس نامعتبر است');

  const target = typeof targetUserId === 'number' ? String(targetUserId) : targetUserId;
  if (typeof target !== 'string' || !USER_ID_RE.test(target)) return deny(res, 400, 'شناسه‌ی کاربر مقصد نامعتبر است');

  const me = req.user;
  if (target === me.id) return deny(res, 400, 'نمی‌توانید با خودتان تماس بگیرید');

  // تغییر نام کانال به فرمت استاندارد Ably
  const channel = `private:notifications-${target}`;

  try {
    if (type === 'invite') {
      if (pendingCalls.has(callId)) return deny(res, 409, 'این تماس قبلاً ثبت شده است');
      if (!(await canCallUser(me.id, target))) return deny(res, 403, 'امکان تماس با این کاربر وجود ندارد');

      pendingCalls.set(callId, { callerId: me.id, targetId: target, createdAt: Date.now() });

      try {
        // تغییر به publish
        await ably.channels.get(channel).publish('incoming-call', {
          callId,
          callerId: me.id,
          callerName: me.username,
          callType: callType === 'video' ? 'video' : 'audio',
        });
      } catch (err) {
        pendingCalls.delete(callId);
        throw err;
      }
    } else {
      const record = pendingCalls.get(callId);
      if (!record || record.callerId !== me.id || record.targetId !== target) {
        return deny(res, 404, 'تماسی برای لغو پیدا نشد');
      }
      pendingCalls.delete(callId);

      await ably.channels.get(channel).publish('call-cancelled', {
        callId,
        callerId: me.id,
      });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[Calls] Signal error:', error.message);
    return deny(res, 500, 'ارسال سیگنال تماس با خطا مواجه شد');
  }
});