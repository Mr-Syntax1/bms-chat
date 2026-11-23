// صداسازی رویه‌ای (بدون فایل mp3): آتش، جیرجیرک، آب، گیتار، yum + مجموعه‌ی کامل fallback
// خروجی هر تابع یک AudioBuffer قابل‌استفاده در THREE.PositionalAudio است.
// توجه: هیچ سازنده‌ی صدای باد در این پروژه وجود ندارد (ممنوع).
//
// قاعده: هر کلید صوتی که فایل واقعی ندارد باید اینجا کارخانه داشته باشد تا
// هیچ‌چیز ساکت نماند. کلیدها از assetManifest (فیلد synth) می‌آیند.

function noiseBuffer(context, seconds, fill) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  fill(data, context.sampleRate, length);
  return buffer;
}

// مولد شبه‌تصادفی ساده (بدون Math.random در بعضی سازنده‌ها برای تکرارپذیری)
function makeRand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// هسته‌ی موجود
// ---------------------------------------------------------------------------
export function makeFireBuffer(context) {
  let last = 0;
  return noiseBuffer(context, 4, (data, sampleRate) => {
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 2.4;
    }
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

export function makeGuitarBuffer(context) {
  const seconds = 5.5;
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  const sampleRate = context.sampleRate;

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

export function makeWaterBuffer(context) {
  return noiseBuffer(context, 1.6, (data, sampleRate) => {
    let lp = 0;
    const decay = Math.floor(sampleRate * 1.3);
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      lp = 0.72 * lp + 0.28 * white;
      const hp = white - lp;
      const splash = i < decay ? Math.exp(-i / (sampleRate * 0.28)) : 0;
      const ripple = 0.35 + 0.65 * Math.abs(Math.sin((i / sampleRate) * 11));
      data[i] = (lp * 0.45 + hp * 0.55) * splash * ripple * 0.75;
    }
  });
}

// ---------------------------------------------------------------------------
// ابزارهای کمکی
// ---------------------------------------------------------------------------
// ضربه‌ی نویزی باند-محدود (قدم‌صدا، پاشش، فرود)
function filteredNoiseHit(context, seconds, opts = {}) {
  const { lp = 0.55, hp = 0.15, decay = 0.12, gain = 0.5, seed = 7 } = opts;
  const rand = makeRand(seed);
  return noiseBuffer(context, seconds, (data, sampleRate) => {
    let low = 0;
    const decayLen = Math.max(1, Math.floor(sampleRate * decay));
    for (let i = 0; i < data.length; i += 1) {
      const white = rand() * 2 - 1;
      low = lp * low + (1 - lp) * white;
      const high = white - low;
      const env = Math.exp(-i / decayLen);
      data[i] = (low * (1 - hp) + high * hp) * env * gain;
    }
  });
}

// بوق سینوسی با پوش (blip/click/emote)
function toneBuffer(context, seconds, tones, opts = {}) {
  const { gain = 0.22, vibrato = 0, seed = 3 } = opts;
  const rand = makeRand(seed);
  return noiseBuffer(context, seconds, (data, sampleRate) => {
    for (const t of tones) {
      const start = Math.floor(sampleRate * (t.start ?? 0));
      const dur = Math.floor(sampleRate * (t.dur ?? 0.12));
      for (let k = 0; k < dur && start + k < data.length; k += 1) {
        const env = Math.sin((Math.PI * k) / dur) ** (t.sharp ? 4 : 2);
        const vib = vibrato ? Math.sin((2 * Math.PI * 5 * k) / sampleRate) * vibrato : 0;
        const noise = t.noisy ? (rand() * 2 - 1) * 0.4 : 0;
        data[start + k] +=
          (Math.sin((2 * Math.PI * (t.freq + vib) * k) / sampleRate) + noise) *
          (t.gain ?? gain) *
          env;
      }
    }
  });
}

// ---------------------------------------------------------------------------
// محیط (loops)
// ---------------------------------------------------------------------------
export function makeStreamBuffer(context) {
  let last = 0;
  let last2 = 0;
  return noiseBuffer(context, 6, (data, sampleRate) => {
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = 0.9 * last + 0.1 * white;
      last2 = 0.97 * last2 + 0.03 * white;
      const bubble = Math.sin((i / sampleRate) * 37) * 0.04 * (0.5 + 0.5 * Math.sin(i / 900));
      data[i] = (last - last2) * 0.5 + bubble;
    }
  });
}

export function makeWaterfallBuffer(context) {
  let low = 0;
  let low2 = 0;
  return noiseBuffer(context, 6, (data, sampleRate) => {
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      low = 0.82 * low + 0.18 * white;
      low2 = 0.95 * low2 + 0.05 * white;
      const roar = Math.sin((i / sampleRate) * 0.7) * 0.05;
      data[i] = (low * 0.6 + low2 * 0.4 + roar) * 0.85;
    }
  });
}

