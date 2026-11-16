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

    const capabilities = {
      'presence:room-*': ['subscribe', 'presence'],
      'private:dm-*': ['subscribe', 'publish'],
      'private:notifications-*': ['subscribe', 'presence'], // اضافه کردن presence برای اطمینان
      'private:webrtc-*': ['subscribe', 'publish']
    };

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