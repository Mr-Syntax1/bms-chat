import { Apinator } from '@apinator/client';

const APINATOR_KEY = import.meta.env.VITE_APINATOR_KEY;
const APINATOR_CLUSTER = import.meta.env.VITE_APINATOR_CLUSTER || 'us';

const tokenRef = { current: null };
export function setApinatorAuthToken(token) {
  tokenRef.current = token;
  apinator.options.authHeaders = token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

const AUTH_ENDPOINT = '/api/apinator/auth';

if (!APINATOR_KEY) {
  console.warn('[Apinator] VITE_APINATOR_KEY is not set');
}

export const apinator = new Apinator({
  appKey: APINATOR_KEY,
  cluster: APINATOR_CLUSTER,
  authEndpoint: AUTH_ENDPOINT,
  authHeaders: {},
  enableReconnect: true,
});

apinator.bind('state_change', ({ previous, current }) => {
  console.log('[Apinator] state change:', previous, '->', current);
});

apinator.bind('realtime:error', (err) => {
  console.error('[Apinator] realtime error:', err);
});


export function getRoomChannelName(roomName) {
  if (roomName.startsWith('dm_')) {
    const idsPart = roomName.replace('dm_', '');

    return `private-dm-${idsPart.replace('_', '-')}`;
  }
  return `presence-room-${roomName}`;
}

export function getDMChannelName(userId1, userId2) {
  const ids = [userId1, userId2].sort();
  return `private-dm-${ids[0]}-${ids[1]}`;
}

export function getNotificationChannelName(userId) {
  return `private-notifications-${userId}`;
}

export function getWebRTCChannelName(userId1, userId2) {
  const ids = [userId1, userId2].sort();
  return `private-webrtc-${ids[0]}-${ids[1]}`;
}

export function subscribeToRoom(roomName) {
  const channelName = getRoomChannelName(roomName);
  return apinator.subscribe(channelName);
}

export function subscribeToDM(userId1, userId2) {
  const channelName = getDMChannelName(userId1, userId2);
  return apinator.subscribe(channelName);
}

export function subscribeToNotifications(userId) {
  const channelName = getNotificationChannelName(userId);
  return apinator.subscribe(channelName);
}

export function subscribeToWebRTC(userId1, userId2) {
  const channelName = getWebRTCChannelName(userId1, userId2);
  return apinator.subscribe(channelName);
}

export function unsubscribeFromRoom(roomName) {
  const channelName = getRoomChannelName(roomName);
  return apinator.unsubscribe(channelName);
}

export function unsubscribeFromDM(userId1, userId2) {
  const channelName = getDMChannelName(userId1, userId2);
  return apinator.unsubscribe(channelName);
}

export function unsubscribeFromNotifications(userId) {
  const channelName = getNotificationChannelName(userId);
  return apinator.unsubscribe(channelName);
}

export function unsubscribeFromWebRTC(userId1, userId2) {
  const channelName = getWebRTCChannelName(userId1, userId2);
  return apinator.unsubscribe(channelName);
}

export function triggerClientEvent(channelName, eventName, data) {
  const channel = apinator.channel(channelName);
  if (!channel || channel.subscribed !== true) {
    console.warn(`[Apinator] Cannot trigger "${eventName}" on channel "${channelName}": channel not subscribed`);
    return false;
  }
  return apinator.trigger(channelName, `client-${eventName}`, data);
}

export function bindEvent(channelName, eventName, callback) {
  const channel = apinator.channel(channelName);
  if (channel) {
    return channel.bind(eventName, callback);
  }
  return null;
}

export function bindClientEvent(channelName, eventName, callback) {
  const channel = apinator.channel(channelName);
  if (channel) {
    return channel.bind(`client-${eventName}`, callback);
  }
  return null;
}

export function unbindEvent(channelName, eventName, callback) {
  const channel = apinator.channel(channelName);
  if (channel) {
    channel.unbind(eventName, callback);
  }
}

export function unbindClientEvent(channelName, eventName, callback) {
  const channel = apinator.channel(channelName);
  if (channel) {
    channel.unbind(`client-${eventName}`, callback);
  }
}

export function getChannelMembers(channelName) {
  const channel = apinator.channel(channelName);
  if (channel && typeof channel.getMembers === 'function') {
    return channel.getMembers();
  }
  return [];
}

export function isChannelSubscribed(channelName) {
  const channel = apinator.channel(channelName);
  return channel?.subscribed === true;
}

export default apinator;