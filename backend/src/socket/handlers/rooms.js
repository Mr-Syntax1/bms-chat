import { Room } from '../../models/Room.js';
import { Message } from '../../models/Message.js';
import { User } from '../../models/User.js';
import { getRoomsForUser } from './users.js';
import { users } from '../../utils/users.js';
import { markAllAsRead } from './notification.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getRoomUsers(io, roomName, users) {
  const room = io.sockets.adapter.rooms.get(roomName);
  if (!room) return [];
  return Array.from(room)
    .map((socketId) => users.get(socketId))
    .filter(Boolean);
}

export function handleListRooms(socket, io) {
  return async function onListRooms(callback) {
    const rooms = await getRoomsForUser(socket, io, users);
    callback({ rooms });
  };
}

export function handleSearchRooms(socket, io) {
  return async function onSearchRooms(payload, callback) {
    try {
      const user = users.get(socket.id);
      if (!user) return callback({ error: 'ابتدا وارد شوید.' });

      // دریافت متن جستجو
      const raw = typeof payload === 'string' ? payload : payload?.query;
      const trimmed = typeof raw === 'string' ? raw.trim() : '';
      if (!trimmed) return callback({ rooms: [], users: [] });

      const regex = new RegExp(escapeRegex(trimmed), 'i');

      //  ساخت کوئری جستجو برای کاربران (هم با نام و هم با آی‌دی)
      const userQuery = {
        _id: { $ne: socket.userId }, // کاربر خودم را نشان نده
        $or: [
          { username: regex },
          // اگر عبارت وارد شده یک ObjectId کامل و معتبر بود
          ...(trimmed.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: trimmed }] : []),
          // برای جستجوی بخشی از آی‌دی (مثل 018ab0)
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$_id" },
                regex: escapeRegex(trimmed),
                options: "i"
              }
            }
          }
        ]
      };

      // جستجوی همزمان اتاق‌ها و کاربران
      const [rooms, foundUsers] = await Promise.all([
        Room.find({ isPrivate: false, name: regex }).limit(20).lean(),
        User.find(userQuery)
          .select('username')
          .limit(20)
          .lean(),
      ]);

      callback({
        rooms: rooms.map((r) => ({
          id: r._id.toString(),
          name: r.name,
          createdBy: r.createdBy.toString(),
          isMember: r.members?.some((m) => m.toString() === socket.userId),
          isPrivate: r.isPrivate,
        })),
        users: foundUsers.map((u) => ({
          id: u._id.toString(),
          username: u.username,
          isOnline: !!users.findByUserId(u._id.toString()),
        })),
      });
    } catch (err) {
      console.error('[Search Rooms] error:', err);
      callback({ rooms: [], users: [], error: 'خطا در جستجو.' });
    }
  };
}

export function handleCreateRoom(socket, io, users) {
  return async function onCreateRoom({ name }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const trimmed = name?.trim();
    if (!trimmed || trimmed.length < 2) return callback({ error: 'نام اتاق حداقل ۲ کاراکتر است.' });
    if (trimmed.length > 30) return callback({ error: 'نام اتاق حداکثر ۳۰ کاراکتر است.' });

    const exists = await Room.findOne({ name: trimmed });
    if (exists) return callback({ error: 'این اتاق قبلاً ساخته شده.' });

    const room = await Room.create({
      name: trimmed,
      createdBy: socket.userId,
      members: [socket.userId]
    });

    io.emit('room created', { id: room._id.toString(), name: room.name, createdBy: room.createdBy.toString() });
    callback({ success: true, room: { id: room._id.toString(), name: room.name, createdBy: room.createdBy.toString() } });
  };
}

