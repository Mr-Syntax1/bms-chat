import { useEffect, useRef, useState } from 'react';
import { usePlayerStore, remoteMap, uiFlags } from '../stores/usePlayerStore';
import { publishPlayerAction } from '../hooks/useGameSync';
import { playPositionalOneShot } from '../audio';
import { EMOTE_POP_SOUND } from '../sounds';
import { GameIcon } from './icons';

// ۸ ایموت چرخ فلکی — شناسه‌ها با CLIP_SUFFIX و انیمیشن رویه‌ای Character یکی‌اند
const WHEEL_EMOTES = [
  { id: 'wave', label: 'دست تکون', icon: 'wave' },
  { id: 'dance', label: 'رقص', icon: 'dance' },
  { id: 'cheer', label: 'هورا', icon: 'party' },
  { id: 'laugh', label: 'خنده', icon: 'laugh' },
  { id: 'sit', label: 'چهارزانو', icon: 'sit' },
  { id: 'sleep', label: 'خواب', icon: 'sleep' },
  { id: 'hug', label: 'بغل', icon: 'hug' },
  { id: 'highfive', label: 'بزن قدش', icon: 'highfive' },
];

const EMOTE_DURATION = 3400;
const RING_RADIUS = 104;
const DEAD_ZONE = 26;
const DUO_RANGE = 2;

// انتخاب ایموت با حرکت موس (حتی در pointer lock) — حالت بیرون از React
const wheelState = { open: false, x: 0, y: 0 };

function indexFromCursor() {
  const dist = Math.hypot(wheelState.x, wheelState.y);
  if (dist < DEAD_ZONE) return null;
  const angle = Math.atan2(wheelState.y, wheelState.x);
  // اسلایس ۰ در بالای دایره است
  let a = angle + Math.PI / 2;
  if (a < 0) a += Math.PI * 2;
  return Math.round(a / (Math.PI / 4)) % WHEEL_EMOTES.length;
}

/**
 * چرخ ایموت: نگه‌داشتن Q → انتخاب با موس → رها کردن Q.
 * برای hug/highfive نزدیک‌ترین بازیکن تا ۲ متر هم‌گام می‌شود.
 */
export default function EmoteWheel({ roomId, user }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const timerRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const trigger = (index) => {
      const emote = WHEEL_EMOTES[index];
      if (!emote) return;
      const state = usePlayerStore.getState();
      const { local } = state;
      playPositionalOneShot(EMOTE_POP_SOUND, [local.x, 1.3, local.z], { volume: 0.8 });

      let duo = null;
      if (emote.id === 'hug' || emote.id === 'highfive') {
        let bestId = null;
        let bestDist = DUO_RANGE;
        for (const [id, entry] of remoteMap) {
          const d = Math.hypot(entry.current.x - local.x, entry.current.z - local.z);
          if (d < bestDist) {
            bestDist = d;
            bestId = id;
          }
        }
        if (bestId) {
          duo = bestId;
          const entry = remoteMap.get(bestId);
          if (entry) {
            entry.emote = emote.id;
            entry.emoteUntil = Date.now() + EMOTE_DURATION;
          }
        }
      }

      state.startEmote(emote.id, EMOTE_DURATION);
      publishPlayerAction(roomId, user, 'emote', {
        emote: emote.id,
        duration: EMOTE_DURATION,
        duo,
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        usePlayerStore.getState().endEmote();
        timerRef.current = null;
      }, EMOTE_DURATION);
    };

    const openWheel = () => {
      wheelState.open = true;
      uiFlags.emoteWheelOpen = true;
      wheelState.x = 0;
      wheelState.y = 0;
      setActive(null);
      setOpen(true);
    };

    const closeWheel = (commit) => {
      if (!wheelState.open) return;
      wheelState.open = false;
      uiFlags.emoteWheelOpen = false;
      if (commit) trigger(activeRef.current);
      setOpen(false);
      setActive(null);
    };

    const onKeyDown = (event) => {
      if (event.code !== 'KeyQ' || event.repeat) return;
      // در حالت دکور، Q برای چرخش آیتم است نه چرخ ایموت
      if (usePlayerStore.getState().decorMode) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      event.preventDefault();
      openWheel();
    };

    const onKeyUp = (event) => {
      if (event.code !== 'KeyQ') return;
      closeWheel(true);
    };

    // اگر کاربر در فیلد متنی تایپ می‌کند، چرخ باز نماند
    const onFocusIn = (event) => {
      if (event.target?.tagName === 'INPUT' || event.target?.tagName === 'TEXTAREA') {
        closeWheel(false);
      }
    };

    const onPointerMove = (event) => {
      if (!wheelState.open) return;
      // در pointer lock، movementX/Y معتبر است؛ قبل از قفل شدن clientX کافی است
      if (document.pointerLockElement) {
        wheelState.x += event.movementX || 0;
        wheelState.y += event.movementY || 0;
      } else {
        wheelState.x = event.clientX - window.innerWidth / 2;
        wheelState.y = event.clientY - window.innerHeight / 2;
      }
      const len = Math.hypot(wheelState.x, wheelState.y);
      if (len > RING_RADIUS + 46) {
        wheelState.x = (wheelState.x / len) * (RING_RADIUS + 46);
        wheelState.y = (wheelState.y / len) * (RING_RADIUS + 46);
      }
    };

    const onBlur = () => closeWheel(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focusin', onFocusIn);

    // فقط هنگام باز بودن چرخ، انتخاب را از موس بخوان (بدون re-render در حالت بسته)
    let raf = 0;
    const tick = () => {
      if (wheelState.open) {
        const next = indexFromCursor();
        if (next !== activeRef.current) {
          activeRef.current = next;
          setActive(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focusin', onFocusIn);
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
      wheelState.open = false;
      uiFlags.emoteWheelOpen = false;
    };
  }, [roomId, user]);

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
      <div className="relative h-[280px] w-[280px] select-none">
        <div className="absolute inset-0 rounded-full border border-white/10 bg-[#171426]/55 backdrop-blur-md" />
        {WHEEL_EMOTES.map((emote, i) => {
          const angle = -Math.PI / 2 + (i * Math.PI * 2) / WHEEL_EMOTES.length;
          const x = Math.cos(angle) * RING_RADIUS;
          const y = Math.sin(angle) * RING_RADIUS;
          const isActive = active === i;
          return (
            <div
              key={emote.id}
              className={`absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border text-center transition-all duration-150 ${
                isActive
                  ? 'scale-110 border-[#ffc66d]/70 bg-[#ff9a4d]/25 text-[#fff4e4] shadow-[0_0_18px_rgba(255,154,77,0.45)]'
                  : 'border-white/12 bg-[#1c1830]/80 text-[#f5ebdd]/75'
              }`}
              style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
            >
              <span className="text-[#f5ebdd]">
                <GameIcon name={emote.icon} className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <span className="mt-0.5 text-[9px] leading-none">{emote.label}</span>
            </div>
          );
        })}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
          <span className="text-[11px] font-bold text-[#ffc66d]">
            {active != null ? WHEEL_EMOTES[active].label : 'ایموت'}
          </span>
          <span className="text-[9px] text-[#f5ebdd]/50">موس را بچرخان و Q را رها کن</span>
        </div>
      </div>
    </div>
  );
}
