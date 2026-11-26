import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { usePlayerStore } from './stores/usePlayerStore';
import { SPAWN } from './sceneLayout';
import { usePointerLook } from './hooks/usePointerLook';
import { useQuestSystem } from './hooks/useQuestSystem';
import { useClaimCharacter } from './hooks/useClaimCharacter';
import { useMicControl } from './hooks/useMicControl';
import { useFishingSpots } from './hooks/useFishingSpots';
import GameVoice from './components/GameVoice';
import { preloadAllModels, preloadGroup } from './preload';

import GameHUD from './ui/GameHUD';
import QuestLog from './ui/QuestLog';
import SettingsPanel from './ui/SettingsPanel';
import PauseMenu from './ui/PauseMenu';
import Toasts from './ui/Toasts';
import InteractionPrompt from './ui/InteractionPrompt';
import GameLoadingScreen from './ui/GameLoadingScreen';
import FacingDebug from './ui/FacingDebug';
import EmoteWheel from './ui/EmoteWheel';
import CharacterSelector from './ui/CharacterSelector';
import Wardrobe from './ui/Wardrobe';
import CookingUI from './ui/CookingUI';
import FishingUI from './ui/FishingUI';
import DecorPanel from './ui/DecorPanel';
import DialogueBox from './components/DialogueBox';
import { useChatBubbles } from './hooks/useChatBubbles';
import { loadWardrobe } from './models/wardrobeConfig';

const GameCanvas = lazy(() => import('./GameCanvas'));

