import { Room } from '../../models/Room.js';
import { Message } from '../../models/Message.js';
import { users } from '../../utils/users.js';

export function getRoomUsers(io, roomName, users) {
  const room = io.sockets.adapter.rooms.get(roomName);
  if (!room) return [];
  return Array.from(room)
    .map((socketId) => users.get(socketId))
    .filter(Boolean);
}

export function handleListRooms(socket, io) {
  return async function onListRooms(callback) {
    const rooms = await Room.find({ isPrivate: false }).sort({ createdAt: 1 }).lean();
    callback({ rooms: rooms.map((r) => ({ id: r._id.toString(), name: r.name, createdBy: r.createdBy.toString() })) });
  };
}

export function handleSearchRooms(socket, io) {
  return async function onSearchRooms({ query }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const trimmed = query?.trim();
    if (!trimmed || trimmed.length < 1) return callback({ rooms: [] });

    const rooms = await Room.find({
      isPrivate: false,
      $text: { $search: trimmed }
    }).sort({ score: { $meta: 'textScore' } }).limit(20).lean();

    callback({
      rooms: rooms.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        createdBy: r.createdBy.toString(),
        isMember: r.members?.some(m => m.toString() === socket.userId)
      }))
    });
  };
}

export function handleCreateRoom(socket, io, users) {
  return async function onCreateRoom({ name }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const trimmed = name?.trim();
    if (!trimmed || trimmed.length < 2) return callback({ error: 'نام اتاق حداقل ۲ کاراکتر است.' });
    if (trimmed.length > 30) return callback({ error: 'نام اتاق حداکثر ۳۰ کاراکتر است.' });

    const exists = await Room.findOne({ name: trimmed });
    if (exists) return callback({ error: 'این اتاق قبلاً ساخته شده.' });

    const room = await Room.create({
      name: trimmed,
      createdBy: socket.userId,
      members: [socket.userId]
    });

    io.emit('room created', { id: room._id.toString(), name: room.name, createdBy: room.createdBy.toString() });
    callback({ success: true, room: { id: room._id.toString(), name: room.name, createdBy: room.createdBy.toString() } });
  };
}

export function handleJoinRoom(socket, io, users) {
  return async function onJoinRoom({ roomName }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const room = await Room.findOne({ name: roomName });
    if (!room) return callback({ error: 'اتاق پیدا نشد.' });

    if (room.isPrivate) {
      const isMember = room.members?.some(m => m.toString() === socket.userId);
      if (!isMember) return callback({ error: 'شما عضو این اتاق نیستید.' });
    }

    if (!room.members?.some(m => m.toString() === socket.userId)) {
      room.members.push(socket.userId);
      await room.save();
    }

    for (const r of socket.rooms) {
      if (r !== socket.id) socket.leave(r);
    }

    socket.join(roomName);
    socket.currentRoom = roomName;

    // 👈 اصلاح نهایی: استفاده از socket.userId در کوئری دیتابیس
    const history = await Message.find({
      room: roomName,
      $or: [
        { deletedFor: { $ne: socket.userId } }, 
        { isDeletedForEveryone: false }
      ]
    }).sort({ createdAt: -1 }).limit(100).lean();
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

    socket.to(roomName).emit('system message', { text: `${user.username} وارد اتاق شد.`, room: roomName });
    callback({ success: true, room: roomName, history: formattedHistory });
    io.to(roomName).emit('room users', getRoomUsers(io, roomName, users));
  };
}

export function handleLeaveRoom(socket, io, users) {
  return async function onLeaveRoom({ roomName }, callback) {
    if (!socket.currentRoom) return callback?.({ error: 'در هیچ اتاقی نیستی.' });
    if (socket.currentRoom !== roomName) return callback?.({ error: 'در این اتاق نیستی.' });

    const leavingRoom = socket.currentRoom;
    const user = users.get(socket.id);

    socket.leave(leavingRoom);
    socket.currentRoom = null;

    const room = await Room.findOne({ name: leavingRoom });
    if (room && !room.isPrivate && room.createdBy.toString() !== socket.userId) {
      room.members = room.members.filter(m => m.toString() !== socket.userId);
      await room.save();
    }

    socket.to(leavingRoom).emit('system message', { text: `${user.username} اتاق را ترک کرد.`, room: leavingRoom });
    callback?.({ success: true });

    const roomSockets = io.sockets.adapter.rooms.get(leavingRoom);
    if (roomSockets) io.to(leavingRoom).emit('room users', getRoomUsers(io, leavingRoom, users));
  };
}

export function handleDeleteRoom(socket, io, users) {
  return async function onDeleteRoom({ roomName }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const room = await Room.findOne({ name: roomName });
    if (!room) return callback({ error: 'اتاق پیدا نشد.' });
    if (room.createdBy.toString() !== socket.userId) {
      return callback({ error: 'فقط سازنده می‌تونه اتاق رو حذف کنه.' });
    }

    const roomSockets = io.sockets.adapter.rooms.get(roomName);
    if (roomSockets) {
      for (const sid of roomSockets) {
        const s = io.sockets.sockets.get(sid);
        if (s) {
          s.leave(roomName);
          s.currentRoom = null;
          s.emit('room deleted', { roomName });
        }
      }
    }

    await Message.deleteMany({ room: roomName });
    await Room.deleteOne({ name: roomName });
    io.emit('room removed', { roomName });
    callback({ success: true });
  };
}

export function handleGetRoomInfo(socket, io, users) {
  return async function onGetRoomInfo({ roomName }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'ابتدا وارد شوید.' });

    const room = await Room.findOne({ name: roomName }).populate('createdBy', 'username').populate('members', 'username').lean();
    if (!room) return callback({ error: 'اتاق پیدا نشد.' });

    callback({
      success: true,
      room: {
        id: room._id.toString(),
        name: room.name,
        createdBy: room.createdBy._id.toString(),
        createdByUsername: room.createdBy.username,
        members: room.members.map(m => ({ id: m._id.toString(), username: m.username })),
        isPrivate: room.isPrivate
      }
    });
  };
}