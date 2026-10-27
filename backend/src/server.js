import express from 'express';
import { createServer } from 'node:http';
import { initSocket } from './socket/index.js';

const app = express();
const server = createServer(app);

app.get('/', (req, res) => res.json({ status: 'ok' }));

initSocket(server);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 server on http://localhost:${PORT}`);
});