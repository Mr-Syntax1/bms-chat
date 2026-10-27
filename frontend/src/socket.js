// import { io } from 'socket.io-client';

// export const socket = io('http://localhost:3000', {
//   autoConnect: false, // به React اجازه می‌دیم کنترل کنه
//   transports: ['websocket'], // فقط از websocket استفاده کن (اختیاری)
// });


import { io } from 'socket.io-client';
export const socket = io('http://localhost:3000', { autoConnect: false });