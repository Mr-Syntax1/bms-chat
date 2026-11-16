import express from 'express';
import mongoose from 'mongoose';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { verifyToken } from '../utils/jwt.js';

export const roomsRouter = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// میدل‌ور احراز هویت با پشتیبانی از کوکی و هدر Bearer
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

  req.userId = decoded.id;
  req.username = decoded.username;
  next();
};

roomsRouter.use(authMiddleware);

roomsRouter.get('/search', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query || query.length < 2) {
    return res.json({ rooms: [], users: [] });
  }

  try {
    const regex = new RegExp(escapeRegex(query), 'i');

    const [rooms, users] = await Promise.all([
      Room.find({ isPrivate: false, name: regex }).limit(20).lean(),
      // جستجوی بهینه فقط بر اساس username
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
      users: users.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        isOnline: false, // وضعیت آنلاین از طریق Presence مدیریت می‌شود
      })),
    });
  } catch (err) {
    console.error('Search rooms error:', err);
    res.status(500).json({ error: 'خطا در جستجو' });
  }
});

roomsRouter.get('/list', async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.userId }).lean();

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
          result.dmPartnerId = otherId.toString();
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

roomsRouter.post('/create', async (req, res) => {
  try {
    const { name } = req.body;
    const trimmed = name?.trim();
    if (!trimmed || trimmed.length < 2) return res.status(400).json({ error: 'نام اتاق حداقل ۲ کاراکتر است.' });
    if (trimmed.length > 30) return res.status(400).json({ error: 'نام اتاق حداکثر ۳۰ کاراکتر است.' });

    const exists = await Room.findOne({ name: trimmed });
    if (exists) return res.status(400).json({ error: 'این اتاق قبلاً ساخته شده.' });

    const room = await Room.create({
      name: trimmed,
      createdBy: req.userId,
      members: [req.userId]
    });

    res.json({ success: true, room: { id: room._id.toString(), name: room.name, createdBy: room.createdBy.toString() } });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

roomsRouter.post('/join', async (req, res) => {
  try {
    const { roomName } = req.body;
    const room = await Room.findOne({ name: roomName });
    if (!room) return res.status(404).json({ error: 'اتاق پیدا نشد.' });

    if (room.isPrivate) {
      const isMember = room.members?.some(m => m.toString() === req.userId);
      if (!isMember) return res.status(403).json({ error: 'شما عضو این اتاق نیستید.' });
    }

    if (!room.members?.some(m => m.toString() === req.userId)) {
      room.members.push(req.userId);
      await room.save();
    }

    await Message.updateMany(
      { room: roomName, isRead: false },
      { isRead: true }
    ).catch(() => {});

    const history = await Message.find({
      room: roomName,
      isDeletedForEveryone: { $ne: true },
      deletedFor: { $ne: req.userId },
    }).sort({ createdAt: -1 }).limit(100).lean();
    history.reverse();

    const formattedHistory = history.map((m) => ({
      id: m._id.toString(),
      text: m.text,
      sender: m.sender,
      senderId: m.senderId?.toString(),
      type: m.type,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileType: m.fileType,
      fileSize: m.fileSize,
      createdAt: m.createdAt,
      time: new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    }));

    res.json({ success: true, room: roomName, history: formattedHistory });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

roomsRouter.post('/leave', async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName) return res.status(400).json({ error: 'اتاقی انتخاب نشده است.' });

    const room = await Room.findOne({ name: roomName });
    if (!room) return res.status(404).json({ error: 'اتاق پیدا نشد.' });

    const isMember = room.members?.some((m) => m.toString() === req.userId);
    if (!isMember) return res.status(403).json({ error: 'شما عضو این اتاق نیستید.' });

    room.members = room.members.filter((m) => m.toString() !== req.userId);
    await room.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Leave room error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

roomsRouter.post('/delete', async (req, res) => {
  try {
    const { roomName } = req.body;
    const room = await Room.findOne({ name: roomName });
    if (!room) return res.status(404).json({ error: 'اتاق پیدا نشد.' });
    if (room.createdBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'فقط سازنده می‌تونه اتاق رو حذف کنه.' });
    }

    await Message.deleteMany({ room: roomName });
    await Room.deleteOne({ name: roomName });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete room error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

roomsRouter.get('/info', async (req, res) => {
  try {
    const { roomName } = req.query;
    const room = await Room.findOne({ name: roomName }).populate('createdBy', 'username').populate('members', 'username').lean();
    if (!room) return res.status(404).json({ error: 'اتاق پیدا نشد.' });

    res.json({
      success: true,
      room: {
        id: room._id.toString(),
        name: room.name,
        createdBy: room.createdBy._id.toString(),
        createdByUsername: room.createdBy.username,
        members: room.members.map(m => ({ id: m._id.toString(), username: m.username })),
        isPrivate: room.isPrivate
      }
    });
  } catch (err) {
    console.error('Get room info error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

roomsRouter.post('/open-dm', async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'کاربر پیدا نشد.' });

    if (!mongoose.isValidObjectId(String(targetUserId))) {
      return res.status(400).json({ error: 'کاربر پیدا نشد.' });
    }
    const dbUser = await User.findById(targetUserId).select('username').lean();
    if (!dbUser) return res.status(404).json({ error: 'کاربر پیدا نشد.' });
    const targetDbId = dbUser._id.toString();
    const targetUsername = dbUser.username;

    if (targetDbId === req.userId) {
      return res.status(400).json({ error: 'نمی‌توانید با خودتان چت کنید.' });
    }

    const ids = [req.userId, targetDbId].sort();
    const dmRoomName = `dm_${ids[0]}_${ids[1]}`;

    let room = await Room.findOne({ name: dmRoomName });
    if (!room) {
      room = await Room.create({
        name: dmRoomName,
        createdBy: req.userId,
        members: [req.userId, targetDbId],
        isPrivate: true,
      });
    } else {
      let changed = false;
      for (const id of [req.userId, targetDbId]) {
        if (!room.members.some((m) => m.toString() === id)) {
          room.members.push(id);
          changed = true;
        }
      }
      if (changed) await room.save();
    }

    const history = await Message.find({
      room: dmRoomName,
      isDeletedForEveryone: { $ne: true },
      deletedFor: { $ne: req.userId },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    history.reverse();

    const formattedHistory = history.map((m) => ({
      id: m._id.toString(),
      text: m.text,
      sender: m.sender,
      senderId: m.senderId?.toString(),
      type: m.type,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileType: m.fileType,
      fileSize: m.fileSize,
      createdAt: m.createdAt,
      time: new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    }));

    res.json({
      success: true,
      room: dmRoomName,
      history: formattedHistory,
      targetUser: { id: targetDbId, username: targetUsername, isOnline: false },
    });
  } catch (err) {
    console.error('Open DM error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});