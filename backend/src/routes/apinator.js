import express from 'express';
import { apinator } from '../config/apinator.js';
import { verifyToken } from '../utils/jwt.js';
import isRoomMember from '../services/roomService.js';
// ⚠️ این تابع را خودتان باید بسازید (نمونه در پایین فایل آمده است)

export const apinatorRouter = express.Router();

// ---------------------------------------------------------------------------
// ثابت‌ها
// ---------------------------------------------------------------------------
const PREFIX = {
  PRESENCE_ROOM: 'presence-room-',
  DM: 'private-dm-',
  NOTIFICATIONS: 'private-notifications-',
  WEBRTC: 'private-webrtc-',
};

// کاراکترهای مجاز نام کانال (مطابق استاندارد Pusher-like) و حداکثر طول
const CHANNEL_RE = /^[A-Za-z0-9_\-=@,.;]{1,164}$/;
const SOCKET_ID_RE = /^[A-Za-z0-9_\-.:]{1,128}$/;

// ---------------------------------------------------------------------------
// توابع کمکی
// ---------------------------------------------------------------------------

/**
 * توکن را از هدر Authorization (اولویت اول) یا کوکی می‌خواند و اعتبارسنجی می‌کند.
 * اگر توکن نامعتبر/منقضی باشد null برمی‌گرداند (هرگز throw نمی‌کند).
 */
function getAuthUser(req) {
  let token = null;

  const header = req.headers.authorization;
  if (header) {
    const [scheme, value, ...rest] = header.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && value && rest.length === 0) {
      token = value;
    }
  }
  if (!token) token = req.cookies?.token || null;
  if (!token) return null;

  try {
    const decoded = verifyToken(token);
    if (!decoded || decoded.id === undefined || decoded.id === null) return null;
    return decoded;
  } catch {
    return null; // توکن منقضی یا خراب
  }
}

/**
 * بررسی می‌کند کاربر یکی از دو طرف کانال دو نفره (dm / webrtc) باشد.
 * رشته‌ی ids به شکل "<idA>-<idB>" است. چون ممکن است id ها خودشان "-" داشته باشند
 * (مثل UUID)، به جای split از startsWith / endsWith استفاده می‌کنیم.
 */
function isParticipant(idsPart, uid) {
  let other = null;

  if (idsPart.startsWith(`${uid}-`)) {
    other = idsPart.slice(uid.length + 1);
  } else if (idsPart.endsWith(`-${uid}`)) {
    other = idsPart.slice(0, idsPart.length - uid.length - 1);
  }

  return Boolean(other) && other.length > 0;
}

const deny = (res, status, message) => res.status(status).json({ error: message });

// ---------------------------------------------------------------------------
// POST /auth
// ---------------------------------------------------------------------------
apinatorRouter.post('/auth', async (req, res) => {
  // 1) اعتبارسنجی ورودی
  const { socket_id: socketId, channel_name: channelName } = req.body ?? {};

  if (
    typeof socketId !== 'string' ||
    typeof channelName !== 'string' ||
    !SOCKET_ID_RE.test(socketId) ||
    !CHANNEL_RE.test(channelName)
  ) {
    return deny(res, 400, 'درخواست نامعتبر است');
  }

  // 2) احراز هویت
  const decoded = getAuthUser(req);
  if (!decoded) {
    return deny(res, 401, 'کاربر لاگین نیست یا توکن نامعتبر است');
  }

  const uid = String(decoded.id); // user_id باید همیشه string باشد
  const username = decoded.username ?? 'Unknown';

  try {
    let channelData; // فقط برای presence ست می‌شود

    // 3) مجوزدهی بر اساس نوع کانال (پیش‌فرض: رد کردن)
    if (channelName.startsWith(PREFIX.PRESENCE_ROOM)) {
      const roomName = channelName.slice(PREFIX.PRESENCE_ROOM.length);

      if (!roomName) return deny(res, 400, 'نام اتاق نامعتبر است');

      const allowed = await isRoomMember(uid, roomName);
      if (!allowed) return deny(res, 403, 'شما عضو این اتاق نیستید');

      channelData = JSON.stringify({
        user_id: uid,
        user_info: { name: username },
      });
    } else if (channelName.startsWith(PREFIX.DM)) {
      const idsPart = channelName.slice(PREFIX.DM.length);
      if (!isParticipant(idsPart, uid)) {
        return deny(res, 403, 'دسترسی به این کانال دایرکت مجاز نیست');
      }
    } else if (channelName.startsWith(PREFIX.WEBRTC)) {
      const idsPart = channelName.slice(PREFIX.WEBRTC.length);
      if (!isParticipant(idsPart, uid)) {
        return deny(res, 403, 'دسترسی به این کانال تماس مجاز نیست');
      }
    } else if (channelName.startsWith(PREFIX.NOTIFICATIONS)) {
      const targetId = channelName.slice(PREFIX.NOTIFICATIONS.length);
      if (targetId !== uid) {
        return deny(res, 403, 'دسترسی به این کانال اعلان‌ها مجاز نیست');
      }
    } else {
      // هر کانال ناشناخته‌ای رد می‌شود
      return deny(res, 403, 'کانال ناشناخته است');
    }

    // 4) امضای کانال
    const auth = apinator.authenticateChannel(socketId, channelName, channelData);
    return res.json(auth);
  } catch (error) {
    console.error('[Apinator Auth] Error:', error.message);
    return deny(res, 500, 'خطا در احراز هویت کانال');
  }
});

/*
 * ---------------------------------------------------------------------------
 * نمونه‌ی isRoomMember (فایل backend/src/services/roomService.js)
 * مطابق دیتابیس خودتان بازنویسی کنید:
 *
 * export async function isRoomMember(userId, roomName) {
 *   const room = await db.rooms.findOne({ name: roomName });
 *   if (!room) return false;
 *   if (!room.isPrivate) return true;           // اتاق عمومی
 *   return room.members.map(String).includes(String(userId));
 * }
 * ---------------------------------------------------------------------------
 * در app.js حتماً این‌ها فعال باشند:
 *   app.use(express.json());
 *   app.use(express.urlencoded({ extended: true })); // کلاینت‌های Pusher-like معمولاً form می‌فرستند
 *   app.use(cookieParser());
 * و روی این روت rate limit بگذارید (مثلاً express-rate-limit).
 * ---------------------------------------------------------------------------
 */