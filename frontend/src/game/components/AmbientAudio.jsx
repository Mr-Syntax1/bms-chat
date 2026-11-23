import { useEffect } from 'react';
import { createPositionalLoop, setVolumeGains } from '../audio';
import { FIRE_SOUND, CRICKETS_SOUND, WATERFALL_SOUND, STREAM_SOUND } from '../sounds';
import { useSettingsStore } from '../stores/useSettingsStore';
import { WATERFALL, RIVER, WATER_LEVEL } from '../terrain';

// چند نقطه در لبه‌ی جنگل برای جیرجیرک‌ها (صدای مکانی)
const CRICKET_SPOTS = [
  [-18, 1.8, 6],
  [-24, 1.8, -14],
  [-10, 1.8, -20],
  [-30, 1.8, 12],
];

// نقاطی در امتداد رودخانه که صدای جریان آب از آن‌ها می‌آید
const STREAM_SPOTS = (() => {
  const pts = RIVER.points;
  const spots = [];
  for (let i = 0; i < pts.length - 1; i += 2) {
    spots.push([pts[i].x, WATER_LEVEL + 0.6, pts[i].z]);
  }
  return spots;
})();

// صدای محیطی:
//   • آتش (مکانی، دامنه‌ی کوتاه)
//   • جیرجیرک (چند منبع مکانی در جنگل)
//   • آبشار (مکانی، دامنه‌ی وسیع — از دور هم شنیده می‌شود)
//   • رودخانه (چند منبع در امتداد مسیر آب)
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

    // آبشار: منبع مکانی با دامنه‌ی بلند
    const waterfall = createPositionalLoop(
      WATERFALL_SOUND,
      [WATERFALL.x, WATER_LEVEL + 2.2, WATERFALL.baseZ],
      {
        volume: 0.62,
        refDistance: 9,
        maxDistance: 62,
        rolloff: 1.05,
        channel: 'ambient',
        synth: 'waterfall',
      }
    );

    // رودخانه: چند منبع در امتداد مسیر
    const streams = STREAM_SPOTS.map((pos, i) =>
      createPositionalLoop(STREAM_SOUND, pos, {
        volume: 0.3 - i * 0.03,
        refDistance: 6,
        maxDistance: 30,
        rolloff: 1.2,
        channel: 'ambient',
        synth: 'stream',
      })
    );

    return () => {
      fire.dispose();
      crickets.forEach((c) => c.dispose());
      waterfall.dispose();
      streams.forEach((s) => s.dispose());
    };
  }, []);

  return null;
}
