import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { PrimaryButton } from './primitives';

const MESSAGES = [
  'در حال روشن کردن آتش...',
  'در حال کاشتن درختان...',
  'در حال آماده‌سازی جنگل...',
  'در حال پختن مارشمالو...',
  'در حال صدا زدن دوستان...',
];

// ستاره‌های ثابت — یک‌بار در سطح ماژول ساخته می‌شوند تا رندر خالص بماند
const STARS = (() => {
  let seed = 20261122;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: 46 }, () => ({
    left: rand() * 100,
    top: rand() * 100,
    size: 1 + rand() * 2.2,
    delay: rand() * 3.2,
    duration: 2.4 + rand() * 2.6,
  }));
})();

/**
 * صفحه‌ی لودینگ با پیشرفت واقعی.
 *
 * وزن‌ها با کارهایی که واقعاً قبل از ورود انجام می‌شوند منطبق است:
 *   مدل‌ها ۷۰٪ • توکن LiveKit ۲۰٪ • کاراکتر ۱۰٪
 * اتصال Ably پس از ورود برقرار می‌شود، پس در سنجه‌ی آمادگی ورود حساب نمی‌شود.
 */
export default function GameLoadingScreen({
  livekitReady = false,
  characterReady = false,
  modelBoost = 0,
  error = null,
  canEnter = false,
  onEnter,
  onRetry,
  slowThresholdMs = 30000,
}) {
  const { progress } = useProgress();
  const [msgIndex, setMsgIndex] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 2600);
    return () => clearInterval(timer);
  }, []);

  // پس از ۳۰ ثانیه، گزینه‌ی ورود بدون انتظار
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), slowThresholdMs);
    return () => clearTimeout(timer);
  }, [slowThresholdMs]);

  // پیشرفت وزن‌دار واقعی
  const modelPct = Math.min(100, Math.max(0, progress)) || Math.min(100, modelBoost);
  const weighted = modelPct * 0.7 + (livekitReady ? 20 : 0) + (characterReady ? 10 : 0);
  const ready = canEnter && modelPct >= 100 && livekitReady && characterReady;
  // درصد نهایی فقط وقتی همه‌چیز آماده است ۱۰۰ می‌شود
  const shown = ready ? 100 : Math.min(99, Math.round(weighted));
  // ورود دستی وقتی حداقل‌ها آماده‌اند یا انتظار طولانی شده است
  const canSkip = !error && !ready && (characterReady || slow);

  const tasks = [
    { label: 'جنگل', ready: modelPct >= 100, pct: modelPct },
    { label: 'صدا', ready: livekitReady },
    { label: 'کاراکتر', ready: characterReady },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden bg-[#171426]">
      {/* گرادیان عمقی */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 50% 108%, rgba(255,154,77,0.20) 0%, rgba(255,154,77,0) 62%),' +
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(93,155,120,0.16) 0%, rgba(93,155,120,0) 70%)',
        }}
      />

      {/* ستاره‌ها */}
      <div className="pointer-events-none absolute inset-0">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="loading-star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-6 text-center">
        {/* لوگو */}
        <div className="gentle-float mb-6">
          <div className="relative">
            <div className="absolute inset-0 -z-10 scale-125 rounded-full bg-[#ff9a4d]/18 blur-2xl" />
            <img
              src="/pwa-512x512.png"
              alt=""
              width={96}
              height={96}
              className="h-24 w-24 rounded-3xl border border-white/10 object-cover shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>

        <h1 className="mb-1 text-xl font-extrabold text-[#f5ebdd]">کمپ دنج جنگل</h1>
        <p className="mb-7 min-h-[1.25rem] text-[12px] text-[#f5ebdd]/60" aria-live="polite">
          {ready ? 'همه‌چیز آماده است!' : MESSAGES[msgIndex]}
        </p>

        {/* درصد بزرگ */}
        <div className="mb-3 flex items-end justify-center gap-1 font-mono">
          <span className="text-4xl font-black leading-none text-[#ffc66d] tabular-nums">{shown}</span>
          <span className="pb-1 text-sm text-[#f5ebdd]/45">%</span>
        </div>

        {/* نوار پیشرفت */}
        <div className="relative h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff9a4d] via-[#ffb45f] to-[#ffc66d] transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(3, shown)}%` }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
        </div>

        {/* جزئیات وظایف */}
        <div className="mt-4 grid w-full grid-cols-3 gap-2 text-[9px]">
          {tasks.map((task) => (
            <div
              key={task.label}
              className={`rounded-lg border px-1.5 py-1 ${
                task.ready
                  ? 'border-[#5d9b78]/40 bg-[#5d9b78]/10 text-[#65F5A0]'
                  : 'border-white/8 bg-black/25 text-[#f5ebdd]/45'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span
                  className={`h-1 w-1 rounded-full ${
                    task.ready ? 'bg-[#65F5A0]' : 'animate-pulse bg-[#f5ebdd]/35'
                  }`}
                />
                {task.label}
              </div>
            </div>
          ))}
        </div>

        {/* خطا */}
        {error && (
          <div className="mt-5 w-full rounded-xl border border-[#ef4444]/35 bg-[#ef4444]/10 px-3 py-2 text-[11px] text-[#ffb4b4]">
            {error}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 block w-full rounded-lg border border-white/15 bg-white/5 py-1 text-[10px] font-bold text-[#f5ebdd] hover:bg-white/10"
              >
                تلاش دوباره
              </button>
            )}
          </div>
        )}

        {/* دکمه‌ی ورود */}
        {!error && onEnter && (
          <div className="mt-6 w-full">
            <PrimaryButton className="w-full" onClick={onEnter} disabled={!ready && !canSkip}>
              {ready ? (
                <>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  ورود به کمپ
                </>
              ) : (
                'در حال آماده‌سازی...'
              )}
            </PrimaryButton>
            {canSkip && !ready && (
              <button
                type="button"
                onClick={onEnter}
                className="mt-2 text-[10.5px] font-semibold text-[#f5ebdd]/45 underline decoration-dotted underline-offset-4 hover:text-[#ffc66d]"
              >
                ورود بدون انتظار
              </button>
            )}
          </div>
        )}

        <p className="mt-5 max-w-[260px] text-[9.5px] leading-relaxed text-[#f5ebdd]/30">
          اتصال گفتگوی صوتی پس از ورود برقرار می‌شود.
        </p>
      </div>
    </div>
  );
}
