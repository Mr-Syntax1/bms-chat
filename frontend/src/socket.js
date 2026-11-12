import { io } from 'socket.io-client';

export const socket = io('https://ebxh6cw8k0fy-production-ie00nenq.us-central1.suga.run', {
  autoConnect: false,
  withCredentials: true,
});

export function setSocketToken(token) {
  socket.auth = { token };
}