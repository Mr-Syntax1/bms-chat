// ---------------------------------------------------------------------------
// پل رویدادهای واقعی LiveKit → استور بازی
// `activeSpeakersChanged` تنها منبع معتبر «در حال صحبت» است.
// micEnabled فقط یعنی میکروفن باز است، نه اینکه صدا در حال ارسال است.
// ---------------------------------------------------------------------------
import { usePlayerStore } from './stores/usePlayerStore';

let roomRef = null;
let handler = null;

function publish(speakers) {
  const ids = (speakers || [])
    .map((p) => (p?.identity != null ? String(p.identity) : null))
    .filter(Boolean);
  usePlayerStore.getState().setSpeaking(ids);
}

export function attachVoiceActivity(room) {
  detachVoiceActivity();
  if (!room) return;
  roomRef = room;

  handler = (speakers) => publish(speakers);
  room.on?.('activeSpeakersChanged', handler);

  // وضعیت اولیه (اتصال مجدد / mount دیرهنگام)
  publish(room.activeSpeakers || []);
}

export function detachVoiceActivity() {
  if (roomRef && handler) {
    try {
      roomRef.off?.('activeSpeakersChanged', handler);
    } catch {
      /* ignore */
    }
  }
  roomRef = null;
  handler = null;
  usePlayerStore.getState().setSpeaking([]);
}

export function getVoiceActivitySnapshot() {
  return (roomRef?.activeSpeakers || []).map((p) => String(p.identity));
}

export function subscribeVoiceActivity() {
  return () => {};
}
