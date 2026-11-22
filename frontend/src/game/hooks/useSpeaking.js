import { usePlayerStore } from '../stores/usePlayerStore';

// وضعیت صحبت‌کردن بر اساس رویداد واقعی LiveKit (نه وضعیت میکروفن)
export function useIsSpeaking(id) {
  return usePlayerStore((s) => Boolean(id != null && s.speakingIds?.includes(String(id))));
}

export function useLocalSpeaking() {
  return usePlayerStore((s) => Boolean(s.selfId && s.speakingIds?.includes(String(s.selfId))));
}
