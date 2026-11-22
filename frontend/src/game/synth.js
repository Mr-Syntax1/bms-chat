// صداسازی رویه‌ای (بدون فایل mp3): آتش، جیرجیرک و باد
// خروجی هر تابع یک AudioBuffer قابل‌استفاده در THREE.PositionalAudio است.

function noiseBuffer(context, seconds, fill) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  fill(data, context.sampleRate, length);
  return buffer;
}

// آتش: نویز قهوه‌ای (فرکانس پایین) + ترقه‌های تصادفی
export function makeFireBuffer(context) {
  let last = 0;
  return noiseBuffer(context, 4, (data, sampleRate) => {
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 2.4;
    }
    // ترقه‌ها
    const crackles = Math.floor(sampleRate * 0.9);
    for (let c = 0; c < crackles; c += 1) {
      const pos = Math.floor(Math.random() * data.length);
      const amp = Math.random() * 0.5;
      for (let k = 0; k < 180 && pos + k < data.length; k += 1) {
        data[pos + k] += (Math.random() * 2 - 1) * amp * Math.exp(-k / 40);
      }
    }
  });
}

// جیرجیرک: چند بurst کوتاه سینوسی با فاصله‌های نامنظم
export function makeCricketsBuffer(context) {
  return noiseBuffer(context, 6, (data, sampleRate) => {
    const bursts = 22;
    for (let b = 0; b < bursts; b += 1) {
      const start = Math.floor(Math.random() * (data.length - sampleRate * 0.2));
      const freq = 3600 + Math.random() * 1400;
      const dur = Math.floor(sampleRate * (0.04 + Math.random() * 0.05));
      for (let k = 0; k < dur; k += 1) {
        const env = Math.sin((Math.PI * k) / dur) ** 2;
        data[start + k] += Math.sin((2 * Math.PI * freq * k) / sampleRate) * 0.12 * env;
      }
    }
  });
}

// باد: نویز صورتی با مدولاسیون دامنه‌ی آهسته
export function makeWindBuffer(context) {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  return noiseBuffer(context, 8, (data, sampleRate) => {
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      // فیلتر پایین‌گذر ساده
      b0 = 0.99 * b0 + 0.01 * white;
      b1 = 0.96 * b1 + 0.04 * b0;
      b2 = 0.9 * b2 + 0.1 * b1;
      const t = i / sampleRate;
      const mod = 0.55 + 0.45 * Math.sin(t * 0.35) * Math.sin(t * 0.11 + 1.3);
      data[i] = b2 * 9 * mod;
    }
  });
}

// گیتار: آرپژ ساده‌ی سیم زهی (Karplus-Strong سبک)
export function makeGuitarBuffer(context) {
  const seconds = 5.5;
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  const sampleRate = context.sampleRate;

  // آکورد دو ماژور: C4, E4, G4, C5
  const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 261.63];
  const step = Math.floor(sampleRate * 0.62);

  notes.forEach((freq, n) => {
    const start = n * step;
    if (start >= length) return;
    const period = Math.max(2, Math.round(sampleRate / freq));
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i += 1) ring[i] = Math.random() * 2 - 1;

    let idx = 0;
    const noteLen = Math.min(Math.floor(sampleRate * 1.8), length - start);
    for (let k = 0; k < noteLen; k += 1) {
      const cur = ring[idx];
      const next = ring[(idx + 1) % period];
      ring[idx] = (cur + next) * 0.5 * 0.996;
      idx = (idx + 1) % period;
      const env = Math.min(1, k / (sampleRate * 0.01)) * Math.exp(-k / (sampleRate * 0.9));
      data[start + k] += cur * 0.32 * env;
    }
  });

  return buffer;
}

// صدای لذیذ خوردن مارشمالو: دو نت کوتاه با محو سریع
export function makeYumBuffer(context) {
  return noiseBuffer(context, 1.1, (data, sampleRate) => {
    const tones = [
      { freq: 620, start: 0.02, dur: 0.18 },
      { freq: 880, start: 0.22, dur: 0.28 },
    ];
    for (const tone of tones) {
      const start = Math.floor(sampleRate * tone.start);
      const dur = Math.floor(sampleRate * tone.dur);
      for (let k = 0; k < dur && start + k < data.length; k += 1) {
        const env = Math.sin((Math.PI * k) / dur) ** 2;
        const vib = Math.sin((2 * Math.PI * 6 * k) / sampleRate) * 6;
        data[start + k] += Math.sin((2 * Math.PI * (tone.freq + vib) * k) / sampleRate) * 0.22 * env;
      }
    }
  });
}

// آب: نویز سفید باند-محدود با محو سریع (پاشیدن آب هنگام ماهیگیری)
export function makeWaterBuffer(context) {
  return noiseBuffer(context, 1.6, (data, sampleRate) => {
    let lp = 0;
    const decay = Math.floor(sampleRate * 1.3);
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      lp = 0.72 * lp + 0.28 * white; // پایین‌گذر
      const hp = white - lp; // بالاگذر ساده
      const splash = i < decay ? Math.exp(-i / (sampleRate * 0.28)) : 0;
      const ripple = 0.35 + 0.65 * Math.abs(Math.sin((i / sampleRate) * 11));
      data[i] = (lp * 0.45 + hp * 0.55) * splash * ripple * 0.75;
    }
  });
}

export const PROCEDURAL_FACTORIES = {
  fire: makeFireBuffer,
  campfire: makeFireBuffer,
  crickets: makeCricketsBuffer,
  wind: makeWindBuffer,
  water: makeWaterBuffer,
  guitar: makeGuitarBuffer,
  guitar1: makeGuitarBuffer,
  guitar2: makeGuitarBuffer,
  guitar3: makeGuitarBuffer,
  yum: makeYumBuffer,
};
