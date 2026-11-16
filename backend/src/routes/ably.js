import express from 'express';
import ably from '../config/ably.js';
import { verifyToken } from '../utils/jwt.js';

export const ablyRouter = express.Router();

const authMiddleware = (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const [scheme, ...rest] = req.headers.authorization.split(' ');
    if (scheme.toLowerCase() === 'bearer' && rest.length === 1) {
      token = rest[0];
    }
  }

  if (!token) return res.status(401).json({ error: 'توکن یافت نشد' });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'توکن نامعتبر' });

  req.userId = String(decoded.id);
  req.username = decoded.username;
  next();
};

ablyRouter.post('/auth', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // 👇 تغییر حیاتی: استفاده از نام دقیق کانال به جای * برای نوتیفیکیشن 👇
    const capabilities = {
      'presence:room-*': ['subscribe', 'presence'],
      'private:dm-*': ['subscribe', 'publish'],
      [`private:notifications-${userId}`]: ['subscribe', 'presence'], // تطابق ۱۰۰٪ دقیق و امن
      'private:webrtc-*': ['subscribe', 'publish'],
      'presence:online': ['subscribe', 'presence']
    };

    const capabilityString = JSON.stringify(capabilities);
    console.log('✅ [Backend] Secure Capability String:', capabilityString);

    const tokenParams = {
      clientId: userId,
      capability: capabilityString,
      ttl: 3600 * 1000,
    };

    const tokenRequest = await ably.auth.createTokenRequest(tokenParams);
    res.json(tokenRequest);
  } catch (error) {
    console.error('[Ably] Auth error:', error);
    res.status(500).json({ error: 'خطا در تولید توکن Ably' });
  }
});