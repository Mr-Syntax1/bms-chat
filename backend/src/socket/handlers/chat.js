import { getPersianTime } from '../../utils/messages.js';
import { Message } from '../../models/Message.js';

export function handleChat(socket, io, users) {
  return async function onChatMessage(payload, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const text = typeof payload === 'string' ? payload : payload?.text;
    if (!text || !text.trim()) return callback?.({ error: 'پیام خالی است.' });
    if (text.length > 500) return callback?.({ error: 'پیام طولانی است.' });

    const saved = await Message.create({
      text: text.trim(),
      sender: user.username,
      senderId: user.id,
      avatarColor: user.avatarColor,
      type: 'message',
    });

    const message = {
      id: saved._id.toString(),
      text: saved.text,
      sender: saved.sender,
      senderId: saved.senderId,
      avatarColor: saved.avatarColor,
      type: saved.type,
      time: getPersianTime(),
    };

    io.emit('chat message', message);// به همه کلاینت‌ها میفرسته پیام را
    callback?.({ success: true, message });
  };
}