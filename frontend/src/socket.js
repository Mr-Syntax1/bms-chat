import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true, // required so the auth cookie is sent
  transports: ['polling'],  // force websocket in production
});

export function setSocketToken(token) {
  socket.auth = { token };
}