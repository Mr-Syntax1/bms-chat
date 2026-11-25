import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import {
  STATIONS,
  INGREDIENTS,
  QUALITY,
  BAR_ZONES,
  cooking,
  subscribeCooking,
  matchRecipe,
  recipesForStation,
  startCook,
  tickCook,
  finishCook,
  flipCook,
  stirCook,
  resetCook,
  zoneColorAt,
} from '../recipes';
import { publishPlayerAction } from '../hooks/useGameSync';
import { createPositionalLoop, playPositionalOneShot } from '../audio';
import {
  FLIP_SOUND,
  FRY_LOOP_SOUND,
  POT_BUBBLE_SOUND,
  COOK_DONE_SOUND,
  BURN_SOUND,
} from '../sounds';
import { PrimaryButton, GhostButton } from './primitives';
import { STIRS_FOR_PERFECT as REQUIRED_STIRS } from '../recipes';
import { GameIcon } from './icons';

/**
 * رابط پخت. والد فقط وقتی ایستگاه باز است این را mount می‌کند و key=stationId
 * می‌دهد تا وضعیت هر ایستگاه تازه شروع شود.
 */
export default function CookingUI({ stationId, roomId, user }) {
  const ingredients = usePlayerStore((s) => s.ingredients);
  const closeCooking = usePlayerStore((s) => s.closeCooking);

  const options = recipesForStation(stationId);
  const station = STATIONS[stationId];

  const [selectedId, setSelectedId] = useState(options[0]?.id ?? null);
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  // شمارش اکشن‌ها برای به‌روزرسانی دکمه‌ها (بدون رندر هر فریم)
  const [actionCount, setActionCount] = useState({ flipped: 0, stirred: 0 });

  const barRef = useRef(null);
  const statsRef = useRef(null);
  const loopRef = useRef(null);
  const holdingRef = useRef(false);
  const phaseRef = useRef('idle');
  const selectedRef = useRef(options[0] ?? null);
  const contextRef = useRef({ roomId, user });

  const selected = options.find((r) => r.id === selectedId) || options[0] || null;

  // مقدارهای تازه برای لیسنرها/حلقه‌ی فریم (نوشتن ref در افکت مجاز است)
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    contextRef.current = { roomId, user };
  }, [roomId, user]);

  // رویدادهای گسسته‌ی مینی‌گیم — رندر فقط در همین لحظات
  useEffect(() => {
    return subscribeCooking((type) => {
      if (type === 'result') {
        setPhase('result');
      } else if (type === 'start') {
        setPhase('cooking');
        setResult(null);
      } else if (type === 'reset') {
        setPhase('idle');
        setActionCount({ flipped: 0, stirred: 0 });
      } else if (type === 'flip' || type === 'stir') {
        setActionCount({ flipped: cooking.flipped, stirred: cooking.stirred });
      }
    });
  }, []);

  // شروع تازه‌ی ایستگاه + پاک‌سازی هنگام بسته شدن UI
  useEffect(() => {
    resetCook();
    return () => {
      loopRef.current?.dispose();
      loopRef.current = null;
      const state = usePlayerStore.getState();
      if (state.action?.startsWith('cooking')) {
        state.endAction();
        publishPlayerAction(contextRef.current.roomId, contextRef.current.user, 'action-end');
      }
      resetCook();
    };
  }, [stationId]);

  // حلقه‌ی مستقل از React برای پیشرفت بار + پایان خودکار
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const finished = tickCook(dt);

      if (barRef.current) {
        barRef.current.style.width = `${Math.round(cooking.progress * 1000) / 10}%`;
        barRef.current.style.background = zoneColorAt(cooking.progress);
      }
      if (statsRef.current) {
        statsRef.current.textContent =
          cooking.phase === 'cooking'
            ? `${cooking.elapsed.toFixed(1)} / ${cooking.recipe?.cookTime?.toFixed(1)}s`
            : '';
      }

      if (finished) {
        phaseRef.current = 'result';
        setResult(finished);
        const state = usePlayerStore.getState();
        state.addFood(finished.dish);
        const tierLabel = finished.tier?.label || QUALITY[finished.quality].label;
        state.pushToast(
          `${finished.recipe.name} — ${tierLabel}`,
          finished.quality === 'perfect' ? 'success' : finished.quality === 'burnt' ? 'warn' : 'info'
        );
        const def = STATIONS[finished.stationId];
        playPositionalOneShot(
          finished.quality === 'burnt' ? BURN_SOUND : COOK_DONE_SOUND,
          [def.pos.x, 1.1, def.pos.z],
          { volume: 0.85 }
        );
        if (state.action?.startsWith('cooking')) {
          state.endAction();
          publishPlayerAction(contextRef.current.roomId, contextRef.current.user, 'action-end');
        }
        loopRef.current?.dispose();
        loopRef.current = null;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stationId]);

  const applyResult = (res) => {
    if (!res) return;
    setResult(res);
    const state = usePlayerStore.getState();
    state.addFood(res.dish);
    const tierLabel = res.tier?.label || QUALITY[res.quality].label;
    state.pushToast(
      `${res.recipe.name} — ${tierLabel}`,
      res.quality === 'perfect' ? 'success' : res.quality === 'burnt' ? 'warn' : 'info'
    );
    playPositionalOneShot(
      res.quality === 'burnt' ? BURN_SOUND : COOK_DONE_SOUND,
      [STATIONS[res.stationId].pos.x, 1.1, STATIONS[res.stationId].pos.z],
      { volume: 0.85 }
    );
    if (state.action?.startsWith('cooking')) {
      state.endAction();
      publishPlayerAction(contextRef.current.roomId, contextRef.current.user, 'action-end');
    }
    if (loopRef.current) {
      loopRef.current.dispose();
      loopRef.current = null;
    }
  };

  const begin = () => {
    const recipe = selectedRef.current;
    if (!recipe || phaseRef.current === 'cooking') return;
    const state = usePlayerStore.getState();
    if (!matchRecipe(stationId, recipe.ingredients)) {
      state.pushToast('این ترکیب با دستور پخت نمی‌خواند', 'warn');
      return;
    }
    if (!state.consumeIngredients(recipe.ingredients)) {
      state.pushToast('مواد اولیه کافی نداری', 'warn');
      return;
    }
    startCook(stationId, recipe);
    setResult(null);
    const def = STATIONS[stationId];
    state.startAction(def.action);
    // مدت تقریبی تا پایان (برای ریموت‌ها؛ action-end زودتر پاکش می‌کند)
    publishPlayerAction(contextRef.current.roomId, contextRef.current.user, 'action', {
      action: def.action,
      duration: Math.round(recipe.cookTime * 1.6 + 2) * 1000,
    });

    if (loopRef.current) {
      loopRef.current.dispose();
      loopRef.current = null;
    }
    loopRef.current =
      stationId === 'pan'
        ? createPositionalLoop(FRY_LOOP_SOUND, [def.pos.x, 0.8, def.pos.z], {
            volume: 0.6,
            channel: 'effects',
            synth: 'fry_sizzle',
          })
        : createPositionalLoop(POT_BUBBLE_SOUND, [def.pos.x, 0.9, def.pos.z], {
            volume: 0.55,
            channel: 'effects',
            synth: 'pot_bubble',
          });
  };

  const end = () => {
    if (phaseRef.current !== 'cooking') return;
    applyResult(finishCook());
  };

  // نگه‌داشتن E برای پخت وقتی UI باز است
  useEffect(() => {
    const onDown = (event) => {
      if (event.code !== 'KeyE' || event.repeat) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      event.preventDefault();
      holdingRef.current = true;
      begin();
    };
    const onUp = (event) => {
      if (event.code !== 'KeyE') return;
      if (!holdingRef.current) return;
      holdingRef.current = false;
      end();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    // رها کردن کلیک بیرون از دکمه هم پخت را تمام می‌کند
    const onPointerUp = () => {
      if (!holdingRef.current) return;
      holdingRef.current = false;
      end();
    };
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('pointerup', onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId]);

  if (!station || !selected) return null;

  const owned = (id) => ingredients[id] || 0;
  const neededCount = (id) => selected.ingredients.filter((x) => x === id).length;
  const canStart = selected.ingredients.every((id) => owned(id) >= neededCount(id));

  const isCooking = phase === 'cooking';
  const canFlip = isCooking && selected.requiresFlip && actionCount.flipped < 1;
  const canStir = isCooking && selected.requiresStir && actionCount.stirred < REQUIRED_STIRS;

  const handleFlip = () => {
    if (!flipCook()) return;
    const def = STATIONS[stationId];
    playPositionalOneShot(FLIP_SOUND, [def.pos.x, 1, def.pos.z], { volume: 0.8 });
  };

  const handleStir = () => {
    if (!stirCook()) return;
    const def = STATIONS[stationId];
    playPositionalOneShot(FLIP_SOUND, [def.pos.x, 1, def.pos.z], { volume: 0.5 });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[92] flex items-end justify-center pb-24 sm:items-center sm:pb-0">
      <div className="pointer-events-auto w-[420px] max-w-[92vw] overflow-hidden rounded-2xl border border-white/12 bg-[#171426]/94 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {/* سربرگ */}
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#ffc66d]">
            <GameIcon name="pan" className="h-4 w-4" strokeWidth={1.7} />
            {station.label}
          </div>
          <button
            type="button"
            onClick={closeCooking}
            aria-label="بستن"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#f5ebdd]/60 hover:bg-white/10 hover:text-[#f5ebdd]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 p-4">
          {/* انتخاب دستور */}
          <div>
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">دستور پخت</div>
            <div className="flex flex-wrap gap-1.5">
              {options.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  disabled={isCooking}
                  onClick={() => setSelectedId(recipe.id)}
                  className={`rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    selected.id === recipe.id
                      ? 'border-[#ffc66d]/50 bg-[#ff9a4d]/18 text-[#ffc66d]'
                      : 'border-white/10 bg-white/[0.04] text-[#f5ebdd]/70 hover:bg-white/10'
                  } disabled:opacity-50`}
                >
                  <span className="mr-1 inline-flex align-middle" aria-hidden="true">
                    <GameIcon name={recipe.icon} className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </span>
                  {recipe.name}
                </button>
              ))}
            </div>
          </div>

          {/* قالب مواد اولیه */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[10px]">
              <span className="font-bold uppercase tracking-wider text-[#ffc66d]/80">مواد لازم</span>
              <span className="text-[#f5ebdd]/45">
                {selected.cookTime.toFixed(1)}s ·{' '}
                {selected.requiresFlip
                  ? 'نیاز به برگرداندن'
                  : selected.requiresStir
                    ? 'نیاز به هم زدن'
                    : 'بدون اکشن'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, slot) => {
                const id = selected.ingredients[slot];
                if (!id) {
                  return (
                    <div
                      key={slot}
                      className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-white/8 bg-black/20 text-[10px] text-[#f5ebdd]/25"
                    >
                      —
                    </div>
                  );
                }
                const item = INGREDIENTS[id] || { name: id, icon: 'info' };
                const have = owned(id) >= neededCount(id);
                return (
                  <div
                    key={slot}
                    title={`${item.name} — موجود: ${owned(id)}`}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl border ${
                      have ? 'border-[#5d9b78]/45 bg-[#5d9b78]/12' : 'border-[#ef4444]/40 bg-[#ef4444]/10'
                    }`}
                  >
                    <span className="text-[#f5ebdd]" aria-hidden="true">
                      <GameIcon name={item.icon} className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <span className="mt-0.5 text-[9px] text-[#f5ebdd]/70">{item.name}</span>
                    <span className={`font-mono text-[9px] ${have ? 'text-[#65F5A0]' : 'text-[#ef4444]'}`}>
                      {owned(id)}/{neededCount(id)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* نوار پیشرفت با ناحیه‌های کیفیت */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-[#f5ebdd]/45">
              <span ref={statsRef} className="font-mono" />
              <span>{isCooking ? 'کلید E را رها کن' : 'برای شروع نگه دار'}</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full">
              <div className="absolute inset-0 flex">
                {BAR_ZONES.map((z, i) => (
                  <div
                    key={i}
                    style={{ width: `${(z.to - z.from) * 100}%`, background: z.color, opacity: 0.35 }}
                  />
                ))}
              </div>
              <div
                ref={barRef}
                className="relative h-full rounded-full transition-[width] duration-75"
                style={{ width: '0%', background: '#4ade80' }}
              />
            </div>
          </div>

          {/* دکمه‌ها */}
          <div className="flex items-center gap-2">
            <PrimaryButton
              onPointerDown={begin}
              onPointerUp={end}
              onPointerLeave={() => holdingRef.current && end()}
              disabled={!canStart || isCooking}
              className="flex-1 py-2 text-[12px]"
            >
              {isCooking ? 'در حال پختن…' : 'پختن (نگه دار)'}
            </PrimaryButton>

            {selected.requiresFlip && (
              <GhostButton onClick={handleFlip} disabled={!canFlip} className="py-2 text-[11px]">
                برگرداندن
              </GhostButton>
            )}
            {selected.requiresStir && (
              <GhostButton onClick={handleStir} disabled={!canStir} className="py-2 text-[11px]">
                هم زدن {actionCount.stirred}/{REQUIRED_STIRS}
              </GhostButton>
            )}
          </div>

          {/* نتیجه */}
          {phase === 'result' && result && (
            <div
              className="flex items-center gap-2 rounded-xl border px-3 py-2"
              style={{
                borderColor: `${QUALITY[result.quality].color}55`,
                background: `${QUALITY[result.quality].color}14`,
              }}
            >
              <span className="text-[#f5ebdd]" aria-hidden="true">
                <GameIcon name={result.dish.icon} className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[12px] font-bold text-[#f5ebdd]">
                  {result.dish.name} —{' '}
                  <span style={{ color: QUALITY[result.quality].color }}>
                    {result.tier?.label || QUALITY[result.quality].label}
                  </span>
                </div>
                <div className="truncate text-[10px] text-[#f5ebdd]/55">
                  {result.tier?.note || QUALITY[result.quality].note}
                </div>
              </div>
              <span className="flex items-center gap-1 font-mono text-[10px] text-[#f5ebdd]/50">
                <GameIcon name="plate" className="h-3 w-3" strokeWidth={1.8} />
                {result.dish.hunger}
              </span>
            </div>
          )}

          <p className="text-[9.5px] leading-relaxed text-[#f5ebdd]/35">
            نکته: زود رها کنی خام می‌ماند؛ دیر رها کنی می‌سوزد. ماهیتابه «برگرداندن» و دیگ «هم زدن» می‌خواهد.
          </p>
        </div>
      </div>
    </div>
  );
}
