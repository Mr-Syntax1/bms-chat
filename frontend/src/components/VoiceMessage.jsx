import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const BAR_COUNT = 34;
const SPEEDS = [1, 1.5, 2];
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

// فقط یک پیام صوتی در هر لحظه پخش می‌شود
let currentlyPlaying = null;

const toFa = (str) => String(str).replace(/\d/g, (d) => FA_DIGITS[d]);

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return toFa(`${m}:${String(s).padStart(2, '0')}`);
}

// موج صوتی ثابت و زیبا که از روی آدرس فایل ساخته می‌شود (هر پیام شکل مخصوص خودش را دارد)
function generateBars(seed, count) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  if (h === 0) h = 1;
  const bars = [];
  for (let i = 0; i < count; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const r = ((h >>> 0) % 1000) / 1000;
    const envelope = 0.6 + 0.4 * Math.sin((i / (count - 1)) * Math.PI);
    bars.push(Math.min(1, Math.max(0.16, (0.22 + r * 0.78) * envelope)));
  }
  return bars;
}

function PlayIcon() {
  return (
    <svg className="w-5 h-5 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 001.52.85l11-6.86a1 1 0 000-1.7l-11-6.86A1 1 0 008 5.14z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}

export default function VoiceMessage({ msg, isMine, size }) {
  const audioRef = useRef(null);
  const waveRef = useRef(null);
  const rafRef = useRef(null);
  const draggingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(msg.duration || 0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [dragProgress, setDragProgress] = useState(null);

  const bars = useMemo(() => generateBars(msg.fileUrl || msg.id || 'voice', BAR_COUNT), [msg.fileUrl, msg.id]);

  const progress = dragProgress !== null ? dragProgress : duration > 0 ? Math.min(1, current / duration) : 0;
  const speed = SPEEDS[speedIndex];

  // ───── به‌روزرسانی نرم زمان با requestAnimationFrame ─────
  const tick = useCallback(() => {
    const a = audioRef.current;
    if (a && !draggingRef.current) setCurrent(a.currentTime);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTick = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopTick();
      const a = audioRef.current;
      if (a) a.pause();
      if (currentlyPlaying === a) currentlyPlaying = null;
    };
  }, [stopTick]);

  // ───── رفع باگ معروف webm (مدت‌زمان Infinity در فایل‌های MediaRecorder) ─────
  const handleLoadedMetadata = () => {
    const a = audioRef.current;
    if (!a) return;
    setLoading(false);
    if (Number.isFinite(a.duration)) {
      setDuration(a.duration);
      return;
    }
    const fix = () => {
      a.removeEventListener('timeupdate', fix);
      if (Number.isFinite(a.duration)) setDuration(a.duration);
      a.currentTime = 0;
      setCurrent(0);
    };
    a.addEventListener('timeupdate', fix);
    a.currentTime = 1e101;
  };

  const togglePlay = useCallback(async () => {
    const a = audioRef.current;
    if (!a || error) return;

    if (!a.paused) {
      a.pause();
      return;
    }

    if (currentlyPlaying && currentlyPlaying !== a) currentlyPlaying.pause();
    currentlyPlaying = a;
    a.playbackRate = SPEEDS[speedIndex];

    try {
      await a.play();
    } catch {
      setPlaying(false);
    }
  }, [error, speedIndex]);

  const cycleSpeed = (e) => {
    e.stopPropagation();
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  // ───── جابه‌جایی (Seek) با کلیک و کشیدن روی موج ─────
  const ratioFromEvent = (e) => {
    const rect = waveRef.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (e) => {
    if (!duration) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragProgress(ratioFromEvent(e));
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    setDragProgress(ratioFromEvent(e));
  };

  const handlePointerUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const ratio = ratioFromEvent(e);
    if (audioRef.current && duration) {
      audioRef.current.currentTime = ratio * duration;
      setCurrent(ratio * duration);
    }
    setDragProgress(null);
  };

  const handleKeyDown = (e) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const step = 5;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      a.currentTime = Math.min(duration, a.currentTime + step);
      setCurrent(a.currentTime);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      a.currentTime = Math.max(0, a.currentTime - step);
      setCurrent(a.currentTime);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      togglePlay();
    }
  };

  // ───── استایل‌ها بر اساس فرستنده ─────
  const styles = isMine
    ? {
        wrapper: 'bg-white/10 ring-1 ring-white/10',
        button: 'bg-white text-primary-700 hover:bg-white/90 shadow-lg shadow-black/20',
        ring: 'ring-white/40',
        played: 'bg-white',
        idle: 'bg-white/30',
        thumb: 'bg-white',
        text: 'text-white/80',
        pill: 'bg-white/15 hover:bg-white/25 text-white',
      }
    : {
        wrapper: 'bg-surface-900/60 ring-1 ring-surface-700',
        button: 'bg-primary-600 text-white hover:bg-primary-500 shadow-lg shadow-primary-900/40',
        ring: 'ring-primary-400/50',
        played: 'bg-primary-400',
        idle: 'bg-surface-600',
        thumb: 'bg-primary-300',
        text: 'text-surface-400',
        pill: 'bg-surface-700 hover:bg-surface-600 text-surface-100',
      };

  const showElapsed = playing || current > 0 || dragProgress !== null;
  const shownTime = dragProgress !== null ? dragProgress * duration : showElapsed ? current : duration;

  return (
    <div
      dir="ltr"
      className={`flex items-center gap-3 p-2.5 pe-3.5 rounded-2xl w-[270px] sm:w-[300px] max-w-full ${styles.wrapper}`}
    >
      <audio
        ref={audioRef}
        src={msg.fileUrl}
        preload="metadata"
        onLoadStart={() => setLoading(true)}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => {
          setLoading(false);
          setPlaying(true);
          stopTick();
          rafRef.current = requestAnimationFrame(tick);
        }}
        onPause={() => {
          setPlaying(false);
          stopTick();
        }}
        onEnded={() => {
          setPlaying(false);
          stopTick();
          setCurrent(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
        onError={() => {
          setError(true);
          setLoading(false);
          setPlaying(false);
        }}
      />

      {/* دکمه پخش / توقف */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={error}
        aria-label={playing ? 'توقف پیام صوتی' : 'پخش پیام صوتی'}
        className={`relative shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 focus:outline-none focus-visible:ring-2 ${styles.ring} disabled:opacity-40 disabled:cursor-not-allowed ${styles.button}`}
      >
        {playing && (
          <span className={`absolute inset-0 rounded-full ring-2 ${styles.ring} animate-ping opacity-60`} />
        )}
        <span className="relative">{loading && !playing ? <Spinner /> : playing ? <PauseIcon /> : <PlayIcon />}</span>
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {/* موج صوتی */}
        <div
          ref={waveRef}
          role="slider"
          tabIndex={0}
          aria-label="موقعیت پیام صوتی"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration) || 0}
          aria-valuenow={Math.round(progress * duration) || 0}
          aria-valuetext={`${formatTime(progress * duration)} از ${formatTime(duration)}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="relative h-9 flex items-center gap-[2px] cursor-pointer touch-none select-none rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {bars.map((h, i) => {
            const barPos = (i + 0.5) / BAR_COUNT;
            const isPlayed = barPos <= progress;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-colors duration-150 ${isPlayed ? styles.played : styles.idle} ${
                  playing && isPlayed && Math.abs(barPos - progress) < 0.06 ? 'scale-y-110' : ''
                }`}
                style={{ height: `${Math.round(h * 100)}%`, minWidth: 2 }}
              />
            );
          })}
          {/* نشانگر موقعیت */}
          {duration > 0 && (
            <span
              className={`absolute top-1/2 w-2.5 h-2.5 rounded-full -translate-y-1/2 -translate-x-1/2 shadow-md transition-transform ${styles.thumb} ${
                dragProgress !== null ? 'scale-150' : 'scale-100'
              }`}
              style={{ left: `${progress * 100}%` }}
            />
          )}
        </div>

        {/* زمان / سرعت / اطلاعات */}
        <div className={`flex items-center justify-between gap-2 text-[11px] leading-none ${styles.text}`}>
          <span className="tabular-nums font-medium min-w-[34px]">{error ? '—' : formatTime(shownTime)}</span>

          <div className="flex items-center gap-1.5 min-w-0">
            {error ? (
              <span className="text-red-400 font-medium">خطا در بارگذاری</span>
            ) : (
              <>
                <span className="flex items-center gap-1 opacity-80 truncate">
                  <MicIcon />
                  <span dir="rtl">پیام صوتی</span>
                  {size && <span dir="rtl">• {toFa(size)}</span>}
                </span>
                <button
                  type="button"
                  onClick={cycleSpeed}
                  aria-label={`سرعت پخش ${toFa(speed)}`}
                  className={`shrink-0 px-1.5 py-1 rounded-full font-bold tabular-nums transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 ${styles.ring} ${styles.pill}`}
                >
                  {toFa(speed)}×
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}