import { useEffect, useMemo } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { registerQuestItem } from '../questRegistry';
import { playPositionalOneShot } from '../audio';
import { FISH_CAST_SOUND, FISH_REEL_SOUND, SPLASH_SOUND } from '../sounds';
import { FISHING_SPOTS } from '../fishingSpots';

// فاصله‌ی امن تا هر نقطه تا دو نقطه‌ی نزدیک هم‌زمان باز نشوند
const COOLDOWN_MS = 2400;
const lastUsed = new Map();

/**
 * نقاط ماهیگیری را به رجیستری تعامل (proximity) اضافه می‌کند.
 * AMD یک فعالیت سبک است: با E چوب پرتاب می‌شود، صدا پخش می‌شود و
 * پیام «ماهی گاز گرفت» نمایش داده می‌شود. سیستم کامل صید در Phase 3 می‌آید.
 */
export function useFishingSpots() {
  const pushToast = usePlayerStore((s) => s.pushToast);

  const actions = useMemo(
    () =>
      FISHING_SPOTS.map(
        (spot, index) => () => {
          const now = Date.now();
          if (now - (lastUsed.get(index) || 0) < COOLDOWN_MS) return;
          lastUsed.set(index, now);

          playPositionalOneShot(FISH_CAST_SOUND, [spot.x, 0.6, spot.z], { volume: 0.6 });
          setTimeout(() => {
            playPositionalOneShot(SPLASH_SOUND, [spot.x, 0.2, spot.z], { volume: 0.5 });
          }, 420);
          setTimeout(() => {
            playPositionalOneShot(FISH_REEL_SOUND, [spot.x, 0.6, spot.z], { volume: 0.5 });
          }, 1500);

          pushToast('ماهی گاز گرفت! 🎣', 'success');
        }
      ),
    [pushToast]
  );

  useEffect(() => {
    const unsubs = FISHING_SPOTS.map((spot, i) =>
      registerQuestItem({
        key: `fishing-spot-${i}`,
        label: spot.label,
        x: spot.x,
        z: spot.z,
        radius: 2.6,
        action: actions[i],
      })
    );
    return () => unsubs.forEach((fn) => fn());
  }, [actions]);
}