export function makeOceanBuffer(context) {
  return noiseBuffer(context, 8, (data, sampleRate) => {
    let low = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      low = 0.95 * low + 0.05 * white;
      const swell = 0.45 + 0.55 * Math.sin((i / sampleRate) * 0.55 + Math.sin(i / sampleRate * 0.21) * 2);
      data[i] = low * swell * 1.4;
    }
  });
}

export function makeOwlBuffer(context) {
  const rand = makeRand(41);
  return noiseBuffer(context, 7, (data, sampleRate) => {
    // ۲ تا ۳ هُو هُو در بازه‌های تصادفی
    const hoots = 3;
    for (let h = 0; h < hoots; h += 1) {
      const start = Math.floor(sampleRate * (0.6 + h * 2.1 + rand() * 0.6));
      const dur = Math.floor(sampleRate * 0.42);
      const base = 380 + rand() * 60;
      for (let k = 0; k < dur && start + k < data.length; k += 1) {
        const t = k / sampleRate;
        const env = Math.sin((Math.PI * k) / dur) ** 1.4;
        const freq = base - t * 60 + Math.sin(t * 9) * 8;
        data[start + k] += Math.sin(2 * Math.PI * freq * t) * 0.18 * env;
      }
    }
  });
}

export function makeFrogBuffer(context) {
  const rand = makeRand(77);
  return noiseBuffer(context, 5, (data, sampleRate) => {
    const croaks = 5;
    for (let c = 0; c < croaks; c += 1) {
      const start = Math.floor(rand() * (data.length - sampleRate * 0.4));
      const dur = Math.floor(sampleRate * (0.09 + rand() * 0.05));
      const base = 180 + rand() * 90;
      for (let k = 0; k < dur; k += 1) {
        const env = Math.sin((Math.PI * k) / dur) ** 2;
        const am = 0.5 + 0.5 * Math.sin((2 * Math.PI * 28 * k) / sampleRate);
        data[start + k] += Math.sin((2 * Math.PI * base * k) / sampleRate) * 0.16 * env * am;
      }
    }
  });
}

export function makeNightBirdsBuffer(context) {
  const rand = makeRand(123);
  return noiseBuffer(context, 8, (data, sampleRate) => {
    const chirps = 26;
    for (let c = 0; c < chirps; c += 1) {
      const start = Math.floor(rand() * (data.length - sampleRate * 0.15));
      const dur = Math.floor(sampleRate * (0.03 + rand() * 0.04));
      const f0 = 2400 + rand() * 1800;
      for (let k = 0; k < dur; k += 1) {
        const env = Math.sin((Math.PI * k) / dur) ** 2;
        const f = f0 + (k / dur) * 900;
        data[start + k] += Math.sin((2 * Math.PI * f * k) / sampleRate) * 0.07 * env;
      }
    }
  });
}

export function makeLeavesRustleBuffer(context) {
  const rand = makeRand(9);
  return noiseBuffer(context, 5, (data, sampleRate) => {
    let prev = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = rand() * 2 - 1;
      const hp = white - prev * 0.7;
      prev = white;
      const gust = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin((i / sampleRate) * 0.9 + rand() * 0.02));
      data[i] = hp * gust * 0.06;
    }
  });
}

