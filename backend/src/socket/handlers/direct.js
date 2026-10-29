import { Room } from '../../models/Room.js';
import { users } from '../../utils/users.js';

export function handleStartDM(socket, io, users) {
  return async function onStartDM({ targetUserId }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    // پیدا کردن کاربر هدف در لیست آنلاین‌ها
    // نکته: targetUserId همان socket.id کاربر است
    const targetSocketId = targetUserId; 
    
    if (targetSocketId === socket.id) {
      return callback({ error: 'نمی‌توانید با خودتان چت کنید.' });
    }

    const targetUser = users.get(targetSocketId);
    if (!targetUser) {
      return callback({ error: 'کاربر آنلاین نیست.' });
    }

    // ساخت شناسه یکتا برای چت خصوصی
    const ids = [socket.userId, targetUser.userId].sort();  // مرتب‌سازی آی‌دی‌ها
    const dmRoomName = `dm_${ids[0]}_${ids[1]}`;

    // بررسی وجود اتاق
    let room = await Room.findOne({ name: dmRoomName });
    if (!room) {
      room = await Room.create({
        name: dmRoomName,
        createdBy: socket.userId,
        members: [socket.userId, targetUser.id],
        isPrivate: true,
      });
    }

    callback({
      success: true,
      roomName: dmRoomName,
      targetUsername: targetUser.username,
    });
  };
}