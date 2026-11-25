// ---------------------------------------------------------------------------
// FishingUI.jsx — مینی‌گیم ۴ مرحله‌ای ماهیگیری
//
//  ۱) نگه‌داشتن E = شارژ قدرت پرتاب، رها کردن = پرتاب
//  ۲) انتظار تصادفی ۳..۸ ثانیه با بابِر روی آب
//  ۳) گزش: E سریع → قلاب
//  ۴) کشش: نگه‌داشتن/رها کردن E برای نگه‌داشتن شاخص در ناحیه‌ی سبز (۳ ثانیه)
//
// داده‌ی زنده در fishData (بیرون React) است؛ نوارها با ref مستقیم آپدیت می‌شوند.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { publishPlayerAction } from '../hooks/useGameSync';
import { playPositionalOneShot, createPositionalLoop } from '../audio';
import {
  FISH_CAST_SOUND,
  FISH_REEL_SOUND,
  FISH_CATCH_SOUND,
  FISH_BITE_SOUND,
} from '../sounds';
import {
  fishing,
  subscribeFishing,
  beginCharge,
  tickCharge,
  releaseCast,
  tickWaiting,
  tickBite,
  hookFish,
  stepReel,
  resetFishing,
  REEL_HOLD_TIME,
  BITE_WINDOW,
  RARITY,
} from '../fishData';
import { GameIcon } from './icons';

const RARITY_FALLBACK = RARITY.common;

