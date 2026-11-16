import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import { apinatorRouter } from './routes/apinator.js';
// Routes
import { authRouter } from './routes/auth.js';
import { uploadRouter } from './routes/upload.js';
import { roomsRouter } from './routes/rooms.js';
import { messagesRouter } from './routes/messages.js';
import { notificationsRouter } from './routes/notifications.js';
import { callsRouter } from './routes/calls.js';


dotenv.config();

const app = express();

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../../frontend/dist');

// Trust the reverse proxy (Vercel/Suga) so secure cookies are set correctly
app.set('trust proxy', 1);


app.use(cors({
  origin: ['https://bms-chat.vercel.app', 'http://localhost:5001', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/auth', authRouter);
app.use('/upload', uploadRouter);
app.use('/api/calls', callsRouter);
app.use('/api/apinator', apinatorRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/notifications', notificationsRouter);

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
  await connectDB();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start();