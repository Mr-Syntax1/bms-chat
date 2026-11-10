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

    // 👈 هیچ اتاقی به صورت خودکار باز نمی‌شود
    socket.currentRoom = null;

    // دریافت لیست اتاق‌هایی که کاربر در آن‌ها عضو است
    const rooms = await getRoomsForUser(socket, io, users);

    // ارسال پاسخ به فرانت‌اند با تاریخچه خالی و اتاق فعلی null
    callback({
      success: true,
      user,
      history: [],
      rooms,
      currentRoom: null,
    });

    // اطلاع‌رسانی به همه که لیست آنلاین‌ها تغییر کرد
    io.emit('online users', users.getAll());
  };
}

// این تابع برای فرمت‌دهی پیام‌هاست (اگر جایی استفاده می‌شود)
function formatMsg(m) {
  return {
    id: m._id.toString(), text: m.text, sender: m.sender, senderId: m.senderId?.toString(),
    fileType: m.fileType, createdAt: m.createdAt,
    time: new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
  };
}

// این تابع لیست اتاق‌های یک کاربر خاص را برمی‌گرداند
export async function getRoomsForUser(socket, io, users) {
  const rooms = await Room.find({
    $or: [{ members: socket.userId }, { isPrivate: true, members: socket.userId }]
  }).lean();

  const roomList = await Promise.all(rooms.map(async (r) => {
    const isMember = r.members?.some((m) => m.toString() === socket.userId);
    const result = {
      id: r._id.toString(),
      name: r.name,
      createdBy: r.createdBy?.toString(), // برای اطمینان از وجود مقدار
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
      // result.dmPartnerId = dmPartnerId;
      result.dmPartnerId = otherMemberId.toString();
    }

    return result;
  }));

  return roomList;
}