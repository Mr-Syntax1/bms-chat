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

    // دیباگ: لاگ داده‌های دریافتی
    console.log('[Chat] received:', {
      text: typeof text,
      type,
      fileUrl: typeof fileUrl,
      fileName,
      fileType,
      fileSize
    });

    // ۲. ایمن‌سازی متن
    const safeText = typeof text === 'string' ? text.trim() : '';

    // ۳. اعتبارسنجی fileUrl - باید string باشه
    const safeFileUrl = typeof fileUrl === 'string' && fileUrl.trim() ? fileUrl.trim() : null;
    const safeFileName = typeof fileName === 'string' ? fileName.trim() : null;
    const safeFileType = typeof fileType === 'string' ? fileType.trim() : null;
    const safeFileSize = typeof fileSize === 'number' && fileSize > 0 ? fileSize : null;

    // ۴. اعتبارسنجی: یا باید متن داشته باشیم یا فایل معتبر
    const isFileMessage = type === 'file' && safeFileUrl;
    if (!safeText && !isFileMessage) {
      return callback?.({ error: 'پیام خالی است.' });
    }
    if (safeText.length > 500) {
      return callback?.({ error: 'پیام طولانی است.' });
    }

    // ۵. ذخیره در دیتابیس
    const saved = await Message.create({
      text: safeText,
      sender: user.username,
      senderId: user.id,
      avatarColor: user.avatarColor,
      type: isFileMessage ? 'file' : 'message',
      fileUrl: safeFileUrl,
      fileName: safeFileName,
      fileType: safeFileType,
      fileSize: safeFileSize,
      room,
    });

    // ۶. ساخت آبجکت پیام برای ارسال به کلاینت
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
      fileSize: saved.fileSize,
      room,
      createdAt: saved.createdAt.toISOString(),
      time: new Date(saved.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    // ارسال به اعضای اتاق
    io.to(room).emit('chat message', message);
    callback?.({ success: true, message });
  };
}