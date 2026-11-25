// ---------------------------------------------------------------------------
// fishData.js — گونه‌های ماهی + وضعیت زنده‌ی ماهیگیری
//
//  • داده‌ی خالص: افزودن گونه = یک ورودی در FISH_SPECIES.
//  • ماهی‌ها با کلون Goldfish.glb و tint/scale اختصاصی رندر می‌شوند.
//  • وضعیت مینی‌گیم بیرون React است؛ UI فقط روی رویدادهای گسسته رندر می‌شود
//    و tension هر فریم روی ref/DOM نوشته می‌شود.
// ---------------------------------------------------------------------------

export const FISH_MODEL_KEY = 'animals.goldfish';

// رنگ‌بندی/برچسب سطح کمیابی + پهنای ناحیه‌ی امن روی نوار کشش
export const RARITY = {
  common: { label: 'معمولی', color: '#9fd6b0', weight: 60, zoneWidth: 0.34 },
  uncommon: { label: 'کمیاب', color: '#7fc4ff', weight: 26, zoneWidth: 0.27 },
  rare: { label: 'نادر', color: '#c58af9', weight: 11, zoneWidth: 0.2 },
  legendary: { label: 'افسانه‌ای', color: '#ffc66d', weight: 3, zoneWidth: 0.14 },
  junk: { label: 'آشغال', color: '#9aa4b2', weight: 0, zoneWidth: 0.3 },
};

// tint در بازه‌ی ۰..۱ برای material.color
export const FISH_SPECIES = [
  {
    id: 'goldfish',
    name: 'ماهی قرمز',
    icon: 'fish',
    rarity: 'common',
    minWeight: 0.1,
    maxWeight: 0.5,
    tint: [1.0, 0.5, 0.2],
    scaleMultiplier: 0.85,
  },
  {
    id: 'carp',
    name: 'کپور',
    icon: 'fish',
    rarity: 'common',
    minWeight: 0.8,
    maxWeight: 3.6,
    tint: [0.62, 0.5, 0.32],
    scaleMultiplier: 1.05,
  },
  {
    id: 'bass',
    name: 'باس',
    icon: 'fish',
    rarity: 'uncommon',
    minWeight: 1.0,
    maxWeight: 4.2,
    tint: [0.42, 0.56, 0.36],
    scaleMultiplier: 1.1,
  },
  {
    id: 'trout',
    name: 'قزل‌آلا',
    icon: 'fish',
    rarity: 'uncommon',
    minWeight: 0.6,
    maxWeight: 2.8,
    tint: [0.86, 0.66, 0.56],
    scaleMultiplier: 1.0,
  },
  {
    id: 'bluegill',
    name: 'ماهی آبی',
    icon: 'fish',
    rarity: 'rare',
    minWeight: 0.3,
    maxWeight: 1.2,
    tint: [0.34, 0.6, 0.95],
    scaleMultiplier: 0.9,
  },
  {
    id: 'eel',
    name: 'مارماهی',
    icon: 'fish',
    rarity: 'rare',
    minWeight: 0.9,
    maxWeight: 2.4,
    tint: [0.3, 0.36, 0.26],
    scaleMultiplier: 1.25,
  },
  {
    id: 'golden-koi',
    name: 'کوی طلایی',
    icon: 'fish',
    rarity: 'legendary',
    minWeight: 2.0,
    maxWeight: 6.5,
    tint: [1.0, 0.85, 0.3],
    scaleMultiplier: 1.4,
  },
];

// دو صید آشغال رویه‌ای با احتمال پایین (مدل ندارند؛ در کارت با SVG نشان داده می‌شوند)
export const JUNK_ITEMS = [
  { id: 'old-shoe', name: 'کفش کهنه', icon: 'shoe', rarity: 'junk', weight: 0.6 },
  { id: 'tin-can', name: 'قوطی حلبی', icon: 'can', rarity: 'junk', weight: 0.25 },
];

export const JUNK_CHANCE = 0.13;
export const REEL_HOLD_TIME = 3;
export const BITE_WINDOW = 1.5;
export const MIN_CAST_POWER = 0.18;
export const CAST_CHARGE_TIME = 1.1;
export const MAX_REEL_TIME = 20;
export const ESCAPE_GRACE = 1.2;

const totalWeight = FISH_SPECIES.reduce((sum, s) => sum + RARITY[s.rarity].weight, 0);

function pickSpecies() {
  let roll = Math.random() * totalWeight;
  for (const species of FISH_SPECIES) {
    roll -= RARITY[species.rarity].weight;
    if (roll <= 0) return species;
  }
  return FISH_SPECIES[0];
}

const round1 = (n) => Math.round(n * 10) / 10;