// باران ملایم: نویز باند-محدود با قطرات پراکنده (بدون فایل)
export function makeRainBuffer(context) {
  const rand = makeRand(4242);
  return noiseBuffer(context, 5, (data, sampleRate) => {
    let lp = 0;
    let hp = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = rand() * 2 - 1;
      // فیلتر پایین‌گذر سبک + بالاگذر برای حس «خش‌خش ریز»
      lp = 0.86 * lp + 0.14 * white;
      hp = lp - hp * 0.12;
      data[i] = hp * 0.16;
    }
    // قطرات مجزا
    const drops = Math.floor(sampleRate * 3.2);
    for (let d = 0; d < drops; d += 1) {
      const pos = Math.floor(rand() * data.length);
      const amp = 0.08 + rand() * 0.16;
      const dur = Math.floor(sampleRate * (0.012 + rand() * 0.02));
      for (let k = 0; k < dur && pos + k < data.length; k += 1) {
        data[pos + k] += (rand() * 2 - 1) * amp * Math.exp(-k / (dur * 0.35));
      }
    }
  });
}

export function makeMusicEveningBuffer(context) {
  // پد ملایم آمبیانتی: آکورد مینور با فید آهسته
  const seconds = 12;
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  const sr = context.sampleRate;
  const notes = [130.81, 155.56, 196.0, 261.63, 329.63];
  notes.forEach((freq, n) => {
    const detune = 1 + (n - 2) * 0.002;
    for (let i = 0; i < length; i += 1) {
      const t = i / sr;
      const swell = Math.sin((Math.PI * i) / length) ** 1.2;
      const trem = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.12 * t + n);
      data[i] += Math.sin(2 * Math.PI * freq * detune * t) * 0.035 * swell * trem;
    }
  });
  return buffer;
}

// ---------------------------------------------------------------------------
// بازیکن (قدم‌صدا/پرش/فرود/آب)
// ---------------------------------------------------------------------------
export const makeFootstepGrass = (context) =>
  filteredNoiseHit(context, 0.18, { lp: 0.62, hp: 0.2, decay: 0.05, gain: 0.35, seed: 11 });
export const makeFootstepSand = (context) =>
  filteredNoiseHit(context, 0.22, { lp: 0.45, hp: 0.45, decay: 0.08, gain: 0.32, seed: 12 });
export const makeFootstepWood = (context) =>
  filteredNoiseHit(context, 0.16, { lp: 0.3, hp: 0.5, decay: 0.04, gain: 0.4, seed: 13 });
export const makeFootstepStone = (context) =>
  filteredNoiseHit(context, 0.14, { lp: 0.25, hp: 0.6, decay: 0.03, gain: 0.38, seed: 14 });

export const makeJumpBuffer = (context) =>
  toneBuffer(context, 0.24, [{ freq: 320, start: 0, dur: 0.2, gain: 0.16 }], { vibrato: 20 });

export const makeLandSoftBuffer = (context) =>
  filteredNoiseHit(context, 0.3, { lp: 0.5, hp: 0.2, decay: 0.1, gain: 0.4, seed: 21 });

export const makeSplashSmallBuffer = (context) =>
  filteredNoiseHit(context, 0.5, { lp: 0.35, hp: 0.55, decay: 0.14, gain: 0.45, seed: 22 });

export const makeWaterEnterBuffer = (context) =>
  filteredNoiseHit(context, 0.7, { lp: 0.4, hp: 0.5, decay: 0.24, gain: 0.5, seed: 23 });

export function makeSwimLoopBuffer(context) {
  return noiseBuffer(context, 3, (data, sampleRate) => {
    let low = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      low = 0.7 * low + 0.3 * white;
      const stroke = Math.pow(Math.max(0, Math.sin((i / sampleRate) * 3.2)), 2);
      data[i] = low * stroke * 0.28;
    }
  });
}

