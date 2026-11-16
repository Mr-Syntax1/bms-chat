import { useCallback, useEffect, useRef, useState } from 'react';
import { END_REASON_TEXT } from '../hooks/useWebRTC';

/*
 * استفاده در Chat.jsx:
 *
 *   const rtc = useWebRTC({ currentUser: user, connected });
 *   ...
 *   <CallModal call={rtc} user={user} />
 *
 * کلیدهای میانبر در تماس (مستقل از زبان کیبورد): M میکروفون، D قطع صدا، V دوربین، S اشتراک صفحه
 */

// ===========================================================================
// استایل‌ها و انیمیشن‌ها
// ===========================================================================
const CSS = `
@keyframes cm-eq { 0%,100% { transform: scaleY(.3) } 50% { transform: scaleY(1) } }
@keyframes cm-speak { 0% { box-shadow: 0 0 0 0 rgba(52,211,153,.55) } 100% { box-shadow: 0 0 0 16px rgba(52,211,153,0) } }
@keyframes cm-ripple { 0% { transform: scale(1); opacity: .5 } 100% { transform: scale(2.2); opacity: 0 } }
@keyframes cm-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes cm-rise { from { opacity: 0; transform: translateY(14px) scale(.98) } to { opacity: 1; transform: none } }
@keyframes cm-drop { from { opacity: 0; transform: translate(-50%, -12px) } to { opacity: 1; transform: translate(-50%, 0) } }
.cm-eq-bar { animation: cm-eq .9s ease-in-out infinite; transform-origin: bottom }
.cm-speaking { animation: cm-speak 1.2s ease-out infinite }
.cm-ripple { animation: cm-ripple 2.6s ease-out infinite }
.cm-fade { animation: cm-fade .25s ease-out both }
.cm-rise { animation: cm-rise .3s cubic-bezier(.2,.8,.2,1) both }
.cm-drop { animation: cm-drop .3s ease-out both }
.cm-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.15) transparent }
@media (prefers-reduced-motion: reduce) {
  .cm-eq-bar, .cm-speaking, .cm-ripple, .cm-fade, .cm-rise, .cm-drop { animation: none !important }
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
  !!stream?.getVideoTracks?.().some((t) => t.enabled && t.readyState === 'live');

const hasAnyVideo = (stream) =>
  !!stream?.getVideoTracks?.().some((t) => t.readyState === 'live');

const isEditable = (el) =>
  !!el &&
  (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

// ===========================================================================
// Hook ها
// ===========================================================================

/** تشخیص «در حال صحبت» از روی سطح صدای stream (بدون پخش صدای اضافه) */
function useSpeaking(stream, active = true) {
  const [speaking, setSpeaking] = useState(false);
  const audioTrack = stream?.getAudioTracks?.()[0] ?? null;

  useEffect(() => {
    setSpeaking(false);
    if (!active || !audioTrack) return undefined;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return undefined;

    let ctx;
    let source;
    let raf;
    let state = false;
    let lastSpoke = 0;
    let lastTick = 0;

    try {
      ctx = new AC();
      source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser); // به destination وصل نمی‌شود، پس صدای اضافه پخش نمی‌شود
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
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
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
      ctx?.close?.().catch(() => {});
    };
  }, [audioTrack, active]);

  return speaking;
}

/** اجرای اکشن async با قفل (جلوگیری از کلیک‌های پشت‌سرهم) */
function useBusyAction(fn) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

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
function Avatar({ name, src, className = 'w-24 h-24 text-3xl', speaking = false }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  return (
    <div
      className={`relative shrink-0 select-none rounded-full grid place-items-center overflow-hidden font-bold text-white shadow-xl ring-1 ring-white/10 transition-shadow ${
        speaking ? 'cm-speaking' : ''
      } ${className}`}
      style={{ background: src && !broken ? '#1f2227' : gradientOf(name) }}
      aria-hidden="true"
    >
      {src && !broken ? (
        <img src={src} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
}

/** ویدیو با مدیریت srcObject (حتی اگر element بعداً mount شود) */
function StreamVideo({ stream, muted = true, mirror = false, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream || null;
    if (stream) el.play?.().catch(() => {});
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
        className={`grid place-items-center w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-90 ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        } ${variants[variant]}`}
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

/** کاشی هر شرکت‌کننده */
function Tile({
  name,
  avatarSrc,
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
      className={`relative min-h-0 min-w-0 overflow-hidden rounded-3xl bg-[#16181c] transition-all duration-300 ${
        speaking
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
        <StreamVideo stream={stream} mirror={mirror} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <Avatar
            name={name}
            src={avatarSrc}
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
// صفحه‌ی زنگ (تماس ورودی / خروجی)
// ===========================================================================
function RingingScreen({
  mode,
  name,
  avatarSrc,
  callType,
  localStream,
  onAccept,
  onDecline,
  onCancel,
}) {
  const incoming = mode === 'incoming';
  const isVideo = callType === 'video';
  const showSelf = !incoming && isVideo && hasAnyVideo(localStream);
  const hue = hueOf(name);

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={incoming ? 'تماس ورودی' : 'در حال تماس'}
      className="cm-fade fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden bg-[#0b0c0f] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-white"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 50% at 50% 30%, hsl(${hue} 65% 32% / .55), transparent 70%), radial-gradient(60% 40% at 50% 100%, hsl(${(hue + 60) % 360} 60% 25% / .35), transparent 70%)`,
        }}
      />
      {showSelf && (
        <StreamVideo
          stream={localStream}
          mirror
          className="absolute inset-0 w-full h-full object-cover opacity-25 blur-2xl scale-110"
        />
      )}

      <div className="relative z-10 text-center">
        <p className="flex items-center justify-center gap-2 text-sm text-white/70">
          {isVideo ? <VideoIcon className="w-4 h-4" /> : <PhoneIcon className="w-4 h-4" />}
          {incoming
            ? isVideo
              ? 'تماس تصویری ورودی'
              : 'تماس صوتی ورودی'
            : isVideo
            ? 'تماس تصویری'
            : 'تماس صوتی'}
        </p>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative grid place-items-center">
          {[0, 0.8, 1.6].map((delay) => (
            <span
              key={delay}
              aria-hidden="true"
              className="cm-ripple absolute h-36 w-36 rounded-full border border-white/25 md:h-44 md:w-44"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
          <Avatar name={name} src={avatarSrc} className="w-36 h-36 text-5xl md:w-44 md:h-44 md:text-6xl" />
        </div>
        <h2 className="mt-8 max-w-[80vw] truncate text-2xl font-bold md:text-3xl">{name}</h2>
        <p className="mt-2 flex items-center gap-2 text-sm text-white/65">
          {incoming ? (
            'در حال زنگ زدن به شما…'
          ) : (
            <>
              <Spinner className="w-3.5 h-3.5" />
              در حال تماس…
            </>
          )}
        </p>
      </div>

      <div className="relative z-10 flex items-end justify-center gap-8">
        {incoming ? (
          <>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onDecline}
                aria-label="رد تماس"
                title="رد تماس"
                className="grid h-16 w-16 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition hover:scale-105 hover:bg-rose-400 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <PhoneIcon className="h-7 w-7 rotate-[135deg]" />
              </button>
              <span className="text-xs text-white/70">رد کردن</span>
            </div>

            {isVideo && (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAccept('audio')}
                  aria-label="پاسخ صوتی"
                  title="پاسخ فقط با صدا (دوربین روشن نمی‌شود)"
                  className="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:scale-105 hover:bg-white/25 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <VolumeIcon className="h-7 w-7" />
                </button>
                <span className="text-xs text-white/70">پاسخ صوتی</span>
              </div>
            )}

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => onAccept(isVideo ? 'video' : 'audio')}
                aria-label={isVideo ? 'پاسخ تصویری' : 'پاسخ'}
                title={isVideo ? 'پاسخ تصویری' : 'پاسخ'}
                className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105 hover:bg-emerald-400 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {isVideo ? <VideoIcon className="h-7 w-7" /> : <PhoneIcon className="h-7 w-7" />}
              </button>
              <span className="text-xs text-white/70">{isVideo ? 'پاسخ تصویری' : 'پاسخ'}</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              aria-label="لغو تماس"
              title="لغو تماس"
              className="grid h-16 w-16 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition hover:scale-105 hover:bg-rose-400 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <PhoneIcon className="h-7 w-7 rotate-[135deg]" />
            </button>
            <span className="text-xs text-white/70">لغو تماس</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// پنجره‌ی کوچک (وقتی تماس minimize است)
// ===========================================================================
function MiniCall({
  name,
  avatarSrc,
  stream,
  showVideo,
  speaking,
  duration,
  connecting,
  isMuted,
  onToggleMute,
  onEnd,
  onExpand,
}) {
  return (
    <div
      dir="rtl"
      role="region"
      aria-label="تماس فعال"
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
            <Avatar name={name} src={avatarSrc} speaking={speaking} className="w-16 h-16 text-2xl" />
          </span>
        )}
        <span className="absolute start-2 top-2 rounded-full bg-black/55 p-1.5 backdrop-blur">
          <MaximizeIcon className="h-3.5 w-3.5" />
        </span>
      </button>
      <div className="flex items-center gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-white/60" dir="ltr" style={{ textAlign: 'right' }}>
            {connecting ? 'در حال اتصال…' : formatDuration(duration)}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'روشن کردن میکروفون' : 'بی‌صدا کردن'}
          aria-pressed={isMuted}
          className={`grid h-9 w-9 place-items-center rounded-full transition ${
            isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          {isMuted ? <MicOffIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onEnd}
          aria-label="قطع تماس"
          className="grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-white transition hover:bg-rose-400"
        >
          <PhoneIcon className="h-4 w-4 rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
// CallModal
// ===========================================================================
export default function CallModal({ call, user, title }) {
  const c = call || {};
  const {
    callState = 'idle',
    callType,
    peer,
    localStream,
    remoteStream,
    remoteStreamVersion = 0,
    isMuted = false,
    isDeafened = false,
    isVideoOn = false,
    isScreenSharing = false,
    remoteScreenSharing = false,
    participants = [],
    duration = 0,
    error,
    endReason,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleCamera,
    toggleScreenShare,
  } = c;

  const [minimized, setMinimized] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [dismissedError, setDismissedError] = useState(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const audioRef = useRef(null);
  const rootRef = useRef(null);

  const active = callState !== 'idle';
  const inCall = callState === 'connecting' || callState === 'connected';
  const connected = callState === 'connected';

  const remoteP = participants.find((p) => !p.isLocal);
  const peerName = peer?.username || remoteP?.username || 'کاربر';
  const myName = user?.username || 'شما';
  const peerAvatar = remoteP?.avatar || remoteP?.avatarUrl || peer?.avatar || peer?.avatarUrl;
  const myAvatar = user?.avatar || user?.avatarUrl || user?.profileImage;

  const remoteSpeaking = useSpeaking(remoteStream, connected);
  const localSpeaking = useSpeaking(localStream, connected && !isMuted);

  const showRemoteCamera = !remoteScreenSharing && hasLiveVideo(remoteStream);
  const showRemoteScreen = remoteScreenSharing && hasAnyVideo(remoteStream);
  const remoteScreenWaiting =
    showRemoteScreen && remoteStream.getVideoTracks().every((t) => t.muted);
  const showLocalCamera = isVideoOn && !isScreenSharing && hasLiveVideo(localStream);
  const presenting = remoteScreenSharing || isScreenSharing;

  const canShareScreen = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
  const toggleVideoFn = toggleVideo ?? toggleCamera;

  const [onToggleVideo, videoBusy] = useBusyAction(toggleVideoFn);
  const [onToggleScreen, screenBusy] = useBusyAction(toggleScreenShare);

  // ---------------------------------------------------------------------
  // صدای طرف مقابل (element جدا؛ ویدیوها muted هستند تا صدا دوبار پخش نشود)
  // ---------------------------------------------------------------------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.srcObject !== (remoteStream || null)) audio.srcObject = remoteStream || null;

    if (!remoteStream || remoteStream.getAudioTracks().length === 0) {
      setAudioBlocked(false);
      return;
    }
    audio
      .play()
      .then(() => setAudioBlocked(false))
      .catch(() => setAudioBlocked(true));
  }, [remoteStream, remoteStreamVersion]);

  // اگر مرورگر autoplay را بلاک کرد، با اولین کلیک/لمس پخش شود
  useEffect(() => {
    if (!audioBlocked) return undefined;
    const resume = () => {
      audioRef.current
        ?.play()
        .then(() => setAudioBlocked(false))
        .catch(() => {});
    };
    window.addEventListener('pointerdown', resume, { once: true });
    return () => window.removeEventListener('pointerdown', resume);
  }, [audioBlocked]);

  useEffect(() => {
    if (callState !== 'idle') return;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.srcObject = null;
    }
    setAudioBlocked(false);
  }, [callState]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.srcObject = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------
  // وضعیت UI
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!inCall) setMinimized(false);
    if (!active) setPanelOpen(false);
  }, [inCall, active]);

  // پیام پایان تماس / خطا (فقط وقتی تماس تمام شده)
  useEffect(() => {
    if (callState !== 'idle') {
      setToast(null);
      return undefined;
    }
    const text = error || (endReason && !QUIET_END_REASONS.has(endReason) ? END_REASON_TEXT[endReason] : null);
    if (!text) return undefined;

    setToast({ text, tone: error || ERROR_END_REASONS.has(endReason) ? 'error' : 'info' });
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [callState, error, endReason]);

  // قفل اسکرول صفحه‌ی پشت
  useEffect(() => {
    if (!active || minimized) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active, minimized]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // کلیدهای میانبر (با code، پس روی کیبورد فارسی هم کار می‌کند)
  useEffect(() => {
    if (!inCall) return undefined;
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
          if (canShareScreen && !(remoteScreenSharing && !isScreenSharing)) onToggleScreen();
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
    toggleMute,
    toggleDeafen,
    onToggleVideo,
    onToggleScreen,
    canShareScreen,
    remoteScreenSharing,
    isScreenSharing,
  ]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  if (!call) return null;

  // ---------------------------------------------------------------------
  // اجزای داخلی صفحه‌ی تماس
  // ---------------------------------------------------------------------
  const connecting = callState === 'connecting';
  const headerTitle = title || peerName;

  const rows = [
    {
      id: 'remote',
      name: peerName,
      you: false,
      avatar: peerAvatar,
      muted: Boolean(remoteP?.muted),
      video: showRemoteCamera,
      screen: remoteScreenSharing,
      speaking: remoteSpeaking,
    },
    {
      id: 'me',
      name: myName,
      you: true,
      avatar: myAvatar,
      muted: isMuted,
      video: showLocalCamera,
      screen: isScreenSharing,
      speaking: localSpeaking,
    },
  ];

  const remoteTile = (compact, className) => (
    <Tile
      key="remote"
      name={peerName}
      avatarSrc={peerAvatar}
      stream={remoteStream}
      showVideo={showRemoteCamera}
      speaking={remoteSpeaking}
      micOff={Boolean(remoteP?.muted)}
      compact={compact}
      statusText={connecting ? 'در حال اتصال…' : null}
      className={className}
    />
  );

  const localTile = (compact, className) => (
    <Tile
      key="local"
      name={myName}
      avatarSrc={myAvatar}
      stream={localStream}
      showVideo={showLocalCamera}
      mirror
      speaking={localSpeaking}
      micOff={isMuted}
      deafened={isDeafened}
      isLocal
      compact={compact}
      presenting={isScreenSharing}
      className={className}
    />
  );

  return (
    <>
      <style>{CSS}</style>
      <audio ref={audioRef} autoPlay className="hidden" aria-hidden="true" />

      {/* ---------- پیام پایان تماس / خطا ---------- */}
      {toast && (
        <div
          dir="rtl"
          role="status"
          aria-live="polite"
          className={`cm-drop fixed start-1/2 top-4 z-[110] flex max-w-[90vw] items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium shadow-2xl ring-1 backdrop-blur-xl ${
            toast.tone === 'error'
              ? 'bg-rose-600/90 text-white ring-rose-300/30'
              : 'bg-[#1b1d22]/95 text-white ring-white/10'
          }`}
          style={{ transform: 'translateX(-50%)' }}
        >
          <PhoneIcon className="h-4 w-4 shrink-0 rotate-[135deg]" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* ---------- تماس ورودی ---------- */}
      {callState === 'incoming' && (
        <RingingScreen
          mode="incoming"
          name={peerName}
          avatarSrc={peerAvatar}
          callType={callType}
          onAccept={(type) => acceptCall?.(type)}
          onDecline={() => rejectCall?.()}
        />
      )}

      {/* ---------- تماس خروجی ---------- */}
      {callState === 'calling' && (
        <RingingScreen
          mode="outgoing"
          name={peerName}
          avatarSrc={peerAvatar}
          callType={callType}
          localStream={localStream}
          onCancel={() => endCall?.()}
        />
      )}

      {/* ---------- پنجره‌ی کوچک ---------- */}
      {inCall && minimized && (
        <MiniCall
          name={peerName}
          avatarSrc={peerAvatar}
          stream={remoteStream}
          showVideo={showRemoteCamera || showRemoteScreen}
          speaking={remoteSpeaking}
          duration={duration}
          connecting={connecting}
          isMuted={isMuted}
          onToggleMute={() => toggleMute?.()}
          onEnd={() => endCall?.()}
          onExpand={() => setMinimized(false)}
        />
      )}

      {/* ---------- صفحه‌ی اصلی تماس ---------- */}
      {inCall && !minimized && (
        <div
          ref={rootRef}
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label={`تماس با ${peerName}`}
          className="cm-fade fixed inset-0 z-[100] flex flex-col bg-[#0b0c0f] text-white"
        >
          {/* ----- نوار بالا ----- */}
          <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMinimized(true)}
                title="کوچک کردن تماس (بازگشت به چت)"
                aria-label="کوچک کردن تماس"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <MinimizeIcon className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold md:text-base">{headerTitle}</h1>
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
                className="hidden h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:grid"
              >
                <FullscreenIcon className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* ----- پیام خطا ----- */}
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
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/10"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ----- محتوا ----- */}
          <main className="relative flex min-h-0 flex-1 gap-3 px-3 pb-2 md:px-4">
            {presenting ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:flex-row">
                {/* صحنه‌ی اشتراک صفحه */}
                <section className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl bg-black ring-1 ring-white/10">
                  {remoteScreenSharing ? (
                    <>
                      {showRemoteScreen && (
                        <StreamVideo
                          stream={remoteStream}
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                      )}
                      {(!showRemoteScreen || remoteScreenWaiting) && (
                        <div className="absolute inset-0 grid place-items-center">
                          <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
                            <Spinner className="h-4 w-4" />
                            در حال دریافت تصویر صفحه…
                          </span>
                        </div>
                      )}
                      <span className="absolute bottom-3 end-3 flex items-center gap-2 rounded-xl bg-black/60 px-3 py-1.5 text-sm font-medium backdrop-blur-md">
                        <ScreenIcon className="h-4 w-4 text-indigo-300" />
                        اشتراک صفحه توسط {peerName}
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
                          {peerName} می‌تواند صفحه‌ی شما را ببیند. برای جلوگیری از تصویر تکراری، پیش‌نمایش اینجا نشان داده نمی‌شود.
                        </p>
                        <button
                          type="button"
                          onClick={onToggleScreen}
                          disabled={screenBusy}
                          className="mt-6 flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 active:scale-95 disabled:opacity-60"
                        >
                          {screenBusy ? <Spinner className="h-4 w-4" /> : <ScreenOffIcon className="h-4 w-4" />}
                          توقف اشتراک
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                {/* کاشی‌ها کنار صحنه */}
                <div className="cm-scroll flex shrink-0 gap-3 overflow-x-auto lg:w-64 lg:flex-col lg:overflow-y-auto xl:w-72">
                  {remoteTile(true, 'aspect-video w-40 shrink-0 sm:w-52 lg:w-full')}
                  {localTile(true, 'aspect-video w-40 shrink-0 sm:w-52 lg:w-full')}
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-2 gap-3 md:grid-cols-2 md:grid-rows-1">
                {remoteTile(false)}
                {localTile(false)}
              </div>
            )}

            {/* ----- پنل شرکت‌کنندگان ----- */}
            {panelOpen && (
              <>
                <button
                  type="button"
                  aria-label="بستن فهرست شرکت‌کنندگان"
                  onClick={() => setPanelOpen(false)}
                  className="cm-fade fixed inset-0 z-10 bg-black/50 md:hidden"
                />
                <aside
                  aria-label="شرکت‌کنندگان"
                  className="cm-rise fixed inset-x-0 bottom-0 z-20 flex max-h-[70vh] flex-col overflow-hidden rounded-t-3xl bg-[#14161a] ring-1 ring-white/10 md:static md:max-h-none md:w-80 md:shrink-0 md:rounded-3xl"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
                    <h2 className="text-sm font-bold">
                      شرکت‌کنندگان <span className="text-white/50">({(2).toLocaleString('fa-IR')})</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setPanelOpen(false)}
                      aria-label="بستن"
                      className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <ul className="cm-scroll flex-1 space-y-1 overflow-y-auto p-2">
                    {rows.map((r) => (
                      <li
                        key={r.id}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                          r.speaking ? 'bg-emerald-400/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <Avatar name={r.name} src={r.avatar} speaking={r.speaking} className="w-10 h-10 text-sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {r.name}
                            {r.you && <span className="ms-1.5 text-xs text-white/50">(شما)</span>}
                          </p>
                          {r.speaking && <p className="text-[11px] text-emerald-300">در حال صحبت…</p>}
                        </div>
                        <div className="flex items-center gap-1.5 text-white/70">
                          {r.speaking && <Equalizer />}
                          {r.muted && <MicOffIcon className="h-4 w-4 text-rose-400" />}
                          {r.video && <VideoIcon className="h-4 w-4 text-emerald-400" />}
                          {r.screen && <ScreenIcon className="h-4 w-4 text-indigo-300" />}
                        </div>
                      </li>
                    ))}
                  </ul>
                </aside>
              </>
            )}

            {/* ----- صدا بلاک شده ----- */}
            {audioBlocked && connected && (
              <button
                type="button"
                onClick={() => audioRef.current?.play().then(() => setAudioBlocked(false)).catch(() => {})}
                className="cm-rise absolute bottom-3 start-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
              >
                <VolumeIcon className="h-4 w-4" />
                برای پخش صدا کلیک کنید
              </button>
            )}
          </main>

          {/* ----- نوار کنترل ----- */}
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
                    className="grid h-12 w-16 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-400 active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-14 sm:w-20"
                  >
                    <PhoneIcon className="h-6 w-6 rotate-[135deg]" />
                  </button>
                  <span className="hidden text-[11px] leading-none text-white/70 sm:block">قطع تماس</span>
                </div>

                {/* دکمه‌ی شرکت‌کنندگان در موبایل */}
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

              {/* دکمه‌ی شرکت‌کنندگان در دسکتاپ */}
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