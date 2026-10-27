import { getPersianTime } from '../../utils/messages.js';

export function handleChat(socket, io, users, messageStore) {
  return function onChatMessage(payload, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const text = typeof payload === 'string' ? payload : payload?.text;
    if (!text || !text.trim()) return callback?.({ error: 'پیام خالی است.' });
    if (text.length > 500) return callback?.({ error: 'پیام طولانی است.' });

    const message = messageStore.add({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: text.trim(),
      sender: user.username,
      senderId: user.id,
      avatarColor: user.avatarColor,
      type: 'message',
      time: getPersianTime(),
    });

    io.emit('chat message', message);
    callback?.({ success: true, message });
  };
}