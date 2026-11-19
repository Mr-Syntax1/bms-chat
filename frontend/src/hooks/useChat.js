import { useEffect, useState, useCallback, useRef } from 'react';
import { sileo } from 'sileo';
import {
  ably,
  subscribeToRoom,
  unsubscribeFromRoom,
  getRoomChannelName,
  publishEvent,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  getNotificationChannelName,
  isChannelSubscribed,
  setAblyAuthToken,
  subscribeToPresence,
  unsubscribeFromPresence,
  getChannel,
} from '../lib/ably';
import { notifyIncomingMessage } from '../lib/notify';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const REQUEST_TIMEOUT = 15000;
const MAX_MESSAGES = 500;
const TYPING_SEND_INTERVAL = 1500;
const TYPING_STOP_DELAY = 2000;
const PRESENCE_SYNC_INTERVAL = 30000;

const isDmRoom = (name) => typeof name === 'string' && name.startsWith('dm_');

// ---------------------------------------------------------------------------
// لایه‌ی API
// ---------------------------------------------------------------------------
let authToken = null;
let unauthorizedHandler = null;

export function setApiToken(token) {
  authToken = token;
  setAblyAuthToken(token);
}

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

export async function apiRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && unauthorizedHandler) unauthorizedHandler();
      const err = new Error(data.error || 'Request failed');
      err.status = response.status;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('زمان درخواست به پایان رسید', err);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
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

  const currentRoomRef = useRef(null);
  const currentUserRef = useRef(null);
  const roomHandlersRef = useRef({});
  const notificationHandlersRef = useRef(null);
  const typingMapRef = useRef(new Map());
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const switchSeqRef = useRef(0);
  const connectSeqRef = useRef(0);
  const wasConnectedRef = useRef(false);
  const resyncRef = useRef(null);
  const disconnectRef = useRef(null);

  // کمک‌کننده: آیا اتصال Ably سالم است؟
  const isAblyConnected = () =>
    ably?.connection?.state === 'connected' || ably?.connection?.state === 'connected';

  const markMessagesAsRead = useCallback(async (roomName, messageIds = []) => {
    const userSettings = currentUserRef.current?.settings;
    if (userSettings?.readReceipts === false) return;

    try {
      await apiRequest('/api/messages/mark-read', {
        method: 'POST',
        body: JSON.stringify({ roomName, messageIds }),
      });
    } catch (err) {
      console.error('[Chat] Mark read error:', err);
    }
  }, []);

  // -------------------------------------------------------------------------
  // وضعیت اتصال Ably
  // -------------------------------------------------------------------------
  useEffect(() => {
    const onState = (stateChange) => {
      if (stateChange.current === 'connected') {
        setConnected(true);
        if (wasConnectedRef.current) resyncRef.current?.();
        wasConnectedRef.current = true;
      } else if (
        stateChange.current === 'disconnected' ||
        stateChange.current === 'suspended'
      ) {
        setConnected(false);
      }
    };

    ably.connection.on(onState);

    return () => {
      ably.connection.off(onState);
    };
  }, []);

  // -------------------------------------------------------------------------
  // حضور سراسری - نسخه‌ی مقاوم در برابر Race Condition و TypeError
  // -------------------------------------------------------------------------
  useEffect(() => {
    const userId = currentUserRef.current?.id;
    if (!connected || !userId) return undefined;

    const channel = subscribeToPresence();
    if (!channel) return undefined;

    let disposed = false;

    const toUser = (m) => ({
      id: m.clientId,
      username: m.data?.name || 'Unknown',
      avatarIndex: m.data?.avatarIndex ?? null,
    });

    //  Defensive: فقط آرایه‌های معتبر را merge کن
    const mergeMembers = (incoming) => {
      if (disposed) return;
      if (!Array.isArray(incoming)) return;

      setOnlineUsers((prev) => {
        const map = new Map(prev.map((u) => [u.id, u]));
        for (const m of incoming) {
          if (m && m.clientId) {
            map.set(m.clientId, toUser(m));
          }
        }
        // کاربر جاری را همیشه نگه دار (تا از بین نرود)
        const self = prev.find((u) => u.id === userId);
        if (self && !map.has(userId)) map.set(userId, self);
        return Array.from(map.values());
      });
    };

    const loadAll = async () => {
      if (disposed) return;
      if (channel.state !== 'attached') return;
      try {
        const members = await channel.presence.get();
        mergeMembers(Array.isArray(members) ? members : []);
      } catch (err) {
        if (!disposed) console.warn('[Chat] presence.get error:', err?.message || err);
      }
    };

    const onEnter = (member) => {
      if (disposed || !member) return;
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.id === member.clientId)) {
          return prev.map((u) => (u.id === member.clientId ? toUser(member) : u));
        }
        return [...prev, toUser(member)];
      });
    };

    const onLeave = (member) => {
      if (disposed || !member) return;
      setOnlineUsers((prev) => prev.filter((u) => u.id !== member.clientId));
    };

    const onUpdate = (member) => {
      if (disposed || !member) return;

      setOnlineUsers((prev) =>
        prev.map((u) => (u.id === member.clientId ? toUser(member) : u))
      );
    };

    //  رویداد present گاهی آرایه، گاهی message واحد است
    const onPresent = (members) => {
      if (disposed) return;
      if (Array.isArray(members)) {
        mergeMembers(members);
      } else if (members && members.clientId) {
        mergeMembers([members]);
      }
    };

    channel.presence.subscribe('enter', onEnter);
    channel.presence.subscribe('leave', onLeave);
    channel.presence.subscribe('update', onUpdate);
    channel.presence.subscribe('present', onPresent);

    //  ورود ایمن: فقط وقتی connection و channel هر دو آماده‌اند
    const doEnter = () => {
      if (disposed) return;
      if (!isAblyConnected()) return;
      if (channel.state !== 'attached') return;

      const username = currentUserRef.current?.username;
      const avatarIndex = currentUserRef.current?.avatarIndex ?? null;

      channel
        .presence.enter({ name: username, avatarIndex })
        .catch((err) => {
          if (disposed) return;
          console.warn('[Chat] presence.enter error:', err?.message || err);
          // retry فقط اگر هنوز متصلیم
          setTimeout(() => {
            if (!disposed && isAblyConnected() && channel.state === 'attached') {
              channel.presence.enter({ name: username, avatarIndex }).catch(() => { });
            }
          }, 2000);
        });
    };

    const onAttached = () => {
      if (disposed) return;
      loadAll();
      doEnter();
    };

    if (channel.state === 'attached') {
      onAttached();
    } else {
      channel.on('attached', onAttached);
    }

    //  Sync دوره‌ای با چک connection
    const syncInterval = setInterval(() => {
      if (disposed) return;
      if (!isAblyConnected()) return;
      if (channel.state === 'attached') loadAll();
    }, PRESENCE_SYNC_INTERVAL);

    //  Watch avatarIndex برای update فوری
    let prevAvatarIndex = currentUserRef.current?.avatarIndex;
    const avatarWatchInterval = setInterval(() => {
      if (disposed) return;
      if (!isAblyConnected()) return;
      if (channel.state !== 'attached') return;

      const current = currentUserRef.current?.avatarIndex;
      if (current !== prevAvatarIndex) {
        const username = currentUserRef.current?.username;
        channel.presence.update({ name: username, avatarIndex: current }).catch(() => { });
        prevAvatarIndex = current;
      }
    }, 5000);

    return () => {
      disposed = true;
      clearInterval(syncInterval);
      clearInterval(avatarWatchInterval);

      try {
        channel.presence.unsubscribe('enter', onEnter);
        channel.presence.unsubscribe('leave', onLeave);
        channel.presence.unsubscribe('update', onUpdate);
        channel.presence.unsubscribe('present', onPresent);
      } catch { /* ignore */ }

      try {
        channel.off('attached', onAttached);
      } catch { /* ignore */ }

      // فقط وقتی connection باز است leave بده
      if (isAblyConnected()) {
        try {
          channel.presence.leave().catch(() => { });
        } catch { /* ignore */ }
      }

      try {
        unsubscribeFromPresence();
      } catch (err) {
        console.warn('[Chat] unsubscribeFromPresence error:', err?.message || err);
      }
    };
  }, [connected]);

  // -------------------------------------------------------------------------
  // Typing (سمت گیرنده)
  // -------------------------------------------------------------------------
  const syncTyping = useCallback(() => {
    setTypingUsers(Array.from(typingMapRef.current.values(), (v) => v.username));
  }, []);

  const clearTypingUser = useCallback(
    (key) => {
      const entry = typingMapRef.current.get(key);
      if (entry) {
        clearTimeout(entry.timer);
        typingMapRef.current.delete(key);
        syncTyping();
      }
    },
    [syncTyping]
  );

  const clearTypingByUsername = useCallback(
    (username) => {
      for (const [key, entry] of typingMapRef.current) {
        if (entry.username === username) clearTypingUser(key);
      }
    },
    [clearTypingUser]
  );

  const resetTyping = useCallback(() => {
    for (const entry of typingMapRef.current.values()) clearTimeout(entry.timer);
    typingMapRef.current.clear();
    setTypingUsers([]);
  }, []);

  // -------------------------------------------------------------------------
  // اعلان‌های خوانده‌نشده
  // -------------------------------------------------------------------------
  const markRead = useCallback(async (roomName) => {
    try {
      const res = await apiRequest('/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify(roomName ? { roomName } : {}),
      });
      if (res.success) {
        setUnreadCount(res.count ?? 0);
        setNotifications((prev) =>
          prev.map((n) => (!roomName || n.roomName === roomName ? { ...n, isRead: true } : n))
        );
      }
      return res;
    } catch (err) {
      console.error('[Chat] Mark read error:', err);
      return { error: err.message };
    }
  }, []);

  // -------------------------------------------------------------------------
  // هندلرهای اتاق
  // -------------------------------------------------------------------------
  const bindRoomHandlers = useCallback(
    (roomName) => {
      const channelName = getRoomChannelName(roomName);
      const channel = getChannel(channelName);
      if (!channel) {
        console.warn('[Chat] Channel not available for:', roomName);
        return;
      }

      const handlers = [];
      const on = (event, fn) => {
        const wrappedFn = (message) => fn(message.data);
        channel.subscribe(event, wrappedFn);
        handlers.push([event, wrappedFn]);
      };

      on('messages-read', (data) => {
        const { userId, messageIds, all } = data || {};
        if (!userId) return;
        setMessages((prev) =>
          prev.map((msg) => {
            const shouldUpdate = all || (Array.isArray(messageIds) && messageIds.includes(msg.id));
            if (shouldUpdate && !msg.readBy?.includes(userId)) {
              return { ...msg, readBy: [...(msg.readBy || []), userId] };
            }
            return msg;
          })
        );
      });

      on('new-message', (msg) => {
        if (!msg) return;
        const currentUserId = currentUserRef.current?.id;
        const senderId = msg.senderId ?? msg.userId;

        if (senderId && currentUserId && String(senderId) !== String(currentUserId)) {
          notifyIncomingMessage({
            sender: msg.sender || msg.username || 'کاربر ناشناس',
            text: msg.text || (msg.type === 'file' ? 'فایل جدید' : 'پیام جدید'),
          });
        }

        if (msg.room && msg.room !== currentRoomRef.current) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
        });

        const senderKey = msg.senderId ?? msg.userId;
        if (senderKey != null) clearTypingUser(String(senderKey));
        else if (msg.sender) clearTypingByUsername(msg.sender);
      });

      roomHandlersRef.current[roomName] = { channelName, handlers };
    },
    [clearTypingUser, clearTypingByUsername]
  );

  const unbindRoomHandlers = useCallback((roomName) => {
    const entry = roomHandlersRef.current[roomName];
    if (!entry) return;
    const channel = getChannel(entry.channelName);
    if (channel) {
      for (const [event, fn] of entry.handlers) {
        try { channel.unsubscribe(event, fn); } catch { /* ignore */ }
      }
    }
    delete roomHandlersRef.current[roomName];
  }, []);

  const teardownRoom = useCallback(
    (roomName) => {
      unbindRoomHandlers(roomName);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      lastTypingSentRef.current = 0;

      try {
        unsubscribeFromRoom(roomName);
      } catch (err) {
        console.warn('[Chat] Unsubscribe room error:', err);
      }
    },
    [unbindRoomHandlers]
  );

  const activateRoom = useCallback(
    async (room) => {
      const prev = currentRoomRef.current;
      if (prev && prev !== room) {
        subscribeToRoom(room);
        teardownRoom(prev);
      } else {
        if (prev) teardownRoom(prev);
        try {
          subscribeToRoom(room);
        } catch (err) {
          currentRoomRef.current = null;
          throw err;
        }
      }
      currentRoomRef.current = room;
      await bindRoomHandlers(room);
    },
    [teardownRoom, bindRoomHandlers]
  );

  const enterRoom = useCallback(
    async ({ room, history, partnerName }) => {
      try {
        await activateRoom(room);
      } catch (err) {
        console.warn('[Chat] Subscribe room error:', err);
        if (!currentRoomRef.current) {
          setCurrentRoom(null);
          setMessages([]);
          resetTyping();
        }
        return { ok: false, error: 'Failed to subscribe to room' };
      }

      setMessages(history || []);
      setCurrentRoom(room);
      setDmPartnerName(partnerName ?? null);
      resetTyping();
      await markRead(room);
      return { ok: true };
    },
    [activateRoom, markRead, resetTyping]
  );

  const leaveCurrentRoomLocally = useCallback(() => {
    const room = currentRoomRef.current;
    if (room) teardownRoom(room);
    currentRoomRef.current = null;
    setCurrentRoom(null);
    setMessages([]);
    setDmPartnerName(null);
    resetTyping();
  }, [teardownRoom, resetTyping]);

  // -------------------------------------------------------------------------
  // هندلرهای اعلان
  // -------------------------------------------------------------------------
  const cleanupNotificationHandlers = useCallback(() => {
    const entry = notificationHandlersRef.current;
    if (!entry) return;

    const channel = getChannel(entry.channelName);
    if (channel) {
      try { channel.unsubscribe('new-notification', entry.handler); } catch { /* ignore */ }
    }

    try {
      unsubscribeFromNotifications(entry.userId);
    } catch (err) {
      console.warn('[Chat] Notification unsubscribe error:', err);
    }
    notificationHandlersRef.current = null;
  }, []);

  const setupNotificationHandlers = useCallback(() => {
    const userId = currentUserRef.current?.id;
    if (!userId) return;
    cleanupNotificationHandlers();
    const channelName = getNotificationChannelName(userId);

    const handler = (message) => {
      const notif = message.data;
      if (!notif) return;
      if (notif.roomName && notif.roomName === currentRoomRef.current) {
        markRead(notif.roomName);
        return;
      }
      setNotifications((prev) => (prev.some((n) => n.id === notif.id) ? prev : [notif, ...prev]));
      setUnreadCount((prev) => prev + 1);
      const isDm = isDmRoom(notif.roomName);
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
      return;
    }

    const channel = getChannel(channelName);
    if (channel) channel.subscribe('new-notification', handler);
    notificationHandlersRef.current = { channelName, userId, handler };
  }, [cleanupNotificationHandlers, markRead]);

  // -------------------------------------------------------------------------
  // اتصال / قطع اتصال
  // -------------------------------------------------------------------------
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

  const refreshRooms = useCallback(async () => {
    try {
      const res = await apiRequest('/api/rooms/list');
      if (res.rooms) setRooms(res.rooms);
    } catch (err) {
      console.error('[Chat] Refresh rooms error:', err);
    }
  }, []);

  useEffect(() => {
    resyncRef.current = async () => {
      await Promise.all([fetchNotifications(), refreshRooms()]);
    };
  }, [fetchNotifications, refreshRooms]);

  const connectSocket = useCallback(async () => {
    const seq = ++connectSeqRef.current;
    const isStale = () => seq !== connectSeqRef.current;

    try {
      setError(null);
      const me = await apiRequest('/auth/me');
      if (isStale()) return { success: false, stale: true };
      if (!me.user) throw new Error('احراز هویت انجام نشد');
      currentUserRef.current = me.user;

      ably.connect();
      if (ably.connection.state === 'connected') setConnected(true);
      setupNotificationHandlers();

      const roomsRes = await apiRequest('/api/rooms/list');
      if (isStale()) return { success: false, stale: true };
      if (roomsRes.rooms) setRooms(roomsRes.rooms);

      return { success: true };
    } catch (err) {
      console.error('[Chat] Connect error:', err);
      if (!isStale()) {
        cleanupNotificationHandlers();
        ably.close();
        setError(err.message);
        setConnected(false);
      }
      return { error: err.message };
    }
  }, [setupNotificationHandlers, cleanupNotificationHandlers]);

  const disconnectSocket = useCallback(() => {
    connectSeqRef.current += 1;
    switchSeqRef.current += 1;
    cleanupNotificationHandlers();

    const roomNames = new Set(Object.keys(roomHandlersRef.current));
    if (currentRoomRef.current) roomNames.add(currentRoomRef.current);
    roomNames.forEach((name) => teardownRoom(name));
    currentRoomRef.current = null;

    resetTyping();
    setMessages([]);
    setRooms([]);
    setCurrentRoom(null);
    setOnlineUsers([]);
    setDmPartnerName(null);
    setNotifications([]);
    setUnreadCount(0);
    setShowNotifications(false);
    setError(null);
    setConnected(false);
    currentUserRef.current = null;
    wasConnectedRef.current = false;

    //  ably.close را به تعویق بینداز تا effect‌ها cleanup شوند
    setTimeout(() => {
      try { ably.close(); } catch { /* ignore */ }
    }, 100);
  }, [cleanupNotificationHandlers, teardownRoom, resetTyping]);

  const logout = useCallback(() => {
    disconnectSocket();
    setApiToken(null);
  }, [disconnectSocket]);

  useEffect(() => {
    disconnectRef.current = disconnectSocket;
  }, [disconnectSocket]);

  useEffect(() => {
    return () => {
      disconnectRef.current?.();
    };
  }, []);

  // -------------------------------------------------------------------------
  // اتاق‌ها
  // -------------------------------------------------------------------------
  const switchRoom = useCallback(
    async (roomName) => {
      const seq = ++switchSeqRef.current;
      if (!roomName) {
        leaveCurrentRoomLocally();
        return { success: true };
      }

      try {
        const res = await apiRequest('/api/rooms/join', {
          method: 'POST',
          body: JSON.stringify({ roomName }),
        });

        if (seq !== switchSeqRef.current) return { success: false, stale: true };
        if (res.error) return res;

        if (res.room && typeof res.room === 'object') {
          setRooms((prevRooms) => {
            const exists = prevRooms.some((r) => r.id === res.room.id || r.name === res.room.name);
            if (exists) return prevRooms;
            return [...prevRooms, res.room];
          });
        }

        const roomToEnter = typeof res.room === 'object' ? res.room.name : res.room;
        const result = await enterRoom({
          room: roomToEnter,
          history: res.history,
          partnerName: res.targetUser?.username ?? null,
        });

        if (!result.ok) return { error: result.error };
        return res;
      } catch (err) {
        console.error('[Chat] Switch room error:', err);
        return { error: err.message };
      }
    },
    [enterRoom, leaveCurrentRoomLocally]
  );

  const openDM = useCallback(
    async (targetUserId, targetUsername) => {
      const seq = ++switchSeqRef.current;
      try {
        const res = await apiRequest('/api/rooms/open-dm', {
          method: 'POST',
          body: JSON.stringify({ targetUserId }),
        });

        if (seq !== switchSeqRef.current) return { success: false, stale: true };
        if (res.error) return { success: false, error: res.error };

        if (res.room && typeof res.room === 'object') {
          setRooms((prevRooms) => {
            const exists = prevRooms.some((r) => r.id === res.room.id || r.name === res.room.name);
            if (exists) return prevRooms;
            return [...prevRooms, res.room];
          });
        }

        const partnerName = res.targetUser?.username || targetUsername;
        const roomNameToEnter = typeof res.room === 'object' ? res.room.name : res.room;

        const result = await enterRoom({
          room: roomNameToEnter,
          history: res.history,
          partnerName,
        });

        if (!result.ok) return { success: false, error: 'Failed to subscribe to DM room' };
        return { success: true, targetUsername: res.targetUser?.username };
      } catch (err) {
        console.error('[Chat] Open DM error:', err);
        return { success: false, error: err.message };
      }
    },
    [enterRoom]
  );

  const createRoom = useCallback(async (name) => {
    if (typeof name === 'string' && name.trim().toLowerCase().startsWith('dm_')) {
      return { error: 'نام اتاق نمی‌تواند با dm_ شروع شود' };
    }
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
      return await apiRequest(`/api/rooms/search?q=${encodeURIComponent(q)}`);
    } catch (err) {
      console.error('[Chat] Search rooms error:', err);
      return { rooms: [], users: [], error: err.message };
    }
  }, []);

  const deleteRoom = useCallback(
    async (roomName) => {
      try {
        const res = await apiRequest('/api/rooms/delete', {
          method: 'POST',
          body: JSON.stringify({ roomName }),
        });
        if (res.success) {
          if (roomName === currentRoomRef.current) leaveCurrentRoomLocally();
          await refreshRooms();
        }
        return res;
      } catch (err) {
        console.error('[Chat] Delete room error:', err);
        return { error: err.message };
      }
    },
    [leaveCurrentRoomLocally, refreshRooms]
  );

  const leaveRoom = useCallback(
    async (roomName) => {
      const room = roomName || currentRoomRef.current;
      if (!room) return { success: false, error: 'اتاقی انتخاب نشده است.' };

      try {
        const res = await apiRequest('/api/rooms/leave', {
          method: 'POST',
          body: JSON.stringify({ roomName: room }),
        });
        if (res.success) {
          if (room === currentRoomRef.current) leaveCurrentRoomLocally();
          await refreshRooms();
        }
        return res;
      } catch (err) {
        console.error('[Chat] Leave room error:', err);
        return { error: err.message };
      }
    },
    [leaveCurrentRoomLocally, refreshRooms]
  );

  // -------------------------------------------------------------------------
  // پیام‌ها و typing (سمت فرستنده)
  // -------------------------------------------------------------------------
  const setTyping = useCallback((isTyping) => {
    const room = currentRoomRef.current;
    if (!room) return;

    const channelName = getRoomChannelName(room);
    if (!isChannelSubscribed(channelName)) return;

    const payload = (value) => ({
      userId: currentUserRef.current?.id,
      username: currentUserRef.current?.username,
      isTyping: value,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTyping) {
      const now = Date.now();
      if (now - lastTypingSentRef.current > TYPING_SEND_INTERVAL) {
        publishEvent(channelName, 'typing', payload(true)).catch(console.error);
        lastTypingSentRef.current = now;
      }

      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
        lastTypingSentRef.current = 0;
        if (isChannelSubscribed(channelName)) {
          publishEvent(channelName, 'typing', payload(false)).catch(console.error);
        }
      }, TYPING_STOP_DELAY);
    } else if (lastTypingSentRef.current !== 0) {
      lastTypingSentRef.current = 0;
      publishEvent(channelName, 'typing', payload(false)).catch(console.error);
    }
  }, []);

  const sendMessage = useCallback(
    async (payload) => {
      const room = currentRoomRef.current;
      if (!room) return;

      const data = typeof payload === 'string' ? { text: payload, room } : { ...payload, room };

      try {
        await apiRequest('/api/messages/send', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        setTyping(false);
      } catch (err) {
        console.error('[Chat] Send message error:', err);
        sileo.error({ title: 'خطا', description: 'ارسال پیام با خطا مواجه شد' });
      }
    },
    [setTyping]
  );

  const deleteMessage = useCallback(async (messageId, deleteForEveryone) => {
    try {
      const res = await apiRequest('/api/messages/delete', {
        method: 'POST',
        body: JSON.stringify({ messageId, deleteForEveryone }),
      });
      if (!deleteForEveryone && !res?.error) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
      return res;
    } catch (err) {
      console.error('[Chat] Delete message error:', err);
      return { error: err.message };
    }
  }, []);

  const editMessage = useCallback(async (messageId, newText) => {
    try {
      return await apiRequest('/api/messages/edit', {
        method: 'POST',
        body: JSON.stringify({ messageId, newText }),
      });
    } catch (err) {
      console.error('[Chat] Edit message error:', err);
      return { error: err.message };
    }
  }, []);

  // -------------------------------------------------------------------------
  // اعلان‌ها
  // -------------------------------------------------------------------------
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

  const markNotificationsAsRead = useCallback(() => markRead(null), [markRead]);

  return {
    messages,
    onlineUsers,
    typingUsers,
    rooms,
    currentRoom,
    error,
    markMessagesAsRead,
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
    logout,
    setNotifications,
    setUnreadCount,
    setShowNotifications,
    notifications,
    unreadCount,
    showNotifications,
    fetchNotifications,
    markNotificationsAsRead,
    dmPartnerName,
    handleLoginNotifications,
  };
}