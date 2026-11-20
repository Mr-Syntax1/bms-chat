import { useEffect, useRef } from 'react';
import { ably, getChannel, encodeChannelPart } from '../../lib/ably';
import { usePlayerStore, emitSpatialFrame, remoteMap } from '../stores/usePlayerStore';

// نرخ ارسال موقعیت: ۱۵ بار در ثانیه (۶۶ میلی‌ثانیه)
const SYNC_INTERVAL = 66;
const PRUNE_INTERVAL = 2000;
const PRUNE_TIMEOUT = 9000;

export function getGameChannelName(roomId) {
  return `game-state-${encodeChannelPart(roomId)}`;
}

// گرد کردن به ۲ رقم اعشار → کاهش حجم پیام
const round2 = (n) => Math.round(n * 100) / 100;

// در StrictMode افکت دو بار اجرا می‌شود؛ با توکن نشست مطمئن می‌شویم
// cleanup قدیمی، کانال نشست جدید را detach/release نکند
const sessions = new Map();
let sessionSeq = 0;

/**
 * سینک چندنفره روی کانال game-state-{roomId}
 * - player-move: موقعیت/چرخش/صندلی بازیکن (۱۵Hz)
 * - player-left: خروج صریح
 * - presence: join/leave + snapshot اولیه‌ی بازیکنان
 */
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

    // توکن نشست: فقط صاحب آخرین نشست حق cleanup دارد
    const sessionToken = ++sessionSeq;
    sessions.set(channelName, sessionToken);
    const isStale = () => sessions.get(channelName) !== sessionToken;

    let intervalId = null;
    let ready = false;

    const selfPayload = () => {
      const { local } = usePlayerStore.getState();
      return {
        x: round2(local.x),
        z: round2(local.z),
        rot: round2(local.rot),
        seat: local.seat,
        userId: user.id,
        username: user.username,
        avatarIndex: user.avatarIndex ?? null,
      };
    };

    const publishPosition = (force = false) => {
      const payload = selfPayload();
      const last = lastSentRef.current;
      // اگر تغییری نبود، پابلیش نکن (کاهش ترافیک در حالت سکون)
      if (
        !force &&
        last.x === payload.x &&
        last.z === payload.z &&
        last.rot === payload.rot &&
        last.seat === payload.seat
      ) {
        return;
      }
      lastSentRef.current = payload;
      lastSentRef.current.at = Date.now();
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

    const upsertFromMember = (member) => {
      if (!member?.clientId || String(member.clientId) === String(user.id)) return;
      usePlayerStore.getState().upsertRemote(String(member.clientId), {
        x: member.data?.x ?? 0,
        z: member.data?.z ?? 0,
        rot: member.data?.rot ?? 0,
        seat: member.data?.seat ?? null,
        username: member.data?.username,
        avatarIndex: member.data?.avatarIndex ?? null,
      });
    };

    const onPresenceEnter = (member) => {
      upsertFromMember(member);
      // موقعیت خود را برای بازیکن تازه‌وارد بفرست
      channel.publish('player-move', selfPayload()).catch(() => {});
    };

    const onPresenceLeave = (member) => {
      if (!member?.clientId) return;
      usePlayerStore.getState().removeRemote(String(member.clientId));
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

    // اشتراک‌ها: Ably به‌صورت خودکار کانال را attach می‌کند
    channel.subscribe('player-move', onPlayerMove).catch(() => {});
    channel.subscribe('player-left', onPlayerLeft).catch(() => {});
    channel.presence.subscribe('enter', onPresenceEnter).catch(() => {});
    channel.presence.subscribe('leave', onPresenceLeave).catch(() => {});

    const onReady = () => {
      if (disposedRef.current || ready || isStale()) return;
      ready = true;

      channel.presence
        .enter({
          username: user.username,
          avatarIndex: user.avatarIndex ?? null,
          x: round2(usePlayerStore.getState().local.x),
          z: round2(usePlayerStore.getState().local.z),
          rot: round2(usePlayerStore.getState().local.rot),
          seat: usePlayerStore.getState().local.seat,
        })
        .catch(() => {});

      syncPresenceMembers();
      usePlayerStore.getState().setSyncStatus('connected');

      intervalId = setInterval(() => {
        const now = Date.now();
        // هر ۳ ثانیه یک heartbeat اجباری تا بازیکن ساکن از لیست پاک نشود
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
        // اگر بین چک state و ثبت listener، کانال attach شد، promise این را پوشش می‌دهد
        channel
          .attach()
          .then(() => onReady())
          .catch(() => {});
      }
    };

    // اگر اتصال Ably هنوز برقرار نشده، منتظر بمان (کانال قبل از اتصال attach نمی‌شود)
    let onConnectionReady = null;
    if (ably.connection.state === 'connected') {
      startSync();
    } else {
      onConnectionReady = () => startSync();
      ably.connection.once('connected', onConnectionReady);
    }

    // پاک‌سازی بازیکنانی که پیامشان قطع شده (packet loss)
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

      // اگر نشست جدیدتری همین کانال را در اختیار گرفته، فقط لیسنرهای خودمان را جدا کن
      const stale = isStale();

      try {
        channel.unsubscribe('player-move', onPlayerMove);
        channel.unsubscribe('player-left', onPlayerLeft);
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
        // بعد از leave، کانال را detach و release کن تا حافظه آزاد شود
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
  }, [roomId, user?.id, user?.username, user?.avatarIndex, enabled]);

  return { channelName: roomId ? getGameChannelName(roomId) : null };
}
