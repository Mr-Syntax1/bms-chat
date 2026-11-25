import { useEffect, useMemo } from 'react';
import { registerFishingSpot } from '../interactionRegistry';
import { FISHING_SPOTS } from '../fishingSpots';
import { beginFishing, resetFishing, fishing } from '../fishData';

// نقطه‌های ماهیگیری را در رجیستری تعامل ثبت می‌کند تا با E باز شوند
export function useFishingSpots() {
  const actions = useMemo(
    () =>
      FISHING_SPOTS.map(
        (spot, index) => () => {
          if (fishing.active || fishing.phase === 'result') return;
          beginFishing(index, spot);
        }
      ),
    []
  );

  useEffect(() => {
    const unsubs = FISHING_SPOTS.map((spot, i) =>
      registerFishingSpot({
        key: `fishing-spot-${i}`,
        spotIndex: i,
        label: spot.label,
        x: spot.x,
        z: spot.z,
        radius: 2.6,
        action: actions[i],
      })
    );
    return () => {
      unsubs.forEach((fn) => fn());
      if (fishing.active) resetFishing();
    };
  }, [actions]);

  return null;
}