// ---------------------------------------------------------------------------
// کنترل لمسی موبایل
// ---------------------------------------------------------------------------
function TouchArrow({ rotate = 0 }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

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
    'flex h-14 w-14 cursor-pointer select-none touch-none items-center justify-center rounded-2xl border border-white/15 bg-[#171426]/75 text-[#f5ebdd] backdrop-blur-md active:bg-[#ff9a4d]/35';

  return (
    <div className="pointer-events-auto absolute bottom-6 left-4 z-20 flex flex-col items-center gap-2 lg:hidden">
      <button type="button" className={buttonClass} {...bind('forward')} aria-label="جلو">
        <TouchArrow />
      </button>
      <div className="flex gap-2">
        <button type="button" className={buttonClass} {...bind('left')} aria-label="چپ">
          <TouchArrow rotate={-90} />
        </button>
        <button type="button" className={buttonClass} {...bind('backward')} aria-label="عقب">
          <TouchArrow rotate={180} />
        </button>
        <button type="button" className={buttonClass} {...bind('right')} aria-label="راست">
          <TouchArrow rotate={90} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// راهنمای کلیدها (۱۰ ثانیه)
// ---------------------------------------------------------------------------
function ControlsHint() {
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFaded(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (faded) return null;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-30 hidden max-w-[250px] rounded-xl border border-white/8 bg-[#171426]/70 px-3 py-2 text-[10.5px] leading-relaxed text-[#f5ebdd]/55 backdrop-blur-md lg:block">
      <div>WASD حرکت • Shift دویدن</div>
      <div>موس: چرخش دوربین • ESC توقف</div>
      <div>E تعامل/نشستن • Q ایموت</div>
      <div>G گیتار • M مارشمالو • F چیدن/تور/چراغ</div>
      <div>L دفترچه • C کمد • B چیدمان کمپ</div>
      <div>1-5 ایموت سریع</div>
    </div>
  );
}

// مأموریت فعلی + فاصله تا هدف — کامپوننت جدا تا تغییر فاصله فقط همین را رندر کند
function QuestTracker({ currentQuest }) {
  const questDistance = usePlayerStore((s) => s.questDistance);

  return (
    <div className="hidden max-w-[232px] rounded-xl border border-white/8 bg-[#171426]/70 px-3 py-2 backdrop-blur-md lg:block">
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold text-[#ffc66d]/80">مأموریت فعلی</span>
        {questDistance != null && (
          <span className="font-mono text-[9px] text-[#65F5A0]/80">{questDistance} متر</span>
        )}
      </div>
      <div className="text-[11px] leading-snug text-[#f5ebdd]/80">{currentQuest}</div>
    </div>
  );
}

// crosshair هنگام قفل موس
function Crosshair() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="h-1.5 w-1.5 rounded-full bg-white/65 shadow-[0_0_6px_rgba(0,0,0,0.8)]" />
    </div>
  );
}

// لاگ کوچک گوشه: آخرین ۳ پیام اتاق
function ChatLogCorner() {
  const chatLog = usePlayerStore((s) => s.chatLog);

  if (chatLog.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-24 right-3 z-30 flex w-[210px] flex-col gap-1">
      {chatLog.map((m) => (
        <div
          key={m.id}
          className="rounded-lg border border-white/10 bg-[#171426]/70 px-2 py-1 text-[10px] leading-snug text-[#f5ebdd]/85 backdrop-blur-md"
        >
          <span className="font-bold text-[#ffc66d]/85">{m.sender}: </span>
          <span>{m.text}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function GameOverlay({ roomId, user, onClose }) {
  const seated = usePlayerStore((s) => s.seated);
  const nearFire = usePlayerStore((s) => s.nearFire);
  const setVirtualInput = usePlayerStore((s) => s.setVirtualInput);
  const teleport = usePlayerStore((s) => s.teleport);
  const character = usePlayerStore((s) => s.character);
  const characterLoading = usePlayerStore((s) => s.characterLoading);
  const characterError = usePlayerStore((s) => s.characterError);
  const pushToast = usePlayerStore((s) => s.pushToast);
  const voiceReady = usePlayerStore((s) => s.voiceReady);
  const voiceTokenReady = usePlayerStore((s) => s.voiceTokenReady);
  const setSelfId = usePlayerStore((s) => s.setSelfId);
  const setWardrobe = usePlayerStore((s) => s.setWardrobe);
  const cookingStation = usePlayerStore((s) => s.cookingStation);
  const fishingActive = usePlayerStore((s) => s.fishingState.spotIndex >= 0);
  const decorMode = usePlayerStore((s) => s.decorMode);
  const activeDialogue = usePlayerStore((s) => s.activeDialogue);

  const [entered, setEntered] = useState(false);
  // انتخابگر کاراکتر همیشه پیش از ورود نمایش داده می‌شود؛ انتخاب قبلی پیش‌فرض است.
  const [characterPicked, setCharacterPicked] = useState(false);
  const [selecting, setSelecting] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const preloadStarted = useRef(false);

  const { currentQuest } = useQuestSystem();

  // بازیابی کمد ذخیره‌شده برای این کاربر (پیش از ورود)
  useEffect(() => {
    if (!user?.id) return;
    setWardrobe(loadWardrobe(user.id));
  }, [user?.id, setWardrobe]);

  // شروع پیش‌بارگذاری واقعی مدل‌ها (بعد از mount شدن صفحه‌ی لودینگ)
  useEffect(() => {
    if (preloadStarted.current) return;
    preloadStarted.current = true;
    preloadAllModels();
    // مدل‌های پخت/غذا و حیات وحش بعد از ورود (idle) warm می‌شوند
    const id = setTimeout(() => {
      preloadGroup('cooking');
      preloadGroup('food');
      preloadGroup('animals');
      preloadGroup('forage');
      preloadGroup('decor');
      preloadGroup('npc');
    }, 1200);
    return () => clearTimeout(id);
  }, []);

  // شناسه‌ی کاربر برای تطبیق activeSpeakers با بازیکن محلی
  useEffect(() => {
    setSelfId(user?.id ?? null);
  }, [user?.id, setSelfId]);

  useClaimCharacter({
    roomId,
    enabled: characterPicked,
    onFull: () => {
      pushToast('ظرفیت بازی پر است', 'warn');
      onClose?.();
    },
  });

  const { micEnabled, toggleMic } = useMicControl();
  const look = usePointerLook({ onExit: () => {} });
  useFishingSpots();
  useChatBubbles(roomId, user);

  const handleStart = useCallback(() => {
    setEntered(true);
    look.lock();
  }, [look]);

  const handleResume = useCallback(() => {
    look.lock();
  }, [look]);

  const handleExit = useCallback(() => {
    look.unlock();
    onClose?.();
  }, [look, onClose]);

  // ESC: اول قفل موس آزاد می‌شود، ESC دوم بازی را می‌بندد
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'Escape') return;
      // دیالوگ باز است → ESC مخصوص DialogueBox است (خودش متن را کامل/می‌بندد)
      if (activeDialogue) return;
      if (cookingStation) {
        usePlayerStore.getState().closeCooking();
        return;
      }
      if (fishingActive) return;
      if (logOpen) return;
      if (settingsOpen) return;
      // در حالت چیدمان، ESC اول از دکور خارج می‌شود و قفل موس برمی‌گردد
      if (decorMode) {
        usePlayerStore.getState().setDecorMode(false);
        usePlayerStore.getState().setSelectedDecor(null);
        if (entered) look.lock();
        return;
      }
      if (wardrobeOpen) {
        setWardrobeOpen(false);
        if (entered) look.lock();
        return;
      }
      if (document.pointerLockElement === document.body) {
        document.exitPointerLock?.();
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, logOpen, settingsOpen, cookingStation, fishingActive, wardrobeOpen, entered, look, decorMode, activeDialogue]);

  // در حالت چیدمان موس آزاد است؛ چرخش دوربین را خودمان اعمال می‌کنیم.
  // look فقط از طریق ref خوانده می‌شود تا افکت به شیء ref وابسته نشود.
  const lookRef = useRef(look);
  useEffect(() => {
    lookRef.current = look;
  }, [look]);
  useEffect(() => {
    if (!decorMode) return undefined;
    const SENS = 0.0022;
    const onMove = (event) => {
      if (document.pointerLockElement === document.body) return;
      const yaw = lookRef.current?.yaw;
      const pitch = lookRef.current?.pitch;
      if (!yaw || !pitch) return;
      yaw.current -= event.movementX * SENS;
      pitch.current -= event.movementY * SENS;
      pitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch.current));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [decorMode]);

  // کلید B برای ورود/خروج از حالت چیدمان کمپ
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'KeyB' || event.repeat) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      if (!entered) return;
      if (logOpen || settingsOpen || wardrobeOpen || cookingStation || fishingActive) return;
      // ورود فقط در حالت بازی (قفل موس) مجاز است
      if (!decorMode && document.pointerLockElement !== document.body) return;
      event.preventDefault();
      const store = usePlayerStore.getState();
      if (decorMode) {
        store.setDecorMode(false);
        store.setSelectedDecor(null);
        look.lock();
      } else {
        look.unlock();
        store.setDecorMode(true);
        if (!store.selectedDecor) store.setSelectedDecor('tent');
        pushToast('حالت چیدمان — آیتم را انتخاب و روی زمین کلیک کن', 'info');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [entered, logOpen, settingsOpen, wardrobeOpen, cookingStation, fishingActive, decorMode, look, pushToast]);

  // باز شدن ایستگاه پخت: قفل موس آزاد تا دکمه‌ها قابل کلیک باشند
  const prevCooking = useRef(null);
  useEffect(() => {
    if (cookingStation) {
      look.unlock();
    } else if (prevCooking.current && entered) {
      look.lock();
    }
    prevCooking.current = cookingStation;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cookingStation]);

  // ماهیگیری فعال: قفل موس آزاد تا کارت نتیجه/دکمه‌ها کلیک‌پذیر باشند
  const prevFishing = useRef(false);
  useEffect(() => {
    if (fishingActive) {
      look.unlock();
    } else if (prevFishing.current && entered) {
      look.lock();
    }
    prevFishing.current = fishingActive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fishingActive]);

  // دیالوگ NPC: قفل موس آزاد تا گزینه‌ها کلیک‌پذیر باشند؛ بستن → قفل برمی‌گردد
  const prevDialogue = useRef(false);
  useEffect(() => {
    const open = Boolean(activeDialogue);
    if (open) {
      look.unlock();
    } else if (prevDialogue.current && entered) {
      look.lock();
    }
    prevDialogue.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDialogue]);

  // کلید L برای دفترچه
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'KeyL' || event.repeat) return;
      if (document.pointerLockElement !== document.body) return;
      event.preventDefault();
      setLogOpen((v) => !v);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // کلید C برای کمد (باز/بسته)
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'KeyC' || event.repeat) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      if (!entered) return;
      if (logOpen || settingsOpen || cookingStation || fishingActive) return;
      // وقتی بسته است فقط در حالت قفل موس باز می‌شود (یعنی در بازی)
      if (!wardrobeOpen && document.pointerLockElement !== document.body) return;
      event.preventDefault();
      if (wardrobeOpen) {
        setWardrobeOpen(false);
        look.lock();
      } else {
        look.unlock();
        setWardrobeOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [entered, logOpen, settingsOpen, cookingStation, fishingActive, wardrobeOpen, look]);

  // قفل اسکرول + پاک‌سازی هنگام بستن
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      setVirtualInput({ forward: false, backward: false, left: false, right: false, run: false });
      usePlayerStore.getState().setSeat(null);
      usePlayerStore.getState().closeCooking();
      teleport(SPAWN.x, SPAWN.z);
      setSelfId(null);
    };
  }, [setVirtualInput, teleport, setSelfId]);

  const locked = look.locked;
  const paused =
    entered &&
    !locked &&
    !logOpen &&
    !settingsOpen &&
    !wardrobeOpen &&
    !cookingStation &&
    !fishingActive &&
    !decorMode &&
    !activeDialogue;
  const loading = !entered;

  // وضعیت‌های واقعی برای صفحه‌ی لودینگ.
  // توکن LiveKit قبل از ورود گرفته می‌شود؛ اتصال به اتاق بعد از کلیک ورود.
  const loadError = characterError;
  // مدل‌های ضروری با نصب Canvas پیش‌بارگذاری می‌شوند؛ تا آن زمان صفر است
  const characterReady = Boolean(character) && !characterLoading;

  return (
    <div className="fixed inset-0 z-[80] bg-[#0d0b16]">
      {/* صفحه‌ی لودینگ تا زمانی که بازیکن وارد شود */}
      {loading && (
        <GameLoadingScreen
          livekitReady={voiceTokenReady}
          characterReady={characterReady}
          error={loadError}
          canEnter
          onEnter={handleStart}
          onRetry={() => window.location.reload()}
        />
      )}

      {entered && (
        <div className="absolute inset-0">
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center text-sm text-[#f5ebdd]/50">
                در حال ساختن کمپ...
              </div>
            }
          >
            <GameCanvas roomId={roomId} user={user} look={look} active={locked} />
          </Suspense>
        </div>
      )}

      {/* صدای LiveKit بیرون از Canvas تا با آماده شدن توکن بازی remount نشود.
          توکن از ابتدا گرفته می‌شود اما اتصال فقط بعد از ورود (کلیک کاربر) انجام می‌شود. */}
      <GameVoice roomId={roomId} enabled={Boolean(roomId)} connect={entered} />

      {locked && <Crosshair />}

      {/* HUD بالا */}
      {entered && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3 sm:p-4">
          <button
            type="button"
            onClick={handleExit}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-[#171426]/80 text-[#f5ebdd] backdrop-blur-md transition-colors hover:border-[#ef4444]/40 hover:bg-[#ef4444]/15"
            aria-label="خروج از بازی"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="pointer-events-none flex flex-col items-end gap-2">
            <GameHUD
              user={user}
              roomId={roomId}
              micEnabled={micEnabled}
              toggleMic={toggleMic}
              connected={voiceReady}
              onOpenSettings={() => {
                look.unlock();
                setSettingsOpen(true);
              }}
              onOpenLog={() => {
                look.unlock();
                setLogOpen(true);
              }}
              onOpenWardrobe={() => {
                look.unlock();
                setWardrobeOpen(true);
              }}
            />

            {/* مأموریت فعلی — فقط دسکتاپ */}
            <QuestTracker currentQuest={currentQuest} />
          </div>
        </div>
      )}

      <Toasts />
      <InteractionPrompt />
      {entered && <DialogueBox />}

      {/* نوار پایین */}
      {entered && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-3 p-3 sm:p-4">
          <div className="hidden flex-1 lg:block" />
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVirtualInput({ run: !usePlayerStore.getState().virtualInput.run })}
              className="h-12 w-14 rounded-2xl border border-white/15 bg-[#171426]/75 text-[11px] text-[#f5ebdd] backdrop-blur-md active:bg-[#ff9a4d]/30 lg:hidden"
            >
              دویدن
            </button>
            <button
              type="button"
              onClick={() => usePlayerStore.getState().sitAuto()}
              disabled={!nearFire && !seated}
              className={`h-12 rounded-2xl border px-4 text-[12px] font-semibold backdrop-blur-md transition-colors ${
                seated
                  ? 'border-[#ffc66d]/45 bg-[#ff9a4d]/20 text-[#ffc66d]'
                  : 'border-[#65F5A0]/40 bg-[#65F5A0]/14 text-[#65F5A0]'
              } disabled:opacity-35`}
            >
              {seated ? 'بلند شدن' : 'نشستن'}
            </button>
          </div>
        </div>
      )}

      <TouchPad />
      {entered && locked && <ControlsHint />}
      <FacingDebug />
      {entered && <EmoteWheel roomId={roomId} user={user} />}
      {entered && <ChatLogCorner />}

      {entered && decorMode && (
        <DecorPanel
          onClose={() => {
            usePlayerStore.getState().setDecorMode(false);
            usePlayerStore.getState().setSelectedDecor(null);
            look.lock();
          }}
        />
      )}

      {paused && (
        <PauseMenu
          onResume={handleResume}
          onSettings={() => setSettingsOpen(true)}
          onExit={handleExit}
          character={character}
        />
      )}

      <QuestLog open={logOpen} onClose={() => setLogOpen(false)} />
      {entered && cookingStation && (
        <CookingUI key={cookingStation} stationId={cookingStation} roomId={roomId} user={user} />
      )}
      {entered && <FishingUI roomId={roomId} user={user} />}
      <Wardrobe
        open={wardrobeOpen}
        userId={user?.id}
        onClose={() => {
          setWardrobeOpen(false);
          if (entered) look.lock();
        }}
      />
      {settingsOpen && (
        <SettingsPanel
          onClose={() => {
            setSettingsOpen(false);
            // بازگشت به بازی فقط اگر کاربر قبلاً وارد شده بود
            if (entered) look.lock();
          }}
        />
      )}

      {/* انتخاب کاراکتر پیش از بازی — قبل از لودینگ/ورود */}
      <CharacterSelector
        open={selecting}
        onConfirm={() => {
          setCharacterPicked(true);
          setSelecting(false);
        }}
      />
    </div>
  );
}
