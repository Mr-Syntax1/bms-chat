import { useEffect, useRef } from 'react';
import { ably, getChannel, encodeChannelPart } from '../../lib/ably';
import { usePlayerStore, emitSpatialFrame, remoteMap } from '../stores/usePlayerStore';
import { playPositionalOneShot } from '../audio';
import { GUITAR_SOUNDS, YUM_SOUND } from '../sounds';

// نرخ ارسال موقعیت: ۱۵ بار در ثانیه (۶۶ میلی‌ثانیه)
const SYNC_INTERVAL = 66;
const PRUNE_INTERVAL = 2000;
const PRUNE_TIMEOUT = 9000;

export function getGameChannelName(roomId) {
  return `game-state-${encodeChannelPart(roomId)}`;
}

const round2 = (n) => Math.round(n * 100) / 100;

// در StrictMode افکت دو بار اجرا می‌شود؛ با توکن نشست مطمئن می‌شویم
// cleanup قدیمی، کانال نشست جدید را detach/release نکند
const sessions = new Map();
let sessionSeq = 0;

export function useGameSync({ roomId, user, enabled = true }) {
  const lastSentRef = useRef({ x: null, z: null, rot: null, seat: null, at: 0 });
  const disposedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !roomId || !user?.id) return undefined;

    disposedRef.current = false;
    lastSentRef.current = { x: null, z: null, rot: null, seat: null, at: 0 };

    const channelName = getGameChannelName(roomId);
    const channel = getChannel(channelName);
    const store = usePlayerStore.getState();
    store.setSyncStatus('connecting');

    const sessionToken = ++sessionSeq;
    sessions.set(channelName, sessionToken);
    const isStale = () => sessions.get(channelName) !== sessionToken;

    let intervalId = null;
    let ready = false;
    let onConnectionReady = null;

    const selfPayload = () => {
      const { local, character } = usePlayerStore.getState();
      return {
        x: round2(local.x),
        z: round2(local.z),
        rot: round2(local.rot),
        seat: local.seat,
        emote: local.emote,
        action: local.action,
        userId: user.id,
        username: user.username,
        character,
      };
    };

    const publishPosition = (force = false) => {
      const payload = selfPayload();
      const last = lastSentRef.current;
      if (
        !force &&
        last.x === payload.x &&
        last.z === payload.z &&
        last.rot === payload.rot &&
        last.seat === payload.seat &&
        last.emote === payload.emote &&
        last.action === payload.action
      ) {
        return;
      }
      lastSentRef.current = { ...payload, at: Date.now() };
      channel.publish('player-move', payload).catch(() => {});
    };

    const onPlayerMove = (message) => {
      const data = message?.data;
      if (!data || !data.userId) return;
      if (String(data.userId) === String(user.id)) return;
      usePlayerStore.getState().upsertRemote(String(data.userId), data);
    };

    const onPlayerLeft = (message) => {
      const data = message?.data;
      if (!data?.userId) return;
      usePlayerStore.getState().removeRemote(String(data.userId));
    };

    // رویدادهای لحظه‌ای اکشن/ایموت/گیتار بازیکنان دیگر
    const onPlayerAction = (message) => {
      const data = message?.data;
      if (!data || !data.userId) return;
      if (String(data.userId) === String(user.id)) return;

      const id = String(data.userId);
      const entry = remoteMap.get(id);
      if (!entry) return;

      const now = Date.now();
      const duration = Number(data.duration) || 0;

      switch (data.type) {
        case 'action':
          entry.action = data.action ?? null;
          entry.actionUntil = duration ? now + duration : 0;
          if (data.action === 'guitar') {
            playPositionalOneShot(data.sound || GUITAR_SOUNDS[0], [entry.current.x, 1.2, entry.current.z], {
              volume: 0.75,
            });
          }
          break;
        case 'action-end':
          entry.action = null;
          entry.actionUntil = 0;
          break;
        case 'guitar': {
          // پخش صدای گیتار از موقعیت بازیکن (رویداد مستقل)
          const soundUrl = data.sound || GUITAR_SOUNDS[0];
          playPositionalOneShot(soundUrl, [entry.current.x, 1.2, entry.current.z], { volume: 0.8 });
          entry.action = 'guitar';
          entry.actionUntil = now + (duration || 5000);
          break;
        }
        case 'marshmallow-ready':
          playPositionalOneShot(YUM_SOUND, [entry.current.x, 1.2, entry.current.z], {
            volume: 0.7,
          });
          break;
        case 'emote':
          entry.emote = data.emote ?? null;
          entry.emoteUntil = duration ? now + duration : 0;
          break;
        default:
          break;
      }
      entry.lastSeen = performance.now();
    };

    const upsertFromMember = (member) => {
      if (!member?.clientId || String(member.clientId) === String(user.id)) return;
      const payload = {
        x: member.data?.x ?? 0,
        z: member.data?.z ?? 0,
        rot: member.data?.rot ?? 0,
        seat: member.data?.seat ?? null,
        username: member.data?.username,
        character: member.data?.character,
      };
      if (member.data && 'emote' in member.data) payload.emote = member.data.emote;
      if (member.data && 'action' in member.data) payload.action = member.data.action;
      usePlayerStore.getState().upsertRemote(String(member.clientId), payload);
    };

    const onPresenceEnter = (member) => {
      upsertFromMember(member);
      channel.presence
        .get()
        .then((members) => {
          if (Array.isArray(members)) usePlayerStore.getState().setPeerCount(members.length);
        })
        .catch(() => {});
      channel.publish('player-move', selfPayload()).catch(() => {});
    };

    const onPresenceLeave = (member) => {
      if (!member?.clientId) return;
      usePlayerStore.getState().removeRemote(String(member.clientId));
      channel.presence
        .get()
        .then((members) => {
          if (Array.isArray(members)) usePlayerStore.getState().setPeerCount(members.length);
        })
        .catch(() => {});
    };

    const syncPresenceMembers = async () => {
      try {
        const members = (await channel.presence.get()) || [];
        members.forEach(upsertFromMember);
        usePlayerStore.getState().setPeerCount(members.length);
      } catch {
        /* ignore */
      }
    };

    channel.subscribe('player-move', onPlayerMove).catch(() => {});
    channel.subscribe('player-left', onPlayerLeft).catch(() => {});
    channel.subscribe('player-action', onPlayerAction).catch(() => {});
    channel.presence.subscribe('enter', onPresenceEnter).catch(() => {});
    channel.presence.subscribe('leave', onPresenceLeave).catch(() => {});

    const onReady = () => {
      if (disposedRef.current || ready || isStale()) return;
      ready = true;

      const { local, character } = usePlayerStore.getState();

      channel.presence
        .enter({
          username: user.username,
          character,
          x: round2(local.x),
          z: round2(local.z),
          rot: round2(local.rot),
          seat: local.seat,
        })
        .catch(() => {});

      syncPresenceMembers();
      usePlayerStore.getState().setSyncStatus('connected');

      intervalId = setInterval(() => {
        const now = Date.now();
        const force = now - (lastSentRef.current.at || 0) > 3000;
        publishPosition(force);
        emitSpatialFrame();
      }, SYNC_INTERVAL);
    };

    const startSync = () => {
      if (disposedRef.current || isStale()) return;
      if (channel.state === 'attached') {
        onReady();
      } else {
        channel.once('attached', onReady);
        channel
          .attach()
          .then(() => onReady())
          .catch(() => {});
      }
    };

    if (ably.connection.state === 'connected') {
      startSync();
    } else {
      onConnectionReady = () => startSync();
      ably.connection.once('connected', onConnectionReady);
    }

    const pruneId = setInterval(() => {
      const now = performance.now();
      for (const [id, entry] of Array.from(remoteMap.entries())) {
        if (now - entry.lastSeen > PRUNE_TIMEOUT) {
          usePlayerStore.getState().removeRemote(id);
        }
      }
    }, PRUNE_INTERVAL);

    return () => {
      disposedRef.current = true;
      ready = false;
      if (intervalId) clearInterval(intervalId);
      clearInterval(pruneId);

      const stale = isStale();

      try {
        channel.unsubscribe('player-move', onPlayerMove);
        channel.unsubscribe('player-left', onPlayerLeft);
        channel.unsubscribe('player-action', onPlayerAction);
        channel.presence.unsubscribe('enter', onPresenceEnter);
        channel.presence.unsubscribe('leave', onPresenceLeave);
        channel.off('attached', onReady);
        if (onConnectionReady) ably.connection.off('connected', onConnectionReady);
      } catch {
        /* ignore */
      }

      if (stale) return;

      sessions.delete(channelName);

      if (ably.connection.state === 'connected') {
        channel.publish('player-left', selfPayload()).catch(() => {});
        channel.presence
          .leave()
          .catch(() => {})
          .finally(() => {
            channel
              .detach()
              .catch(() => {})
              .finally(() => {
                try {
                  ably.channels.release(channelName);
                } catch {
                  /* ignore */
                }
              });
          });
      } else {
        try {
          ably.channels.release(channelName);
        } catch {
          /* ignore */
        }
      }

      const state = usePlayerStore.getState();
      state.clearRemotes();
      state.setSyncStatus('idle');
      state.setPeerCount(0);
    };
  }, [roomId, user?.id, user?.username, enabled]);

  return { channelName: roomId ? getGameChannelName(roomId) : null };
}

// انتشار رویداد اکشن/ایموت/گیتار روی کانال بازی
export function publishPlayerAction(roomId, user, type, extra = {}) {
  if (!roomId || !user?.id) return;
  const channel = getChannel(getGameChannelName(roomId));
  channel
    .publish('player-action', {
      userId: user.id,
      username: user.username,
      type,
      at: Date.now(),
      ...extra,
    })
    .catch(() => {});
}
