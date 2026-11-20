import { useMemo } from 'react';
import Avatar from './Avatar';

function UsersIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PhoneIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function VideoIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function Spinner({ className = 'h-4 w-4' }) {
  return <span className={`${className} inline-block rounded-full border-2 border-current border-t-transparent animate-spin`} aria-hidden="true" />;
}

const fmtCount = (n) => Number(n || 0).toLocaleString('fa-IR');

function WaveBars() {
  return (
    <span className="flex items-end gap-[3px] h-4" aria-hidden="true">
      {[0, 0.15, 0.3].map((delay) => (
        <span
          key={delay}
          className="w-[3px] h-full rounded-full bg-emerald-400"
          style={{ animation: 'cc-eq .9s ease-in-out infinite', animationDelay: `${delay}s`, transformOrigin: 'bottom' }}
        />
      ))}
    </span>
  );
}

const CSS = `
@keyframes cc-eq { 0%,100% { transform: scaleY(.3) } 50% { transform: scaleY(1) } }
@keyframes cc-in { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: none } }
.cc-in { animation: cc-in .28s cubic-bezier(.2,.8,.2,1) both }
@media (prefers-reduced-motion: reduce) {
  .cc-in { animation: none !important }
  .cc-eq-fallback { animation: none !important }
}
`;

export default function GroupCallBanner({
  activeCall,
  inCall = false,
  participants = [],
  currentUserId = null,
  duration = 0,
  isMuted = false,
  isVideoOn = false,
  isScreenSharing = false,
  busy = false,
  onJoin,
  onEnd,
  onToggleMute,
  onExpand,
}) {
  const isJoined = Boolean(inCall);

  const people = useMemo(
    () => (participants || []).filter((participant) => participant && participant.id),
    [participants],
  );

  const others = people.filter((participant) => String(participant.id) !== String(currentUserId));
  const visibleOthers = others.slice(0, 4);
  const extra = others.length - visibleOthers.length;

  if (!isJoined && !activeCall) return null;

  const count = isJoined ? people.length : Number(activeCall?.participants?.length || 0);
  const callType = isJoined ? null : activeCall?.callType;
  const clock = `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`;

  return (
    <div dir="rtl" className="cc-in px-2 pt-2 sm:px-3 lg:px-4">
      <style>{CSS}</style>
      <div
        className={`relative overflow-hidden rounded-2xl border px-3 py-2.5 shadow-lg backdrop-blur-xl transition-colors sm:px-4 ${isJoined
          ? 'border-emerald-400/25 bg-emerald-500/[0.08]'
          : 'border-primary-400/25 bg-primary-500/[0.08]'
          }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 w-24 opacity-40 blur-2xl"
          style={{ background: isJoined ? 'radial-gradient(circle at 0% 50%, rgba(16,185,129,.55), transparent 70%)' : 'radial-gradient(circle at 0% 50%, rgba(99,102,241,.55), transparent 70%)' }}
        />

        <div className="relative flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            {isJoined ? (
              <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <WaveBars />
                <span className="absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,.25)] animate-pulse" />
              </span>
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-500/20 text-primary-300">
                {callType === 'video' ? <VideoIcon className="h-4 w-4" /> : <PhoneIcon className="h-4 w-4" />}
              </span>
            )}

            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-[13px] font-bold text-surface-50 sm:text-sm">
                {isJoined ? 'شما در تماس گروهی هستید' : 'تماس گروهی در جریان است'}
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-surface-200">
                  {fmtCount(count)} نفر
                </span>
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-surface-400 sm:text-xs">
                {isJoined ? (
                  <>
                    <span dir="ltr" className="tabular-nums font-medium text-emerald-300">{clock}</span>
                    <span className="text-surface-600">•</span>
                    <span>میکروفون {isMuted ? 'خاموش' : 'روشن'}</span>
                    {isScreenSharing && (
                      <>
                        <span className="text-surface-600">•</span>
                        <span>اشتراک صفحه</span>
                      </>
                    )}
                    {!isScreenSharing && isVideoOn && (
                      <>
                        <span className="text-surface-600">•</span>
                        <span>دوربین روشن</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <UsersIcon className="h-3.5 w-3.5" />
                    <span className="truncate">هم‌تیمی‌ها منتظر شما هستند</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {people.length > 0 && (
            <div className="order-3 flex w-full items-center gap-2 sm:order-none sm:w-auto">
              <div className="flex items-center">
                {(isJoined ? visibleOthers : people.slice(0, 4)).map((participant) => (
                  <span key={participant.id} className="-ms-2 first:ms-0 rounded-full ring-2 ring-surface-950/80">
                    <Avatar
                      username={participant.username}
                      avatarIndex={participant.avatarIndex}
                      size="xs"
                      className="pointer-events-none"
                    />
                  </span>
                ))}
                {isJoined && extra > 0 && (
                  <span className="-ms-2 grid h-8 w-8 place-items-center rounded-full bg-surface-800 text-[10px] font-bold text-surface-300 ring-2 ring-surface-950/80">
                    +{fmtCount(extra)}
                  </span>
                )}
              </div>
              {!isJoined && people[0]?.username && (
                <span className="truncate text-[11px] text-surface-400">{people[0].username} شروع کرده</span>
              )}
            </div>
          )}

          <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
            {isJoined ? (
              <>
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-pressed={isMuted}
                  title={isMuted ? 'روشن کردن میکروفون (M)' : 'بی‌صدا کردن (M)'}
                  className={`btn-ghost grid h-9 w-9 place-items-center rounded-xl transition-colors cursor-pointer ${isMuted
                    ? 'bg-rose-500/90 text-white hover:bg-rose-400'
                    : 'text-surface-200 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {isMuted ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <line x1="2" x2="22" y1="2" y2="22" />
                      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                      <path d="M5 10v2a7 7 0 0 0 12 5" />
                      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onExpand}
                  className="flex items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20 cursor-pointer sm:px-3"
                  title="بازگشت به پنجره‌ی تماس"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" x2="14" y1="3" y2="10" />
                    <line x1="3" x2="10" y1="21" y2="14" />
                  </svg>
                  <span className="hidden sm:inline">نمایش تماس</span>
                </button>

                <button
                  type="button"
                  onClick={onEnd}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500 text-white transition hover:bg-rose-400 cursor-pointer"
                  title="قطع تماس"
                  aria-label="قطع تماس"
                >
                  <PhoneIcon className="h-4 w-4 rotate-[135deg]" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onJoin}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer sm:px-4"
              >
                {busy ? <Spinner className="h-3.5 w-3.5" /> : <PhoneIcon className="h-3.5 w-3.5" />}
                پیوستن به تماس
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
