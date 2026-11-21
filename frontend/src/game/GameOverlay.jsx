import { Suspense, lazy, useEffect } from 'react';
import { usePlayerStore } from './stores/usePlayerStore';
import { SPAWN } from './sceneLayout';
import SpatialVoice from './components/SpatialVoice';

// Canvas فقط وقتی مودال باز است لود می‌شود (کاهش هزینه‌ی اولیه)
const GameCanvas = lazy(() => import('./GameCanvas'));

// دکمه‌های کنترل لمسی موبایل
function TouchPad() {
  const setVirtualInput = usePlayerStore((s) => s.setVirtualInput);

  const bind = (key) => ({
    onPointerDown: (event) => {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setVirtualInput({ [key]: true });
    },
    onPointerUp: () => setVirtualInput({ [key]: false }),
    onPointerLeave: () => setVirtualInput({ [key]: false }),
    onPointerCancel: () => setVirtualInput({ [key]: false }),
  });

  const buttonClass =
    'w-14 h-14 rounded-2xl bg-surface-900/70 border border-white/15 text-surface-100 text-lg font-bold flex items-center justify-center backdrop-blur active:bg-primary-500/50 select-none touch-none';

  return (
    <div className="lg:hidden absolute bottom-6 left-6 z-20 flex flex-col items-center gap-2">
      <button type="button" className={buttonClass} {...bind('forward')} aria-label="جلو">
        ▲
      </button>
      <div className="flex gap-2">
        <button type="button" className={buttonClass} {...bind('left')} aria-label="چپ">
          ◀
        </button>
        <button type="button" className={buttonClass} {...bind('backward')} aria-label="عقب">
          ▼
        </button>
        <button type="button" className={buttonClass} {...bind('right')} aria-label="راست">
          ▶
        </button>
      </div>
    </div>
  );
}

export default function GameOverlay({ roomId, user, onClose }) {
  const syncStatus = usePlayerStore((s) => s.syncStatus);
  const peerCount = usePlayerStore((s) => s.peerCount);
  const nearFire = usePlayerStore((s) => s.nearFire);
  const seated = usePlayerStore((s) => s.seated);
  const hovered = usePlayerStore((s) => s.hovered);
  const headlights = usePlayerStore((s) => s.headlights);
  const action = usePlayerStore((s) => s.action);
  const setSeat = usePlayerStore((s) => s.setSeat);
  const sitAuto = usePlayerStore((s) => s.sitAuto);
  const setVirtualInput = usePlayerStore((s) => s.setVirtualInput);
  const teleport = usePlayerStore((s) => s.teleport);

  // کلید Escape برای بستن + پاک‌سازی ورودی مجازی + بازگشت به نقطه‌ی شروع
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      setVirtualInput({ forward: false, backward: false, left: false, right: false, run: false });
      setSeat(null);
      teleport(SPAWN.x, SPAWN.z);
    };
  }, [onClose, setVirtualInput, setSeat, teleport]);

  const statusLabel =
    syncStatus === 'connected' ? 'متصل' : syncStatus === 'connecting' ? 'در حال اتصال...' : 'آفلاین';

  const hint = seated
    ? 'E برای بلند شدن • 1-5 ایموت'
    : nearFire
      ? action === 'guitar'
        ? 'G برای توقف گیتار • M مارشمالو • 1-5 ایموت'
        : action === 'marshmallow'
          ? 'M برای برداشتن سیخ • G گیتار • 1-5 ایموت'
          : 'E نشستن • G گیتار • M مارشمالو • 1-5 ایموت'
      : hovered === 'van'
        ? 'F برای روشن/خاموش کردن چراغ ون'
        : 'WASD حرکت • Shift دویدن • درگ موس چرخش دوربین';

  return (
    <div className="fixed inset-0 z-[80] bg-surface-950">
      {/* صحنه‌ی سه‌بعدی */}
      <div className="absolute inset-0">
        <Suspense
          fallback={
            <div className="h-full w-full flex items-center justify-center text-surface-300 text-sm">
              در حال ساختن کمپ...
            </div>
          }
        >
          <GameCanvas roomId={roomId} user={user} />
        </Suspense>
      </div>

      {/* HUD بالا */}
      <div className="absolute top-0 inset-x-0 z-20 p-3 sm:p-4 flex items-start justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-950/70 border border-white/10 backdrop-blur-md">
          <span
            className={`h-2 w-2 rounded-full ${syncStatus === 'connected' ? 'bg-success-500 animate-pulse' : 'bg-surface-500'
              }`}
          />
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] text-surface-400">کمپ {roomId}</span>
            <span className="text-xs font-semibold text-surface-50">
              {statusLabel} • {Math.max(peerCount, 1)} نفر
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <SpatialVoice roomId={roomId} enabled={syncStatus !== 'idle'} />
          {headlights && (
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-warning-500/15 border border-warning-500/30 text-[11px] text-warning-500">
              چراغ ون روشن
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-surface-900/80 border border-white/15 text-surface-100 text-sm hover:bg-error-500/20 hover:border-error-500/40 transition-colors backdrop-blur-md"
          >
            بستن (Esc)
          </button>
        </div>
      </div>

      {/* راهنما و کنترل نشستن */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-3 sm:p-4 flex items-end justify-between gap-3 pointer-events-none">
        <div className="hidden lg:block pointer-events-auto px-3 py-2 rounded-xl bg-surface-950/70 border border-white/10 backdrop-blur-md text-xs text-surface-300">
          {hint}
        </div>

        <div className="lg:hidden pointer-events-auto px-3 py-2 rounded-xl bg-surface-950/70 border border-white/10 backdrop-blur-md text-[11px] text-surface-300">
          {hint}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVirtualInput({ run: !usePlayerStore.getState().virtualInput.run })}
            className="lg:hidden w-14 h-14 rounded-2xl bg-surface-900/70 border border-white/15 text-surface-100 text-xs backdrop-blur active:bg-primary-500/40"
          >
            دویدن
          </button>
          <button
            type="button"
            onClick={() => sitAuto()}
            disabled={!nearFire && !seated}
            className={`px-4 h-12 rounded-2xl border text-sm font-semibold transition-colors backdrop-blur ${seated
              ? 'bg-primary-500/25 border-primary-400/50 text-primary-100'
              : nearFire
                ? 'bg-success-500/20 border-success-500/40 text-success-500'
                : 'bg-surface-900/60 border-white/10 text-surface-500 cursor-not-allowed'
              }`}
          >
            {seated ? 'بلند شدن' : 'نشستن'}
          </button>
        </div>
      </div>

      <TouchPad />
    </div>
  );
}
