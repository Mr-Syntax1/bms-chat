import express from 'express';
import { Notification } from '../models/Notification.js';
import { verifyToken } from '../utils/jwt.js';

export const notificationsRouter = express.Router();

// میدل‌ور احراز هویت با پشتیبانی از کوکی و هدر Bearer
const authMiddleware = (req, res, next) => {
  let token = req.cookies?.token;
  
  // اگر توکن در کوکی نبود، هدر Authorization را بررسی کن
  if (!token && req.headers.authorization) {
    const [scheme, ...rest] = req.headers.authorization.split(' ');
    if (scheme.toLowerCase() === 'bearer' && rest.length === 1) {
      token = rest[0];
    }
  }

  if (!token) return res.status(401).json({ error: 'توکن یافت نشد' });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'توکن نامعتبر' });

  req.userId = decoded.id;
  req.username = decoded.username;
  next();
};

notificationsRouter.use(authMiddleware);

notificationsRouter.get('/', async (req, res) => {
  try {
    const { roomName } = req.query;

    const filter = { userId: req.userId, isRead: false };
    if (roomName) filter.roomName = roomName;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const formatted = notifications.map((n) => ({
      id: n._id.toString(),
      senderId: n.senderId?.toString(),
      senderName: n.senderName,
      roomName: n.roomName,
      messagePreview: n.messagePreview,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));

    res.json({ success: true, notifications: formatted, count: formatted.length });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

notificationsRouter.post('/mark-read', async (req, res) => {
  try {
    const { roomName } = req.body;

    const filter = { userId: req.userId, isRead: false };
    if (roomName) filter.roomName = roomName;

    await Notification.updateMany(filter, { isRead: true });
    const result = await Notification.find({ userId: req.userId, isRead: false }).lean();

    res.json({ success: true, count: result.length });
  } catch (err) {
    console.error('Mark notifications read error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});