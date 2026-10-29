import { Server } from 'socket.io';
import { users } from '../utils/users.js';
import { handleJoin } from './handlers/users.js';
import { handleChat, handleDeleteMessage, handleGetMessages } from './handlers/chat.js';
import { handleTyping } from './handlers/typing.js';
import {
  handleListRooms,
  handleSearchRooms,
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  handleDeleteRoom,
  handleGetRoomInfo,
  getRoomUsers,
} from './handlers/rooms.js';
import { handleOpenDirectMessage } from './handlers/direct.js';
import { verifyToken } from '../utils/jwt.js';

function getSocketToken(socket) {
  if (socket.handshake.auth?.token) return socket.handshake.auth.token;
  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) {
    console.log('[Socket Auth] No cookie header');
    return null;
  }
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const idx = c.indexOf('=');
      if (idx === -1) return [c.trim(), ''];
      const k = c.slice(0, idx).trim();
      const v = decodeURIComponent(c.slice(idx + 1).trim());
      return [k, v];
    })
  );
  const token = cookies.token || null;
  console.log('[Socket Auth] Token from cookie:', token ? 'FOUND' : 'NOT FOUND');
  return token;
}

export function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'], credentials: true },
  });

  io.use((socket, next) => {
    const token = getSocketToken(socket);
    if (!token) {
      console.log('[Socket Auth] REJECT: No token');
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('[Socket Auth] REJECT: Invalid token');
      return next(new Error('Authentication error: Invalid token'));
    }

    console.log('[Socket Auth] ACCEPT:', decoded.username);
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  });


  io.on('connection', (socket) => {
    console.log('🟢 connected:', socket.id);

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
    socket.on('open dm', handleOpenDirectMessage(socket, io));

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