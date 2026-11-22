import { useEffect } from 'react';
import { createPositionalLoop, setVolumeGains } from '../audio';
import { FIRE_SOUND, CRICKETS_SOUND } from '../sounds';
import { useSettingsStore } from '../stores/useSettingsStore';

// چند نقطه در لبه‌ی جنگل برای جیرجیرک‌ها (صدای مکانی)
const CRICKET_SPOTS = [
  [-18, 1.8, 6],
  [-24, 1.8, -14],
  [-10, 1.8, -20],
  [-30, 1.8, 12],
];

// صدای محیطی: آتش (مکانی، distance=20) + جیرجیرک (مکانی، distance=40)
// توجه: هیچ صدای بادی در بازی وجود ندارد و نباید اضافه شود.
export default function AmbientAudio() {
  const audio = useSettingsStore((s) => s.audio);

  // تغییر اسلایدرهای صدا بلافاصله روی صداهای در حال پخش اثر می‌گذارد
  useEffect(() => {
    setVolumeGains(audio);
  }, [audio]);

  useEffect(() => {
    // آتش: منبع صدا دقیقاً روی گودال آتش
    const fire = createPositionalLoop(FIRE_SOUND, [0, 0.85, 0], {
      volume: 0.85,
      refDistance: 2.4,
      maxDistance: 20,
      rolloff: 1.9,
      channel: 'fire',
    });

    // جیرجیرک: چند منبع مکانی در جنگل
    const crickets = CRICKET_SPOTS.map((pos, i) =>
      createPositionalLoop(CRICKETS_SOUND, pos, {
        volume: 0.42 - i * 0.04,
        refDistance: 8,
        maxDistance: 40,
        rolloff: 1.1,
        channel: 'ambient',
      })
    );

    return () => {
      fire.dispose();
      crickets.forEach((c) => c.dispose());
    };
  }, []);

  return null;
}
