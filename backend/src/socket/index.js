import { Server } from 'socket.io';
import { users } from '../utils/users.js';
import { handleJoin } from './handlers/users.js';
import { handleChat } from './handlers/chat.js';
import { handleTyping } from './handlers/typing.js';
import { Message } from '../models/Message.js';
import { getPersianTime } from '../utils/messages.js';

export function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log('🟢 connected:', socket.id);

    socket.on('join', handleJoin(socket, io, users));
    socket.on('chat message', handleChat(socket, io, users));
    socket.on('typing', handleTyping(socket, io, users));

    socket.on('disconnect', async () => {
      const user = users.remove(socket.id);
      if (user) {
        const sysMsg = await Message.create({
          text: `${user.username} گروه را ترک کرد.`,
          sender: 'system',
          type: 'system',
        });

        const sysMsgForBroadcast = {
          id: sysMsg._id.toString(),
          text: sysMsg.text,
          sender: sysMsg.sender,
          type: sysMsg.type,
          time: getPersianTime(),
        };

        io.emit('user left', { user, message: sysMsgForBroadcast, onlineUsers: users.getAll() });
        io.emit('online users', users.getAll());
      }
      console.log('🔴 disconnected:', socket.id);
    });
  });

  return io;
}