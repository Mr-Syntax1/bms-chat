import { Room } from '../../models/Room.js';
import { Message } from '../../models/Message.js';
import { User } from '../../models/User.js';
import { users } from '../../utils/users.js';
import mongoose from 'mongoose';

export function handleOpenDM(socket, io, users) {
  return async function onOpenDM(payload, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const targetUserId = payload?.targetUserId;
    if (!targetUserId) return callback({ error: 'کاربر پیدا نشد.' });

    // The target may be an online socket id or a database user id.
    const onlineTarget = users.get(String(targetUserId)) || users.findByUserId(String(targetUserId));

    let targetDbId;
    let targetUsername;
    let isOnline = false;

    if (onlineTarget) {
      targetDbId = onlineTarget.userId.toString();
      targetUsername = onlineTarget.username;
      isOnline = true;
    } else {
      if (!mongoose.isValidObjectId(String(targetUserId))) {
        return callback({ error: 'کاربر پیدا نشد.' });
      }
      const dbUser = await User.findById(targetUserId).select('username').lean();
      if (!dbUser) return callback({ error: 'کاربر پیدا نشد.' });
      targetDbId = dbUser._id.toString();
      targetUsername = dbUser.username;
    }

    if (targetDbId === socket.userId) {
      return callback({ error: 'نمی‌توانید با خودتان چت کنید.' });
    }

    const ids = [socket.userId, targetDbId].sort();
    const dmRoomName = `dm_${ids[0]}_${ids[1]}`;

    let room = await Room.findOne({ name: dmRoomName });
    if (!room) {
      room = await Room.create({
        name: dmRoomName,
        createdBy: socket.userId,
        members: [socket.userId, targetDbId],
        isPrivate: true,
      });
    } else {
      // Re-adding members supports opening a DM again after one side removed it.
      let changed = false;
      for (const id of [socket.userId, targetDbId]) {
        if (!room.members.some((m) => m.toString() === id)) {
          room.members.push(id);
          changed = true;
        }
      }
      if (changed) await room.save();
    }

    // Leave previous room and join DM room
    for (const r of socket.rooms) {
      if (r !== socket.id) socket.leave(r);
    }
    socket.join(dmRoomName);
    socket.currentRoom = dmRoomName;

    const history = await Message.find({
      room: dmRoomName,
      isDeletedForEveryone: { $ne: true },
      deletedFor: { $ne: socket.userId },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    history.reverse();

    callback({
      success: true,
      room: dmRoomName,
      history: history.map((m) => ({
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
      })),
      targetUser: { id: targetDbId, username: targetUsername, isOnline },
    });
  };
}
