import { Server } from 'socket.io';
import { users } from '../utils/users.js';
import { messageStore } from '../utils/messages.js';
import { handleJoin } from './handlers/users.js';
import { handleChat } from './handlers/chat.js';
import { handleTyping } from './handlers/typing.js';

export function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('🟢 connected:', socket.id);

    socket.on('join', handleJoin(socket, io, users, messageStore));
    socket.on('chat message', handleChat(socket, io, users, messageStore));
    socket.on('typing', handleTyping(socket, io, users));

    socket.on('disconnect', () => {
      const user = users.remove(socket.id);
      if (user) {
        const sysMsg = messageStore.add({
          id: `sys-${Date.now()}`,
          text: `${user.username} گروه را ترک کرد.`,
          sender: 'system',
          type: 'system',
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        });
        io.emit('user left', { user, message: sysMsg, onlineUsers: users.getAll() });
        io.emit('online users', users.getAll());
      }
      console.log('🔴 disconnected:', socket.id);
    });
  });

  return io;
}