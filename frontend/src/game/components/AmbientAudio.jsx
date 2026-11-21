import { useEffect } from 'react';
import { createPositionalLoop, createGlobalLoop } from '../audio';
import { CAMP_RADIUS, TREES } from '../sceneLayout';
import { FIRE_SOUND, CRICKETS_SOUND, WIND_SOUND } from '../sounds';

// چند نقطه در لبه‌ی جنگل برای جیرجیرک‌ها (صدای مکانی)
const CRICKET_SPOTS = [
  [CAMP_RADIUS + 5, 1.8, 0],
  [0, 1.8, CAMP_RADIUS + 5],
  [-(CAMP_RADIUS + 5), 1.8, 0],
  [0, 1.8, -(CAMP_RADIUS + 5)],
  [CAMP_RADIUS * 0.7, 1.6, CAMP_RADIUS * 0.7],
  [-CAMP_RADIUS * 0.7, 1.6, -CAMP_RADIUS * 0.7],
];

// صدای محیطی: آتش در مرکز (مکانی)، جیرجیرک از میان درختان (مکانی)، باد سراسری
export default function AmbientAudio() {
  useEffect(() => {
    // آتش: منبع صدا دقیقاً روی گودال آتش
    const fire = createPositionalLoop(FIRE_SOUND, [0, 0.85, 0], {
      volume: 0.8,
      refDistance: 2.4,
      maxDistance: 30,
      rolloff: 1.9,
    });

    // جیرجیرک: چند منبع مکانی با حجم‌های متفاوت
    const crickets = CRICKET_SPOTS.map((pos, i) =>
      createPositionalLoop(CRICKETS_SOUND, pos, {
        volume: 0.3 - i * 0.03,
        refDistance: 7,
        maxDistance: 55,
        rolloff: 1.2,
      })
    );

    // باد: یک لایه‌ی مکانی دور از میان بلندترین درختان + یک بستر سراسری
    const tallest = TREES.reduce(
      (best, tree) => (tree.scale > best.scale ? tree : best),
      TREES[0] || { x: 0, z: 30, scale: 1 }
    );
    const wind = createPositionalLoop(WIND_SOUND, [tallest.x, 13, tallest.z], {
      volume: 0.28,
      refDistance: 20,
      maxDistance: 120,
      rolloff: 0.7,
    });
    const windBed = createGlobalLoop(WIND_SOUND, { volume: 0.14 });

    return () => {
      fire.dispose();
      crickets.forEach((c) => c.dispose());
      wind.dispose();
      windBed.dispose();
    };
  }, []);

  return null;
}
