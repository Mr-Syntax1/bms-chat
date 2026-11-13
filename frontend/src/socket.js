import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  pingInterval: 25000,       //  هماهنگ با سرور
  pingTimeout: 60000,        //  هماهنگ با سرور
  // اجازه بده Socket.IO خودش:
  // polling → websocket upgrade
  transports: ['polling'],
});

export function setSocketToken(token) {
  socket.auth = { token };
}