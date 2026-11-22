import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { usePlayerStore } from './stores/usePlayerStore';
import { SPAWN } from './sceneLayout';
import { usePointerLook } from './hooks/usePointerLook';
import { useQuestSystem } from './hooks/useQuestSystem';
import { useClaimCharacter } from './hooks/useClaimCharacter';
import { useMicControl } from './hooks/useMicControl';
import GameVoice from './components/GameVoice';

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

// HUD شیشه‌ای بالا سمت راست
function GlassHUD({ user, roomId, micEnabled, toggleMic, connected }) {
  const character = usePlayerStore((s) => s.character);
  const peerCount = usePlayerStore((s) => s.peerCount);
  const syncStatus = usePlayerStore((s) => s.syncStatus);
  const characterLabel = character?.replace('.glb', '') || '—';

  return (
    <div className="pointer-events-auto flex flex-col gap-2 min-w-[210px] rounded-2xl bg-surface-950/60 border border-white/10 backdrop-blur-xl p-3 text-surface-100 shadow-xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] text-surface-400">کمپ {roomId}</span>
          <span className="text-sm font-bold">{user?.username || 'مهمان'}</span>
        </div>
        <span
          className={`h-2.5 w-2.5 rounded-full ${syncStatus === 'connected' ? 'bg-success-500 animate-pulse' : 'bg-surface-500'
            }`}
          title={syncStatus === 'connected' ? 'متصل' : 'آفلاین'}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-surface-300">
        <span>کاراکتر: {characterLabel}</span>
        <span>{Math.max(peerCount, 1)}/9 نفر</span>
      </div>

      <button
        type="button"
        onClick={toggleMic}
        disabled={!connected}
        className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${micEnabled
          ? 'bg-success-500/20 border-success-500/40 text-success-500'
          : 'bg-surface-900/70 border-white/15 text-surface-400'
          } ${!connected ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={micEnabled ? 'قطع میکروفن' : 'وصل میکروفن'}
      >
        {micEnabled ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 003-3V4.5a3 3 0 00-6 0v8.25a3 3 0 003 3z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.25 9.75v1.5a5.25 5.25 0 01-8.4 4.05M6.75 9.75v1.5c0 .857.2 1.667.555 2.386M12 18.75v3.75m-3.75 0h7.5M3 3l18 18" />
          </svg>
        )}
        {connected ? (micEnabled ? 'میکروفن روشن' : 'میکروفن خاموش') : 'صدا در دسترس نیست'}
      </button>
    </div>
  );
}

// پنل مأموریت
function QuestTracker({ currentQuest }) {
  const quests = usePlayerStore((s) => s.quests);

  return (
    <div className="pointer-events-none rounded-xl bg-surface-950/60 border border-white/10 backdrop-blur-md px-3 py-2 text-surface-100 max-w-[240px]">
      <div className="text-[10px] text-primary-300 font-bold mb-0.5">مأموریت داستانی</div>
      <div className="text-[11px] leading-snug">{currentQuest}</div>
      <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-surface-300">
        <span className="px-1.5 py-0.5 rounded bg-white/5">🗺️ {quests.parchments}/3</span>
        <span className="px-1.5 py-0.5 rounded bg-white/5">🏮 {quests.lanterns}/5</span>
        {quests.hasKey && <span className="px-1.5 py-0.5 rounded bg-white/5">🗝️ کلید</span>}
        <span className="px-1.5 py-0.5 rounded bg-white/5">🐚 {quests.shells}/10</span>
      </div>
    </div>
  );
}

