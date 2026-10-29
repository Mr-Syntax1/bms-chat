import express from 'express';
import { Room } from '../models/Room.js';
import { verifyToken } from '../utils/jwt.js';

const router = express.Router();

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
  const query = req.query.q?.trim();
  if (!query || query.length < 1) return res.json({ rooms: [] });

  try {
    const rooms = await Room.find({
      isPrivate: false,
      $text: { $search: query }
    }).sort({ score: { $meta: 'textScore' } }).limit(20).lean();

    const roomsWithMember = rooms.map(r => ({
      id: r._id.toString(),
      name: r.name,
      createdBy: r.createdBy.toString(),
      isMember: r.members?.some(m => m.toString() === req.userId),
      isPrivate: r.isPrivate,
      dmPartnerUsername: r.isPrivate ? r.members?.find(m => m.toString() !== req.userId)?.toString() : undefined,
    }));

    res.json({ rooms: roomsWithMember });
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

    const roomsWithInfo = rooms.map(r => {
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
        result.dmPartnerUsername = otherId?.toString();
      }
      return result;
    });

    res.json({ rooms: roomsWithInfo });
  } catch (err) {
    console.error('List rooms error:', err);
    res.status(500).json({ error: 'خطا در دریافت اتاق‌ها' });
  }
});

export default router;