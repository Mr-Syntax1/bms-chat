import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';


const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // آدرس فرانت‌اند Vite
    methods: ["GET", "POST"]
  }
});


const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(join(__dirname, '../frontend')));
// برای css

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, '../frontend/index.html'));
});

io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);

  socket.on('chat message', (data) => {
    // data = { text, sender }
    const message = {
      id: crypto.randomUUID(), // شناسه یکتا
      text: data.text,
      sender: data.sender,
      time: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    io.emit('chat message', message); // به همه بفرست
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected:', socket.id);
  });
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000 🎉');
});