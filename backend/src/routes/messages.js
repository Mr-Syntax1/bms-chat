import express from 'express';
import { Message } from '../models/Message.js';
import { Room } from '../models/Room.js';
import { Notification } from '../models/Notification.js';
import { verifyToken } from '../utils/jwt.js';
import { apinator } from '../config/apinator.js';

export const messagesRouter = express.Router();

// میدل‌ور احراز هویت با پشتیبانی از کوکی و هدر Bearer
const authMiddleware = (req, res, next) => {
  let token = req.cookies?.token;
  
  // اگر توکن در کوکی نبود، هدر Authorization را بررسی کن
  if (!token && req.headers.authorization) {
    const [scheme, ...rest] = req.headers.authorization.split(' ');
    if (scheme.toLowerCase() === 'bearer' && rest.length === 1) {
      token = rest[0];
    }
  }

  if (!token) return res.status(401).json({ error: 'توکن یافت نشد' });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'توکن نامعتبر' });

  req.userId = decoded.id;
  req.username = decoded.username;
  next();
};

messagesRouter.use(authMiddleware);

// تابع کمکی برای یکپارچه‌سازی نام کانال‌ها
function getChannelName(roomName) {
  if (roomName.startsWith('dm_')) {
    const idsPart = roomName.replace('dm_', '');
    // جایگزینی آندرلاین با خط تیره برای هماهنگی با Apinator
    return `private-dm-${idsPart.replace('_', '-')}`;
  }
  return `presence-room-${roomName}`;
}

