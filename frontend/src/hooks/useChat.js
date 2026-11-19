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
  // getPresenceChannelName,
  getChannel,
} from '../lib/ably'; // مسیر را به فایل ably.js جدید تغییر دهید
import { notifyIncomingMessage } from '../lib/notify';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const REQUEST_TIMEOUT = 15000; // ms
const MAX_MESSAGES = 500;
const TYPING_SEND_INTERVAL = 1500; // حداقل فاصله‌ی ارسال رویداد typing
const TYPING_STOP_DELAY = 2000; // چند ms بعد از آخرین کلید، «توقف تایپ» ارسال شود
// const TYPING_TTL = 4000; // سمت گیرنده: اگر رویداد توقف نرسید، بعد از این مدت حذف شود

const isDmRoom = (name) => typeof name === 'string' && name.startsWith('dm_');

// ---------------------------------------------------------------------------
// لایه‌ی API
// ---------------------------------------------------------------------------
let authToken = null;
let unauthorizedHandler = null;

/** یک‌جا توکن هم برای API و هم برای auth کانال‌های Ably ست می‌شود. */
export function setApiToken(token) {
  authToken = token;
  setAblyAuthToken(token);
}

/** اختیاری: وقتی سرور 401 داد صدا زده می‌شود (مثلاً برای هدایت به صفحه‌ی لاگین). */
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
  const roomHandlersRef = useRef({}); // roomName -> { channelName, handlers: [[event, fn], ...], presenceHandlers: [...] }
  const notificationHandlersRef = useRef(null);
  const typingMapRef = useRef(new Map());
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  // const sysMsgCounterRef = useRef(0);
  const switchSeqRef = useRef(0);
  const connectSeqRef = useRef(0);
  const wasConnectedRef = useRef(false);
  const resyncRef = useRef(null);
  const disconnectRef = useRef(null);



  const markMessagesAsRead = useCallback(async (roomName, messageIds = []) => {
    const userSettings = currentUserRef.current?.settings;
    if (userSettings?.readReceipts === false) {
      console.log('🚫 Read receipts disabled');
      return;
    }

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
  // حضور سراسری: همه کاربران آنلاین (مستقل از اتاق جاری)
  // -------------------------------------------------------------------------
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
  // حضور سراسری: همه کاربران آنلاین (مستقل از اتاق جاری)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const userId = currentUserRef.current?.id;
    if (!connected || !userId) return undefined;

    const channel = subscribeToPresence();
    const toUser = (m) => ({ id: m.clientId, username: m.data?.name || 'Unknown', avatarIndex: m.data?.avatarIndex ?? null });

    const loadAll = async () => {
      try {
        const members = await channel.presence.get();
        setOnlineUsers(members.map(toUser));
      } catch (err) {
        console.error('[Chat] presence.get error:', err);
      }
    };

    const onEnter = (member) => {
      setOnlineUsers((prev) =>
        prev.some((u) => u.id === member.clientId) ? prev : [...prev, toUser(member)]
      );
    };
    const onLeave = (member) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== member.clientId));
    };

    channel.presence.subscribe('enter', onEnter);
    channel.presence.subscribe('leave', onLeave);

    const username = currentUserRef.current?.username;
    const avatarIndex = currentUserRef.current?.avatarIndex ?? null;
    channel.presence.enter({ name: username, avatarIndex }).catch((err) => {
      console.warn('[Chat] presence.enter error:', err);
    });

    if (channel.state === 'attached') loadAll();
    else channel.on('attached', loadAll);

    return () => {
      channel.presence.unsubscribe('enter', onEnter);
      channel.presence.unsubscribe('leave', onLeave);
      channel.off('attached', loadAll);
      channel.presence.leave().catch(() => { });
      unsubscribeFromPresence();
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
  // هندلرهای اتاق (presence + message + typing)
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
        console.log('📥 [Ably] Received messages-read event:', data);
        const { userId, messageIds, all } = data;

        setMessages(prev => prev.map(msg => {
          // اگر all=true تمام پیام‌ها آپدیت شوند، وگرنه فقط messageIds
          const shouldUpdate = all || messageIds?.includes(msg.id);
          if (shouldUpdate && !msg.readBy?.includes(userId)) {
            console.log('🔄 [State] Updating message readBy for:', msg.id);
            return { ...msg, readBy: [...(msg.readBy || []), userId] };
          }
          return msg;
        }));
      });

      // ---- پیام‌ها ----
      on('new-message', (msg) => {
        const currentUserId = currentUserRef.current?.id;
        const senderId = msg.senderId ?? msg.userId;

        //  ۱. اولویت اول: بررسی و پخش اعلان (حتی اگر در اتاق دیگری هستیم)
        if (senderId && currentUserId && String(senderId) !== String(currentUserId)) {
          notifyIncomingMessage({
            sender: msg.sender || msg.username || 'کاربر ناشناس',
            text: msg.text || (msg.type === 'file' ? 'فایل جدید' : 'پیام جدید'),
          });
        }

        //  ۲. اگر پیام مربوط به اتاق فعلی نیست، فقط اعلان بده و از آپدیت state صرف‌نظر کن
        if (msg.room && msg.room !== currentRoomRef.current) return;

        //  ۳. اضافه کردن پیام به لیست (فقط برای اتاق جاری)
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
        });

        const senderKey = msg.senderId ?? msg.userId;
        if (senderKey != null) clearTypingUser(String(senderKey));
        else if (msg.sender) clearTypingByUsername(msg.sender);
      });

    },
    [clearTypingUser, clearTypingByUsername, syncTyping]
  );

  const unbindRoomHandlers = useCallback((roomName) => {
    const entry = roomHandlersRef.current[roomName];
    if (!entry) return;
    const channel = getChannel(entry.channelName);
    if (channel) {
      for (const [event, fn] of entry.handlers) {
        channel.unsubscribe(event, fn);
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
      // 👇 setOnlineUsers([]) حذف شد — onlineUsers سراسری است و نباید با تغییر اتاق خالی شود
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
          setOnlineUsers([]);
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
    if (channel) channel.unsubscribe('new-notification', entry.handler);

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
      const notif = message.data; // استخراج داده از پیام Ably
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

    ably.close();
    wasConnectedRef.current = false;
    currentUserRef.current = null;

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

        // اصلاح: اضافه کردن اتاق جوین‌شده به لیست در صورت عدم وجود
        if (res.room) {
          setRooms((prevRooms) => {
            const roomObj = typeof res.room === 'object' ? res.room : { name: res.room };
            const exists = prevRooms.some(
              (r) => r.id === roomObj.id || r.name === roomObj.name
            );
            if (exists) return prevRooms;

            return [...prevRooms, roomObj];
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

        //  اصلاح: اضافه کردن اتاق جدید به لیست در صورت عدم وجود
        if (res.room) {
          setRooms((prevRooms) => {
            // بررسی می‌کنیم آیا این اتاق از قبل در لیست هست یا خیر
            const exists = prevRooms.some(
              (r) => r.id === res.room.id || r.name === res.room.name
            );
            if (exists) return prevRooms; // اگر بود، لیست را تغییر نده

            // اگر نبود، اتاق جدید را به لیست اضافه کن
            return [...prevRooms, res.room];
          });
        }

        const partnerName = res.targetUser?.username || targetUsername;

        // توجه: اگر res.room یک آبجکت است، نام آن res.room.name است. 
        // اگر بک‌اند فقط نام رشته‌ای را برمی‌گرداند، از همان res.room استفاده کنید.
        const roomNameToEnter = typeof res.room === 'object' ? res.room.name : res.room;

        const result = await enterRoom({
          room: roomNameToEnter,
          history: res.history,
          partnerName
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