// اینونتوری
function Inventory() {
  const quests = usePlayerStore((s) => s.quests);
  const items = [
    { icon: '🗺️', label: 'نقشه', count: quests.parchments, max: 3 },
    { icon: '🏮', label: 'فانوس', count: quests.lanterns, max: 5 },
    { icon: '🗝️', label: 'کلید', count: quests.hasKey ? 1 : 0, max: 1 },
    { icon: '🐚', label: 'صدف', count: quests.shells, max: 10 },
  ];

  return (
    <div className="pointer-events-none rounded-xl bg-surface-950/60 border border-white/10 backdrop-blur-md px-2.5 py-2">
      <div className="text-[10px] text-surface-400 mb-1">اینونتوری</div>
      <div className="flex gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex flex-col items-center text-[10px] ${item.count >= item.max ? 'text-success-500' : 'text-surface-300'
              }`}
            title={`${item.label} ${item.count}/${item.max}`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span>{item.count}/{item.max}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Toast
function Toasts() {
  const toasts = usePlayerStore((s) => s.toasts);
  const dismiss = usePlayerStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 items-center">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className={`pointer-events-auto px-4 py-2 rounded-xl text-xs font-semibold border backdrop-blur-md shadow-lg ${toast.kind === 'success'
            ? 'bg-success-500/20 border-success-500/40 text-success-500'
            : toast.kind === 'warn'
              ? 'bg-warning-500/20 border-warning-500/40 text-warning-500'
              : 'bg-surface-900/80 border-white/15 text-surface-100'
            }`}
        >
          {toast.text}
        </button>
      ))}
    </div>
  );
}

// راهنمای کیبورد که بعد از ۱۰ ثانیه محو می‌شود
function ControlsHint() {
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFaded(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (faded) return null;

  return (
    <div className="pointer-events-none absolute bottom-24 left-4 z-30 rounded-xl bg-surface-950/70 border border-white/10 backdrop-blur-md px-3 py-2 text-[11px] text-surface-300 leading-relaxed max-w-[220px]">
      <div>WASD حرکت • Shift دویدن</div>
      <div>موس: چرخش دوربین • ESC خروج از قفل</div>
      <div>E تعامل/نشستن • G گیتار • M مارشمالو</div>
      <div>1-5 ایموت • F چراغ ون</div>
    </div>
  );
}

// crosshair وسط صفحه هنگام Pointer Lock
function Crosshair() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="h-1.5 w-1.5 rounded-full bg-white/70 shadow" />
    </div>
  );
}

// صفحه‌ی شروع / توقف
function StartScreen({ onStart, loading, error, character, resume }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-surface-950 via-surface-950/95 to-surface-950">
      <div className="flex flex-col items-center gap-5 px-6 text-center max-w-md">
        <div className="text-5xl">🔥</div>
        <h1 className="text-2xl font-extrabold text-surface-50">کمپ دنج جنگل</h1>
        <p className="text-sm text-surface-300 leading-relaxed">
          شب آرام جنگل، آتش گرم و یک داستان گمشده. کاراکتر یکتای خودت را بگیر و به جمع کمپ بپیوند.
        </p>

        {character && (
          <div className="text-xs text-surface-400">
            کاراکتر تو: <span className="text-primary-300 font-bold">{character.replace('.glb', '')}</span>
          </div>
        )}

        {error && (
          <div className="px-3 py-2 rounded-xl bg-error-500/15 border border-error-500/30 text-error-500 text-xs">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={loading || Boolean(error)}
          className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base shadow-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {loading ? 'در حال آماده‌سازی...' : resume ? 'ادامه بازی' : 'شروع بازی'}
        </button>

        <div className="text-[11px] text-surface-500">
          با کلیک روی شروع، موس قفل می‌شود. برای خروج ESC بزن.
        </div>
      </div>
    </div>
  );
}

export default function GameOverlay({ roomId, user, onClose }) {
  const seated = usePlayerStore((s) => s.seated);
  const hovered = usePlayerStore((s) => s.hovered);
  const nearInteractable = usePlayerStore((s) => s.nearInteractable);
  const setVirtualInput = usePlayerStore((s) => s.setVirtualInput);
  const teleport = usePlayerStore((s) => s.teleport);
  const character = usePlayerStore((s) => s.character);
  const characterLoading = usePlayerStore((s) => s.characterLoading);
  const characterError = usePlayerStore((s) => s.characterError);
  const pushToast = usePlayerStore((s) => s.pushToast);
  // وضعیت واقعی صدای LiveKit (نه وضعیت سینک Ably)
  const voiceReady = usePlayerStore((s) => s.voiceReady);

  const [entered, setEntered] = useState(false);

  const { currentQuest } = useQuestSystem();

  useClaimCharacter({
    roomId,
    enabled: true,
    onFull: () => {
      pushToast('ظرفیت بازی پر است', 'warn');
      onClose?.();
    },
  });

  const { micEnabled, toggleMic } = useMicControl();
  // با ESC قفل موس آزاد می‌شود؛ صفحه‌ی «ادامه بازی» روی صحنه ظاهر می‌شود
  const look = usePointerLook({ onExit: () => {} });

  const handleStart = useCallback(() => {
    setEntered(true);
    // قفل موس باید همگام با کلیک کاربر باشد
    look.lock();
  }, [look]);

  const handleExit = useCallback(() => {
    look.unlock();
    onClose?.();
  }, [look, onClose]);

  // ESC: اول قفل موس آزاد می‌شود (صفحه‌ی توقف)، ESC دوم بازی را می‌بندد
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'Escape') return;
      if (document.pointerLockElement === document.body) {
        document.exitPointerLock?.();
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // قفل اسکرول صفحه + پاک‌سازی ورودی هنگام بسته شدن بازی
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      setVirtualInput({ forward: false, backward: false, left: false, right: false, run: false });
      usePlayerStore.getState().setSeat(null);
      teleport(SPAWN.x, SPAWN.z);
    };
  }, [setVirtualInput, teleport]);

  const hint = seated
    ? 'E برای بلند شدن • 1-5 ایموت'
    : nearInteractable
      ? nearInteractable.locked
        ? `${nearInteractable.label} — 🔒 قفل است`
        : `${nearInteractable.label} — E`
      : hovered === 'van'
        ? 'F برای روشن/خاموش کردن چراغ ون'
        : 'WASD حرکت • Shift دویدن • E تعامل • G گیتار • M مارشمالو • 1-5 ایموت';

  const locked = look.locked;
  const paused = entered && !locked;

  return (
    <div className="fixed inset-0 z-[80] bg-surface-950">
      {entered && (
        <div className="absolute inset-0">
          <Suspense
            fallback={
              <div className="h-full w-full flex items-center justify-center text-surface-300 text-sm">
                در حال ساختن کمپ...
              </div>
            }
          >
            <GameCanvas roomId={roomId} user={user} look={look} active={locked} />
          </Suspense>
        </div>
      )}

      {/* صدای LiveKit جدا از Canvas است تا با آماده شدن توکن، بازی remount نشود */}
      {entered && <GameVoice roomId={roomId} enabled={Boolean(roomId)} />}

      {locked && <Crosshair />}

      {/* HUD بالا */}
      <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 flex items-start justify-between gap-2 pointer-events-none">
        <button
          type="button"
          onClick={handleExit}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl bg-surface-900/80 border border-white/15 text-surface-100 hover:bg-error-500/20 hover:border-error-500/40 transition-colors backdrop-blur-md"
          aria-label="خروج از بازی"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="pointer-events-none flex flex-col items-end gap-2">
          <GlassHUD
            user={user}
            roomId={roomId}
            micEnabled={micEnabled}
            toggleMic={toggleMic}
            connected={voiceReady}
          />
          <QuestTracker currentQuest={currentQuest} />
          <Inventory />
        </div>
      </div>

      <Toasts />

      {entered && locked && <ControlsHint />}

      {/* نوار پایین */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-3 sm:p-4 flex items-end justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto px-3 py-2 rounded-xl bg-surface-950/70 border border-white/10 backdrop-blur-md text-[11px] text-surface-300 max-w-[60vw]">
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
            onClick={() => usePlayerStore.getState().sitAuto()}
            disabled={!usePlayerStore.getState().nearFire && !seated}
            className={`px-4 h-12 rounded-2xl border text-sm font-semibold transition-colors backdrop-blur ${seated
              ? 'bg-primary-500/25 border-primary-400/50 text-primary-100'
              : 'bg-success-500/20 border-success-500/40 text-success-500'
              }`}
          >
            {seated ? 'بلند شدن' : 'نشستن'}
          </button>
        </div>
      </div>

      <TouchPad />

      {!entered && (
        <StartScreen
          onStart={handleStart}
          loading={characterLoading}
          error={characterError}
          character={character}
        />
      )}

      {paused && (
        <StartScreen
          onStart={handleStart}
          loading={false}
          error={null}
          character={character}
          resume
        />
      )}
    </div>
  );
}
