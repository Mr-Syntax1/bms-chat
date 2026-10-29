import { Room } from '../../models/Room.js';
import { Message } from '../../models/Message.js';
import { User } from '../../models/User.js';
import { users } from '../../utils/users.js';

function generatePrivateRoomId(userId1, userId2) {
  const sorted = [userId1.toString(), userId2.toString()].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

export function handleOpenDirectMessage(socket, io) {
  return async function onOpenDirectMessage({ targetUserId }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    if (targetUserId === user.userId) {
      return callback?.({ error: 'نمی‌توانید با خودتان چت خصوصی کنید.' });
    }

    const targetUser = await User.findById(targetUserId).select('username').lean();
    if (!targetUser) return callback?.({ error: 'کاربر یافت نشد.' });

    const roomName = generatePrivateRoomId(user.userId, targetUserId);

    let room = await Room.findOne({ name: roomName });
    if (!room) {
      room = await Room.create({
        name: roomName,
        createdBy: user.userId,
        members: [user.userId, targetUserId],
        isPrivate: true
      });
    } else if (!room.members.some(m => m.toString() === user.userId)) {
      room.members.push(user.userId);
      await room.save();
    }

    // Leave current room
    for (const r of socket.rooms) {
      if (r !== socket.id) socket.leave(r);
    }

    socket.join(roomName);
    socket.currentRoom = roomName;

    // Fetch history
    const history = await Message.find({
      room: roomName,
      $or: [
        { deletedFor: { $ne: user.userId } },
        { isDeletedForEveryone: false }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    history.reverse();

    const formattedHistory = history.map((m) => ({
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

    callback({
      success: true,
      room: roomName,
      history: formattedHistory,
      targetUser: { id: targetUser._id.toString(), username: targetUser.username }
    });

    io.to(roomName).emit('room users', Array.from(io.sockets.adapter.rooms.get(roomName) || [])
      .map(sid => users.get(sid))
      .filter(Boolean));
  };
}