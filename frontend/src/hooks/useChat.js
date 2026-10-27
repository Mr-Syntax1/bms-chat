import { useEffect, useState } from 'react';
import { socket } from '../socket';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onChatMessage = (msg) => setMessages((prev) => [...prev, msg]);
    
    const onUserJoined = ({ message, onlineUsers }) => {
      if (message) setMessages((prev) => [...prev, message]);
      setOnlineUsers(onlineUsers);
    };

    const onUserLeft = ({ message, onlineUsers }) => {
      if (message) setMessages((prev) => [...prev, message]);
      setOnlineUsers(onlineUsers);
    };

    const onOnlineUsers = (users) => setOnlineUsers(users);

    const onTyping = ({ username, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) return prev.includes(username) ? prev : [...prev, username];
        return prev.filter((u) => u !== username);
      });
    };

    socket.on('chat message', onChatMessage);
    socket.on('user joined', onUserJoined);
    socket.on('user left', onUserLeft);
    socket.on('online users', onOnlineUsers);
    socket.on('typing', onTyping);

    return () => {
      socket.off('chat message', onChatMessage);
      socket.off('user joined', onUserJoined);
      socket.off('user left', onUserLeft);
      socket.off('online users', onOnlineUsers);
      socket.off('typing', onTyping);
    };
  }, []);

  const join = (username) => {
    return new Promise((resolve) => {
      socket.connect();
      socket.emit('join', { username }, (response) => {
        if (response.error) {
          setError(response.error);
          socket.disconnect();
          resolve({ ok: false, error: response.error });
        } else {
          setUser(response.user);
          setMessages(response.history);
          setError(null);
          resolve({ ok: true });
        }
      });
    });
  };

  const sendMessage = (text) => socket.emit('chat message', { text });
  const setTyping = (isTyping) => socket.emit('typing', isTyping);

  return { messages, onlineUsers, typingUsers, user, error, join, sendMessage, setTyping };
}