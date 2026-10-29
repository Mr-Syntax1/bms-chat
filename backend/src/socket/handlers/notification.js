import { Notification } from '../../models/Notification.js';

export async function notifyUser(socket, io, users, data) {
  const { userId, senderId, senderName, roomName, messagePreview } = data;
  if (!userId || !senderId) return null;

  const notification = await Notification.create({
    userId,
    senderId,
    senderName,
    roomName,
    messagePreview,
    isRead: false,
  });

  const targetUser = users.findByUserId(userId.toString());
  if (targetUser) {
    io.to(targetUser.id).emit('new notification', {
      id: notification._id.toString(),
      senderId: senderId.toString(),
      senderName,
      roomName,
      messagePreview,
      createdAt: notification.createdAt,
    });
  }

  return notification;
}

export async function getUnreadNotifications(userId) {
  return Notification.find({ userId, isRead: false })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
}

export async function markAllAsRead(userId, roomName) {
  const filter = { userId, isRead: false };
  if (roomName) filter.roomName = roomName;
  return Notification.updateMany(filter, { isRead: true });
}