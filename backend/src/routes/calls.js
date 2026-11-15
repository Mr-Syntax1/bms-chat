import express from 'express';
import { apinator } from '../config/apinator.js';
import { verifyToken } from '../utils/jwt.js';

export const callsRouter = express.Router();

// ---------------------------------------------------------------------------
// ثابت‌ها
// ---------------------------------------------------------------------------
const CALL_ID_RE = /^[A-Za-z0-9-]{8,64}$/; // UUID یا مشابه
const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/; // جلوگیری از تزریق در نام کانال
const INVITE_TTL = 2 * 60 * 1000; // ms: مدت نگه‌داشتن دعوت برای اعتبارسنجی cancel
const RATE_WINDOW = 60 * 1000; // ms
const RATE_MAX = 20; // حداکثر درخواست در هر پنجره برای هر کاربر

const deny = (res, status, message) => res.status(status).json({ error: message });

// ---------------------------------------------------------------------------
// احراز هویت (هدر Authorization در اولویت، بعد کوکی)
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
// Rate limit ساده (درون‌حافظه‌ای، بدون وابستگی). برای چند instance از Redis استفاده کنید.
// ---------------------------------------------------------------------------
const rateBuckets = new Map(); // userId -> [timestamps]

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
// دعوت‌های فعال: برای اینکه فقط خود caller بتواند همان تماس را لغو کند.
// (درون‌حافظه‌ای؛ برای چند instance از Redis با TTL استفاده کنید.)
// ---------------------------------------------------------------------------
const pendingCalls = new Map(); // callId -> { callerId, targetId, createdAt }

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

// ---------------------------------------------------------------------------
// سیاست اجازه‌ی تماس
// TODO: مطابق دیتابیس خودتان پیاده‌سازی کنید، مثلاً:
//   - کاربر هدف وجود داشته باشد
//   - بلاک نشده باشد / دوست باشد / DM مشترک داشته باشند
//
//   async function canCallUser(callerId, targetId) {
//     const target = await db.users.findById(targetId);
//     return Boolean(target) && !(await db.blocks.exists(targetId, callerId));
//   }
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
async function canCallUser(callerId, targetId) {
  return true;
}

// ---------------------------------------------------------------------------
// POST /api/calls/signal
// body: { type: 'invite' | 'cancel', targetUserId, callId, callType? }
// ---------------------------------------------------------------------------
callsRouter.post('/signal', requireAuth, rateLimit, async (req, res) => {
  const { type, targetUserId, callId, callType } = req.body ?? {};

  // --- اعتبارسنجی ورودی ---
  if (type !== 'invite' && type !== 'cancel') {
    return deny(res, 400, 'نوع درخواست نامعتبر است');
  }
  if (typeof callId !== 'string' || !CALL_ID_RE.test(callId)) {
    return deny(res, 400, 'شناسه‌ی تماس نامعتبر است');
  }

  const target =
    typeof targetUserId === 'number' ? String(targetUserId) : targetUserId;
  if (typeof target !== 'string' || !USER_ID_RE.test(target)) {
    return deny(res, 400, 'شناسه‌ی کاربر مقصد نامعتبر است');
  }

  const me = req.user;
  if (target === me.id) {
    return deny(res, 400, 'نمی‌توانید با خودتان تماس بگیرید');
  }

  const channel = `private-notifications-${target}`;

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
        // هویت caller از توکن می‌آید، نه از بدنه‌ی درخواست؛ پس قابل جعل نیست
        await apinator.trigger({
          name: 'incoming-call',
          channel: channel,
          data: JSON.stringify({
            callId,
            callerId: me.id,
            callerName: me.username,
            callType: callType === 'video' ? 'video' : 'audio',
          }),
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

      await apinator.trigger({
        name: 'call-cancelled',
        channel: channel,
        data: JSON.stringify({
          callId,
          callerId: me.id,
        }),
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[Calls] Signal error:', error.message);
    return deny(res, 500, 'ارسال سیگنال تماس با خطا مواجه شد');
  }
});