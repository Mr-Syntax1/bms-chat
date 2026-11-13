import { Server } from 'socket.io';
import { users } from '../utils/users.js';
import { handleJoin } from './handlers/users.js';
import {
  handleChat,
  handleDeleteMessage,
  handleGetMessages,
  handleEditMessage,
  handleGetNotifications,
  handleMarkNotificationsAsRead,
} from './handlers/chat.js';
import { handleTyping } from './handlers/typing.js';
import {
  handleListRooms,
  handleSearchRooms,
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  handleDeleteRoom,
  handleGetRoomInfo,
} from './handlers/rooms.js';
import { handleOpenDM } from './handlers/direct.js';
import {
  handleWebRTCOffer,        
  handleWebRTCAnswer,
  handleWebRTCIceCandidate,
  handleWebRTCHangup,
  handleWebRTCStreamUpdated,
  handleWebRTCScreenLock,   
  handleWebRTCScreenUnlock, 
} from './handlers/webrtc.js';
import { verifyToken } from '../utils/jwt.js';

const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5001';

function getSocketToken(socket) {
  if (socket.handshake.auth?.token) return socket.handshake.auth.token;
  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const idx = c.indexOf('=');
      if (idx === -1) return [c.trim(), ''];
      const k = c.slice(0, idx).trim();
      const v = decodeURIComponent(c.slice(idx + 1).trim());
      return [k, v];
    })
  );
  return cookies.token || null;
}

export function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['polling', 'websocket'],
  });

  // احراز هویت
  io.use((socket, next) => {
    const token = getSocketToken(socket);
    if (!token) return next(new Error('Authentication error: No token provided'));

    const decoded = verifyToken(token);
    if (!decoded) return next(new Error('Authentication error: Invalid token'));

    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  });

  io.on('connection', (socket) => {
    console.log('🟢 connected:', socket.id);

    // کاربر به اتاق شخصی خودش (socket.id) join می‌شه
    socket.join(socket.id);

    // --- رویدادهای چت ---
    socket.on('join', handleJoin(socket, io, users));
    socket.on('chat message', handleChat(socket, io, users));
    socket.on('delete message', handleDeleteMessage(socket, io, users));
    socket.on('get messages', handleGetMessages(socket, io, users));
    socket.on('typing', handleTyping(socket, io, users));
    socket.on('list rooms', handleListRooms(socket, io));
    socket.on('search rooms', handleSearchRooms(socket, io));
    socket.on('create room', handleCreateRoom(socket, io, users));
    socket.on('join room', handleJoinRoom(socket, io, users));
    socket.on('leave room', handleLeaveRoom(socket, io, users));
    socket.on('delete room', handleDeleteRoom(socket, io, users));
    socket.on('get room info', handleGetRoomInfo(socket, io, users));
    socket.on('open dm', handleOpenDM(socket, io, users));
    socket.on('edit message', handleEditMessage(socket, io, users));
    socket.on('get notifications', handleGetNotifications(socket, io, users));
    socket.on('mark notifications as read', handleMarkNotificationsAsRead(socket, io, users));

    // ============================================================
    // --- رویدادهای WebRTC (استفاده از هندلرهای ماژولار) ---
    // ============================================================
    socket.on('webrtc-offer', handleWebRTCOffer(socket, io));
    socket.on('webrtc-answer', handleWebRTCAnswer(socket, io));
    socket.on('webrtc-ice-candidate', handleWebRTCIceCandidate(socket, io));
    socket.on('webrtc-hangup', handleWebRTCHangup(socket, io));
    socket.on('webrtc-stream-updated', handleWebRTCStreamUpdated(socket, io));
    socket.on('webrtc-screen-lock', handleWebRTCScreenLock(socket, io));
    socket.on('webrtc-screen-unlock', handleWebRTCScreenUnlock(socket, io));

    // --- قطع اتصال ---
    socket.on('disconnect', async () => {
      const user = users.remove(socket.id);
      if (user) {
        io.emit('online users', users.getAll());
      }
      console.log('🔴 disconnected:', socket.id);
    });
  });

  return io;
}