export function handleJoinRoom(socket, io, users) {
  return async function onJoinRoom({ roomName }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const room = await Room.findOne({ name: roomName });
    if (!room) return callback({ error: 'اتاق پیدا نشد.' });

    if (room.isPrivate) {
      const isMember = room.members?.some(m => m.toString() === socket.userId);
      if (!isMember) return callback({ error: 'شما عضو این اتاق نیستید.' });
    }

    if (!room.members?.some(m => m.toString() === socket.userId)) {
      room.members.push(socket.userId);
      await room.save();
    }

    for (const r of socket.rooms) {
      if (r !== socket.id) socket.leave(r);
    }

    socket.join(roomName);
    socket.currentRoom = roomName;

    // Mark notifications for this room as read
    await markAllAsRead(socket.userId, roomName);

    // 👈 اصلاح نهایی: استفاده از socket.userId در کوئری دیتابیس
    const history = await Message.find({
      room: roomName,
      isDeletedForEveryone: { $ne: true },
      deletedFor: { $ne: socket.userId },
    }).sort({ createdAt: -1 }).limit(100).lean();
    history.reverse();

    const formattedHistory = history.map((m) => ({
      id: m._id.toString(),
      text: m.text,
      sender: m.sender,
      senderId: m.senderId?.toString(),
      avatarColor: m.avatarColor,
      type: m.type,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileType: m.fileType,
      fileSize: m.fileSize,
      createdAt: m.createdAt,
      time: new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    }));

    socket.to(roomName).emit('system message', { text: `${user.username} وارد اتاق شد.`, room: roomName });
    callback({ success: true, room: roomName, history: formattedHistory });
    io.to(roomName).emit('room users', getRoomUsers(io, roomName, users));
  };
}

export function handleLeaveRoom(socket, io, users) {
  return async function onLeaveRoom(payload, callback) {
    const roomName = payload?.roomName || socket.currentRoom;
    if (!roomName) return callback?.({ error: 'اتاقی انتخاب نشده است.' });

    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const room = await Room.findOne({ name: roomName });
    if (!room) return callback?.({ error: 'اتاق پیدا نشد.' });

    const isMember = room.members?.some((m) => m.toString() === socket.userId);
    if (!isMember) return callback?.({ error: 'شما عضو این اتاق نیستید.' });

    // Anyone who is a member (including the creator of a public group) can leave.
    // Leaving only removes them from the room list; the group itself stays in the database.

    const isCurrent = socket.currentRoom === roomName;
    if (isCurrent) {
      socket.leave(roomName);
      socket.currentRoom = null;
    }

    // Removing the user from members takes the room out of their room list
    // (it stays in the database for everyone else).
    room.members = room.members.filter((m) => m.toString() !== socket.userId);
    await room.save();

    if (isCurrent) {
      socket.to(roomName).emit('system message', { text: `${user.username} اتاق را ترک کرد.`, room: roomName });
      const roomSockets = io.sockets.adapter.rooms.get(roomName);
      if (roomSockets) io.to(roomName).emit('room users', getRoomUsers(io, roomName, users));
    }

    callback?.({ success: true });
  };
}

export function handleDeleteRoom(socket, io, users) {
  return async function onDeleteRoom({ roomName }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const room = await Room.findOne({ name: roomName });
    if (!room) return callback({ error: 'اتاق پیدا نشد.' });
    if (room.createdBy.toString() !== socket.userId) {
      return callback({ error: 'فقط سازنده می‌تونه اتاق رو حذف کنه.' });
    }

    const roomSockets = io.sockets.adapter.rooms.get(roomName);
    if (roomSockets) {
      for (const sid of roomSockets) {
        const s = io.sockets.sockets.get(sid);
        if (s) {
          s.leave(roomName);
          s.currentRoom = null;
          s.emit('room deleted', { roomName });
        }
      }
    }

    await Message.deleteMany({ room: roomName });
    await Room.deleteOne({ name: roomName });
    io.emit('room removed', { roomName });
    callback({ success: true });
  };
}

export function handleGetRoomInfo(socket, io, users) {
  return async function onGetRoomInfo({ roomName }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const room = await Room.findOne({ name: roomName }).populate('createdBy', 'username').populate('members', 'username').lean();
    if (!room) return callback({ error: 'اتاق پیدا نشد.' });

    callback({
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
  };
}