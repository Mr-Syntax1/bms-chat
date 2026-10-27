import { getPersianTime } from '../../utils/messages.js';
import { Message } from '../../models/Message.js';
import { Room } from '../../models/Room.js';

export function handleJoin(socket, io, users) {
  return async function onJoin(payload, callback) {
    let username = payload;
    if (payload && typeof payload === 'object') username = payload.username;

    if (!username || !username.trim()) {
      return callback({ error: 'نام کاربری الزامی است.' });
    }

    const trimmed = username.trim();
    if (trimmed.length > 30) {
      return callback({ error: 'نام کاربری نمی‌تواند بیش از ۳۰ کاراکتر باشد.' });
    }

    if (users.findByUsername(trimmed)) {
      return callback({ error: 'این نام کاربری قبلاً استفاده شده است.' });
    }

    const user = users.add(socket.id, trimmed);
    socket.username = trimmed;
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