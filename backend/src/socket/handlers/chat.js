import { getPersianTime } from '../../utils/messages.js';
import { Message } from '../../models/Message.js';
import { Room } from '../../models/Room.js';
import { notifyUser, getUnreadNotifications, markAllAsRead } from './notification.js';
import { users } from '../../utils/users.js';

export function handleChat(socket, io, users) {
  return async function onChatMessage(payload, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const room = socket.currentRoom;
    if (!room) return callback?.({ error: 'ابتدا وارد یک اتاق شوید.' });

    const data = typeof payload === 'string' ? { text: payload } : payload || {};
    const { text, type, fileUrl, fileName, fileType, fileSize } = data;

    console.log('[Chat] received:', {
      text: typeof text,
      type,
      fileUrl: typeof fileUrl,
      fileName,
      fileType,
      fileSize
    });

    const safeText = typeof text === 'string' ? text.trim() : '';
    const safeFileUrl = typeof fileUrl === 'string' && fileUrl.trim() ? fileUrl.trim() : null;
    const safeFileName = typeof fileName === 'string' ? fileName.trim() : null;
    const safeFileType = typeof fileType === 'string' ? fileType.trim() : null;
    const safeFileSize = typeof fileSize === 'number' && fileSize > 0 ? fileSize : null;
    const isFileMessage = type === 'file' && safeFileUrl;
    if (!safeText && !isFileMessage) {
      return callback?.({ error: 'پیام خالی است.' });
    }
    if (safeText.length > 500) {
      return callback?.({ error: 'پیام طولانی است.' });
    }

    const saved = await Message.create({
      text: safeText,
      sender: user.username,
      senderId: socket.userId,
      avatarColor: user.avatarColor,
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

    io.to(room).emit('chat message', message);

    if (room !== 'general') {
      const roomDoc = await Room.findOne({ name: room });
      const roomSockets = io.sockets.adapter.rooms.get(room);
      if (roomDoc) {
        for (const memberId of roomDoc.members) {
          if (memberId.toString() !== socket.userId) {
            const memberUser = users.findByUserId(memberId.toString());
            if (memberUser && !roomSockets?.has(memberUser.id)) {
              await notifyUser(socket, io, users, {
                userId: memberId,
                senderId: socket.userId,
                senderName: user.username,
                roomName: room,
                messagePreview: safeText.slice(0, 120),
              });
            }
          }
        }
      }
    }
    callback?.({ success: true, message });
  };
}

export function handleDeleteMessage(socket, io, users) {
  return async function onDeleteMessage({ messageId, deleteForEveryone }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const message = await Message.findById(messageId);
    if (!message) return callback?.({ error: 'پیام پیدا نشد.' });

    if (message.senderId?.toString() !== socket.userId) {
      return callback?.({ error: 'شما فقط می‌توانید پیام‌های خود را حذف کنید.' });
    }

    if (deleteForEveryone) {
      message.isDeletedForEveryone = true;
      await message.save();
      io.to(message.room).emit('message deleted', { messageId, deleteForEveryone: true });
    } else {
      if (!message.deletedFor.some(id => id.toString() === socket.userId)) {
        message.deletedFor.push(socket.userId);
        await message.save();
      }
      socket.emit('message deleted', { messageId, deleteForEveryone: false });
    }

    callback?.({ success: true });
  };
}

export function handleGetMessages(socket, io, users) {
  return async function onGetMessages({ room, before, limit = 50 }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const query = {
      room,
      $or: [
        { deletedFor: { $ne: user.id } },
        { isDeletedForEveryone: false }
      ]
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    messages.reverse();

    const formattedMessages = messages.map((m) => ({
      id: m._id.toString(),
      text: m.text,
      sender: m.sender,
      senderId: m.senderId?.toString(),
      avatarColor: m.avatarColor,
      type: m.type,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileType: m.fileType,
      fileSize: m.fileSize,
      createdAt: m.createdAt,
      time: new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    }));

    callback?.({ success: true, messages: formattedMessages });
  };
}

export function handleEditMessage(socket, io, users) {
  return async function onEditMessage({ messageId, newText }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const message = await Message.findById(messageId);
    if (!message) return callback?.({ error: 'پیام پیدا نشد.' });

    if (message.senderId?.toString() !== socket.userId) {
      return callback?.({ error: 'شما فقط می‌توانید پیام‌های خود را ویرایش کنید.' });
    }

    const safeText = typeof newText === 'string' ? newText.trim() : '';
    if (!safeText) return callback?.({ error: 'متن پیام خالی است.' });
    if (safeText.length > 500) return callback?.({ error: 'متن پیام بیش از حد طولانی است.' });

    message.text = safeText;
    await message.save();

    const editedMessage = {
      id: message._id.toString(),
      text: message.text,
      sender: message.sender,
      senderId: message.senderId.toString(),
      avatarColor: message.avatarColor,
      type: message.type,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      fileSize: message.fileSize,
      room: message.room,
      createdAt: message.createdAt.toISOString(),
      time: new Date(message.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    io.to(message.room).emit('message edited', editedMessage);
    callback?.({ success: true, message: editedMessage });
  };
}

export function handleGetNotifications(socket, io, users) {
  return async function onGetNotifications(_, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const notifications = await getUnreadNotifications(socket.userId);
    const formatted = notifications.map((n) => ({
      id: n._id.toString(),
      senderId: n.senderId?.toString(),
      senderName: n.senderName,
      roomName: n.roomName,
      messagePreview: n.messagePreview,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));
    callback?.({ success: true, notifications: formatted, count: formatted.length });
  };
}

export function handleMarkNotificationsAsRead(socket, io, users) {
  return async function onMarkNotificationsAsRead({ roomName } = {}, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    await markAllAsRead(socket.userId, roomName);
    const result = await getUnreadNotifications(socket.userId);
    socket.emit('notifications updated', { count: result.length });
    callback?.({ success: true, count: result.length });
  };
}