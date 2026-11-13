import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  pingInterval: 10000, // //  هماهنگ با سرور
  pingTimeout: 5000,         //  هماهنگ با سرور
  // اجازه بده Socket.IO خودش:
  // polling → websocket upgrade
  // 'polling', 
  transports: ['websocket'],
});

export function setSocketToken(token) {
  socket.auth = { token };
}