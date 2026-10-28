import { getPersianTime } from '../../utils/messages.js';
import { Message } from '../../models/Message.js';

export function handleChat(socket, io, users) {
  return async function onChatMessage(payload, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const room = socket.currentRoom;
    if (!room) return callback?.({ error: 'ابتدا وارد یک اتاق شوید.' });

    // ۱. تشخیص اینکه payload رشته است یا آبجکت
    const data = typeof payload === 'string' ? { text: payload } : payload || {};
    const { text, type, fileUrl, fileName, fileType, fileSize } = data;

    // ۲. ایمن‌سازی متن (اگر undefined بود، رشته خالی در نظر بگیر)
    const safeText = typeof text === 'string' ? text.trim() : '';

    // ۳. اعتبارسنجی: یا باید متن داشته باشیم یا فایل
    if (!safeText && !fileUrl) {
      return callback?.({ error: 'پیام خالی است.' });
    }
    if (safeText.length > 500) {
      return callback?.({ error: 'پیام طولانی است.' });
    }

    // ۴. ذخیره در دیتابیس با تمام فیلدهای جدید
    const saved = await Message.create({
      text: safeText,
      sender: user.username,
      senderId: user.id,
      avatarColor: user.avatarColor,
      type: type === 'file' ? 'file' : 'message', // تشخیص نوع پیام
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileType: fileType || null,
      fileSize: fileSize || null,
      room,
    });

    // ۵. ساخت آبجکت پیام برای ارسال به کلاینت
    const message = {
      id: saved._id.toString(),
      text: saved.text,
      sender: saved.sender,
      senderId: saved.senderId,
      avatarColor: saved.avatarColor,
      type: saved.type,
      fileUrl: saved.fileUrl,
      fileName: saved.fileName,
      fileType: saved.fileType,
      room,
      time: getPersianTime(),
    };

    // ارسال به اعضای اتاق
    io.to(room).emit('chat message', message);
    callback?.({ success: true, message });
  };
}