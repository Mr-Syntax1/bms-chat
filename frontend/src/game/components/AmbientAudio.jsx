import { useEffect } from 'react';
import { createPositionalLoop, createGlobalLoop } from '../audio';
import { FIRE_SOUND, CRICKETS_SOUND, WIND_SOUND } from '../sounds';

// چند نقطه در لبه‌ی جنگل برای جیرجیرک‌ها (صدای مکانی)
const CRICKET_SPOTS = [
  [-18, 1.8, 6],
  [-24, 1.8, -14],
  [-10, 1.8, -20],
  [-30, 1.8, 12],
];

// صدای محیطی: آتش (مکانی، distance=20)، جیرجیرک (مکانی، distance=40)، باد سراسری
export default function AmbientAudio() {
  useEffect(() => {
    // آتش: منبع صدا دقیقاً روی گودال آتش
    const fire = createPositionalLoop(FIRE_SOUND, [0, 0.85, 0], {
      volume: 0.85,
      refDistance: 2.4,
      maxDistance: 20,
      rolloff: 1.9,
    });

    // جیرجیرک: چند منبع مکانی در جنگل
    const crickets = CRICKET_SPOTS.map((pos, i) =>
      createPositionalLoop(CRICKETS_SOUND, pos, {
        volume: 0.42 - i * 0.04,
        refDistance: 8,
        maxDistance: 40,
        rolloff: 1.1,
      })
    );

    // باد: بستر سراسری + یک لایه‌ی مکانی در جنگل
    const wind = createPositionalLoop(WIND_SOUND, [-40, 13, 0], {
      volume: 0.3,
      refDistance: 20,
      maxDistance: 120,
      rolloff: 0.7,
    });
    const windBed = createGlobalLoop(WIND_SOUND, { volume: 0.16 });

    return () => {
      fire.dispose();
      crickets.forEach((c) => c.dispose());
      wind.dispose();
      windBed.dispose();
    };
  }, []);

  return null;
}
