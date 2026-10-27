import { getPersianTime } from '../../utils/messages.js';
import { Message } from '../../models/Message.js';

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

    // ذخیره پیام سیستمی در دیتابیس
    const systemMessage = await Message.create({
      text: `${trimmed} به گروه پیوست.`,
      sender: 'system',
      type: 'system',
    });

    // دریافت ۱۰۰ پیام آخر از دیتابیس
    const history = await Message.find().sort({ createdAt: -1 }).limit(100).lean();
    history.reverse(); // قدیمی‌ترین اول

    callback({ success: true, user, history });

    const sysMsgForBroadcast = {
      id: systemMessage._id.toString(),
      text: systemMessage.text,
      sender: systemMessage.sender,
      type: systemMessage.type,
      time: getPersianTime(),
    };

    io.emit('user joined', {
      user,
      message: sysMsgForBroadcast,
      onlineUsers: users.getAll(),
    });
    io.emit('online users', users.getAll());
  };
}