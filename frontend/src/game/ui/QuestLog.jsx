import { useEffect } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { QUEST_STEPS, questValue, isQuestStepLocked, getActiveQuestStep } from '../questSteps';
import { ProgressBar } from './primitives';

const ITEMS = [
  { icon: '🗺️', label: 'تکه نقشه', key: 'parchments', max: 3 },
  { icon: '🏮', label: 'فانوس', key: 'lanterns', max: 5 },
  { icon: '🗝️', label: 'کلید', key: 'key', max: 1 },
  { icon: '🐚', label: 'صدف', key: 'shells', max: 10 },
];

/**
 * کشوی سمت راست: پیشرفت مأموریت‌ها + اینونتوری.
 * با ESC یا کلیک بیرون بسته می‌شود.
 */
export default function QuestLog({ open, onClose }) {
  const quests = usePlayerStore((s) => s.quests);
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
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/12 text-[#f5ebdd]/70 hover:bg-white/10 hover:text-[#f5ebdd]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                    <span className="text-sm" aria-hidden="true">
                      {locked ? '🔒' : step.icon}
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
                  <span className="text-lg leading-none" aria-hidden="true">
                    {item.icon}
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

        <p className="mt-5 rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] leading-relaxed text-[#f5ebdd]/40">
          نکته: ترتیب مراحل اجباری است. هر مرحله پس از تکمیل قبلی باز می‌شود.
        </p>
      </aside>
    </>
  );
}
