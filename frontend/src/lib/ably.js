import { createClient } from '@ably/pubsub-device';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const AUTH_ENDPOINT = `${API_BASE}/api/ably/auth`;

let authToken = null;

export function setAblyAuthToken(token) {
  authToken = token;
}

export const ably = createClient({
  authCallback: async (tokenParams, callback) => {
    try {
      console.log('[Ably v3] Requesting token from:', AUTH_ENDPOINT);
      
      const res = await fetch(AUTH_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Auth failed: ${res.status} - ${errText}`);
      }
      
      const tokenRequest = await res.json();
      
      console.log('✅ [Frontend] Token received. Capabilities:', tokenRequest.capability);
      
      // تحویل توکن به SDK نسخه ۳
      callback(null, tokenRequest);
    } catch (err) {
      console.error('❌ [Ably v3] Auth callback error:', err);
      callback(err);
    }
  },
  disconnectedRetryTimeout: 3000,
  suspendedRetryTimeout: 10000,
});

// ---------------------------------------------------------------------------
// نام‌گذاری کانال‌ها
// ---------------------------------------------------------------------------
const MAX_CHANNEL_LENGTH = 164;
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
  if (typeof roomName !== 'string' || !roomName) throw new Error('[Ably] roomName is required');
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

export function subscribeToRoom(roomName) { return getChannel(getRoomChannelName(roomName)); }
export function subscribeToDM(userId1, userId2) { return getChannel(getDMChannelName(userId1, userId2)); }
export function subscribeToNotifications(userId) { return getChannel(getNotificationChannelName(userId)); }
export function subscribeToWebRTC(userId1, userId2) { return getChannel(getWebRTCChannelName(userId1, userId2)); }

// 👇 تابع حیاتی برای جلوگیری از خطای release در حالت attached 👇
function safeReleaseChannel(channelName) {
  const channel = ably.channels.get(channelName);
  if (channel) {
    // اگر کانال هنوز متصل یا در حال اتصال است، ابتدا آن را detach کن
    if (channel.state === 'attached' || channel.state === 'attaching') {
      channel.detach();
    }
    // سپس آن را به طور کامل آزاد (release) کن
    ably.channels.release(channelName);
  }
}

// استفاده از تابع ایمن به جای release مستقیم
export function unsubscribeFromRoom(roomName) { safeReleaseChannel(getRoomChannelName(roomName)); }
export function unsubscribeFromDM(userId1, userId2) { safeReleaseChannel(getDMChannelName(userId1, userId2)); }
export function unsubscribeFromNotifications(userId) { safeReleaseChannel(getNotificationChannelName(userId)); }
export function unsubscribeFromWebRTC(userId1, userId2) { safeReleaseChannel(getWebRTCChannelName(userId1, userId2)); }

export function disconnectAbly() {
  ably.close();
}

export function publishEvent(channelName, eventName, data) {
  const channel = getChannel(channelName);
  return channel.publish(eventName, data);
}

export function bindEvent(channelName, eventName, callback) {
  const channel = getChannel(channelName);
  const wrappedFn = (message) => {
    // در v3، آبجکت Message برگردانده می‌شود. داده اصلی در message.data است.
    callback(message.data !== undefined ? message.data : message);
  };
  channel.subscribe(eventName, wrappedFn);
  return wrappedFn;
}

export function unbindEvent(channelName, eventName, callback) {
  const channel = getChannel(channelName);
  channel.unsubscribe(eventName, callback);
}

export async function getChannelMembers(channelName) {
  const channel = getChannel(channelName);
  try {
    const members = await channel.presence.get();
    return members.map(m => ({ user_id: m.clientId, user_info: m.data }));
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