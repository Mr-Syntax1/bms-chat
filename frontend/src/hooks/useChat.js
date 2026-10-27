import { useEffect, useState, useCallback, useRef } from 'react';
import { socket } from '../socket';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const connectListenerRef = useRef(null);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

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
    const onRoomRemoved = ({ roomName }) => setRooms((prev) => prev.filter((r) => r.name !== roomName));
    const onRoomDeleted = ({ roomName }) => {
      if (currentRoom === roomName) {
        setCurrentRoom('general');
      }
      setRooms((prev) => prev.filter((r) => r.name !== roomName));
    };

    socket.on('chat message', onChatMessage);
    socket.on('system message', onSystemMessage);
    socket.on('online users', onOnlineUsers);
    socket.on('typing', onTyping);
    socket.on('room created', onRoomCreated);
    socket.on('room removed', onRoomRemoved);
    socket.on('room deleted', onRoomDeleted);

    return () => {
      socket.off('chat message', onChatMessage);
      socket.off('system message', onSystemMessage);
      socket.off('online users', onOnlineUsers);
      socket.off('typing', onTyping);
      socket.off('room created', onRoomCreated);
      socket.off('room removed', onRoomRemoved);
      socket.off('room deleted', onRoomDeleted);
    };
  }, [currentRoom]);

  const connectSocket = useCallback(() => {
    return new Promise((resolve) => {
      if (socket.connected) {
        // اگه قبلاً وصله، مستقیم join کن
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
          resolve();
        });
        return;
      }

      const onConnect = () => {
        socket.off('connect', onConnect);
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
          resolve();
        });
      };
      connectListenerRef.current = onConnect;
      socket.on('connect', onConnect);
      socket.connect();
    });
  }, []);

  const disconnectSocket = useCallback(() => {
    if (connectListenerRef.current) {
      socket.off('connect', connectListenerRef.current);
      connectListenerRef.current = null;
    }
    socket.disconnect();
    setMessages([]);
    setRooms([]);
    setCurrentRoom('general');
    setOnlineUsers([]);
    setConnected(false);
  }, []);

  const sendMessage = (text) => socket.emit('chat message', { text });
  const setTyping = (isTyping) => socket.emit('typing', isTyping);

  const createRoom = (name) => {
    return new Promise((resolve) => {
      socket.emit('create room', { name }, (res) => resolve(res));
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
      socket.emit('delete room', { roomName }, (res) => resolve(res));
    });
  };

  const leaveRoom = () => {
    if (!currentRoom) return;
    socket.emit('leave room', { roomName: currentRoom }, (res) => {
      if (res.success) {
        switchRoom('general');
      }
    });
  };

  return {
    messages,
    onlineUsers,
    typingUsers,
    rooms,
    currentRoom,
    error,
    connected,
    connectSocket,
    disconnectSocket,
    sendMessage,
    setTyping,
    createRoom,
    switchRoom,
    leaveRoom,
    deleteRoom,
    logout: disconnectSocket,
  };
}