import { getPersianTime } from '../../utils/messages.js';

export function handleJoin(socket, io, users, messageStore) {
  return function onJoin(payload, callback) {
    // مقاوم‌سازی: هم string هم object
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

    const systemMessage = messageStore.add({
      id: `sys-${Date.now()}`,
      text: `${trimmed} به گروه پیوست.`,
      sender: 'system',
      type: 'system',
      time: getPersianTime(),
    });

    callback({ success: true, user, history: messageStore.getAll() });

    io.emit('user joined', {
      user,
      message: systemMessage,
      onlineUsers: users.getAll(),
    });
    io.emit('online users', users.getAll());
  };
}