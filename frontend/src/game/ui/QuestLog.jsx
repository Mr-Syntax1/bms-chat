import { useEffect } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { QUEST_STEPS, questValue, isQuestStepLocked, getActiveQuestStep } from '../questSteps';
import { RARITY } from '../fishData';
import { ProgressBar } from './primitives';
import { GameIcon } from './icons';

const ITEMS = [
  { icon: 'map', label: 'تکه نقشه', key: 'parchments', max: 3 },
  { icon: 'lantern', label: 'فانوس', key: 'lanterns', max: 5 },
  { icon: 'key', label: 'کلید', key: 'key', max: 1 },
  { icon: 'shell', label: 'صدف', key: 'shells', max: 10 },
];

/**
 * کشوی سمت راست: پیشرفت مأموریت‌ها + اینونتوری.
 * با ESC یا کلیک بیرون بسته می‌شود.
 */
export default function QuestLog({ open, onClose }) {
  const quests = usePlayerStore((s) => s.quests);
  const foods = usePlayerStore((s) => s.foods);
  const eatFood = usePlayerStore((s) => s.eatFood);
  const fishCaught = usePlayerStore((s) => s.fishCaught);
  const bugsCaught = usePlayerStore((s) => s.bugsCaught);
  const active = getActiveQuestStep(quests);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.code === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="بستن"
        onClick={onClose}
        className="fixed inset-0 z-[100] cursor-default bg-black/40 backdrop-blur-[2px] cozy-fade-in"
      />

      <aside className="fixed right-0 top-0 z-[101] h-full w-[300px] max-w-[88vw] overflow-y-auto border-l border-white/10 bg-[#171426]/94 p-4 backdrop-blur-xl cozy-pop-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#f5ebdd]">دفترچه‌ی کمپ</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/12 text-[#f5ebdd]/70 hover:bg-white/10 hover:text-[#f5ebdd]"
          >
            <GameIcon name="close" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* مأموریت‌ها */}
        <section className="mb-5">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">مأموریت داستانی</h3>
          <div className="space-y-2">
            {QUEST_STEPS.map((step) => {
              const value = questValue(quests, step.key);
              const done = value >= step.max;
              const locked = !done && isQuestStepLocked(quests, step.key);
              const isActive = !done && !locked && active.step.key === step.key;

              return (
                <div
                  key={step.key}
                  className={`rounded-xl border p-2.5 transition-colors ${
                    done
                      ? 'border-[#5d9b78]/40 bg-[#5d9b78]/10'
                      : locked
                        ? 'border-white/6 bg-black/20 opacity-55'
                        : isActive
                          ? 'border-[#ffc66d]/45 bg-[#ffc66d]/10'
                          : 'border-white/10 bg-black/25'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-[#f5ebdd]" aria-hidden="true">
                      <GameIcon name={locked ? 'lock' : step.icon} className="h-4 w-4" strokeWidth={1.7} />
                    </span>
                    <span className="flex-1 text-[11px] font-bold text-[#f5ebdd]">{step.title}</span>
                    {isActive && (
                      <span className="rounded-full bg-[#ff9a4d]/25 px-1.5 py-0.5 text-[8px] font-bold text-[#ffc66d]">
                        فعال
                      </span>
                    )}
                    <span
                      className={`font-mono text-[10px] ${
                        done ? 'text-[#65F5A0]' : 'text-[#f5ebdd]/55'
                      }`}
                    >
                      {value}/{step.max}
                    </span>
                  </div>
                  <p className="mb-1.5 text-[10px] leading-relaxed text-[#f5ebdd]/50">{step.desc}</p>
                  <ProgressBar value={value} max={step.max} />
                </div>
              );
            })}
          </div>
        </section>

        {/* اینونتوری */}
        <section>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">اینونتوری</h3>
          <div className="grid grid-cols-4 gap-2">
            {ITEMS.map((item) => {
              const value = questValue(quests, item.key);
              const full = value >= item.max;
              return (
                <div
                  key={item.key}
                  title={`${item.label} — ${value}/${item.max}`}
                  className={`group relative flex aspect-square flex-col items-center justify-center rounded-xl border transition-colors ${
                    full
                      ? 'border-[#5d9b78]/45 bg-[#5d9b78]/12'
                      : value > 0
                        ? 'border-[#ffc66d]/30 bg-[#ffc66d]/8'
                        : 'border-white/8 bg-black/25'
                  }`}
                >
                  <span className="text-[#f5ebdd]" aria-hidden="true">
                    <GameIcon name={item.icon} className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <span className={`mt-0.5 font-mono text-[9px] ${full ? 'text-[#65F5A0]' : 'text-[#f5ebdd]/50'}`}>
                    {value}/{item.max}
                  </span>
                  {/* تولتیپ */}
                  <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/12 bg-[#0d0b16]/95 px-2 py-0.5 text-[9px] text-[#f5ebdd] group-hover:block">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ماهی‌های صیدشده */}
        <section className="mt-5">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
            ماهی‌های صیدشده ({fishCaught.length})
          </h3>
          {fishCaught.length === 0 ? (
            <p className="rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] text-[#f5ebdd]/40">
              هنوز ماهی نگرفتی. کنار رودخانه یا اسکله با E ماهیگیری کن.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {fishCaught.map((fish) => {
                const rarity = RARITY[fish.rarity] || RARITY.common;
                return (
                  <div
                    key={fish.uid}
                    title={`${fish.name}${fish.junk ? '' : ` — ${fish.weight} کیلو`} (${rarity.label})`}
                    className="group relative flex aspect-square flex-col items-center justify-center rounded-xl border bg-black/25"
                    style={{ borderColor: `${rarity.color}55` }}
                  >
                    <span style={{ color: rarity.color }} aria-hidden="true">
                      <GameIcon name={fish.icon} className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <span className="mt-0.5 line-clamp-1 px-0.5 text-[8px] text-[#f5ebdd]/65">{fish.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* حشرات گرفته‌شده */}
        <section className="mt-5">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
            حشرات گرفته‌شده ({bugsCaught.length})
          </h3>
          {bugsCaught.length === 0 ? (
            <p className="rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] text-[#f5ebdd]/40">
              هنوز حشره‌ای نگرفتی. نزدیک پروانه/سوسک/کرم شب‌تاب با F تور بزن.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {bugsCaught.map((bug) => (
                <div
                  key={bug.uid}
                  title={`${bug.name}`}
                  className="group relative flex aspect-square flex-col items-center justify-center rounded-xl border bg-black/25"
                  style={{ borderColor: `${bug.rarityColor || '#9fd6b0'}55` }}
                >
                  <span style={{ color: bug.rarityColor || '#9fd6b0' }} aria-hidden="true">
                    <GameIcon name={bug.icon} className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <span className="mt-0.5 line-clamp-1 px-0.5 text-[8px] text-[#f5ebdd]/65">{bug.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* غذاهای پخته‌شده */}
        <section className="mt-5">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
            غذاهای پخته‌شده ({foods.length})
          </h3>
          {foods.length === 0 ? (
            <p className="rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] text-[#f5ebdd]/40">
              هنوز چیزی نپختی. سر یک ایستگاه پخت برو و E را نگه دار.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {foods.map((dish) => (
                <button
                  key={dish.uid}
                  type="button"
                  onClick={() => eatFood(dish.uid)}
                  title={`${dish.name} (${dish.qualityLabel}) — برای خوردن کلیک کن`}
                  className={`group relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border transition-colors hover:brightness-110 ${
                    dish.quality === 'perfect'
                      ? 'border-[#ffc66d]/50 bg-[#ffc66d]/12'
                      : dish.quality === 'burnt'
                        ? 'border-[#ef4444]/40 bg-[#ef4444]/10'
                        : 'border-[#5d9b78]/35 bg-[#5d9b78]/8'
                  }`}
                >
                  <span className="text-[#f5ebdd]" aria-hidden="true">
                    <GameIcon name={dish.icon} className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <span className="mt-0.5 line-clamp-1 px-0.5 text-[8px] text-[#f5ebdd]/65">{dish.name}</span>
                  <span className="flex items-center gap-1 font-mono text-[8px] text-[#f5ebdd]/45">
                    <GameIcon name="plate" className="h-2.5 w-2.5" strokeWidth={2} />
                    {dish.hunger}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <p className="mt-5 rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] leading-relaxed text-[#f5ebdd]/40">
          نکته: ترتیب مراحل اجباری است. هر مرحله پس از تکمیل قبلی باز می‌شود.
        </p>
      </aside>
    </>
  );
}
