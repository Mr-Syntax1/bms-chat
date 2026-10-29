import { Message } from '../../models/Message.js';
import { Room } from '../../models/Room.js';
import { User } from '../../models/User.js';
import { users } from '../../utils/users.js';

export function handleJoin(socket, io, users) {
  return async function onJoin(payload, callback) {
    const username = socket.username;
    if (!username) return callback({ error: 'احراز هویت نشده.' });

    if (users.findByUsername(username)) {
      return callback({ error: 'این نام کاربری قبلاً وارد شده است.' });
    }

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

    const rooms = await getRoomsForUser(socket, io, users);

    callback({
      success: true,
      user,
      history: history.map(formatMsg),
      rooms,
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

export async function getRoomsForUser(socket, io, users) {
  const rooms = await Room.find({
    $or: [{ members: socket.userId }, { isPrivate: true, members: socket.userId }]
  }).lean();

  const roomList = await Promise.all(rooms.map(async (r) => {
    const isMember = r.members?.some((m) => m.toString() === socket.userId);
    const result = {
      id: r._id.toString(),
      name: r.name,
      createdBy: r.createdBy.toString(),
      isMember: isMember,
      isPrivate: r.isPrivate,
    };

    if (r.isPrivate) {
      const otherMemberId = r.members?.find((m) => m.toString() !== socket.userId);
      let dmPartnerUsername = 'کاربر حذف شده';
      let dmPartnerAvatar = null;
      let dmPartnerId = null;

      if (otherMemberId) {
        const otherUser = await User.findById(otherMemberId).select('username').lean();
        if (otherUser) {
          dmPartnerUsername = otherUser.username;
        }
        const onlinePartner = users.findByUserId(otherMemberId.toString());
        if (onlinePartner) {
          dmPartnerAvatar = onlinePartner.avatarColor;
          dmPartnerId = onlinePartner.id;
        }
      }

      result.dmPartnerUsername = dmPartnerUsername;
      result.dmPartnerAvatar = dmPartnerAvatar;
      result.dmPartnerId = dmPartnerId;
    }

    return result;
  }));

  return roomList;
}