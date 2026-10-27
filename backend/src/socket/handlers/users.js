import { getPersianTime } from '../../utils/messages.js';
import { Message } from '../../models/Message.js';
import { Room } from '../../models/Room.js';

export function handleJoin(socket, io, users) {
  return async function onJoin(payload, callback) {
    const username = socket.username;

    if (!username) {
      return callback({ error: 'احراز هویت نامعتبر است.' });
    }

    if (users.findByUsername(username)) {
      return callback({ error: 'این نام کاربری قبلاً استفاده شده است.' });
    }

    const user = users.add(socket.id, username);
    socket.user = user;

    // اطمینان از وجود اتاق general
    let general = await Room.findOne({ name: 'general' });
    if (!general) {
      general = await Room.create({ name: 'general', createdBy: 'system' });
    }

    socket.join('general');
    socket.currentRoom = 'general';

    // تاریخچه‌ی ۱۰۰ پیام آخر در general
    const history = await Message.find({ room: 'general' })
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

    const rooms = await Room.find().sort({ createdAt: 1 }).lean();

    callback({
      success: true,
      user,
      history: formattedHistory,
      rooms: rooms.map((r) => ({ id: r._id.toString(), name: r.name })),
      currentRoom: 'general',
    });

    io.emit('online users', users.getAll());
  };
}

export function handleDeleteRoom(socket, io) {
  return async function onDeleteRoom({ roomName }, callback) {
    const room = await Room.findOne({ name: roomName });
    if (!room) return callback({ error: 'اتاق پیدا نشد.' });
    if (room.createdBy.toString() !== socket.userId) {
      return callback({ error: 'فقط سازنده می‌تونه اتاق رو حذف کنه.' });
    }
    // همه کاربران رو از اتاق خارج کن
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
    await Room.deleteOne({ name: roomName });
    io.emit('room removed', { roomName });
    callback({ success: true });
  };
}