function buildFish() {
  if (Math.random() < JUNK_CHANCE) {
    const junk = JUNK_ITEMS[Math.floor(Math.random() * JUNK_ITEMS.length)];
    return {
      uid: `${junk.id}-${Date.now().toString(36)}`,
      id: junk.id,
      name: junk.name,
      icon: junk.icon,
      rarity: 'junk',
      rarityLabel: RARITY.junk.label,
      rarityColor: RARITY.junk.color,
      weight: junk.weight,
      tint: [0.45, 0.36, 0.28],
      scaleMultiplier: 0.7,
      junk: true,
      caughtAt: Date.now(),
    };
  }
  const species = pickSpecies();
  const weight = round1(
    species.minWeight + Math.random() * (species.maxWeight - species.minWeight)
  );
  return {
    uid: `${species.id}-${Date.now().toString(36)}`,
    id: species.id,
    name: species.name,
    icon: 'fish',
    rarity: species.rarity,
    rarityLabel: RARITY[species.rarity].label,
    rarityColor: RARITY[species.rarity].color,
    weight,
    tint: species.tint,
    scaleMultiplier: species.scaleMultiplier,
    junk: false,
    caughtAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// وضعیت زنده — module-level (بدون re-render هر فریم)
// phase: idle | ready | charging | waiting | bite | reeling | result
// ---------------------------------------------------------------------------
export const fishing = {
  active: false,
  phase: 'idle',
  spotIndex: -1,
  spot: null,
  power: 0,
  waitDuration: 0,
  waitElapsed: 0,
  biteLeft: 0,
  species: null,
  safeFrom: 0.4,
  safeTo: 0.6,
  indicator: 0.5,
  keepTime: 0,
  reelElapsed: 0,
  result: null,
};

const listeners = new Set();

export function subscribeFishing(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emit(type) {
  for (const cb of listeners) cb(type);
}

export function beginFishing(spotIndex, spot) {
  fishing.active = true;
  fishing.phase = 'ready';
  fishing.spotIndex = spotIndex;
  fishing.spot = spot || null;
  fishing.power = 0;
  fishing.waitDuration = 0;
  fishing.waitElapsed = 0;
  fishing.biteLeft = 0;
  fishing.species = null;
  fishing.indicator = 0.5;
  fishing.keepTime = 0;
  fishing.reelElapsed = 0;
  fishing.result = null;
  emit('start');
}

// شروع شارژ قدرت پرتاب (نگه‌داشتن E در فاز ready)
export function beginCharge() {
  if (fishing.phase !== 'ready') return false;
  fishing.phase = 'charging';
  fishing.power = 0;
  emit('charge');
  return true;
}

// نگه‌داشتن E در مرحله‌ی پرتاب، قدرت را تا سقف بالا می‌برد
export function tickCharge(dt) {
  if (fishing.phase !== 'charging') return;
  fishing.power = Math.min(1, fishing.power + dt / CAST_CHARGE_TIME);
}

// رها کردن E: پرتاب با قدرت فعلی (حداقل قدرت لازم است)
export function releaseCast() {
  if (fishing.phase !== 'charging') return false;
  if (fishing.power < MIN_CAST_POWER) {
    fishing.phase = 'ready';
    fishing.power = 0;
    emit('charge');
    return false;
  }
  fishing.phase = 'waiting';
  fishing.waitDuration = 3 + Math.random() * 5;
  fishing.waitElapsed = 0;
  emit('cast');
  return true;
}

// انتظار برای گاز گرفتن؛ بعد از مدت تصادفی به فاز bite می‌رود
export function tickWaiting(dt) {
  if (fishing.phase !== 'waiting') return;
  fishing.waitElapsed += dt;
  if (fishing.waitElapsed >= fishing.waitDuration) {
    fishing.phase = 'bite';
    fishing.biteLeft = BITE_WINDOW;
    emit('bite');
  }
}

export function tickBite(dt) {
  if (fishing.phase !== 'bite') return;
  fishing.biteLeft -= dt;
  if (fishing.biteLeft <= 0) {
    escape('ماهی فرار کرد');
  }
}

// قلاب زدن در پنجره‌ی گزش: گونه و ناحیه‌ی امن انتخاب می‌شود
export function hookFish() {
  if (fishing.phase !== 'bite') return false;
  const species = buildFish();
  const width = RARITY[species.rarity].zoneWidth;
  const center = 0.3 + Math.random() * 0.4;
  fishing.species = species;
  fishing.safeFrom = Math.max(0.08, Math.min(0.92 - width, center - width / 2));
  fishing.safeTo = fishing.safeFrom + width;
  fishing.indicator = 0.5;
  fishing.keepTime = 0;
  fishing.reelElapsed = 0;
  fishing.phase = 'reeling';
  emit('reel');
  return true;
}

// یک گام کشش: نگه‌داشتن E شاخص را بالا، رها کردن پایین می‌برد
export function stepReel(dt, holding) {
  if (fishing.phase !== 'reeling') return;
  const accel = holding ? 0.85 : -0.78;
  fishing.indicator = Math.max(0, Math.min(1, fishing.indicator + accel * dt));
  const inSafe = fishing.indicator >= fishing.safeFrom && fishing.indicator <= fishing.safeTo;
  fishing.keepTime += inSafe ? dt : -dt * 0.9;
  fishing.reelElapsed += dt;

  if (fishing.keepTime >= REEL_HOLD_TIME) {
    succeed();
    return;
  }
  if (fishing.keepTime <= -ESCAPE_GRACE) {
    escape('نخ پاره شد');
    return;
  }
  if (fishing.reelElapsed >= MAX_REEL_TIME) {
    escape('ماهی فرار کرد');
  }
}

function succeed() {
  const species = fishing.species;
  fishing.phase = 'result';
  fishing.result = { ok: true, fish: species };
  fishing.active = false;
  emit('result');
}

function escape(reason) {
  fishing.phase = 'result';
  fishing.result = { ok: false, fish: fishing.species, reason };
  fishing.active = false;
  emit('result');
}

// بستن کامل (پس از نمایش کارت یا با ESC)
export function resetFishing() {
  fishing.active = false;
  fishing.phase = 'idle';
  fishing.spotIndex = -1;
  fishing.spot = null;
  fishing.power = 0;
  fishing.waitDuration = 0;
  fishing.waitElapsed = 0;
  fishing.biteLeft = 0;
  fishing.species = null;
  fishing.indicator = 0.5;
  fishing.keepTime = 0;
  fishing.reelElapsed = 0;
  fishing.result = null;
  emit('reset');
}

export function fishTotalWeight(fishList) {
  if (!Array.isArray(fishList)) return 0;
  return Math.round(fishList.reduce((sum, f) => sum + (f.weight || 0), 0) * 10) / 10;
}