// ---------------------------------------------------------------------------
// ماهیگیری
// ---------------------------------------------------------------------------
export function makeFishBiteBuffer(context) {
  const b = filteredNoiseHit(context, 0.3, { lp: 0.4, hp: 0.6, decay: 0.05, gain: 0.5, seed: 31 });
  const data = b.getChannelData(0);
  const sr = context.sampleRate;
  // یک «تُپ» سینوسی روی نویز
  for (let k = 0; k < sr * 0.08 && k < data.length; k += 1) {
    data[k] += Math.sin((2 * Math.PI * 220 * k) / sr) * 0.3 * Math.exp(-k / (sr * 0.02));
  }
  return b;
}

// ---------------------------------------------------------------------------
// خوردن/ابزار
// ---------------------------------------------------------------------------
export const makeEatCrunchBuffer = (context) =>
  filteredNoiseHit(context, 0.14, { lp: 0.55, hp: 0.5, decay: 0.03, gain: 0.4, seed: 41 });
export const makeEatGulpBuffer = (context) =>
  toneBuffer(context, 0.28, [{ freq: 180, start: 0, dur: 0.22, gain: 0.16 }], { vibrato: 30 });

export const makeUiClickBuffer = (context) =>
  toneBuffer(context, 0.09, [{ freq: 880, start: 0, dur: 0.06, gain: 0.18, sharp: true }], { seed: 51 });
export const makeUiHoverBuffer = (context) =>
  toneBuffer(context, 0.07, [{ freq: 1240, start: 0, dur: 0.05, gain: 0.1 }], { seed: 52 });
export const makePickupBuffer = (context) =>
  toneBuffer(context, 0.3, [
    { freq: 660, start: 0, dur: 0.1, gain: 0.16 },
    { freq: 990, start: 0.09, dur: 0.16, gain: 0.14 },
  ]);
export const makeEmotePopBuffer = (context) =>
  toneBuffer(context, 0.22, [{ freq: 740, start: 0, dur: 0.16, gain: 0.18 }], { vibrato: 40 });
export const makePlaceItemBuffer = (context) =>
  filteredNoiseHit(context, 0.16, { lp: 0.35, hp: 0.4, decay: 0.04, gain: 0.35, seed: 53 });
export const makeEquipClothBuffer = (context) =>
  filteredNoiseHit(context, 0.24, { lp: 0.5, hp: 0.35, decay: 0.09, gain: 0.28, seed: 54 });
export const makeTentZipBuffer = (context) =>
  filteredNoiseHit(context, 0.4, { lp: 0.3, hp: 0.65, decay: 0.2, gain: 0.3, seed: 55 });

// ---------------------------------------------------------------------------
// فعالیت‌ها
// ---------------------------------------------------------------------------
export const makeBerryPickBuffer = (context) =>
  toneBuffer(context, 0.18, [{ freq: 520, start: 0, dur: 0.12, gain: 0.14 }], { vibrato: 24 });
export const makeBugNetBuffer = (context) =>
  filteredNoiseHit(context, 0.22, { lp: 0.4, hp: 0.55, decay: 0.07, gain: 0.35, seed: 61 });
export const makeBugCatchBuffer = (context) =>
  toneBuffer(context, 0.26, [
    { freq: 900, start: 0, dur: 0.08, gain: 0.15 },
    { freq: 1320, start: 0.07, dur: 0.14, gain: 0.12 },
  ]);
export const makeBallBounceBuffer = (context) =>
  toneBuffer(context, 0.2, [{ freq: 240, start: 0, dur: 0.14, gain: 0.2 }], { vibrato: 14 });
export const makeBallKickBuffer = (context) =>
  filteredNoiseHit(context, 0.18, { lp: 0.3, hp: 0.45, decay: 0.05, gain: 0.4, seed: 62 });

// ---------------------------------------------------------------------------
// کوئست
// ---------------------------------------------------------------------------
export const makeQuestAcceptBuffer = (context) =>
  toneBuffer(context, 0.5, [
    { freq: 523.25, start: 0, dur: 0.14, gain: 0.14 },
    { freq: 659.25, start: 0.12, dur: 0.16, gain: 0.13 },
  ]);
