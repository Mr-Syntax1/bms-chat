import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/index.js';
import { authRouter } from './routes/auth.js';

dotenv.config();

const app = express();
const server = createServer(app);

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRouter)

app.get('/', (req, res) => res.json({ status: 'ok' }));

async function start() {
  await connectDB(); // اول دیتابیس
  initSocket(server); // بعد Socket
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🚀 server on http://localhost:${PORT}`);
  });
}

start();