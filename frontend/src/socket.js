// src/socket.js
import { io } from 'socket.io-client';

// آدرس بک‌اند خود را وارد کنید
const URL = 'http://localhost:3000';

export const socket = io(URL, {
  autoConnect: false // می‌توانید ابتدا اتصال خودکار را غیرفعال کنید و در جای مناسب دستی connect کنید
});