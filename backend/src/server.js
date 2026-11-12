import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/index.js';
// Routes
import { authRouter } from './routes/auth.js';
import { uploadRouter } from './routes/upload.js';
// import roomsRouter from './routes/rooms.js';


dotenv.config();

const app = express();
const server = createServer(app);

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../../frontend/dist');

app.use(cors({
  origin: 'https://bms-chat.vercel.app',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use('https://ebxh6cw8k0fy-production-ie00nenq.us-central1.suga.run/auth', authRouter)
app.use('https://ebxh6cw8k0fy-production-ie00nenq.us-central1.suga.run/upload', uploadRouter);
// app.use('/api/rooms', roomsRouter);

// Serve static files from frontend/dist
app.use(express.static(distPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path.startsWith('/upload') || req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});


async function start() {
  await connectDB(); // اول دیتابیس
  initSocket(server); // بعد Socket
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🚀 server on http://localhost:${PORT}`);
  });
}

start();