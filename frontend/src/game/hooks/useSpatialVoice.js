import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeSpatial, getSpatialSnapshot, usePlayerStore } from '../stores/usePlayerStore';

const SPATIAL_TICK = 100;
const ATTRIBUTE_MIN_INTERVAL = 250; // LiveKit نرخ آپدیت metadata را محدود می‌کند
const ATTRIBUTE_MIN_DELTA = 0.25;
const ATTRIBUTE_KEEPALIVE = 2500;
const HEARING_RADIUS = 26;
const MIN_VOLUME = 0.12;
const MAX_VOLUME = 1;
const ROLLOFF_POWER = 1.6;

/**
 * چت صوتی Spatial روی LiveKit.
 * - موقعیت محلی هر ۱۰۰ms روی attribute های participant نوشته می‌شود (x/y/z)
 * - حجم صدای هر بازیکن ریموت بر اساس فاصله‌ی واقعی 3D محاسبه می‌شود
 */
export function useSpatialVoice({ enabled = true } = {}) {
  const roomRef = useRef(null);
  // وضعیت اولیه از Store خوانده می‌شود تا انتخاب کاربر قبل از اتصال حفظ شود
  const [micEnabled, setMicEnabledState] = useState(() => usePlayerStore.getState().micEnabled);
  const localPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const lastSentRef = useRef({ x: NaN, y: NaN, z: NaN, at: 0 });

  // ثبت اتاق LiveKit (از داخل LiveKitRoom)
  const registerRoom = useCallback((room) => {
    roomRef.current = room;
  }, []);

  // موقعیت محلی را از Store بگیر (بدون re-render)
  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeSpatial((players) => {
      const me = players.find((p) => p.id === 'local');
      if (me) localPositionRef.current = { x: me.x, y: me.y ?? 0, z: me.z };
    });
  }, [enabled]);

  // آپدیت attribute های موقعیت + تنظیم حجم صدا
  useEffect(() => {
    if (!enabled) return undefined;

    const tick = () => {
      const room = roomRef.current;
      if (!room) return;

      const me = localPositionRef.current;

      // Spatial Audio: موقعیت محلی روی attribute ها (X,Y,Z) با throttle
      const now = performance.now();
      const last = lastSentRef.current;
      const moved =
        !Number.isFinite(last.x) ||
        Math.abs(me.x - last.x) > ATTRIBUTE_MIN_DELTA ||
        Math.abs(me.y - last.y) > ATTRIBUTE_MIN_DELTA ||
        Math.abs(me.z - last.z) > ATTRIBUTE_MIN_DELTA;
      if (now - last.at > ATTRIBUTE_KEEPALIVE || (moved && now - last.at > ATTRIBUTE_MIN_INTERVAL)) {
        lastSentRef.current = { x: me.x, y: me.y, z: me.z, at: now };
        room.localParticipant
          ?.setAttributes?.({ x: String(me.x), y: String(me.y), z: String(me.z) })
          .catch(() => {});
      }

      const snapshot = getSpatialSnapshot();
      const byId = new Map(snapshot.filter((p) => p.id !== 'local').map((p) => [p.id, p]));

      for (const participant of room.remoteParticipants.values()) {
        const pos = byId.get(participant.identity);
        const audioPubs = Array.from(participant.audioTrackPublications.values());

        if (!pos) {
          for (const pub of audioPubs) if (pub.track) pub.track.setVolume?.(0.55);
          continue;
        }

        // فاصله‌ی سه‌بعدی (X,Y,Z) از attribute های participant
        const attrs = participant.attributes || {};
        const px = Number.isFinite(Number(attrs.x)) ? Number(attrs.x) : pos.x;
        const py = Number.isFinite(Number(attrs.y)) ? Number(attrs.y) : (pos.y ?? 0);
        const pz = Number.isFinite(Number(attrs.z)) ? Number(attrs.z) : pos.z;

        const dist = Math.hypot(px - me.x, py - me.y, pz - me.z);
        const t = Math.min(1, dist / HEARING_RADIUS);
        const volume = Math.max(MIN_VOLUME, MAX_VOLUME * Math.pow(1 - t, ROLLOFF_POWER));

        for (const pub of audioPubs) {
          if (!pub.track) continue;
          pub.track.setVolume?.(volume);
        }
      }
    };

    const timer = setInterval(tick, SPATIAL_TICK);
    return () => clearInterval(timer);
  }, [enabled]);

  // روشن/خاموش کردن میکروفن
  const setMicEnabled = useCallback(async (next) => {
    const room = roomRef.current;
    if (!room) {
      setMicEnabledState(next);
      usePlayerStore.getState().setMicEnabled(next);
      return;
    }
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicEnabledState(next);
      usePlayerStore.getState().setMicEnabled(next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMic = useCallback(() => {
    setMicEnabled(!micEnabled);
  }, [micEnabled, setMicEnabled]);

  return { micEnabled, setMicEnabled, toggleMic, registerRoom };
}
