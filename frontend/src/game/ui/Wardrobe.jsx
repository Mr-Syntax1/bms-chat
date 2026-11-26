import { useMemo, useState } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { playPositionalOneShot } from '../audio';
import { EQUIP_CLOTH_SOUND } from '../sounds';
import {
  CHARACTER_LABELS,
  HAT_ITEMS,
  FACE_ITEMS,
  ACCESSORY_ITEMS,
  SHIRT_COLORS,
  SHIRT_PATTERNS,
  isUnlocked,
  normalizeWardrobe,
  saveWardrobe,
} from '../models/wardrobeConfig';
import { CharacterPreview } from './CharacterSelector';
import { GameIcon } from './icons';

const TABS = [
  { id: 'hat', label: 'کلاه', icon: 'hat' },
  { id: 'face', label: 'صورت', icon: 'glasses' },
  { id: 'shirt', label: 'پیراهن', icon: 'shirt' },
  { id: 'accessory', label: 'اکسسوری', icon: 'backpack' },
];

function ItemCard({ item, active, locked, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      title={locked ? `قفل — ${item.hint || 'با پیشرفت مأموریت باز می‌شود'}` : item.label}
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2.5 text-center transition-all disabled:cursor-not-allowed ${
        active
          ? 'border-[#ffc66d]/70 bg-[#ff9a4d]/20 text-[#fff4e4]'
          : locked
            ? 'border-white/8 bg-black/30 text-[#f5ebdd]/30'
            : 'border-white/10 bg-white/[0.03] text-[#f5ebdd]/75 hover:bg-white/[0.08]'
      }`}
    >
      <span className={`${locked ? 'opacity-40' : ''}`} aria-hidden="true">
        <GameIcon name={item.icon} className="h-5 w-5" strokeWidth={1.7} />
      </span>
      <span className="text-[9.5px] font-semibold leading-tight">{item.label}</span>
      {locked && (
        <span className="mt-0.5 flex items-center gap-0.5 text-[8px] leading-tight text-[#f5ebdd]/40">
          <GameIcon name="lock" className="h-2.5 w-2.5" />
          {item.hint}
        </span>
      )}
    </button>
  );
}

/**
 * کمد لباس: کلاه/عینک/پیراهن/اکسسوری با پیش‌نمایش سه‌بعدی زنده.
 * انتخاب‌ها در localStorage و store ذخیره و از طریق player-move پخش می‌شوند.
 */
export default function Wardrobe({ open, onClose, userId }) {
  const wardrobe = usePlayerStore((s) => s.wardrobe);
  const setWardrobe = usePlayerStore((s) => s.setWardrobe);
  const character = usePlayerStore((s) => s.character);
  const quests = usePlayerStore((s) => s.quests);
  const unlockedItems = usePlayerStore((s) => s.unlockedItems);
  const [tab, setTab] = useState('hat');

  const items = useMemo(() => normalizeWardrobe(wardrobe), [wardrobe]);
  const characterName = CHARACTER_LABELS[character] || character;

  if (!open) return null;

  const commit = (next) => {
    const normalized = normalizeWardrobe(next);
    setWardrobe(normalized);
    if (userId) saveWardrobe(userId, normalized);
    const { local } = usePlayerStore.getState();
    playPositionalOneShot(EQUIP_CLOTH_SOUND, [local.x, 1.2, local.z], { volume: 0.75 });
  };

  const pickHat = (id) => commit({ ...items, hat: id });
  const pickFace = (id) => commit({ ...items, face: id });
  const pickAccessory = (id) => commit({ ...items, accessory: id });
  const pickColor = (color) => commit({ ...items, shirt: { ...items.shirt, color } });
  const pickPattern = (pattern) => commit({ ...items, shirt: { ...items.shirt, pattern } });

  return (
    <>
      <button
        type="button"
        aria-label="بستن"
        onClick={onClose}
        className="fixed inset-0 z-[100] cursor-default bg-black/45 backdrop-blur-[2px] cozy-fade-in"
      />

      <aside className="fixed right-0 top-0 z-[101] flex h-full w-[330px] max-w-[92vw] flex-col overflow-y-auto border-l border-white/10 bg-[#171426]/95 p-4 backdrop-blur-xl cozy-pop-in">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#f5ebdd]">کمد لباس</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/12 text-[#f5ebdd]/70 hover:bg-white/10 hover:text-[#f5ebdd]"
          >
            <GameIcon name="close" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* پیش‌نمایش زنده با آیتم‌های فعلی */}
        <CharacterPreview model={character} wardrobe={items} className="mb-1 h-[210px] w-full" />
        <p className="mb-3 text-center text-[11px] text-[#f5ebdd]/55">
          کاراکتر: <span className="font-bold text-[#ffc66d]">{characterName}</span>
        </p>

        {/* تب‌ها */}
        <div className="mb-3 grid grid-cols-4 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border py-1.5 text-[10px] font-bold transition-colors ${
                tab === t.id
                  ? 'border-[#ffc66d]/50 bg-[#ff9a4d]/16 text-[#ffc66d]'
                  : 'border-white/8 bg-black/25 text-[#f5ebdd]/55 hover:text-[#f5ebdd]'
              }`}
            >
              <GameIcon name={t.icon} className="h-4 w-4" strokeWidth={1.7} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'hat' && (
          <div className="grid grid-cols-3 gap-2">
            {HAT_ITEMS.map((item) => {
              const locked = !isUnlocked(item, quests, unlockedItems);
              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  active={items.hat === item.id}
                  locked={locked}
                  onClick={() => !locked && pickHat(item.id)}
                />
              );
            })}
          </div>
        )}

        {tab === 'face' && (
          <div className="grid grid-cols-3 gap-2">
            {FACE_ITEMS.map((item) => {
              const locked = !isUnlocked(item, quests, unlockedItems);
              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  active={items.face === item.id}
                  locked={locked}
                  onClick={() => !locked && pickFace(item.id)}
                />
              );
            })}
          </div>
        )}

        {tab === 'shirt' && (
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">رنگ</h3>
              <div className="grid grid-cols-6 gap-2">
                {SHIRT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => pickColor(color)}
                    aria-label={color}
                    className={`aspect-square cursor-pointer rounded-full border-2 transition-transform ${
                      items.shirt.color === color
                        ? 'scale-110 border-white'
                        : 'border-white/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">طرح</h3>
              <div className="grid grid-cols-3 gap-2">
                {SHIRT_PATTERNS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickPattern(p.id)}
                    className={`cursor-pointer rounded-lg border py-1.5 text-[10.5px] font-semibold transition-colors ${
                      items.shirt.pattern === p.id
                        ? 'border-[#ffc66d]/50 bg-[#ff9a4d]/16 text-[#ffc66d]'
                        : 'border-white/10 bg-black/25 text-[#f5ebdd]/65 hover:text-[#f5ebdd]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'accessory' && (
          <div className="grid grid-cols-3 gap-2">
            {ACCESSORY_ITEMS.map((item) => {
              const locked = !isUnlocked(item, quests, unlockedItems);
              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  active={items.accessory === item.id}
                  locked={locked}
                  onClick={() => !locked && pickAccessory(item.id)}
                />
              );
            })}
          </div>
        )}

        <p className="mt-4 rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] leading-relaxed text-[#f5ebdd]/40">
          آیتم‌های قفل با پیشرفت مأموریت‌ها و ماهیگیری باز می‌شوند. انتخاب‌ها به‌صورت خودکار ذخیره و برای بقیه پخش می‌شوند.
        </p>
      </aside>
    </>
  );
}
