import { usePlayerStore } from '../stores/usePlayerStore';
import { DECOR_CATALOG, DECOR_CATEGORIES, DECOR_LIMIT, countOwnedDecor } from '../decorData';
import { getDecorOwnerId } from '../decorSync';
import { playPositionalOneShot } from '../audio';
import { UI_CLICK_SOUND } from '../sounds';
import { GameIcon } from './icons';

/**
 * پنل کاتالوگ دکوراسیون (Phase 3f).
 * فقط در حالت دکور نمایش داده می‌شود؛ کلیک روی آیتم، شبح پیش‌نمایش را عوض می‌کند.
 */
export default function DecorPanel({ onClose }) {
  const selectedDecor = usePlayerStore((s) => s.selectedDecor);
  const setSelectedDecor = usePlayerStore((s) => s.setSelectedDecor);
  const decorations = usePlayerStore((s) => s.decorations);
  const unlockedDecor = usePlayerStore((s) => s.unlockedItems?.decor);

  const owned = countOwnedDecor(decorations, getDecorOwnerId());
  const full = owned >= DECOR_LIMIT;

  const pick = (id) => {
    const state = usePlayerStore.getState();
    const local = state.local;
    playPositionalOneShot(UI_CLICK_SOUND, [local.x, 1.2, local.z], { volume: 0.5 });
    setSelectedDecor(id);
  };

  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-[60] w-[min(560px,94vw)] -translate-x-1/2 rounded-2xl border border-white/12 bg-[#171426]/94 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl cozy-pop-in">
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
        <div className="flex items-center gap-2 text-[12px] font-bold text-[#ffc66d]">
          <GameIcon name="tent" className="h-4 w-4" strokeWidth={1.7} />
          چیدمان کمپ
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] ${full ? 'text-[#ef4444]' : 'text-[#65F5A0]'}`}>
            {owned}/{DECOR_LIMIT}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن چیدمان"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#f5ebdd]/60 hover:bg-white/10 hover:text-[#f5ebdd]"
          >
            <GameIcon name="close" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="max-h-[38vh] space-y-2 overflow-y-auto px-3 py-2">
        {DECOR_CATEGORIES.map((cat) => {
          const items = DECOR_CATALOG.filter(
            (item) =>
              item.category === cat.id &&
              (!item.unlock || (Array.isArray(unlockedDecor) && unlockedDecor.includes(item.unlock)))
          );
          if (!items.length) return null;
          return (
            <div key={cat.id}>
              <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#ffc66d]/70">
                {cat.label}
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {items.map((item) => {
                  const active = selectedDecor === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => pick(item.id)}
                      title={item.name}
                      className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-[8.5px] leading-none transition-colors ${
                        active
                          ? 'border-[#ffc66d]/55 bg-[#ff9a4d]/20 text-[#ffc66d]'
                          : 'border-white/10 bg-white/[0.04] text-[#f5ebdd]/70 hover:bg-white/10'
                      }`}
                    >
                      <GameIcon name={item.icon} className="h-4 w-4" strokeWidth={1.7} />
                      <span className="mt-1 line-clamp-1 px-0.5">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/8 px-3 py-1.5 text-[9px] leading-relaxed text-[#f5ebdd]/45">
        کلیک: گذاشتن • Shift+کلیک: برداشتن برای جابه‌جایی • راست‌کلیک: حذف • Q/E چرخش • +/− اندازه • ESC خروج
      </div>
    </div>
  );
}