export default function FishingUI({ roomId, user }) {
  const [phase, setPhase] = useState(fishing.phase);
  const [result, setResult] = useState(null);
  const [shake, setShake] = useState(false);

  const barRef = useRef(null);
  const markerRef = useRef(null);
  const safeRef = useRef(null);
  const holdRef = useRef(null);
  const powerRef = useRef(null);
  const chargeWrapRef = useRef(null);
  const biteRef = useRef(null);
  const holdKeyRef = useRef(false);
  const openedAtRef = useRef(0);
  const reelLoopRef = useRef(null);
  const contextRef = useRef({ roomId, user });
  const phaseRef = useRef(fishing.phase);

  useEffect(() => {
    contextRef.current = { roomId, user };
  }, [roomId, user]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const stopReelSound = () => {
    reelLoopRef.current?.dispose();
    reelLoopRef.current = null;
  };

  const broadcastStart = () => {
    const { roomId: room, user: u } = contextRef.current;
    publishPlayerAction(room, u, 'action', { action: 'fishing-hold', duration: 180000 });
  };

  const broadcastEnd = () => {
    const { roomId: room, user: u } = contextRef.current;
    publishPlayerAction(room, u, 'action-end');
  };

  // همگام‌سازی store + صدا + پخش شبکه‌ای روی رویدادهای گسسته
  useEffect(() => {
    return subscribeFishing((type) => {
      const state = usePlayerStore.getState();
      const spot = fishing.spot;
      const pos = spot ? [spot.x, 0.6, spot.z] : [0, 0.6, 0];

      if (type === 'start') {
        openedAtRef.current = performance.now();
        state.setFishingState({ isCasting: true, isWaiting: false, isReeling: false, spotIndex: fishing.spotIndex });
        state.startAction('fishing-hold');
        broadcastStart();
        setResult(null);
      } else if (type === 'charge') {
        state.setFishingState({ isCasting: true, isWaiting: false, isReeling: false });
        setResult(null);
      } else if (type === 'cast') {
        state.setFishingState({ isCasting: false, isWaiting: true, isReeling: false });
        playPositionalOneShot(FISH_CAST_SOUND, pos, { volume: 0.7, synth: 'splash_small' });
      } else if (type === 'bite') {
        playPositionalOneShot(FISH_BITE_SOUND, pos, { volume: 0.9, synth: 'fish_bite' });
        setShake(true);
        setTimeout(() => setShake(false), 320);
      } else if (type === 'reel') {
        state.setFishingState({ isCasting: false, isWaiting: false, isReeling: true });
        stopReelSound();
        reelLoopRef.current = createPositionalLoop(FISH_REEL_SOUND, [pos[0], 0.8, pos[2]], {
          volume: 0.6,
          channel: 'effects',
          loop: true,
        });
      } else if (type === 'result') {
        state.setFishingState({ isCasting: false, isWaiting: false, isReeling: false });
        stopReelSound();
        if (fishing.result?.ok) {
          playPositionalOneShot(FISH_CATCH_SOUND, pos, { volume: 0.9 });
          state.addFish(fishing.result.fish);
        }
        if (state.action === 'fishing-hold') {
          state.endAction();
          broadcastEnd();
        }
        setResult(fishing.result);
      } else if (type === 'reset') {
        state.setFishingState({ isCasting: false, isWaiting: false, isReeling: false, spotIndex: -1 });
        stopReelSound();
        if (state.action === 'fishing-hold') {
          state.endAction();
          broadcastEnd();
        }
        setResult(null);
      }

      setPhase(fishing.phase);
    });
  }, []);

  // حلقه‌ی مستقل از React: شارژ، انتظار، گزش، کشش
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      if (fishing.active) {
        if (fishing.phase === 'charging') tickCharge(dt);
        else if (fishing.phase === 'waiting') tickWaiting(dt);
        else if (fishing.phase === 'bite') tickBite(dt);
        else if (fishing.phase === 'reeling') stepReel(dt, holdKeyRef.current);
      }

      if (chargeWrapRef.current) {
        chargeWrapRef.current.style.opacity = fishing.phase === 'charging' ? '1' : '0';
      }
      if (powerRef.current) {
        powerRef.current.style.width = `${Math.round(fishing.power * 100)}%`;
      }
      if (biteRef.current) {
        const pct = Math.max(0, fishing.biteLeft / BITE_WINDOW);
        biteRef.current.style.width = `${Math.round(pct * 100)}%`;
      }
      if (barRef.current && fishing.phase === 'reeling') {
        const safeFrom = fishing.safeFrom ?? 0.4;
        const safeTo = fishing.safeTo ?? 0.6;
        markerRef.current.style.left = `${Math.round(fishing.indicator * 1000) / 10}%`;
        if (safeRef.current) {
          safeRef.current.style.left = `${Math.round(safeFrom * 1000) / 10}%`;
          safeRef.current.style.width = `${Math.round((safeTo - safeFrom) * 1000) / 10}%`;
        }
        if (holdRef.current) {
          const pct = Math.max(0, Math.min(1, fishing.keepTime / REEL_HOLD_TIME));
          holdRef.current.style.width = `${Math.round(pct * 100)}%`;
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // کیبورد: E نگه‌داشتن/رها کردن، ESC بستن
  useEffect(() => {
    const onDown = (event) => {
      if (event.code === 'Escape' && (fishing.active || fishing.phase === 'result')) {
        resetFishing();
        return;
      }
      if (event.code === 'KeyE' && fishing.phase === 'bite') {
        event.preventDefault();
        holdKeyRef.current = true;
        hookFish();
        return;
      }
      if (event.code === 'KeyE' && fishing.phase === 'ready') {
        // همان E که مینی‌گیم را باز کرده نباید بلافاصله شارژ را شروع کند
        if (performance.now() - openedAtRef.current < 260) return;
        event.preventDefault();
        holdKeyRef.current = true;
        beginCharge();
        return;
      }
    };
    const onUp = (event) => {
      if (event.code !== 'KeyE') return;
      holdKeyRef.current = false;
      if (fishing.phase === 'charging') releaseCast();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useEffect(() => stopReelSound, []);

  if (!fishing.active && !result) return null;

  const rarity = result?.fish ? RARITY[result.fish.rarity] || RARITY_FALLBACK : RARITY_FALLBACK;
  const isReeling = phase === 'reeling';

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[91] flex items-end justify-center pb-28 sm:pb-36 ${
        shake ? 'fishing-shake' : ''
      }`}
    >
      <div className="pointer-events-auto w-[360px] max-w-[92vw]">
        {/* راهنماهای مرحله */}
        {phase === 'ready' && (
          <HintCard title="آماده‌ی پرتاب" hint="E را نگه دار تا قدرت جمع شود، بعد رها کن.">
            <div ref={chargeWrapRef} className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10 opacity-0">
              <div ref={powerRef} className="h-full w-0 rounded-full bg-gradient-to-r from-[#65F5A0] to-[#ffc66d]" />
            </div>
          </HintCard>
        )}

        {phase === 'charging' && (
          <HintCard title="شارژ قدرت" hint="هرچه بیشتر نگه داری، پرتاب دورتر می‌رود.">
            <div ref={chargeWrapRef} className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div ref={powerRef} className="h-full w-0 rounded-full bg-gradient-to-r from-[#65F5A0] to-[#ffc66d]" />
            </div>
          </HintCard>
        )}

        {(phase === 'waiting' || phase === 'bite') && (
          <HintCard
            title={phase === 'bite' ? 'گرفتش!' : 'منتظر گزش ماهی'}
            hint={phase === 'bite' ? 'سریع E را بزن تا قلاب کنی.' : 'بابِر روی آب است…'}
            danger={phase === 'bite'}
          >
            {phase === 'bite' && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div ref={biteRef} className="h-full rounded-full bg-[#ef4444]" style={{ width: '100%' }} />
              </div>
            )}
          </HintCard>
        )}

        {isReeling && (
          <div className="rounded-2xl border border-white/12 bg-[#171426]/94 p-4 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#ffc66d]">
                <GameIcon name="rod" className="h-4 w-4" />
                کشش نخ
              </span>
              <span className="font-mono text-[10px] text-[#f5ebdd]/50">
                {Math.max(0, fishing.keepTime).toFixed(1)} / {REEL_HOLD_TIME}s
              </span>
            </div>

            <div ref={barRef} className="relative h-4 w-full overflow-hidden rounded-full bg-[#262238]">
              <div ref={safeRef} className="absolute inset-y-0 bg-[#65F5A0]/35" />
              <div ref={markerRef} className="absolute inset-y-0 w-1.5 -translate-x-1/2 rounded-full bg-[#fff4e4] shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div ref={holdRef} className="h-full w-0 rounded-full bg-[#65F5A0]" />
            </div>

            <p className="mt-2 text-center text-[10px] text-[#f5ebdd]/55">
              E را نگه دار تا شاخص بالا برود؛ در ناحیه‌ی سبز نگهش دار.
            </p>
          </div>
        )}

        {result && (
          <div
            className="rounded-2xl border bg-[#171426]/96 p-4 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            style={{ borderColor: `${rarity.color}66` }}
          >
            {result.ok ? (
              <>
                <div className="mb-2 flex items-center gap-2.5">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: `${rarity.color}22`, color: rarity.color }}
                  >
                    <GameIcon name={result.fish.icon} className="h-7 w-7" />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[13px] font-extrabold text-[#f5ebdd]">{result.fish.name}</div>
                    <div className="text-[10px]" style={{ color: rarity.color }}>
                      {rarity.label}
                    </div>
                  </div>
                  {!result.fish.junk && (
                    <span className="font-mono text-[11px] text-[#f5ebdd]/70">{result.fish.weight} kg</span>
                  )}
                </div>
                <p className="text-[10.5px] leading-relaxed text-[#f5ebdd]/55">
                  {result.fish.junk ? 'این یکی خوردنی نیست؛ بهتر است برگردانی.' : 'به دفترچه‌ی ماهی‌ها اضافه شد.'}
                </p>
              </>
            ) : (
              <>
                <div className="mb-1 flex items-center gap-2 text-[12px] font-bold text-[#fbbf24]">
                  <GameIcon name="alert" className="h-4 w-4" />
                  {result.reason || 'ماهی فرار کرد'}
                </div>
                <p className="text-[10.5px] text-[#f5ebdd]/55">دوباره تلاش کن؛ E را کمی دیرتر رها کن.</p>
              </>
            )}

            <button
              type="button"
              onClick={() => resetFishing()}
              className="mt-3 w-full cursor-pointer rounded-xl border border-white/12 bg-white/[0.06] py-1.5 text-[11px] font-semibold text-[#f5ebdd] transition-colors hover:bg-white/12"
            >
              بستن
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HintCard({ title, hint, danger = false, children }) {
  return (
    <div
      className={`rounded-2xl border bg-[#171426]/94 px-4 py-3 backdrop-blur-xl ${
        danger ? 'border-[#ef4444]/55 shadow-[0_0_26px_-6px_rgba(239,68,68,0.7)]' : 'border-white/12'
      }`}
    >
      <div className={`flex items-center gap-1.5 text-[12px] font-bold ${danger ? 'text-[#ffb4b4]' : 'text-[#ffc66d]'}`}>
        <GameIcon name="fish" className="h-4 w-4" />
        {title}
      </div>
      <p className="mt-1 text-[10.5px] text-[#f5ebdd]/60">{hint}</p>
      {children}
    </div>
  );
}
