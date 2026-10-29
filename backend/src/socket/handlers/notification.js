import { Notification } from '../../models/Notification.js';
import { users } from '../../utils/users.js';

export async function createNotification(userId, senderId, senderName, roomName, messagePreview) {
  const notification = await Notification.create({
    userId,
    senderId,
    senderName,
    roomName,
    messagePreview,
    isRead: false,
  });
  return notification;
}

export async function getUnreadNotifications(userId) {
  return Notification.find({ userId, isRead: false }).sort({ createdAt: -1 }).limit(20).lean();
}

export async function markAllAsRead(userId, roomName) {
  return Notification.markAllAsRead(userId, roomName);
}

export async function markNotificationsAsRead(socket, io, { roomName }, callback) {
  const user = users.get(socket.id);
  if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

  await markAllAsRead(socket.userId, roomName);
  const unread = await getUnreadNotifications(socket.userId);
  socket.emit('notifications updated', { count: unread.length });
  callback?.({ success: true, count: unread.length });
}

export async function notifyUser(socket, io, users, notification) {
  await createNotification(notification.userId, notification.senderId, notification.senderName, notification.roomName, notification.messagePreview);
  const targetUser = users.findByUserId(notification.userId);
  if (targetUser) {
    io.to(targetUser.id).emit('new notification', {
      id: notification._id?.toString(),
      senderId: notification.senderId?.toString(),
      senderName: notification.senderName,
      roomName: notification.roomName,
      messagePreview: notification.messagePreview,
    });
  } else {
    io.emit('notification pending', { userId: notification.userId });
  }
}
