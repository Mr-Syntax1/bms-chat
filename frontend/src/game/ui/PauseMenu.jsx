import { usePlayerStore } from '../stores/usePlayerStore';
import { GlassPanel, PrimaryButton, GhostButton } from './primitives';
import { GameIcon } from './icons';

const KEYS = [
  ['WASD', 'حرکت'],
  ['Shift', 'دویدن'],
  ['موس', 'چرخش دوربین'],
  ['E', 'تعامل / ماهیگیری / نشستن'],
  ['Q', 'چرخ ایموت'],
  ['G', 'گیتار'],
  ['M', 'مارشمالو'],
  ['F', 'چراغ ون'],
  ['L', 'دفترچه'],
  ['C', 'کمد لباس'],
  ['B', 'چیدمان کمپ'],
  ['1–5', 'ایموت سریع'],
  ['ESC', 'توقف'],
];

/**
 * منوی توقف: پس از آزاد شدن قفل موس (ESC) روی صحنه ظاهر می‌شود.
 */
export default function PauseMenu({ onResume, onSettings, onExit, character }) {
  const quests = usePlayerStore((s) => s.quests);
  const fishCaught = usePlayerStore((s) => s.fishCaught);

  const stats = [
    { icon: 'map', value: quests.parchments, max: 3 },
    { icon: 'lantern', value: quests.lanterns, max: 5 },
    { icon: 'key', value: quests.hasKey ? 1 : 0, max: 1 },
    { icon: 'shell', value: quests.shells, max: 10 },
    { icon: 'fish', value: fishCaught.length, max: 40 },
  ];

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0d0b16]/82 backdrop-blur-md cozy-fade-in" />

      <GlassPanel className="relative z-10 w-full max-w-sm p-6 text-center cozy-pop-in">
        <div className="mb-2 flex justify-center text-[#ff9a4d]" aria-hidden="true">
          <GameIcon name="flame" className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <h2 className="mb-1 text-lg font-extrabold text-[#f5ebdd]">کمپ دنج جنگل</h2>
        <p className="mb-5 text-[11px] text-[#f5ebdd]/50">
          {character ? `کاراکتر تو: ${String(character).replace('.glb', '')}` : 'به کمپ خوش آمدی'}
        </p>

        <div className="mb-5 grid grid-cols-5 gap-1.5 text-[10px]">
          {stats.map((item) => (
            <div key={item.icon} className="rounded-lg border border-white/8 bg-black/25 py-1.5 text-[#f5ebdd]/60">
              <div className="flex justify-center leading-none" aria-hidden="true">
                <GameIcon name={item.icon} className="h-4 w-4" strokeWidth={1.7} />
              </div>
              <div className="mt-1 font-mono text-[9px]">
                {item.value}/{item.max}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-5 space-y-2">
          <PrimaryButton className="w-full" onClick={onResume}>
            <GameIcon name="play" className="h-4 w-4" strokeWidth={0} />
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
