import { Room } from '../../models/Room.js';
import { Message } from '../../models/Message.js';
import { getPersianTime } from '../../utils/messages.js';

// لیست همه اتاق‌ها
export function handleListRooms(socket, io) {
  return async function onListRooms(callback) {
    const rooms = await Room.find().sort({ createdAt: 1 }).lean();
    callback({ rooms: rooms.map((r) => ({ id: r._id.toString(), name: r.name })) });
  };
}

// ساخت اتاق جدید
export function handleCreateRoom(socket, io, users) {
  return async function onCreateRoom({ name }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const trimmed = name?.trim();
    if (!trimmed || trimmed.length < 2) {
      return callback({ error: 'نام اتاق حداقل ۲ کاراکتر است.' });
    }
    if (trimmed.length > 30) {
      return callback({ error: 'نام اتاق حداکثر ۳۰ کاراکتر است.' });
    }

    const exists = await Room.findOne({ name: trimmed });
    if (exists) return callback({ error: 'این اتاق قبلاً ساخته شده.' });

    const room = await Room.create({ name: trimmed, createdBy: user.username });

    // به همه اطلاع بده که اتاق جدید ساخته شد
    io.emit('room created', { id: room._id.toString(), name: room.name });

    callback({ success: true, room: { id: room._id.toString(), name: room.name } });
  };
}

// ورود به اتاق
export function handleJoinRoom(socket, io, users) {
  return async function onJoinRoom({ roomName }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const room = await Room.findOne({ name: roomName });
    if (!room) return callback({ error: 'اتاق پیدا نشد.' });

    // خروج از همه‌ی اتاق‌های قبلی (به جز socket.id خودش)
    for (const r of socket.rooms) {
      if (r !== socket.id) socket.leave(r);
    }

    socket.join(roomName);
    socket.currentRoom = roomName;

    // تاریخچه‌ی پیام‌های این اتاق
    const history = await Message.find({ room: roomName })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    history.reverse();

    const formattedHistory = history.map((m) => ({
      id: m._id.toString(),
      text: m.text,
      sender: m.sender,
      senderId: m.senderId,
      avatarColor: m.avatarColor,
      type: m.type,
      time: getPersianTime(),
    }));

    // پیام سیستمی به اعضای اتاق
    socket.to(roomName).emit('system message', {
      text: `${user.username} وارد اتاق شد.`,
      room: roomName,
    });

    callback({ success: true, room: roomName, history: formattedHistory });

    // آپدیت لیست کاربران آنلاین در این اتاق
    io.to(roomName).emit('room users', getRoomUsers(io, roomName, users));
  };
}


export function handleLeaveRoom(socket, io) {
  return async function onLeaveRoom({ roomName }, callback) {
    if (!socket.currentRoom) return callback?.({ error: 'در هیچ اتاقی نیستی.' });
    if (socket.currentRoom !== roomName) {
      return callback?.({ error: 'در این اتاق نیستی.' });
    }
    socket.leave(roomName);
    socket.currentRoom = null;
    socket.to(roomName).emit('system message', {
      text: `${socket.username} اتاق را ترک کرد.`,
      room: roomName,
    });
    callback?.({ success: true });
    io.to(roomName).emit('room users', getRoomUsers(io, roomName, users));
  };
}

// لیست کاربران آنلاین در یک اتاق
export function getRoomUsers(io, roomName, users) {
  const room = io.sockets.adapter.rooms.get(roomName);
  if (!room) return [];
  return Array.from(room)
    .map((socketId) => users.get(socketId))
    .filter(Boolean);
}