messagesRouter.get('/history', async (req, res) => {
  try {
    const { room, before, limit = 50 } = req.query;

    if (!room) {
      return res.status(400).json({ error: 'نام اتاق الزامی است.' });
    }

    const query = {
      room,
      isDeletedForEveryone: { $ne: true },
      deletedFor: { $ne: req.userId },
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    messages.reverse();

    const formattedMessages = messages.map((m) => ({
      id: m._id.toString(),
      text: m.text,
      sender: m.sender,
      senderId: m.senderId?.toString(),
      type: m.type,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileType: m.fileType,
      fileSize: m.fileSize,
      createdAt: m.createdAt,
      time: new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    }));

    res.json({ success: true, messages: formattedMessages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

messagesRouter.post('/send', async (req, res) => {
  try {
    const { room, text, type, fileUrl, fileName, fileType, fileSize } = req.body;

    if (!room) {
      return res.status(400).json({ error: 'نام اتاق الزامی است.' });
    }

    const roomDoc = await Room.findOne({ name: room });
    if (!roomDoc) {
      return res.status(404).json({ error: 'اتاق پیدا نشد.' });
    }

    if (roomDoc.isPrivate) {
      const isMember = roomDoc.members?.some(m => m.toString() === req.userId);
      if (!isMember) {
        return res.status(403).json({ error: 'شما عضو این اتاق نیستید.' });
      }
    } else {
      const isMember = roomDoc.members?.some(m => m.toString() === req.userId);
      if (!isMember) {
        roomDoc.members.push(req.userId);
        await roomDoc.save();
      }
    }

    const safeText = typeof text === 'string' ? text.trim() : '';
    const safeFileUrl = typeof fileUrl === 'string' && fileUrl.trim() ? fileUrl.trim() : null;
    const safeFileName = typeof fileName === 'string' ? fileName.trim() : null;
    const safeFileType = typeof fileType === 'string' ? fileType.trim() : null;
    const safeFileSize = typeof fileSize === 'number' && fileSize > 0 ? fileSize : null;
    const isFileMessage = type === 'file' && safeFileUrl;

    if (!safeText && !isFileMessage) {
      return res.status(400).json({ error: 'پیام خالی است.' });
    }
    if (safeText.length > 500) {
      return res.status(400).json({ error: 'پیام طولانی است.' });
    }

    const saved = await Message.create({
      text: safeText,
      sender: req.username,
      senderId: req.userId,
      type: isFileMessage ? 'file' : 'message',
      fileUrl: safeFileUrl,
      fileName: safeFileName,
      fileType: safeFileType,
      fileSize: safeFileSize,
      room,
    });

    const message = {
      id: saved._id.toString(),
      text: saved.text,
      sender: saved.sender,
      senderId: saved.senderId.toString(),
      type: saved.type,
      fileUrl: saved.fileUrl,
      fileName: saved.fileName,
      fileType: saved.fileType,
      fileSize: saved.fileSize,
      room,
      createdAt: saved.createdAt.toISOString(),
      time: new Date(saved.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    const channelName = getChannelName(room);
    await apinator.trigger({
      name: 'new-message',
      channel: channelName,
      data: JSON.stringify(message),
    });

    if (roomDoc) {
      for (const memberId of roomDoc.members) {
        if (memberId.toString() === req.userId) continue;

        const notification = await Notification.create({
          userId: memberId,
          senderId: req.userId,
          senderName: req.username,
          roomName: room,
          messagePreview: safeText.slice(0, 120) || safeFileName || 'فایل',
          isRead: false,
        });

        const notificationChannel = `private-notifications-${memberId.toString()}`;
        await apinator.trigger({
          name: 'new-notification',
          channel: notificationChannel,
          data: JSON.stringify({
            id: notification._id.toString(),
            senderId: req.userId,
            senderName: req.username,
            roomName: room,
            messagePreview: safeText.slice(0, 120) || safeFileName || 'فایل',
            createdAt: notification.createdAt,
          }),
        });
      }
    }

    res.json({ success: true, message });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

messagesRouter.post('/edit', async (req, res) => {
  try {
    const { messageId, newText } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'پیام پیدا نشد.' });

    if (message.senderId?.toString() !== req.userId) {
      return res.status(403).json({ error: 'شما فقط می‌توانید پیام‌های خود را ویرایش کنید.' });
    }

    const safeText = typeof newText === 'string' ? newText.trim() : '';
    if (!safeText) return res.status(400).json({ error: 'متن پیام خالی است.' });
    if (safeText.length > 500) return res.status(400).json({ error: 'متن پیام بیش از حد طولانی است.' });

    message.text = safeText;
    await message.save();

    const editedMessage = {
      id: message._id.toString(),
      text: message.text,
      sender: message.sender,
      senderId: message.senderId.toString(),
      type: message.type,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      fileSize: message.fileSize,
      room: message.room,
      createdAt: message.createdAt.toISOString(),
      time: new Date(message.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    const channelName = getChannelName(message.room);
    await apinator.trigger({
      name: 'message-edited',
      channel: channelName,
      data: JSON.stringify(editedMessage),
    });

    res.json({ success: true, message: editedMessage });
  } catch (err) {
    console.error('Edit message error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

messagesRouter.post('/delete', async (req, res) => {
  try {
    const { messageId, deleteForEveryone } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'پیام پیدا نشد.' });

    const isSender = message.senderId?.toString() === req.userId;

    if (deleteForEveryone) {
      if (!isSender) {
        return res.status(403).json({ error: 'فقط فرستنده می‌تواند پیام را برای همه حذف کند.' });
      }
      message.isDeletedForEveryone = true;
      await message.save();

      const channelName = getChannelName(message.room);
      await apinator.trigger({
        name: 'message-deleted',
        channel: channelName,
        data: JSON.stringify({ messageId, deleteForEveryone: true }),
      });
    } else {
      if (!message.deletedFor.some((id) => id.toString() === req.userId)) {
        message.deletedFor.push(req.userId);
        await message.save();
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

messagesRouter.post('/system', async (req, res) => {
  try {
    const { room, text } = req.body;

    if (!room || !text) {
      return res.status(400).json({ error: 'اطلاعات ناقص است.' });
    }

    const channelName = getChannelName(room);
    await apinator.trigger({
      name: 'system-message',
      channel: channelName,
      data: JSON.stringify({
        text,
        room,
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      }),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('System message error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});