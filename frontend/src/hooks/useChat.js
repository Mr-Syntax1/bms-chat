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
      console.log('📥 Received:', msg.type, '| Room:', msg.room, '| Current:', currentRoom);

      if (!msg.room || msg.room === currentRoom) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
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
    const onRoomCreated = (room) => setRooms((prev) => {
      if (prev.some(r => r.id === room.id || r.name === room.name)) return prev;
      return [...prev, room];
    });
    const onRoomRemoved = ({ roomName }) => setRooms((prev) => prev.filter((r) => r.name !== roomName));
    const onRoomDeleted = ({ roomName }) => {
      if (currentRoom === roomName) {
        setCurrentRoom('general');
      }
      setRooms((prev) => prev.filter((r) => r.name !== roomName));
    };
    const onMessageDeleted = ({ messageId, deleteForEveryone }) => {
      if (deleteForEveryone) {
        // Remove message for everyone
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else {
        // Mark message as deleted for current user (handled by server not sending it)
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    };

    socket.on('chat message', onChatMessage);
    socket.on('system message', onSystemMessage);
    socket.on('online users', onOnlineUsers);
    socket.on('typing', onTyping);
    socket.on('room created', onRoomCreated);
    socket.on('room removed', onRoomRemoved);
    socket.on('room deleted', onRoomDeleted);
    socket.on('message deleted', onMessageDeleted);

    return () => {
      socket.off('chat message', onChatMessage);
      socket.off('system message', onSystemMessage);
      socket.off('online users', onOnlineUsers);
      socket.off('typing', onTyping);
      socket.off('room created', onRoomCreated);
      socket.off('room removed', onRoomRemoved);
      socket.off('room deleted', onRoomDeleted);
      socket.off('message deleted', onMessageDeleted);
    };
  }, [currentRoom]);

  const connectSocket = useCallback(() => {
    return new Promise((resolve) => {
      if (socket.connected) {
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

  const sendMessage = (payload) => socket.emit('chat message', typeof payload === 'string' ? { text: payload } : payload);
  const setTyping = (isTyping) => socket.emit('typing', isTyping);

  const createRoom = (name) => {
    return new Promise((resolve) => {
      socket.emit('create room', { name }, (res) => resolve(res));
    });
  };

  const searchRooms = (query) => {
    return new Promise((resolve) => {
      socket.emit('search rooms', { query }, (res) => resolve(res));
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

const openDM = (targetUserId, targetUsername) => {
  return new Promise((resolve) => {
    socket.emit('start dm', { targetUserId }, (res) => {
      if (res.error) return resolve(res);
      setMessages(res.history);
      setCurrentRoom(res.roomName);
      setTypingUsers([]);
      resolve({ ...res, targetUsername });
    });
  });
};
  const deleteRoom = (roomName) => {
    return new Promise((resolve) => {
      socket.emit('delete room', { roomName }, (res) => resolve(res));
    });
  };

  const leaveRoom = (roomName) => {
    return new Promise((resolve) => {
      socket.emit('leave room', { roomName: roomName || currentRoom }, (res) => {
        if (res.success && (!roomName || roomName === currentRoom)) {
          switchRoom('general');
        }
        resolve(res);
      });
    });
  };

  const deleteMessage = (messageId, deleteForEveryone) => {
    return new Promise((resolve) => {
      socket.emit('delete message', { messageId, deleteForEveryone }, (res) => resolve(res));
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
    searchRooms,
    switchRoom,
    openDM,
    leaveRoom,
    deleteRoom,
    deleteMessage,
    logout: disconnectSocket,
  };
}