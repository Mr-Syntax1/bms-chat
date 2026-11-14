import { useEffect, useState, useCallback, useRef } from 'react';
import { sileo } from 'sileo';
import {
  apinator,
  subscribeToRoom,
  unsubscribeFromRoom,
  getRoomChannelName,
  bindEvent,
  unbindEvent,
  triggerClientEvent,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  getNotificationChannelName,
} from '../lib/apinator';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// متغیر برای نگهداری توکن در حافظه
let authToken = null;
export function setApiToken(token) {
  authToken = token;
}

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}), // اضافه شدن توکن
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dmPartnerName, setDmPartnerName] = useState(null);

  const currentRoomRef = useRef(currentRoom);
  const currentUserRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const presenceHandlersRef = useRef({});
  const messageHandlersRef = useRef({});
  const notificationHandlersRef = useRef({});
  const typingHandlersRef = useRef({});

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    apinator.bind('state_change', ({ previous, current }) => {
      console.log('[Apinator] state change:', previous, '->', current);
      if (current === 'connected') {
        setConnected(true);
      } else if (current === 'disconnected' || current === 'unavailable') {
        setConnected(false);
      }
    });

    apinator.bind('realtime:error', (err) => {
      console.error('[Apinator] realtime error:', err);
    });

    return () => {
      apinator.unbind('state_change');
      apinator.unbind('realtime:error');
    };
  }, []);

  const setupPresenceHandlers = useCallback((roomName) => {
    const channelName = getRoomChannelName(roomName);
    const channel = apinator.channel(channelName);

    if (!channel) return;

    const onMemberAdded = (member) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.id === member.user_id)) return prev;
        return [
          ...prev,
          {
            id: member.user_id,
            username: member.user_info?.name,
          },
        ];
      });
    };

    const onMemberRemoved = (member) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== member.user_id));
    };

    const onSubscriptionSucceeded = () => {
      if (typeof channel.getMembers === 'function') {
        const members = channel.getMembers();
        setOnlineUsers(
          members.map((m) => ({
            id: m.user_id,
            username: m.user_info?.name,
          }))
        );
      }
    };

    channel.bind('realtime:member_added', onMemberAdded);
    channel.bind('realtime:member_removed', onMemberRemoved);
    channel.bind('realtime:subscription_succeeded', onSubscriptionSucceeded);

    presenceHandlersRef.current[roomName] = {
      onMemberAdded,
      onMemberRemoved,
      onSubscriptionSucceeded,
    };
  }, []);

  const cleanupPresenceHandlers = useCallback((roomName) => {
    const handlers = presenceHandlersRef.current[roomName];
    if (handlers) {
      const channelName = getRoomChannelName(roomName);
      const channel = apinator.channel(channelName);
      if (channel) {
        channel.unbind('realtime:member_added', handlers.onMemberAdded);
        channel.unbind('realtime:member_removed', handlers.onMemberRemoved);
        channel.unbind('realtime:subscription_succeeded', handlers.onSubscriptionSucceeded);
      }
      delete presenceHandlersRef.current[roomName];
    }
  }, []);

  const setupMessageHandlers = useCallback((roomName) => {
    const channelName = getRoomChannelName(roomName);
    const channel = apinator.channel(channelName);

    if (!channel) return;

    const onNewMessage = (msg) => {
      if (!msg.room || msg.room === currentRoomRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const onSystemMessage = ({ text, room }) => {
      if (room === currentRoomRef.current) {
        setMessages((prev) => [
          ...prev,
          { id: `sys-${Date.now()}`, text, sender: 'system', type: 'system', time: '' },
        ]);
      }
    };

    const onMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const onMessageEdited = (editedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === editedMsg.id ? { ...m, ...editedMsg } : m))
      );
    };

    channel.bind('new-message', onNewMessage);
    channel.bind('system-message', onSystemMessage);
    channel.bind('message-deleted', onMessageDeleted);
    channel.bind('message-edited', onMessageEdited);

    messageHandlersRef.current[roomName] = {
      onNewMessage,
      onSystemMessage,
      onMessageDeleted,
      onMessageEdited,
    };
  }, []);

  const cleanupMessageHandlers = useCallback((roomName) => {
    const handlers = messageHandlersRef.current[roomName];
    if (handlers) {
      const channelName = getRoomChannelName(roomName);
      const channel = apinator.channel(channelName);
      if (channel) {
        channel.unbind('new-message', handlers.onNewMessage);
        channel.unbind('system-message', handlers.onSystemMessage);
        channel.unbind('message-deleted', handlers.onMessageDeleted);
        channel.unbind('message-edited', handlers.onMessageEdited);
      }
      delete messageHandlersRef.current[roomName];
    }
  }, []);

  const setupTypingHandlers = useCallback((roomName) => {
    const channelName = getRoomChannelName(roomName);
    const channel = apinator.channel(channelName);

    if (!channel) return;

    const onTyping = ({ username, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) return prev.includes(username) ? prev : [...prev, username];
        return prev.filter((u) => u !== username);
      });
    };

    channel.bind('client-typing', onTyping);
    typingHandlersRef.current[roomName] = { onTyping };
  }, []);

  const cleanupTypingHandlers = useCallback((roomName) => {
    const handlers = typingHandlersRef.current[roomName];
    if (handlers) {
      const channelName = getRoomChannelName(roomName);
      const channel = apinator.channel(channelName);
      if (channel) {
        channel.unbind('client-typing', handlers.onTyping);
      }
      delete typingHandlersRef.current[roomName];
    }
  }, []);

  const setupNotificationHandlers = useCallback(() => {
    const userId = currentUserRef.current?.id;
    if (!userId) return;

    const notificationChannel = getNotificationChannelName(userId);

    const onNewNotification = (notif) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);

      const isDm = notif.roomName?.startsWith('dm_');
      sileo.info({
        title: `پیام جدید از ${notif.senderName}`,
        description: isDm
          ? `پیام خصوصی: ${notif.messagePreview}`
          : `در اتاق ${notif.roomName}: ${notif.messagePreview}`,
        position: 'top-center',
        duration: 5000,
      });
    };

    try {
      subscribeToNotifications(userId);
    } catch (err) {
      console.warn('[Chat] Notification subscription error:', err);
    }
    const channel = apinator.channel(notificationChannel);
    if (channel) {
      channel.bind('new-notification', onNewNotification);
    }

    notificationHandlersRef.current = { onNewNotification, channel: notificationChannel };
  }, []);

  const cleanupNotificationHandlers = useCallback(() => {
    const handlers = notificationHandlersRef.current;
    if (handlers) {
      const channel = apinator.channel(handlers.channel);
      if (channel) {
        channel.unbind('new-notification', handlers.onNewNotification);
      }
      unsubscribeFromNotifications(currentUserRef.current?.id).catch(() => { });
      notificationHandlersRef.current = {};
    }
  }, []);

  const connectSocket = useCallback(async () => {
    try {
      setError(null);
      apinator.connect();

      const res = await apiRequest('/auth/me');
      if (res.user) {
        currentUserRef.current = res.user;
        setupNotificationHandlers();
      }

      const roomsRes = await apiRequest('/api/rooms/list');
      if (roomsRes.rooms) setRooms(roomsRes.rooms);

      setConnected(true);
      return { success: true };
    } catch (err) {
      console.error('[Chat] Connect error:', err);
      setError(err.message);
      setConnected(false);
      return { error: err.message };
    }
  }, [setupNotificationHandlers]);

  const disconnectSocket = useCallback(async () => {
    cleanupNotificationHandlers();

    for (const roomName of Object.keys(presenceHandlersRef.current)) {
      cleanupPresenceHandlers(roomName);
      cleanupMessageHandlers(roomName);
      cleanupTypingHandlers(roomName);
      await unsubscribeFromRoom(roomName).catch(() => { });
    }

    apinator.disconnect();
    setMessages([]);
    setRooms([]);
    setCurrentRoom(null);
    setOnlineUsers([]);
    setTypingUsers([]);
    setDmPartnerName(null);
    setConnected(false);
    currentUserRef.current = null;
  }, [cleanupNotificationHandlers, cleanupPresenceHandlers, cleanupMessageHandlers, cleanupTypingHandlers]);

  const switchRoom = useCallback(async (roomName) => {
    if (!roomName) {
      setCurrentRoom(null);
      setMessages([]);
      setTypingUsers([]);
      setDmPartnerName(null);
      return { success: true };
    }

    const prevRoom = currentRoomRef.current;
    if (prevRoom) {
      cleanupPresenceHandlers(prevRoom);
      cleanupMessageHandlers(prevRoom);
      cleanupTypingHandlers(prevRoom);
      await unsubscribeFromRoom(prevRoom).catch(() => { });
    }

    try {
      const res = await apiRequest('/api/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ roomName }),
      });

      if (res.error) return res;

      setMessages(res.history || []);
      setCurrentRoom(res.room);
      setTypingUsers([]);

      if (!roomName.startsWith('dm_')) {
        setDmPartnerName(null);
      }

      await subscribeToRoom(roomName);
      setupPresenceHandlers(roomName);
      setupMessageHandlers(roomName);
      setupTypingHandlers(roomName);

      const markRes = await apiRequest('/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ roomName: res.room }),
      });
      if (markRes.success) {
        setUnreadCount(markRes.count);
        setNotifications((prev) =>
          prev.map((n) => (n.roomName === res.room ? { ...n, isRead: true } : n))
        );
      }

      return res;
    } catch (err) {
      console.error('[Chat] Switch room error:', err);
      return { error: err.message };
    }
  }, [
    cleanupPresenceHandlers,
    cleanupMessageHandlers,
    cleanupTypingHandlers,
    setupPresenceHandlers,
    setupMessageHandlers,
    setupTypingHandlers,
  ]);

  const openDM = useCallback(async (targetUserId, targetUsername) => {
    try {
      const res = await apiRequest('/api/rooms/open-dm', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });

      if (res.error) return { success: false, error: res.error };

      setDmPartnerName(res.targetUser?.username || targetUsername);
      setMessages(res.history || []);
      setCurrentRoom(res.room);
      setTypingUsers([]);

      const prevRoom = currentRoomRef.current;
      if (prevRoom && prevRoom !== res.room) {
        cleanupPresenceHandlers(prevRoom);
        cleanupMessageHandlers(prevRoom);
        cleanupTypingHandlers(prevRoom);
        await unsubscribeFromRoom(prevRoom).catch(() => { });
      }

      await subscribeToRoom(res.room);
      setupPresenceHandlers(res.room);
      setupMessageHandlers(res.room);
      setupTypingHandlers(res.room);

      const markRes = await apiRequest('/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ roomName: res.room }),
      });
      if (markRes.success) {
        setUnreadCount(markRes.count);
        setNotifications((prev) =>
          prev.map((n) => (n.roomName === res.room ? { ...n, isRead: true } : n))
        );
      }

      return { success: true, targetUsername: res.targetUser?.username };
    } catch (err) {
      console.error('[Chat] Open DM error:', err);
      return { success: false, error: err.message };
    }
  }, [
    cleanupPresenceHandlers,
    cleanupMessageHandlers,
    cleanupTypingHandlers,
    setupPresenceHandlers,
    setupMessageHandlers,
    setupTypingHandlers,
  ]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiRequest('/api/notifications');
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.count);
      }
      return res;
    } catch (err) {
      console.error('[Chat] Fetch notifications error:', err);
      return { error: err.message };
    }
  }, []);

  const handleLoginNotifications = useCallback(async () => {
    const res = await fetchNotifications();
    if (res.success && res.count > 0) {
      sileo.info({
        title: 'پیام‌های جدید',
        description: `شما ${res.count} پیام خوانده‌نشده دارید.`,
        position: 'top-center',
        duration: 4000,
      });
    }
  }, [fetchNotifications]);

  const sendMessage = useCallback(async (payload) => {
    const room = currentRoomRef.current;
    if (!room) return;

    const data = typeof payload === 'string' ? { text: payload, room } : { ...payload, room };

    try {
      await apiRequest('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error('[Chat] Send message error:', err);
      sileo.error({ title: 'خطا', description: 'ارسال پیام با خطا مواجه شد' });
    }
  }, []);

  const setTyping = useCallback((isTyping) => {
    const room = currentRoomRef.current;
    if (!room) return;

    const channelName = getRoomChannelName(room);
    triggerClientEvent(channelName, 'typing', {
      username: currentUserRef.current?.username,
      isTyping,
    });

    // اصلاح مدیریت تایمر
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        triggerClientEvent(channelName, 'typing', {
          username: currentUserRef.current?.username,
          isTyping: false,
        });
      }, 2000);
    }
  }, []);

  const createRoom = useCallback(async (name) => {
    try {
      const res = await apiRequest('/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      if (res.success && res.room) {
        setRooms((prev) => {
          if (prev.some((r) => r.id === res.room.id || r.name === res.room.name)) return prev;
          return [...prev, res.room];
        });
      }
      return res;
    } catch (err) {
      console.error('[Chat] Create room error:', err);
      return { error: err.message };
    }
  }, []);

  const searchRooms = useCallback(async (query) => {
    const q = typeof query === 'string' ? query : query?.query ?? '';
    try {
      const res = await apiRequest(`/api/rooms/search?q=${encodeURIComponent(q)}`);
      return res;
    } catch (err) {
      console.error('[Chat] Search rooms error:', err);
      return { rooms: [], users: [], error: err.message };
    }
  }, []);

  const refreshRooms = useCallback(async () => {
    try {
      const res = await apiRequest('/api/rooms/list');
      if (res.rooms) setRooms(res.rooms);
    } catch (err) {
      console.error('[Chat] Refresh rooms error:', err);
    }
  }, []);

  const deleteRoom = useCallback(async (roomName) => {
    try {
      const res = await apiRequest('/api/rooms/delete', {
        method: 'POST',
        body: JSON.stringify({ roomName }),
      });
      if (res.success) {
        if (roomName === currentRoom) {
          setCurrentRoom(null);
          setMessages([]);
        }
        await refreshRooms();
      }
      return res;
    } catch (err) {
      console.error('[Chat] Delete room error:', err);
      return { error: err.message };
    }
  }, [currentRoom, refreshRooms]);

  const leaveRoom = useCallback(async (roomName) => {
    const room = roomName || currentRoom;
    if (!room) return { success: false, error: 'اتاقی انتخاب نشده است.' };

    try {
      const res = await apiRequest('/api/rooms/leave', {
        method: 'POST',
        body: JSON.stringify({ roomName: room }),
      });
      if (res.success) {
        if (!roomName || room === currentRoom) {
          setCurrentRoom(null);
          setMessages([]);
        }
        await refreshRooms();
      }
      return res;
    } catch (err) {
      console.error('[Chat] Leave room error:', err);
      return { error: err.message };
    }
  }, [currentRoom, refreshRooms]);

  const deleteMessage = useCallback(async (messageId, deleteForEveryone) => {
    try {
      const res = await apiRequest('/api/messages/delete', {
        method: 'POST',
        body: JSON.stringify({ messageId, deleteForEveryone }),
      });
      return res;
    } catch (err) {
      console.error('[Chat] Delete message error:', err);
      return { error: err.message };
    }
  }, []);

  const editMessage = useCallback(async (messageId, newText) => {
    try {
      const res = await apiRequest('/api/messages/edit', {
        method: 'POST',
        body: JSON.stringify({ messageId, newText }),
      });
      return res;
    } catch (err) {
      console.error('[Chat] Edit message error:', err);
      return { error: err.message };
    }
  }, []);

  const markNotificationsAsRead = useCallback(async () => {
    try {
      const res = await apiRequest('/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (res.success) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
      return res;
    } catch (err) {
      console.error('[Chat] Mark notifications read error:', err);
      return { error: err.message };
    }
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

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
    editMessage,
    logout: disconnectSocket,
    setNotifications,
    setUnreadCount,
    setShowNotifications,
    notifications,
    unreadCount,
    showNotifications,
    fetchNotifications,
    markNotificationsAsRead,
    dmPartnerName,
    handleLoginNotifications, // این را هم اضافه کردم که در App.jsx استفاده کنی
  };
}