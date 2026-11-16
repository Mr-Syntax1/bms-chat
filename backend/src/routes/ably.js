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

    // استفاده از نام دقیق کانال برای کاربر فعلی + Wildcard برای اتاق‌ها
    const capabilities = {
      'presence:room-*': ['subscribe', 'presence'],
      'private:dm-*': ['subscribe', 'publish'],
      [`private:notifications-${userId}`]: ['subscribe', 'presence'], // نام دقیق و قطعی
      'private:webrtc-*': ['subscribe', 'publish']
    };

    // تبدیل حتمی به رشته JSON (الزامی در Ably v3)
    const capabilityString = JSON.stringify(capabilities);
    
    // این لاگ حیاتی است تا در Suga ببینیم چه چیزی ارسال می‌شود
    console.log('🔥 [Backend] Generating token for user:', userId);
    console.log('🔥 [Backend] Capability String:', capabilityString);

    const tokenParams = {
      clientId: userId,
      capability: capabilityString,
      ttl: 3600 * 1000 // 1 ساعت
    };

    const tokenRequest = await ably.auth.createTokenRequest(tokenParams);
    
    res.json(tokenRequest);
  } catch (error) {
    console.error('[Ably] Auth error:', error);
    res.status(500).json({ error: 'خطا در تولید توکن Ably' });
  }
});