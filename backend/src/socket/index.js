import { Server } from 'socket.io';
import { users } from '../utils/users.js';
import { handleJoin, handleDeleteRoom } from './handlers/users.js';
import { handleChat } from './handlers/chat.js';
import { handleTyping } from './handlers/typing.js';
import {
  handleListRooms,
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  getRoomUsers,
} from './handlers/rooms.js';
import { verifyToken } from '../utils/jwt.js';

export function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid token'));
    }

    // اطلاعات کاربر رو به سوکت بچسبون
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  });



  io.on('connection', (socket) => {
    console.log('🟢 connected:', socket.id);

    socket.on('join', handleJoin(socket, io, users));
    socket.on('chat message', handleChat(socket, io, users));
    socket.on('typing', handleTyping(socket, io, users));
    socket.on('list rooms', handleListRooms(socket, io));
    socket.on('create room', handleCreateRoom(socket, io, users));
    socket.on('join room', handleJoinRoom(socket, io, users));
    socket.on('leave room', handleLeaveRoom(socket, io));
    socket.on('delete room', handleDeleteRoom(socket, io));

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