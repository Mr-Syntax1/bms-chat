import { usePlayerStore } from '../stores/usePlayerStore';
import { setMicFromUI } from '../voiceControl';

/**
 * کنترل میکروفن از HUD:
 * - از voiceControl (اتاق LiveKit فعال) استفاده می‌کند
 * - وضعیت در usePlayerStore نگه داشته می‌شود تا HUD re-render شود
 */
export function useMicControl() {
  const micEnabled = usePlayerStore((s) => s.micEnabled);
  const setMicEnabled = usePlayerStore((s) => s.setMicEnabled);

  const toggleMic = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    setMicFromUI(next);
  };

  return { micEnabled, toggleMic };
}
