import { usePlayerStore } from '../stores/usePlayerStore';
import { useIsSpeaking, useLocalSpeaking } from '../hooks/useSpeaking';

/** سه میله‌ی اکولایزر متحرک — فقط CSS، بدون کتابخانه */
export function EqualizerBars({ className = '' }) {
  return (
    <span className={`inline-flex items-end gap-[2px] h-3 ${className}`} aria-hidden="true">
      <span className="w-[2px] bg-[#65F5A0] rounded-full eq-bar eq-bar-1" />
      <span className="w-[2px] bg-[#65F5A0] rounded-full eq-bar eq-bar-2" />
      <span className="w-[2px] bg-[#65F5A0] rounded-full eq-bar eq-bar-3" />
    </span>
  );
}

/**
 * نشانگر کوچک میکروفن برای نام بازیکن ریموت.
 * فقط وقتی نمایش داده می‌شود که LiveKit واقعاً او را جزو activeSpeakers بفرستد.
 */
export default function VoiceBubble({ id }) {
  const speaking = useIsSpeaking(id);
  if (!speaking) return null;
  return (
    <span className="relative flex items-center justify-center" title="در حال صحبت">
      <span className="absolute h-3.5 w-3.5 rounded-full bg-[#65F5A0]/40 animate-ping" />
      <svg className="relative w-3 h-3 text-[#65F5A0]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 15.75a3 3 0 003-3V4.5a3 3 0 10-6 0v8.25a3 3 0 003 3z" />
        <path d="M6.75 11.25a.75.75 0 00-1.5 0 6.75 6.75 0 006 6.71v2.29H9a.75.75 0 000 1.5h6a.75.75 0 000-1.5h-2.25v-2.29a6.75 6.75 0 006-6.71.75.75 0 00-1.5 0 5.25 5.25 0 01-10.5 0z" />
      </svg>
      <EqualizerBars className="ml-0.5" />
    </span>
  );
}

/** وضعیت صحبت‌کردن محلی برای HUD */
export function LocalSpeakingIndicator({ className = '' }) {
  const speaking = useLocalSpeaking();
  const micEnabled = usePlayerStore((s) => s.micEnabled);

  if (!micEnabled) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-surface-400 ${className}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-surface-500" />
        میکروفن خاموش
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${className}`}>
      {speaking ? (
        <>
          <span className="relative flex items-center justify-center">
            <span className="absolute h-2.5 w-2.5 rounded-full bg-[#65F5A0]/50 animate-ping" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#65F5A0]" />
          </span>
          <span className="text-[#65F5A0] font-semibold">در حال صحبت</span>
          <EqualizerBars />
        </>
      ) : (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-[#65F5A0]/60" />
          <span className="text-surface-300">آماده</span>
        </>
      )}
    </span>
  );
}
