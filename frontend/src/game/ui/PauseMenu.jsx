import { usePlayerStore } from '../stores/usePlayerStore';
import { GlassPanel, PrimaryButton, GhostButton } from './primitives';

const KEYS = [
  ['WASD', 'حرکت'],
  ['Shift', 'دویدن'],
  ['موس', 'چرخش دوربین'],
  ['E', 'تعامل / نشستن'],
  ['G', 'گیتار'],
  ['M', 'مارشمالو'],
  ['1–5', 'ایموت'],
  ['F', 'چراغ ون'],
  ['ESC', 'توقف'],
];

/**
 * منوی توقف: پس از آزاد شدن قفل موس (ESC) روی صحنه ظاهر می‌شود.
 */
export default function PauseMenu({ onResume, onSettings, onExit, character }) {
  const quests = usePlayerStore((s) => s.quests);

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0d0b16]/82 backdrop-blur-md cozy-fade-in" />

      <GlassPanel className="relative z-10 w-full max-w-sm p-6 text-center cozy-pop-in">
        <div className="mb-1 text-3xl" aria-hidden="true">
          🔥
        </div>
        <h2 className="mb-1 text-lg font-extrabold text-[#f5ebdd]">کمپ دنج جنگل</h2>
        <p className="mb-5 text-[11px] text-[#f5ebdd]/50">
          {character ? `کاراکتر تو: ${String(character).replace('.glb', '')}` : 'به کمپ خوش آمدی'}
        </p>

        <div className="mb-5 grid grid-cols-4 gap-1.5 text-[10px]">
          {[
            { icon: '🗺️', value: quests.parchments, max: 3 },
            { icon: '🏮', value: quests.lanterns, max: 5 },
            { icon: '🗝️', value: quests.hasKey ? 1 : 0, max: 1 },
            { icon: '🐚', value: quests.shells, max: 10 },
          ].map((item, i) => (
            <div key={i} className="rounded-lg border border-white/8 bg-black/25 py-1.5 text-[#f5ebdd]/60">
              <div className="text-sm leading-none" aria-hidden="true">
                {item.icon}
              </div>
              <div className="mt-0.5 font-mono text-[9px]">
                {item.value}/{item.max}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-5 space-y-2">
          <PrimaryButton className="w-full" onClick={onResume}>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            ادامه بازی
          </PrimaryButton>
          <GhostButton className="w-full" onClick={onSettings}>
            تنظیمات
          </GhostButton>
          <GhostButton className="w-full !text-[#ffb4b4] hover:!bg-[#ef4444]/12" onClick={onExit}>
            خروج از کمپ
          </GhostButton>
        </div>

        <details className="rounded-xl border border-white/8 bg-black/20 p-2.5 text-left">
          <summary className="cursor-pointer text-[10.5px] font-bold text-[#f5ebdd]/70">کلیدهای بازی</summary>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {KEYS.map(([key, action]) => (
              <div key={key} className="flex items-center justify-between text-[10px] text-[#f5ebdd]/55">
                <kbd className="rounded border border-white/15 bg-white/5 px-1 font-mono text-[9px]">{key}</kbd>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </details>
      </GlassPanel>
    </div>
  );
}
