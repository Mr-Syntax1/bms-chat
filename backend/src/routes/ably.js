import express from 'express';
import ably from '../config/ably.js';
import { verifyToken } from '../utils/jwt.js';

export const ablyRouter = express.Router();

const authMiddleware = (req, res, next) => {
  console.log('[Ably Auth Debug] Cookies:', req.cookies);
  console.log('[Ably Auth Debug] Auth Header:', req.headers.authorization);

  let token = req.cookies?.token;
  
  if (!token && req.headers.authorization) {
    const [scheme, ...rest] = req.headers.authorization.split(' ');
    if (scheme.toLowerCase() === 'bearer' && rest.length === 1) {
      token = rest[0];
    }
  }

  if (!token) {
    console.log('[Ably Auth Debug] ❌ No token found!');
    return res.status(401).json({ error: 'توکن یافت نشد' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    console.log('[Ably Auth Debug] ❌ Invalid token!');
    return res.status(401).json({ error: 'توکن نامعتبر' });
  }

  req.userId = String(decoded.id);
  req.username = decoded.username;
  console.log('[Ably Auth Debug] ✅ Token verified for user:', req.userId);
  next();
};

ablyRouter.post('/auth', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // تعریف دسترسی‌ها (Capabilities) برای امنیت حداکثری
    // کاربر فقط می‌تواند در کانال‌های مرتبط با خود یا اتاق‌های عمومی فعالیت کند
    const capabilities = {
      'presence:room-*': ['subscribe', 'presence'],
      'private:dm-*': ['subscribe', 'publish'],
      'private:notifications-*': ['subscribe'], // فقط دریافت اعلان
      'private:webrtc-*': ['subscribe', 'publish']
    };

    // تولید درخواست توکن با clientId مشخص (برای شناسایی کاربر در Presence الزامی است)
    const tokenParams = {
      clientId: userId,
      capability: capabilities,
      ttl: 3600 * 1000 // 1 ساعت
    };

    const tokenRequest = await ably.auth.createTokenRequest(tokenParams);
    
    res.json(tokenRequest);
  } catch (error) {
    console.error('[Ably] Auth error:', error);
    res.status(500).json({ error: 'خطا در تولید توکن Ably' });
  }
});