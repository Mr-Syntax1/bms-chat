import { Apinator } from '@apinator/client';

// ---------------------------------------------------------------------------
// پیکربندی
// ---------------------------------------------------------------------------
const APINATOR_KEY = import.meta.env.VITE_APINATOR_KEY;
const APINATOR_CLUSTER = import.meta.env.VITE_APINATOR_CLUSTER || 'us';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// آدرس auth باید به بک‌اند برسد، نه به دامنه‌ی فرانت (در dev به Vite می‌رسید).
// اگر از proxy ی Vite استفاده می‌کنید، VITE_APINATOR_AUTH_ENDPOINT=/api/apinator/auth بگذارید.
const AUTH_ENDPOINT =
  import.meta.env.VITE_APINATOR_AUTH_ENDPOINT || `${API_BASE}/api/apinator/auth`;

if (!APINATOR_KEY) {
  console.warn('[Apinator] VITE_APINATOR_KEY is not set');
}

// ---------------------------------------------------------------------------
// هدرهای auth
// همین یک آبجکت به کتابخانه داده می‌شود و به‌جای جایگزین‌کردن، درجا تغییر می‌کند؛
// پس حتی اگر کتابخانه ارجاع اولیه را نگه دارد، توکن جدید اعمال می‌شود.
// ---------------------------------------------------------------------------
const authHeaders = {};

export function setApinatorAuthToken(token) {
  for (const key of Object.keys(authHeaders)) delete authHeaders[key];
  if (token) authHeaders.Authorization = `Bearer ${token}`;
  if (apinator?.options) apinator.options.authHeaders = authHeaders; // fallback
}

export const apinator = new Apinator({
  appKey: APINATOR_KEY,
  cluster: APINATOR_CLUSTER,
  authEndpoint: AUTH_ENDPOINT,
  authHeaders,
  enableReconnect: true,
  autoConnect: false, // اتصال بعد از ست شدن توکن، با apinator.connect() (اگر کتابخانه نشناسد نادیده گرفته می‌شود)
});

if (import.meta.env.DEV) {
  apinator.bind('state_change', ({ previous, current }) => {
    console.log('[Apinator] state change:', previous, '->', current);
  });
  apinator.bind('realtime:error', (err) => {
    console.error('[Apinator] realtime error:', err);
  });
}

// ---------------------------------------------------------------------------
// ساخت نام کانال
// ---------------------------------------------------------------------------
const MAX_CHANNEL_LENGTH = 164;
const CHANNEL_RE = /^[A-Za-z0-9_\-=@,.;]{1,164}$/;
const SAFE_CHAR_RE = /[A-Za-z0-9_.-]/;
const encoder = new TextEncoder();

/**
 * نام اتاق را برای استفاده در نام کانال امن می‌کند.
 * نام‌های ASCII ساده بدون تغییر می‌مانند. بقیه (فارسی، فاصله، ...) بایت‌به‌بایت
 * به شکل "=HH" کدگذاری می‌شوند. سرور باید همین را decode کند (decodeChannelPart).
 */
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
    throw new Error(`[Apinator] Invalid channel name: "${name}"`);
  }
  return name;
}

/** کانال دو نفره با id های مرتب‌شده (برای هر دو طرف یکسان است) */
function pairChannelName(prefix, a, b) {
  const [x, y] = [String(a), String(b)].sort();
  return assertValidChannelName(`${prefix}${x}-${y}`);
}

export function getRoomChannelName(roomName) {
  if (typeof roomName !== 'string' || !roomName) {
    throw new Error('[Apinator] roomName is required');
  }

  if (roomName.startsWith('dm_')) {
    const parts = roomName.slice(3).split('_');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return pairChannelName('private-dm-', parts[0], parts[1]);
    }
    // فرمت غیرمنتظره: id ها خودشان "_" دارند. فرمت اتاق DM را در سرور یک‌دست کنید.
    console.warn('[Apinator] Unexpected DM room format:', roomName);
    return assertValidChannelName(`private-dm-${roomName.slice(3).replace('_', '-')}`);
  }

  return assertValidChannelName(`presence-room-${encodeChannelPart(roomName)}`);
}

export function getDMChannelName(userId1, userId2) {
  return pairChannelName('private-dm-', userId1, userId2);
}

export function getNotificationChannelName(userId) {
  return assertValidChannelName(`private-notifications-${userId}`);
}

export function getWebRTCChannelName(userId1, userId2) {
  return pairChannelName('private-webrtc-', userId1, userId2);
}

// ---------------------------------------------------------------------------
// subscribe / unsubscribe
// ---------------------------------------------------------------------------
function subscribeOnce(channelName) {
  const existing = apinator.channel(channelName);
  return existing || apinator.subscribe(channelName);
}

export function subscribeToRoom(roomName) {
  return subscribeOnce(getRoomChannelName(roomName));
}

export function subscribeToDM(userId1, userId2) {
  return subscribeOnce(getDMChannelName(userId1, userId2));
}

export function subscribeToNotifications(userId) {
  return subscribeOnce(getNotificationChannelName(userId));
}

export function subscribeToWebRTC(userId1, userId2) {
  return subscribeOnce(getWebRTCChannelName(userId1, userId2));
}

export function unsubscribeFromRoom(roomName) {
  return apinator.unsubscribe(getRoomChannelName(roomName));
}

export function unsubscribeFromDM(userId1, userId2) {
  return apinator.unsubscribe(getDMChannelName(userId1, userId2));
}

export function unsubscribeFromNotifications(userId) {
  return apinator.unsubscribe(getNotificationChannelName(userId));
}

export function unsubscribeFromWebRTC(userId1, userId2) {
  return apinator.unsubscribe(getWebRTCChannelName(userId1, userId2));
}

// ---------------------------------------------------------------------------
// رویدادها
// ---------------------------------------------------------------------------
export function triggerClientEvent(channelName, eventName, data) {
  const channel = apinator.channel(channelName);
  if (!channel || channel.subscribed !== true) {
    console.warn(
      `[Apinator] Cannot trigger "${eventName}" on channel "${channelName}": channel not subscribed`
    );
    return false;
  }
  return apinator.trigger(channelName, `client-${eventName}`, data);
}

export function bindEvent(channelName, eventName, callback) {
  const channel = apinator.channel(channelName);
  return channel ? channel.bind(eventName, callback) : null;
}

export function bindClientEvent(channelName, eventName, callback) {
  const channel = apinator.channel(channelName);
  return channel ? channel.bind(`client-${eventName}`, callback) : null;
}

export function unbindEvent(channelName, eventName, callback) {
  const channel = apinator.channel(channelName);
  if (channel) channel.unbind(eventName, callback);
}

export function unbindClientEvent(channelName, eventName, callback) {
  const channel = apinator.channel(channelName);
  if (channel) channel.unbind(`client-${eventName}`, callback);
}

// ---------------------------------------------------------------------------
// ابزارها
// ---------------------------------------------------------------------------
export function getChannelMembers(channelName) {
  const channel = apinator.channel(channelName);
  if (channel && typeof channel.getMembers === 'function') {
    return channel.getMembers();
  }
  return [];
}

export function isChannelSubscribed(channelName) {
  return apinator.channel(channelName)?.subscribed === true;
}

export default apinator;