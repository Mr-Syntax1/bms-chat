import { Room } from '../../models/Room.js';
import { Message } from '../../models/Message.js';
import { users } from '../../utils/users.js';

export function handleOpenDM(socket, io, users) {
  return async function onOpenDM({ targetUserId }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    // targetUserId here is the socket.id of the online user
    if (targetUserId === socket.id) {
      return callback({ error: 'نمی‌توانید با خودتان چت کنید.' });
    }

    const targetUser = users.get(targetUserId);
    if (!targetUser) return callback({ error: 'کاربر آنلاین نیست.' });

    // 👈 USE userId FOR DATABASE QUERIES
    const ids = [socket.userId, targetUser.userId].sort();
    const dmRoomName = `dm_${ids[0]}_${ids[1]}`;

    let room = await Room.findOne({ name: dmRoomName });
    if (!room) {
      room = await Room.create({
        name: dmRoomName,
        createdBy: socket.userId,
        members: [socket.userId, targetUser.userId], // 👈 Use userId
        isPrivate: true,
      });
    }

    // Leave previous room and join DM room
    for (const r of socket.rooms) {
      if (r !== socket.id) socket.leave(r);
    }
    socket.join(dmRoomName);
    socket.currentRoom = dmRoomName;

    const history = await Message.find({ room: dmRoomName }).sort({ createdAt: -1 }).limit(100).lean();
    history.reverse();

    callback({
      success: true,
      room: dmRoomName, // 👈 MUST BE 'room' TO MATCH FRONTEND
      history: history.map(m => ({
        id: m._id.toString(), text: m.text, sender: m.sender, senderId: m.senderId?.toString(),
        avatarColor: m.avatarColor, type: m.type, fileUrl: m.fileUrl, fileName: m.fileName,
        fileType: m.fileType, createdAt: m.createdAt,
        time: new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      })),
      targetUser: { username: targetUser.username }
    });
  };
}
