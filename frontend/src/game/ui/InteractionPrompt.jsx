import { usePlayerStore } from '../stores/usePlayerStore';
import { GameIcon } from './icons';

/**
 * راهنمای تعامل پایین-مرکز: حلقه‌ی درخشان + کلید E.
 * با نزدیک شدن به شیء تعاملی fade-in می‌شود.
 */
export default function InteractionPrompt() {
  const nearInteractable = usePlayerStore((s) => s.nearInteractable);
  const seated = usePlayerStore((s) => s.seated);
  const hovered = usePlayerStore((s) => s.hovered);
  const nearBug = usePlayerStore((s) => s.nearBug);

  let label = null;
  let locked = false;
  let key = 'E';

  if (seated) {
    label = 'بلند شدن';
    key = 'E';
  } else if (nearInteractable) {
    label = nearInteractable.label;
    locked = Boolean(nearInteractable.locked);
  } else if (nearBug) {
    label = 'گرفتن حشره';
    key = 'F';
  } else if (hovered === 'van') {
    label = 'روشن/خاموش کردن چراغ ون';
    key = 'F';
  }

  const visible = Boolean(label);

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-[7.5rem] z-30 flex justify-center transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <div
        className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2 backdrop-blur-xl ${
          locked
            ? 'border-[#f59e0b]/35 bg-[#171426]/85 text-[#fbbf24]'
            : 'border-[#ffc66d]/30 bg-[#171426]/85 text-[#f5ebdd]'
        }`}
      >
        {/* حلقه‌ی درخشان */}
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span
            className={`absolute inset-0 rounded-full border-2 ${
              locked ? 'border-[#f59e0b]/60' : 'border-[#ffc66d]/70'
            } interact-ring`}
          />
          <span
            className={`h-1.5 w-1.5 rounded-full ${locked ? 'bg-[#f59e0b]' : 'bg-[#ffc66d]'}`}
          />
        </span>

        <span className="text-[12px] font-semibold">{label}</span>

        {!locked ? (
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#ffc66d]">
            {key}
          </kbd>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold">
            <GameIcon name="lock" className="h-3 w-3" />
            قفل
          </span>
        )}
      </div>
    </div>
  );
}
