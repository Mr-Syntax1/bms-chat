import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sileo } from 'sileo';
import { END_REASON_TEXT } from '../hooks/useWebRTC';

/*
 * استفاده در Chat.jsx:
 *
 *   const groupCall = useGroupWebRTC({ currentUser: user, connected, currentRoom });
 *   ...
 *   <GroupCallModal call={groupCall} user={user} expanded={expanded} onCollapse={...} onExpand={...} />
 *
 * کلیدهای میانبر در تماس (مستقل از زبان کیبورد): M میکروفون، D قطع صدا، V دوربین، S اشتراک صفحه
 */

// ===========================================================================
// ثابت‌های آواتار (برای هماهنگی با کل برنامه)
// ===========================================================================
const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
];

const AVATAR_IMAGES = [
  '/avatars/red.png', '/avatars/orange.png', '/avatars/yellow.png',
  '/avatars/green.png', '/avatars/teal.png', '/avatars/blue.png',
  '/avatars/indigo.png', '/avatars/purple.png', '/avatars/pink.png',
  '/avatars/slate.png',
];

function getAvatarIndex(username) {
  if (!username) return 5;
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

// ===========================================================================
// استایل‌ها و انیمیشن‌ها
// ===========================================================================
const CSS = `
@keyframes cm-eq { 0%,100% { transform: scaleY(.3) } 50% { transform: scaleY(1) } }
@keyframes cm-speak { 0% { box-shadow: 0 0 0 0 rgba(52,211,153,.55) } 100% { box-shadow: 0 0 0 16px rgba(52,211,153,0) } }
@keyframes cm-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes cm-rise { from { opacity: 0; transform: translateY(14px) scale(.98) } to { opacity: 1; transform: none } }
.cm-eq-bar { animation: cm-eq .9s ease-in-out infinite; transform-origin: bottom }
.cm-speaking { animation: cm-speak 1.2s ease-out infinite }
.cm-fade { animation: cm-fade .25s ease-out both }
.cm-rise { animation: cm-rise .3s cubic-bezier(.2,.8,.2,1) both }
.cm-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.15) transparent }
@media (prefers-reduced-motion: reduce) {
  .cm-eq-bar, .cm-speaking, .cm-fade, .cm-rise { animation: none !important }
}
`;

const QUIET_END_REASONS = new Set(['local-ended', 'rejected-local', 'unmounted']);
const ERROR_END_REASONS = new Set(['error', 'connection-lost', 'connection-failed']);

// ===========================================================================
// توابع کمکی
// ===========================================================================
const fmtNum = (n) =>
  Number(n).toLocaleString('fa-IR', { minimumIntegerDigits: 2, useGrouping: false });

function formatDuration(seconds = 0) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${fmtNum(h)}:${fmtNum(m)}:${fmtNum(s)}` : `${fmtNum(m)}:${fmtNum(s)}`;
}

function hueOf(name = '') {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
}

const gradientOf = (name) => {
  const h = hueOf(name);
  return `linear-gradient(135deg, hsl(${h} 70% 56%), hsl(${(h + 45) % 360} 72% 40%))`;
};

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = Array.from(parts[0])[0] ?? '';
  const second = parts[1] ? Array.from(parts[1])[0] : '';
  return `${first}${second}`.toUpperCase();
}

const hasLiveVideo = (stream) =>
  !!stream?.getVideoTracks?.().some((t) => t.enabled && !t.muted && t.readyState === 'live');

const hasAnyVideo = (stream) =>
  !!stream?.getVideoTracks?.().some((t) => !t.muted && t.readyState === 'live');

const isEditable = (el) =>
  !!el &&
  (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

function gridClassFor(count) {
  if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
  if (count <= 6) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
}

// ===========================================================================
// Hook ها
// ===========================================================================

/** تشخیص «در حال صحبت» از روی سطح صدای stream (بدون پخش صدای اضافه) */
// یک AudioContext مشترک برای همه‌ی کاشی‌ها: ساخت یک context به‌ازای هر شرکت‌کننده
// در تماس ۳+ نفره سقف context مرورگر را پر می‌کرد و باعث قطع/فریز صدا می‌شد.
let sharedAudioCtx = null;
function getSharedAudioCtx() {
  if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') return sharedAudioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    sharedAudioCtx = new AC();
  } catch {
    sharedAudioCtx = null;
  }
  return sharedAudioCtx;
}

function useSpeaking(stream, active = true) {
  const [speaking, setSpeaking] = useState(false);
  const audioTrack = stream?.getAudioTracks?.()[0] ?? null;

  useEffect(() => {
    const reset = setTimeout(() => setSpeaking(false), 0);
    if (!active || !audioTrack) return () => clearTimeout(reset);

    const ctx = getSharedAudioCtx();
    if (!ctx) return () => clearTimeout(reset);

    let source;
    let raf;
    let state = false;
    let lastSpoke = 0;
    let lastTick = 0;

    try {
      source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      const tick = (t) => {
        raf = requestAnimationFrame(tick);
        if (t - lastTick < 90) return;
        lastTick = t;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const now = performance.now();
        if (rms > 0.03) lastSpoke = now;
        const next = now - lastSpoke < 380;
        if (next !== state) {
          state = next;
          setSpeaking(next);
        }
      };
      raf = requestAnimationFrame(tick);
      if (ctx.state === 'suspended') ctx.resume().catch(() => { });
    } catch {
      /* مرورگر پشتیبانی نمی‌کند */
    }

    return () => {
      cancelAnimationFrame(raf);
      try {
        source?.disconnect();
      } catch {
        /* ignore */
      }
      // context مشترک است و بسته نمی‌شود
    };
  }, [audioTrack, active]);

  return speaking;
}

/** اجرای اکشن async با قفل (جلوگیری از کلیک‌های پشت‌سرهم) */
function useBusyAction(fn) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const run = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await fnRef.current?.();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  return [run, busy];
}

// ===========================================================================
// آیکون‌ها
// ===========================================================================
function Svg({ className = 'w-5 h-5', children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const MicIcon = (p) => (
  <Svg {...p}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </Svg>
);
const MicOffIcon = (p) => (
  <Svg {...p}>
    <line x1="2" x2="22" y1="2" y2="22" />
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <path d="M5 10v2a7 7 0 0 0 12 5" />
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </Svg>
);
const HeadphonesIcon = (p) => (
  <Svg {...p}>
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
  </Svg>
);
const HeadphonesOffIcon = (p) => (
  <Svg {...p}>
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </Svg>
);
const VideoIcon = (p) => (
  <Svg {...p}>
    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </Svg>
);
const VideoOffIcon = (p) => (
  <Svg {...p}>
    <path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196" />
    <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
    <path d="m2 2 20 20" />
  </Svg>
);
const ScreenIcon = (p) => (
  <Svg {...p}>
    <path d="m9 10 3-3 3 3" />
    <path d="M12 13V7" />
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <path d="M12 17v4" />
    <path d="M8 21h8" />
  </Svg>
);
const ScreenOffIcon = (p) => (
  <Svg {...p}>
    <path d="M17 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-.2.9" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="m2 2 20 20" />
  </Svg>
);
const PhoneIcon = (p) => (
  <Svg {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
);
const UsersIcon = (p) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);
const MinimizeIcon = (p) => (
  <Svg {...p}>
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" x2="21" y1="10" y2="3" />
    <line x1="3" x2="10" y1="21" y2="14" />
  </Svg>
);
const MaximizeIcon = (p) => (
  <Svg {...p}>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" x2="14" y1="3" y2="10" />
    <line x1="3" x2="10" y1="21" y2="14" />
  </Svg>
);
const FullscreenIcon = (p) => (
  <Svg {...p}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
  </Svg>
);
const XIcon = (p) => (
  <Svg {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
);
const VolumeIcon = (p) => (
  <Svg {...p}>
    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </Svg>
);

const Spinner = ({ className = 'w-5 h-5' }) => (
  <span
    className={`${className} inline-block rounded-full border-2 border-current border-t-transparent animate-spin`}
    aria-hidden="true"
  />
);

// ===========================================================================
// اجزای پایه
// ===========================================================================

function Avatar({ name, avatarIndex, className = 'w-24 h-24 text-3xl', speaking = false }) {
  const finalIndex = (avatarIndex !== undefined && avatarIndex !== null) ? avatarIndex : getAvatarIndex(name);
  const safeIndex = (finalIndex >= 0 && finalIndex < 10) ? finalIndex : 5;
  const avatarImage = AVATAR_IMAGES[safeIndex];

  return (
    <div
      className={`relative shrink-0 select-none rounded-full grid place-items-center overflow-hidden font-bold text-white shadow-xl ring-1 ring-white/10 transition-shadow ${speaking ? 'cm-speaking' : ''} ${className}`}
      style={{ backgroundColor: AVATAR_COLORS[safeIndex] }}
      aria-hidden="true"
    >
      <img
        src={avatarImage}
        alt={name || 'Avatar'}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.target.style.display = 'none';
          const fallback = e.target.parentElement.querySelector('.initials-fallback');
          if (fallback) fallback.classList.remove('hidden');
        }}
      />
      <div className="initials-fallback hidden w-full h-full items-center justify-center" style={{ background: gradientOf(name) }}>
        {initialsOf(name)}
      </div>
    </div>
  );
}

function StreamVideo({ stream, muted = true, mirror = false, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream || null;
    if (stream) el.play?.().catch(() => { });
  }, [stream]);

  useEffect(
    () => () => {
      const el = ref.current;
      if (el) {
        el.pause();
        el.srcObject = null;
      }
    },
    []
  );

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`${className} ${mirror ? '-scale-x-100' : ''}`}
    />
  );
}

function RemoteAudio({ id, stream, onBlocked }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (el.srcObject !== (stream || null)) el.srcObject = stream || null;
    if (!stream) return undefined;

    el.play?.()
      .then(() => onBlocked?.(false))
      .catch(() => onBlocked?.(true));
    return undefined;
  }, [stream, onBlocked]);

  useEffect(
    () => () => {
      const el = ref.current;
      if (el) {
        el.pause();
        el.srcObject = null;
      }
    },
    []
  );

  return <audio ref={ref} autoPlay playsInline className="hidden" aria-hidden="true" data-peer={id} />;
}

function Equalizer({ className = '' }) {
  return (
    <span className={`flex items-end gap-[3px] h-4 ${className}`} aria-hidden="true">
      {[0, 0.15, 0.3].map((delay) => (
        <span
          key={delay}
          className="cm-eq-bar w-[3px] h-full rounded-full bg-emerald-400"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}

function ControlButton({ label, hint, onClick, variant = 'default', disabled, busy, pressed, children }) {
  const variants = {
    default: 'bg-white/10 text-white hover:bg-white/20',
    light: 'bg-white text-neutral-900 hover:bg-white/90',
    danger: 'bg-rose-500 text-white hover:bg-rose-400',
    warning: 'bg-amber-400 text-neutral-900 hover:bg-amber-300',
    accent: 'bg-indigo-500 text-white hover:bg-indigo-400',
  };
  const title = hint ? `${label} (${hint})` : label;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        title={title}
        aria-label={label}
        aria-pressed={pressed}
        className={`grid place-items-center w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-90 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${variants[variant]}`}
      >
        {busy ? <Spinner /> : children}
      </button>
      <span className="hidden sm:block text-[11px] leading-none text-white/70 select-none whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

function StatusIcons({ micOff, deafened }) {
  if (!micOff && !deafened) return null;
  return (
    <div className="flex items-center gap-1.5">
      {micOff && (
        <span className="grid place-items-center w-7 h-7 rounded-full bg-rose-500/90 text-white" title="میکروفون خاموش است">
          <MicOffIcon className="w-4 h-4" />
        </span>
      )}
      {deafened && (
        <span className="grid place-items-center w-7 h-7 rounded-full bg-amber-400 text-neutral-900" title="صدا قطع است">
          <HeadphonesOffIcon className="w-4 h-4" />
        </span>
      )}
    </div>
  );
}

function Tile({
  name,
  avatarIndex,
  stream,
  showVideo,
  mirror,
  speaking,
  micOff,
  deafened,
  isLocal,
  compact,
  statusText,
  presenting,
  className = '',
}) {
  return (
    <div
      className={`relative min-h-0 min-w-0 overflow-hidden rounded-3xl bg-[#16181c] transition-all duration-300 ${speaking
        ? 'ring-2 ring-emerald-400/80 shadow-[0_0_0_6px_rgba(52,211,153,0.10)]'
        : 'ring-1 ring-white/[0.07]'
        } ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(60% 55% at 50% 42%, hsl(${hueOf(name)} 60% 30% / .45), transparent 72%)`,
        }}
      />

      {showVideo ? (
        <StreamVideo
          stream={stream}
          mirror={mirror}
          className={`absolute inset-0 w-full h-full ${presenting ? 'object-contain' : 'object-cover'}`}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <Avatar
            name={name}
            avatarIndex={avatarIndex}
            speaking={speaking}
            className={compact ? 'w-14 h-14 text-xl' : 'w-24 h-24 text-3xl md:w-32 md:h-32 md:text-5xl'}
          />
        </div>
      )}

      {statusText && (
        <div className="absolute inset-x-0 top-3 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-black/55 backdrop-blur-md px-3 py-1 text-xs text-white/90">
            <Spinner className="w-3 h-3" />
            {statusText}
          </span>
        </div>
      )}

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="absolute top-3 start-3">
        <StatusIcons micOff={micOff} deafened={deafened} />
      </div>
      {speaking && (
        <div className="absolute top-3 end-3 grid place-items-center rounded-full bg-black/55 backdrop-blur-md px-2 py-1.5">
          <Equalizer />
        </div>
      )}

      <div className="absolute bottom-3 end-3 flex max-w-[85%] items-center gap-2 rounded-xl bg-black/55 backdrop-blur-md px-3 py-1.5 text-sm font-medium text-white">
        <span className="truncate">{isLocal ? 'شما' : name}</span>
        {presenting && (
          <span className="shrink-0 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-semibold">
            اشتراک صفحه
          </span>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// پنجره‌ی کوچک (وقتی تماس minimize است)
// ===========================================================================
function MiniCall({
  title,
  name,
  avatarIndex,
  stream,
  showVideo,
  speaking,
  duration,
  connecting,
  participantCount,
  isMuted,
  onToggleMute,
  onEnd,
  onExpand,
}) {
  return (
    <div
      dir="rtl"
      role="region"
      aria-label="تماس گروهی فعال"
      className="cm-rise fixed bottom-4 end-4 z-[100] w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-[#14161a]/95 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
    >
      <button
        type="button"
        onClick={onExpand}
        aria-label="بازگشت به تماس"
        className="relative block aspect-video w-full cursor-pointer bg-black outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      >
        {showVideo ? (
          <StreamVideo stream={stream} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center bg-[#16181c]">
            <Avatar name={name} avatarIndex={avatarIndex} speaking={speaking} className="w-16 h-16 text-2xl" />
          </span>
        )}
        <span className="absolute start-2 top-2 rounded-full bg-black/55 p-1.5 backdrop-blur">
          <MaximizeIcon className="h-3.5 w-3.5" />
        </span>
        <span className="absolute end-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] backdrop-blur">
          <UsersIcon className="h-3 w-3" />
          {participantCount.toLocaleString('fa-IR')}
        </span>
      </button>
      <div className="flex items-center gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-white/60" dir="ltr" style={{ textAlign: 'right' }}>
            {connecting ? 'در حال اتصال…' : formatDuration(duration)}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'روشن کردن میکروفون' : 'بی‌صدا کردن'}
          aria-pressed={isMuted}
          className={`grid h-9 w-9 place-items-center rounded-full transition cursor-pointer ${isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
        >
          {isMuted ? <MicOffIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onEnd}
          aria-label="قطع تماس"
          className="grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-white transition hover:bg-rose-400 cursor-pointer"
        >
          <PhoneIcon className="h-4 w-4 rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
// کاشی شرکت‌کننده (با تشخیص صحبت اختصاصی)
// ===========================================================================
function ParticipantTile({ participant, connected, compact, className }) {
  const speaking = useSpeaking(participant.stream, connected && !(participant.isLocal && participant.muted));
  const showVideo = participant.screenSharing
    ? hasAnyVideo(participant.stream)
    : Boolean(participant.video) && hasLiveVideo(participant.stream);

  return (
    <Tile
      name={participant.username || 'کاربر'}
      avatarIndex={participant.avatarIndex}
      stream={participant.stream}
      showVideo={showVideo}
      mirror={participant.isLocal && !participant.screenSharing}
      speaking={speaking}
      micOff={participant.muted}
      deafened={participant.isDeafened}
      isLocal={participant.isLocal}
      compact={compact}
      presenting={participant.screenSharing}
      className={className}
    />
  );
}

function ParticipantRow({ row, connected }) {
  const speaking = useSpeaking(row.stream, connected);
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${speaking ? 'bg-emerald-400/10' : 'hover:bg-white/5'}`}
    >
      <Avatar name={row.name} avatarIndex={row.avatarIndex} speaking={speaking} className="w-10 h-10 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {row.name}
          {row.you && <span className="ms-1.5 text-xs text-white/50">(شما)</span>}
        </p>
        {speaking && <p className="text-[11px] text-emerald-300">در حال صحبت…</p>}
      </div>
      <div className="flex items-center gap-1.5 text-white/70">
        {speaking && <Equalizer />}
        {row.muted && <MicOffIcon className="h-4 w-4 text-rose-400" />}
        {row.video && <VideoIcon className="h-4 w-4 text-emerald-400" />}
        {row.screen && <ScreenIcon className="h-4 w-4 text-indigo-300" />}
      </div>
    </li>
  );
}

// ===========================================================================
// GroupCallModal
// ===========================================================================
export default function GroupCallModal({ call, user, title, expanded = true, onCollapse, onExpand }) {
  const c = call || {};
  const {
    callState = 'idle',
    roomName,
    participants = [],
    isMuted = false,
    isDeafened = false,
    isVideoOn = false,
    isScreenSharing = false,
    remoteScreenSharing = false,
    duration = 0,
    error,
    endReason,
    endCall,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleCamera,
    toggleScreenShare,
  } = c;

  const [panelOpen, setPanelOpen] = useState(false);
  const [dismissedError, setDismissedError] = useState(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rootRef = useRef(null);

  const active = callState !== 'idle';
  const inCall = callState === 'connecting' || callState === 'connected';
  const connected = callState === 'connected';
  const minimized = inCall && !expanded;

  const remotes = useMemo(() => participants.filter((p) => !p.isLocal), [participants]);
  const localP = useMemo(() => participants.find((p) => p.isLocal) || null, [participants]);

  const roomTitle = roomName || title || 'تماس گروهی';
  const myName = user?.username || 'شما';
  const myAvatarIndex = user?.avatarIndex ?? null;

  const primaryRemote = remotes[0] || null;

  const presentingRemote = remotes.find((p) => p.screenSharing) || null;
  const presenting = Boolean(presentingRemote) || isScreenSharing;

  const canShareScreen = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
  const toggleVideoFn = toggleVideo ?? toggleCamera;

  const [onToggleVideo, videoBusy] = useBusyAction(toggleVideoFn);
  const [onToggleScreen, screenBusy] = useBusyAction(toggleScreenShare);

  const handleAudioBlocked = useCallback((blocked) => setAudioBlocked(blocked), []);

  const resumeAudio = useCallback(() => {
    const elements = document.querySelectorAll('audio[data-peer]');
    if (!elements.length) {
      setAudioBlocked(false);
      return;
    }
    Promise.all(Array.from(elements).map((el) => el.play?.().catch(() => {})))
      .then(() => setAudioBlocked(false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (callState !== 'idle') return undefined;
    const timer = setTimeout(() => setAudioBlocked(false), 0);
    return () => clearTimeout(timer);
  }, [callState]);

  useEffect(() => {
    if (!audioBlocked) return undefined;
    const resume = () => resumeAudio();
    window.addEventListener('pointerdown', resume, { once: true });
    return () => window.removeEventListener('pointerdown', resume);
  }, [audioBlocked, resumeAudio]);

  useEffect(() => {
    if (active) return undefined;
    const reset = setTimeout(() => setPanelOpen(false), 0);
    return () => clearTimeout(reset);
  }, [active]);

  useEffect(() => {
    if (callState === 'idle' && (error || (endReason && !QUIET_END_REASONS.has(endReason)))) {
      const message = error || END_REASON_TEXT[endReason];
      const isErr = Boolean(error) || ERROR_END_REASONS.has(endReason);

      if (isErr) {
        sileo.error({
          title: 'خطا در تماس گروهی',
          description: message,
          duration: 4500,
        });
      } else {
        sileo.info({
          title: 'پایان تماس گروهی',
          description: message,
          duration: 4500,
        });
      }
    }
  }, [callState, error, endReason]);

  useEffect(() => {
    if (!inCall || minimized) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [inCall, minimized]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!inCall || minimized) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
      switch (e.code) {
        case 'KeyM':
          toggleMute?.();
          break;
        case 'KeyD':
          toggleDeafen?.();
          break;
        case 'KeyV':
          onToggleVideo();
          break;
        case 'KeyS':
          if (canShareScreen) onToggleScreen();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    inCall,
    minimized,
    toggleMute,
    toggleDeafen,
    onToggleVideo,
    onToggleScreen,
    canShareScreen,
  ]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else rootRef.current?.requestFullscreen?.().catch(() => { });
  };

  if (!call || !inCall) return null;

  const connecting = callState === 'connecting';
  const participantCount = participants.length || 1;

  const rows = participants.map((p) => ({
    id: p.id,
    name: p.isLocal ? myName : p.username,
    you: Boolean(p.isLocal),
    avatarIndex: p.isLocal ? myAvatarIndex : p.avatarIndex,
    muted: Boolean(p.muted),
    video: Boolean(p.video),
    screen: Boolean(p.screenSharing),
    stream: p.stream,
  }));

  const miniParticipant = presentingRemote || remotes.find((p) => p.video) || primaryRemote || localP;

  return (
    <>
      <style>{CSS}</style>

      {remotes.map((participant) => (
        <RemoteAudio
          key={`audio-${participant.id}`}
          id={participant.id}
          stream={participant.stream}
          onBlocked={handleAudioBlocked}
        />
      ))}

      {minimized && (
        <MiniCall
          title={roomTitle}
          name={miniParticipant?.isLocal ? myName : miniParticipant?.username || roomTitle}
          avatarIndex={miniParticipant?.isLocal ? myAvatarIndex : miniParticipant?.avatarIndex ?? null}
          stream={miniParticipant?.stream || null}
          showVideo={
            miniParticipant?.screenSharing
              ? hasAnyVideo(miniParticipant?.stream)
              : Boolean(miniParticipant?.video) && hasLiveVideo(miniParticipant?.stream)
          }
          speaking={false}
          duration={duration}
          connecting={connecting}
          participantCount={participantCount}
          isMuted={isMuted}
          onToggleMute={() => toggleMute?.()}
          onEnd={() => endCall?.()}
          onExpand={() => onExpand?.()}
        />
      )}

      {!minimized && (
        <div
          ref={rootRef}
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label={`تماس گروهی در ${roomTitle}`}
          className="cm-fade fixed inset-0 z-[100] flex flex-col bg-[#0b0c0f] text-white"
        >
          <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => onCollapse?.()}
                title="کوچک کردن تماس (بازگشت به چت)"
                aria-label="کوچک کردن تماس"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 outline-none focus-visible:ring-2 focus-visible:ring-white/80 cursor-pointer"
              >
                <MinimizeIcon className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 truncate text-sm font-bold md:text-base">
                  {roomTitle}
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70">
                    <UsersIcon className="h-3 w-3" />
                    {participantCount.toLocaleString('fa-IR')}
                  </span>
                </h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/60">
                  {connecting ? (
                    <>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                      در حال اتصال…
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span dir="ltr" className="tabular-nums">
                        {formatDuration(duration)}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {presenting && (
                <span className="hidden items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200 ring-1 ring-indigo-400/30 sm:flex">
                  <ScreenIcon className="h-3.5 w-3.5" />
                  {isScreenSharing ? 'در حال اشتراک صفحه' : 'اشتراک صفحه فعال'}
                </span>
              )}
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
                aria-label={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
                className="hidden h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:grid cursor-pointer"
              >
                <FullscreenIcon className="h-5 w-5" />
              </button>
            </div>
          </header>

          {error && error !== dismissedError && (
            <div
              role="alert"
              className="mx-4 mb-1 flex items-center justify-between gap-3 rounded-2xl bg-rose-500/15 px-4 py-2.5 text-sm text-rose-100 ring-1 ring-rose-400/30 md:mx-6"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setDismissedError(error)}
                aria-label="بستن پیام"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/10 cursor-pointer"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          <main className="relative flex min-h-0 flex-1 gap-3 px-3 pb-2 md:px-4">
            {presenting ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:flex-row">
                <section className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl bg-black ring-1 ring-white/10">
                  {presentingRemote ? (
                    <>
                      {hasAnyVideo(presentingRemote.stream) && (
                        <StreamVideo
                          stream={presentingRemote.stream}
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                      )}
                      {!hasAnyVideo(presentingRemote.stream) && (
                        <div className="absolute inset-0 grid place-items-center">
                          <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
                            <Spinner className="h-4 w-4" />
                            در حال دریافت تصویر صفحه…
                          </span>
                        </div>
                      )}
                      <span className="absolute bottom-3 end-3 flex items-center gap-2 rounded-xl bg-black/60 px-3 py-1.5 text-sm font-medium backdrop-blur-md">
                        <ScreenIcon className="h-4 w-4 text-indigo-300" />
                        اشتراک صفحه توسط {presentingRemote.username}
                      </span>
                    </>
                  ) : (
                    <div className="absolute inset-0 grid place-items-center p-6 text-center">
                      <div className="flex max-w-sm flex-col items-center">
                        <span className="grid h-20 w-20 place-items-center rounded-full bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/30">
                          <ScreenIcon className="h-9 w-9" />
                        </span>
                        <h2 className="mt-5 text-lg font-bold">صفحه‌ی شما در حال اشتراک است</h2>
                        <p className="mt-2 text-sm leading-6 text-white/60">
                          سایر شرکت‌کنندگان می‌توانند صفحه‌ی شما را ببینند. برای جلوگیری از تصویر تکراری، پیش‌نمایش اینجا نشان داده نمی‌شود.
                        </p>
                        <button
                          type="button"
                          onClick={onToggleScreen}
                          disabled={screenBusy}
                          className="mt-6 flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {screenBusy ? <Spinner className="h-4 w-4" /> : <ScreenOffIcon className="h-4 w-4" />}
                          توقف اشتراک
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <div className="cm-scroll flex shrink-0 gap-3 overflow-x-auto lg:w-64 lg:flex-col lg:overflow-y-auto xl:w-72">
                  {participants.map((participant) => (
                    <ParticipantTile
                      key={participant.id}
                      participant={participant}
                      connected={connected}
                      compact
                      className="aspect-video w-40 shrink-0 sm:w-52 lg:w-full"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className={`grid min-h-0 min-w-0 flex-1 auto-rows-fr gap-3 ${gridClassFor(participantCount)}`}>
                {participants.map((participant) => (
                  <ParticipantTile
                    key={participant.id}
                    participant={participant}
                    connected={connected}
                  />
                ))}
                {participantCount === 1 && (
                  <div className="grid place-items-center rounded-3xl bg-[#131417] p-6 ring-1 ring-white/[0.07]">
                    <div className="flex flex-col items-center text-center">
                      <Spinner className="h-6 w-6 text-white/60" />
                      <p className="mt-3 text-sm text-white/60">در انتظار پیوستن دیگران…</p>
                      <p className="mt-1 text-xs text-white/40">بنر بالای چت را هم‌تیمی‌هایتان می‌بینند و می‌توانند بپیوندند</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {panelOpen && (
              <>
                <button
                  type="button"
                  aria-label="بستن فهرست شرکت‌کنندگان"
                  onClick={() => setPanelOpen(false)}
                  className="cm-fade fixed inset-0 z-10 bg-black/50 md:hidden cursor-pointer"
                />
                <aside
                  aria-label="شرکت‌کنندگان"
                  className="cm-rise fixed inset-x-0 bottom-0 z-20 flex max-h-[70vh] flex-col overflow-hidden rounded-t-3xl bg-[#14161a] ring-1 ring-white/10 md:static md:max-h-none md:w-80 md:shrink-0 md:rounded-3xl"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
                    <h2 className="text-sm font-bold">
                      شرکت‌کنندگان <span className="text-white/50">({participantCount.toLocaleString('fa-IR')})</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setPanelOpen(false)}
                      aria-label="بستن"
                      className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white cursor-pointer"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <ul className="cm-scroll flex-1 space-y-1 overflow-y-auto p-2">
                    {rows.map((r) => (
                      <ParticipantRow key={r.id} row={r} connected={connected} />
                    ))}
                  </ul>
                </aside>
              </>
            )}

            {audioBlocked && connected && (
              <button
                type="button"
                onClick={resumeAudio}
                className="cm-rise absolute bottom-3 start-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 cursor-pointer"
              >
                <VolumeIcon className="h-4 w-4" />
                برای پخش صدا کلیک کنید
              </button>
            )}
          </main>

          <footer className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:px-6">
            <div className="flex items-end justify-center gap-4 md:justify-between">
              <div className="hidden w-24 md:block" aria-hidden="true" />

              <div className="flex items-end justify-center gap-2.5 sm:gap-4">
                <ControlButton
                  label={isMuted ? 'باز کردن میکروفون' : 'بی‌صدا کردن'}
                  hint="M"
                  variant={isMuted ? 'danger' : 'default'}
                  pressed={isMuted}
                  onClick={() => toggleMute?.()}
                >
                  {isMuted ? <MicOffIcon className="h-5 w-5 sm:h-6 sm:w-6" /> : <MicIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
                </ControlButton>

                <ControlButton
                  label={isDeafened ? 'وصل کردن صدا' : 'قطع صدا'}
                  hint="D"
                  variant={isDeafened ? 'warning' : 'default'}
                  pressed={isDeafened}
                  onClick={() => toggleDeafen?.()}
                >
                  {isDeafened ? (
                    <HeadphonesOffIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <HeadphonesIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </ControlButton>

                <ControlButton
                  label={isVideoOn ? 'بستن دوربین' : 'باز کردن دوربین'}
                  hint="V"
                  variant={isVideoOn ? 'light' : 'default'}
                  pressed={isVideoOn}
                  busy={videoBusy}
                  disabled={isScreenSharing}
                  onClick={onToggleVideo}
                >
                  {isVideoOn ? <VideoIcon className="h-5 w-5 sm:h-6 sm:w-6" /> : <VideoOffIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
                </ControlButton>

                {canShareScreen && (
                  <ControlButton
                    label={isScreenSharing ? 'توقف اشتراک' : 'اشتراک‌گذاری صفحه'}
                    hint="S"
                    variant={isScreenSharing ? 'accent' : 'default'}
                    pressed={isScreenSharing}
                    busy={screenBusy}
                    disabled={remoteScreenSharing && !isScreenSharing}
                    onClick={onToggleScreen}
                  >
                    {isScreenSharing ? <ScreenOffIcon className="h-5 w-5 sm:h-6 sm:w-6" /> : <ScreenIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
                  </ControlButton>
                )}

                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => endCall?.()}
                    title="قطع تماس"
                    aria-label="قطع تماس"
                    className="grid h-12 w-16 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-400 active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-14 sm:w-20 cursor-pointer"
                  >
                    <PhoneIcon className="h-6 w-6 rotate-[135deg]" />
                  </button>
                  <span className="hidden text-[11px] leading-none text-white/70 sm:block">قطع تماس</span>
                </div>

                <div className="md:hidden">
                  <ControlButton
                    label="شرکت‌کنندگان"
                    variant={panelOpen ? 'light' : 'default'}
                    pressed={panelOpen}
                    onClick={() => setPanelOpen((v) => !v)}
                  >
                    <UsersIcon className="h-5 w-5" />
                  </ControlButton>
                </div>
              </div>

              <div className="hidden w-24 justify-end md:flex">
                <ControlButton
                  label="شرکت‌کنندگان"
                  variant={panelOpen ? 'light' : 'default'}
                  pressed={panelOpen}
                  onClick={() => setPanelOpen((v) => !v)}
                >
                  <UsersIcon className="h-6 w-6" />
                </ControlButton>
              </div>
            </div>
          </footer>
        </div>
      )}
    </>
  );
}
