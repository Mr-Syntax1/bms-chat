import Ably from 'ably';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const AUTH_ENDPOINT = `${API_BASE}/api/ably/auth`;

let authToken = null;
let authTokenPromise = null;

export function setAblyAuthToken(token) {
  authToken = token;
  authTokenPromise = null; // Reset promise so next call fetches fresh
}

function getAuthToken() {
  if (authToken) return Promise.resolve(authToken);
  if (authTokenPromise) return authTokenPromise;
  // Wait for token to be set (e.g., from App.jsx useEffect)
  authTokenPromise = new Promise((resolve) => {
    const checkToken = () => {
      if (authToken) {
        resolve(authToken);
      } else {
        setTimeout(checkToken, 50);
      }
    };
    checkToken();
  });
  return authTokenPromise;
}

export const ably = new Ably.Realtime({
  authCallback: async (tokenParams, callback) => {
    console.log('[Ably] authCallback called!', { AUTH_ENDPOINT });

    try {
      const token = await getAuthToken();
      console.log('[Ably] Using token for auth:', token ? 'present' : 'missing');

      const res = await fetch(AUTH_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      console.log('[Ably] Auth response status:', res.status);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Auth failed: ${res.status} ${errText}`);
      }

      const tokenRequest = await res.json();
      console.log('[Ably] Token request received successfully, passing to SDK');
      callback(null, tokenRequest);
    } catch (err) {
      console.error('[Ably] Auth callback error:', err);
      callback(err);
    }
  },
  autoConnect: false,
  disconnectedRetryTimeout: 3000,
  suspendedRetryTimeout: 10000,
});

if (import.meta.env.DEV) {
  ably.connection.on((stateChange) => {
    console.log('[Ably] Connection state:', stateChange.current);
  });
}

// ---------------------------------------------------------------------------
// نام‌گذاری کانال‌ها
// ---------------------------------------------------------------------------
const MAX_CHANNEL_LENGTH = 164;
// اصلاح شد: اضافه کردن ':' به لیست کاراکترهای مجاز
const CHANNEL_RE = /^[A-Za-z0-9_\-=@,.;:]{1,164}$/;
const SAFE_CHAR_RE = /[A-Za-z0-9_.-]/;
const encoder = new TextEncoder();

export function encodeChannelPart(value) {
  const str = String(value);
  let out = '';
  for (const ch of str) {
    if (SAFE_CHAR_RE.test(ch)) {
      out += ch;
    } else {
      for (const byte of encoder.encode(ch)) {
        out += `=${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      }
    }
  }
  return out;
}

function assertValidChannelName(name) {
  if (name.length > MAX_CHANNEL_LENGTH || !CHANNEL_RE.test(name)) {
    throw new Error(`[Ably] Invalid channel name: "${name}"`);
  }
  return name;
}

function pairChannelName(prefix, a, b) {
  const [x, y] = [String(a), String(b)].sort();
  return assertValidChannelName(`${prefix}${x}-${y}`);
}

export function getRoomChannelName(roomName) {
  if (typeof roomName !== 'string' || !roomName) {
    throw new Error('[Ably] roomName is required');
  }
  if (roomName.startsWith('dm_')) {
    const parts = roomName.slice(3).split('_');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return pairChannelName('private:dm-', parts[0], parts[1]);
    }
    return assertValidChannelName(`private:dm-${roomName.slice(3).replace('_', '-')}`);
  }
  return assertValidChannelName(`presence:room-${encodeChannelPart(roomName)}`);
}

export function getDMChannelName(userId1, userId2) {
  return pairChannelName('private:dm-', userId1, userId2);
}

export function getNotificationChannelName(userId) {
  return assertValidChannelName(`private:notifications-${userId}`);
}

export function getWebRTCChannelName(userId1, userId2) {
  return pairChannelName('private:webrtc-', userId1, userId2);
}

// ---------------------------------------------------------------------------
// مدیریت کانال‌ها و رویدادها
// ---------------------------------------------------------------------------
export function getChannel(channelName) {
  return ably.channels.get(channelName);
}

export function subscribeToRoom(roomName) {
  return getChannel(getRoomChannelName(roomName));
}

export function subscribeToDM(userId1, userId2) {
  return getChannel(getDMChannelName(userId1, userId2));
}

export function subscribeToNotifications(userId) {
  return getChannel(getNotificationChannelName(userId));
}

export function subscribeToWebRTC(userId1, userId2) {
  return getChannel(getWebRTCChannelName(userId1, userId2));
}

export function unsubscribeFromRoom(roomName) {
  ably.channels.release(getRoomChannelName(roomName));
}

export function unsubscribeFromDM(userId1, userId2) {
  ably.channels.release(getDMChannelName(userId1, userId2));
}

export function unsubscribeFromNotifications(userId) {
  ably.channels.release(getNotificationChannelName(userId));
}

export function unsubscribeFromWebRTC(userId1, userId2) {
  ably.channels.release(getWebRTCChannelName(userId1, userId2));
}

// تابع جدید برای قطع اتصال (جایگزین disconnect)
export function disconnectAbly() {
  ably.close();
}

export function publishEvent(channelName, eventName, data) {
  const channel = getChannel(channelName);
  return channel.publish(eventName, data);
}

export function bindEvent(channelName, eventName, callback) {
  const channel = getChannel(channelName);
  channel.subscribe(eventName, callback);
  return callback;
}

export function unbindEvent(channelName, eventName, callback) {
  const channel = getChannel(channelName);
  channel.unsubscribe(eventName, callback);
}

export async function getChannelMembers(channelName) {
  const channel = getChannel(channelName);
  try {
    const members = await channel.presence.get();
    return members.map(m => ({
      user_id: m.clientId,
      user_info: m.data
    }));
  } catch (err) {
    console.error('[Ably] Failed to get presence members:', err);
    return [];
  }
}

export function isChannelSubscribed(channelName) {
  const channel = getChannel(channelName);
  return channel.state === 'attached' || channel.state === 'attaching';
}

export default ably;