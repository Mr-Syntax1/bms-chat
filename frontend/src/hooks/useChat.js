import { useEffect, useState } from 'react';
import { socket } from '../socket';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onChatMessage = (msg) => {
      if (msg.room === currentRoom) setMessages((prev) => [...prev, msg]);
    };
    const onSystemMessage = ({ text, room }) => {
      if (room === currentRoom) {
        setMessages((prev) => [
          ...prev,
          { id: `sys-${Date.now()}`, text, sender: 'system', type: 'system', time: '' },
        ]);
      }
    };
    const onOnlineUsers = (users) => setOnlineUsers(users);
    const onTyping = ({ username, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) return prev.includes(username) ? prev : [...prev, username];
        return prev.filter((u) => u !== username);
      });
    };
    const onRoomCreated = (room) => setRooms((prev) => [...prev, room]);

    socket.on('chat message', onChatMessage);
    socket.on('system message', onSystemMessage);
    socket.on('online users', onOnlineUsers);
    socket.on('typing', onTyping);
    socket.on('room created', onRoomCreated);

    return () => {
      socket.off('chat message', onChatMessage);
      socket.off('system message', onSystemMessage);
      socket.off('online users', onOnlineUsers);
      socket.off('typing', onTyping);
      socket.off('room created', onRoomCreated);
    };
  }, [currentRoom]);

  // تابع ورود (بعد از گرفتن توکن از API)
  const login = (userData) => {
    setUser(userData);
    
    // توکن رو به سوکت پاس میدیم (توی socket.js هم ست شده، ولی برای اطمینان)
    socket.auth = { token: localStorage.getItem('token') };
    socket.connect();

    // از سرور می‌خوایم کاربر رو وارد اتاق general کنه
    socket.emit('join', {}, (res) => {
      if (res.error) {
        setError(res.error);
        socket.disconnect();
      } else {
        setMessages(res.history);
        setRooms(res.rooms || []);
        setCurrentRoom(res.currentRoom || 'general');
        setError(null);
      }
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    socket.disconnect();
    setUser(null);
  };

  const sendMessage = (text) => socket.emit('chat message', { text });
  const setTyping = (isTyping) => socket.emit('typing', isTyping);

  const createRoom = (name) => {
    return new Promise((resolve) => {
      socket.emit('create room', { name }, (res) => {
        resolve(res);
      });
    });
  };

  const switchRoom = (roomName) => {
    return new Promise((resolve) => {
      socket.emit('join room', { roomName }, (res) => {
        if (res.error) return resolve(res);
        setMessages(res.history);
        setCurrentRoom(res.room);
        setTypingUsers([]);
        resolve(res);
      });
    });
  };

    const deleteRoom = (roomName) => {
    return new Promise((resolve) => {
      socket.emit('delete room', { roomName }, (res) => {
        if (res.success) {
          // اگر اتاقی که حذف شد، اتاق فعلی بود، برگرد به general
          if (currentRoom === roomName) {
            switchRoom('general');
          }
          // اتاق رو از لیست حذف کن
          setRooms((prev) => prev.filter(r => r.name !== roomName));
        }
        resolve(res);
      });
    });
  };

    const leaveRoom = () => {
    if (!currentRoom) return;
    socket.emit('leave room', { roomName: currentRoom }, (res) => {
      if (res.success) {
        switchRoom('general'); // برگرد به اتاق پیش‌فرض
      }
    });
  };

  return {
    messages, onlineUsers, typingUsers, rooms, currentRoom,
    user, error, login, logout, sendMessage, setTyping, createRoom, switchRoom,leaveRoom,deleteRoom,
  };
}