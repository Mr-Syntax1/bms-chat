// import { io } from 'socket.io-client';
// export const socket = io('http://localhost:3000', { autoConnect: false });

import { io } from 'socket.io-client';

const token = localStorage.getItem('token');

export const socket = io('http://localhost:3000', {
  autoConnect: false,
  auth: { token }, // ← توکن رو با handshake بفرست
});