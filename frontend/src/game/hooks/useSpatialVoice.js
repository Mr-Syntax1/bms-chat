import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../hooks/useChat';
import { subscribeSpatial, getSpatialSnapshot } from '../stores/usePlayerStore';

const LIVEKIT_WS = import.meta.env.VITE_LIVEKIT_URL || '';
const SPATIAL_TICK = 100;
const HEARING_RADIUS = 26;
const MIN_VOLUME = 0.12;
const MAX_VOLUME = 1;
const ROLLOFF_POWER = 1.6;

const EMPTY = { roomId: null, token: null, url: null, error: null };

/**
 * چت صوتی Spatial روی LiveKit.
 * - توکن از بک‌اند (`/api/livekit/token`) با همان JWT چت گرفته می‌شود
 * - موقعیت محلی از usePlayerStore خوانده و روی هر تیک آپدیت می‌شود
 * - حجم صدای هر بازیکن ریموت بر اساس فاصله‌ی واقعی 3D محاسبه می‌شود
 */
export function useSpatialVoice({ roomId, enabled = true }) {
  const [data, setData] = useState(EMPTY);
  const [micEnabled, setMicEnabled] = useState(true);

  const roomRef = useRef(null);
  const localPositionRef = useRef({ x: 0, z: 0 });

  // اگر داده مربوط به اتاق دیگری باشد، به‌عنوان «در حال بارگذاری» در نظر گرفته می‌شود
  const current = data.roomId === roomId ? data : EMPTY;
  const status = !enabled || !roomId
    ? 'idle'
    : current.error
      ? 'error'
      : current.token
        ? 'ready'
        : 'loading';
  const serverUrl = current.url || LIVEKIT_WS;

  // دریافت توکن از بک‌اند (state فقط داخل callback ها آپدیت می‌شود)
  useEffect(() => {
    if (!enabled || !roomId) return undefined;

    let cancelled = false;

    apiRequest('/api/livekit/token', {
      method: 'POST',
      body: JSON.stringify({ roomName: roomId }),
    })
      .then((res) => {
        if (cancelled) return;
        if (!res?.token) throw new Error(res?.error || 'توکن LiveKit دریافت نشد');
        setData({ roomId, token: res.token, url: res.url || null, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setData({ roomId, token: null, url: null, error: err.message || 'خطا در اتصال به LiveKit' });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, roomId]);

  // ثبت اتاق LiveKit برای اعمال حجم صدا
  const registerRoom = useCallback((room) => {
    roomRef.current = room;
  }, []);

  // موقعیت محلی را از Store بگیر (بدون re-render)
  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeSpatial((players) => {
      const me = players.find((p) => p.id === 'local');
      if (me) localPositionRef.current = { x: me.x, z: me.z };
    });
  }, [enabled]);

  // هر ۱۰۰ms حجم صدای هر ریموت را بر اساس فاصله تنظیم می‌کند
  useEffect(() => {
    if (!enabled) return undefined;

    const applyDistanceVolumes = () => {
      const room = roomRef.current;
      if (!room) return;

      const snapshot = getSpatialSnapshot();
      const byId = new Map(snapshot.filter((p) => p.id !== 'local').map((p) => [p.id, p]));
      const me = localPositionRef.current;

      for (const participant of room.remoteParticipants.values()) {
        const pos = byId.get(participant.identity);
        const audioPubs = Array.from(participant.audioTrackPublications.values());

        if (!pos) {
          // بدون موقعیت: صدای محیطی کامل تا از دست نرود
          for (const pub of audioPubs) if (pub.track) pub.track.setVolume?.(0.55);
          continue;
        }

        const dist = Math.hypot(pos.x - me.x, pos.z - me.z);
        const t = Math.min(1, dist / HEARING_RADIUS);
        const volume = Math.max(MIN_VOLUME, MAX_VOLUME * Math.pow(1 - t, ROLLOFF_POWER));

        for (const pub of audioPubs) {
          if (!pub.track) continue;
          pub.track.setVolume?.(volume);
        }
      }
    };

    const timer = setInterval(applyDistanceVolumes, SPATIAL_TICK);
    return () => clearInterval(timer);
  }, [enabled]);

  // روشن/خاموش کردن میکروفن
  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
    } catch {
      /* ignore */
    }
  }, [micEnabled]);

  return {
    token: current.token,
    serverUrl,
    status,
    error: current.error,
    micEnabled,
    toggleMic,
    registerRoom,
  };
}