export const makeQuestCompleteBuffer = (context) =>
  toneBuffer(context, 0.9, [
    { freq: 523.25, start: 0, dur: 0.16, gain: 0.15 },
    { freq: 659.25, start: 0.14, dur: 0.16, gain: 0.14 },
    { freq: 783.99, start: 0.28, dur: 0.3, gain: 0.14 },
  ]);

// ---------------------------------------------------------------------------
// NPC blips (چهار زیروبمی)
// ---------------------------------------------------------------------------
const blip = (freq) => (context) =>
  toneBuffer(context, 0.12, [{ freq, start: 0, dur: 0.07, gain: 0.16, sharp: true }], { seed: freq });

// ---------------------------------------------------------------------------
// نگاشت کلید → کارخانه (کلیدها از assetManifest.synth می‌آیند)
// ---------------------------------------------------------------------------
export const PROCEDURAL_FACTORIES = {
  // هسته
  fire: makeFireBuffer,
  campfire: makeFireBuffer,
  crickets: makeCricketsBuffer,
  water: makeWaterBuffer,
  guitar: makeGuitarBuffer,
  guitar1: makeGuitarBuffer,
  guitar2: makeGuitarBuffer,
  guitar3: makeGuitarBuffer,
  yum: makeYumBuffer,

  // محیط
  stream: makeStreamBuffer,
  waterfall: makeWaterfallBuffer,
  ocean: makeOceanBuffer,
  owl: makeOwlBuffer,
  frog: makeFrogBuffer,
  nightbirds: makeNightBirdsBuffer,
  leaves_rustle: makeLeavesRustleBuffer,
  music_evening: makeMusicEveningBuffer,
  rain: makeRainBuffer,

  // بازیکن
  footstep_grass: makeFootstepGrass,
  footstep_sand: makeFootstepSand,
  footstep_wood: makeFootstepWood,
  footstep_stone: makeFootstepStone,
  jump: makeJumpBuffer,
  land_soft: makeLandSoftBuffer,
  splash_small: makeSplashSmallBuffer,
  water_enter: makeWaterEnterBuffer,
  swim_loop: makeSwimLoopBuffer,

  // ماهیگیری
  fish_bite: makeFishBiteBuffer,

  // خوردن/ابزار
  eat_crunch: makeEatCrunchBuffer,
  eat_gulp: makeEatGulpBuffer,
  ui_click: makeUiClickBuffer,
  ui_hover: makeUiHoverBuffer,
  pickup: makePickupBuffer,
  emote_pop: makeEmotePopBuffer,
  place_item: makePlaceItemBuffer,
  equip_cloth: makeEquipClothBuffer,
  tent_zip: makeTentZipBuffer,

  // فعالیت
  berry_pick: makeBerryPickBuffer,
  bug_net: makeBugNetBuffer,
  bug_catch: makeBugCatchBuffer,
  ball_bounce: makeBallBounceBuffer,
  ball_kick: makeBallKickBuffer,

  // کوئست
  quest_accept: makeQuestAcceptBuffer,
  quest_complete: makeQuestCompleteBuffer,

  // NPC
  npc_blip_1: blip(520),
  npc_blip_2: blip(620),
  npc_blip_3: blip(700),
  npc_blip_4: blip(820),

  // پخت (اگر فایل‌ها نبودند)
  fry_sizzle: (context) => filteredNoiseHit(context, 2, { lp: 0.5, hp: 0.5, decay: 2, gain: 0.2, seed: 71 }),
  pot_bubble: makeStreamBuffer,
  flip: (context) => toneBuffer(context, 0.16, [{ freq: 400, start: 0, dur: 0.1, gain: 0.16 }]),
  cook_done: makeQuestAcceptBuffer,
  burn: (context) => filteredNoiseHit(context, 0.5, { lp: 0.3, hp: 0.55, decay: 0.3, gain: 0.3, seed: 72 }),
  fire_ignite: makeFireBuffer,
  marshmallow_toast: (context) => filteredNoiseHit(context, 0.35, { lp: 0.4, hp: 0.5, decay: 0.12, gain: 0.32, seed: 73 }),
};
