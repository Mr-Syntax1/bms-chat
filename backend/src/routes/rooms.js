import express from 'express';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';

const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Middleware to verify token
const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'توکن یافت نشد' });
  
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'توکن نامعتبر' });
  
  req.userId = decoded.id;
  req.username = decoded.username;
  next();
};

router.get('/search', authMiddleware, async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query) return res.json({ rooms: [], users: [] });

  try {
    const regex = new RegExp(escapeRegex(query), 'i');

    const [rooms, users] = await Promise.all([
      Room.find({ isPrivate: false, name: regex }).limit(20).lean(),
      User.find({ _id: { $ne: req.userId }, username: regex })
        .select('username')
        .limit(20)
        .lean(),
    ]);

    res.json({
      rooms: rooms.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        createdBy: r.createdBy.toString(),
        isMember: r.members?.some((m) => m.toString() === req.userId),
        isPrivate: r.isPrivate,
      })),
      users: users.map((u) => ({ id: u._id.toString(), username: u.username })),
    });
  } catch (err) {
    console.error('Search rooms error:', err);
    res.status(500).json({ error: 'خطا در جستجو' });
  }
});

router.get('/list', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [{ members: req.userId }, { isPrivate: true, members: req.userId }]
    }).lean();

    const roomsWithInfo = await Promise.all(rooms.map(async (r) => {
      const isMember = r.members?.some(m => m.toString() === req.userId);
      const result = {
        id: r._id.toString(),
        name: r.name,
        createdBy: r.createdBy.toString(),
        isMember,
        isPrivate: r.isPrivate,
      };
      if (r.isPrivate) {
        const otherId = r.members?.find(m => m.toString() !== req.userId);
        if (otherId) {
          const otherUser = await User.findById(otherId).select('username').lean();
          result.dmPartnerUsername = otherUser?.username || 'کاربر حذف شده';
        }
      }
      return result;
    }));

    res.json({ rooms: roomsWithInfo });
  } catch (err) {
    console.error('List rooms error:', err);
    res.status(500).json({ error: 'خطا در دریافت اتاق‌ها' });
  }
});

export default router;