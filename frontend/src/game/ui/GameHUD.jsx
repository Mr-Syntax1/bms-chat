import { usePlayerStore } from '../stores/usePlayerStore';
import { LocalSpeakingIndicator } from '../components/VoiceActivityIndicator';
import { GlassPanel } from './primitives';

function MicIcon({ on }) {
  return on ? (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 003-3V4.5a3 3 0 00-6 0v8.25a3 3 0 003 3z"
      />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.25 9.75v1.5a5.25 5.25 0 01-8.4 4.05M6.75 9.75v1.5c0 .857.2 1.667.555 2.386M12 18.75v3.75m-3.75 0h7.5M3 3l18 18"
      />
    </svg>
  );
}

function Avatar({ username }) {
  const initial = (username || '؟').trim().charAt(0).toUpperCase();
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5d9b78] to-[#3d6b52] text-sm font-extrabold text-[#f5ebdd] shadow-inner">
      {initial}
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#171426] bg-[#65F5A0]" />
    </div>
  );
}

/**
 * HUD اصلی بالا-راست: آواتار، نام، میکروفن، تعداد بازیکن، وضعیت اتصال.
 */
export default function GameHUD({ user, roomId, micEnabled, toggleMic, connected, onOpenSettings, onOpenLog }) {
  const peerCount = usePlayerStore((s) => s.peerCount);
  const syncStatus = usePlayerStore((s) => s.syncStatus);
  const quests = usePlayerStore((s) => s.quests);

  const online = syncStatus === 'connected';
  const total = Math.max(peerCount, 1);
  const questDone = quests.chestOpened;
  const questProgress = [quests.parchments >= 3, quests.lanterns >= 5, quests.hasKey, quests.chestOpened].filter(Boolean).length;

  return (
    <GlassPanel className="pointer-events-auto w-[232px] overflow-hidden">
      {/* سربرگ */}
      <div className="flex items-center gap-2.5 border-b border-white/8 px-3 py-2.5">
        <Avatar username={user?.username} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-bold text-[#f5ebdd]">{user?.username || 'مهمان'}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#f5ebdd]/50">
            <span
              className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[#65F5A0]' : 'bg-[#f59e0b]'}`}
              aria-hidden="true"
            />
            <span className="truncate">
              {online ? `کمپ ${roomId}` : syncStatus === 'connecting' ? 'در حال اتصال…' : 'آفلاین'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="تنظیمات"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#f5ebdd]/55 transition-colors hover:bg-white/10 hover:text-[#f5ebdd]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M10.34 3.94c.09-.54.56-.94 1.11-.94h1.1c.55 0 1.02.4 1.11.94l.15.9c.44.13.86.32 1.24.55l.72-.55a1.13 1.13 0 011.45.1l.78.78c.39.39.44 1 .11 1.45l-.55.72c.23.38.42.8.55 1.24l.9.15c.54.09.94.56.94 1.11v1.1c0 .55-.4 1.02-.94 1.11l-.9.15c-.13.44-.32.86-.55 1.24l.55.72c.33.45.28 1.06-.11 1.45l-.78.78a1.13 1.13 0 01-1.45.1l-.72-.55c-.38.23-.8.42-1.24.55l-.15.9c-.09.54-.56.94-1.11.94h-1.1c-.55 0-1.02-.4-1.11-.94l-.15-.9a5.5 5.5 0 01-1.24-.55l-.72.55a1.13 1.13 0 01-1.45-.1l-.78-.78a1.13 1.13 0 01-.11-1.45l.55-.72a5.5 5.5 0 01-.55-1.24l-.9-.15A1.13 1.13 0 013 12.55v-1.1c0-.55.4-1.02.94-1.11l.9-.15c.13-.44.32-.86.55-1.24l-.55-.72a1.13 1.13 0 01.11-1.45l.78-.78a1.13 1.13 0 011.45-.1l.72.55c.38-.23.8-.42 1.24-.55l.15-.9z"
            />
            <circle cx="12" cy="12" r="2.6" strokeWidth={1.8} />
          </svg>
        </button>
      </div>

      {/* وضعیت‌ها */}
      <div className="flex items-center justify-between px-3 py-2">
        <LocalSpeakingIndicator />
        <span className="flex items-center gap-1 rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-[#f5ebdd]/70">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          {total}/9
        </span>
      </div>

      {/* دکمه‌ها */}
      <div className="flex gap-1.5 px-3 pb-3">
        <button
          type="button"
          onClick={toggleMic}
          disabled={!connected}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
            micEnabled
              ? 'border-[#65F5A0]/40 bg-[#65F5A0]/14 text-[#65F5A0]'
              : 'border-white/12 bg-white/[0.04] text-[#f5ebdd]/55'
          } ${!connected ? 'cursor-not-allowed opacity-45' : 'hover:brightness-110'}`}
          title={micEnabled ? 'قطع میکروفن' : 'وصل میکروفن'}
        >
          <MicIcon on={micEnabled} />
          {micEnabled ? 'روشن' : 'خاموش'}
        </button>

        <button
          type="button"
          onClick={onOpenLog}
          className="flex items-center justify-center gap-1 rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-[#f5ebdd]/80 transition-colors hover:bg-white/10"
          title="مأموریت‌ها و اینونتوری"
        >
          <span aria-hidden="true">📜</span>
          {questDone ? 'کامل' : `${questProgress}/4`}
        </button>
      </div>
    </GlassPanel>
  );
}
