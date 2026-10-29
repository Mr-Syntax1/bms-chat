import { Message } from '../../models/Message.js';
import { Room } from '../../models/Room.js';

export function handleJoin(socket, io, users) {
  return async function onJoin(payload, callback) {
    // Assuming JWT middleware already set socket.userId and socket.username
    const username = socket.username;
    if (!username) return callback({ error: 'احراز هویت نشده.' });

    if (users.findByUsername(username)) {
      return callback({ error: 'این نام کاربری قبلاً وارد شده است.' });
    }

    // 👈 PASS socket.userId AS THIRD ARGUMENT
    const user = users.add(socket.id, username, socket.userId);
    socket.currentRoom = 'general';

    let general = await Room.findOne({ name: 'general' });
    if (!general) {
      general = await Room.create({ name: 'general', createdBy: socket.userId, members: [socket.userId] });
    } else if (!general.members.includes(socket.userId)) {
      general.members.push(socket.userId);
      await general.save();
    }
    socket.join('general');

    const history = await Message.find({ room: 'general' }).sort({ createdAt: -1 }).limit(100).lean();
    history.reverse();

    const rooms = await Room.find({ isPrivate: false }).lean();

    callback({
      success: true,
      user,
      history: history.map(formatMsg),
      rooms: rooms.map(r => ({ id: r._id.toString(), name: r.name, createdBy: r.createdBy.toString() })),
      currentRoom: 'general',
    });

    io.emit('online users', users.getAll());
  };
}

function formatMsg(m) {
  return {
    id: m._id.toString(), text: m.text, sender: m.sender, senderId: m.senderId?.toString(),
    avatarColor: m.avatarColor, type: m.type, fileUrl: m.fileUrl, fileName: m.fileName,
    fileType: m.fileType, createdAt: m.createdAt,
    time: new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
  };
}
