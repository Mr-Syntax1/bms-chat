import express from 'express';
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/index.js';

dotenv.config();

const app = express();
const server = createServer(app);

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