import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { verifyToken } from '../utils/jwt.js';

export const livekitRouter = express.Router();

const ROOM_RE = /^[A-Za-z0-9_\-=@,.;:]{1,120}$/;
const TOKEN_TTL = '2h';

// ---------------------------------------------------------------------------
// احراز هویت با همان توکن JWT پروژه
// ---------------------------------------------------------------------------
function requireAuth(req, res, next) {
  let token = null;
  const header = req.headers.authorization;
  if (header) {
    const [scheme, value, ...rest] = header.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && value && rest.length === 0) token = value;
  }
  if (!token) token = req.cookies?.token || null;
  if (!token) return res.status(401).json({ error: 'کاربر لاگین نیست' });

  const decoded = verifyToken(token);
  if (!decoded || decoded.id === undefined || decoded.id === null) {
    return res.status(401).json({ error: 'توکن نامعتبر است' });
  }

  req.user = { id: String(decoded.id), username: decoded.username ?? 'Unknown' };
  return next();
}

// ---------------------------------------------------------------------------
// POST /api/livekit/token  { roomName, roomId }
// توکن ورود به اتاق صوتی LiveKit برای همان اتاق چت
// ---------------------------------------------------------------------------
livekitRouter.post('/token', requireAuth, async (req, res) => {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret) {
      return res.status(503).json({ error: 'LiveKit روی سرور پیکربندی نشده است' });
    }

    const rawRoom = req.body?.roomName ?? req.body?.roomId;
    if (typeof rawRoom !== 'string' || !rawRoom) {
      return res.status(400).json({ error: 'roomName لازم است' });
    }

    // نام اتاق صوتی مستقل از اتاق چت تا با محدودیت کاراکتر Ably تداخل نکند
    const roomName = `camp-${rawRoom}`;
    if (!ROOM_RE.test(roomName)) {
      return res.status(400).json({ error: 'نام اتاق نامعتبر است' });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: req.user.id,
      name: req.user.username,
      ttl: TOKEN_TTL,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // بدون این مجوز، setAttributes (مختصات Spatial Audio) رد می‌شود
      canUpdateOwnMetadata: true,
    });

    const token = await at.toJwt();
    return res.json({ token, url: wsUrl || null, roomName });
  } catch (error) {
    console.error('[LiveKit] Token error:', error);
    return res.status(500).json({ error: 'خطا در تولید توکن LiveKit' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/livekit/health - بررسی پیکربندی
// ---------------------------------------------------------------------------
livekitRouter.get('/health', (req, res) => {
  res.json({
    configured: Boolean(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    hasUrl: Boolean(process.env.LIVEKIT_URL),
  });
});
