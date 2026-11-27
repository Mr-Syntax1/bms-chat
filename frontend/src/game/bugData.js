// ---------------------------------------------------------------------------
// bugData.js — داده‌ی حشرات رویه‌ای + وضعیت زنده‌ی گرفتن
//
//  • هیچ GLB نداریم؛ هر حشره یک توصیف داده‌ای است و Bugs.jsx آن را با
//    InstancedMesh می‌سازد.
//  • موقعیت زنده در Float32Array بیرون React نوشته می‌شود تا «گرفتن با F»
//    بدون re-render هر فریم ممکن باشد.
// ---------------------------------------------------------------------------
import { QUEST_SPOTS } from './sceneLayout';
import { getGroundHeight, isInWater, pathDistance, POND, WATER_LEVEL, CAMP_RADIUS } from './terrain';
import { BUTTERFLY_SPLIT, FIREFLY_SPLIT } from './fxBudget';

export const BUG_TYPES = {
  butterfly: { name: 'پروانه', icon: 'butterfly', rarity: 'common', color: '#ffd166' },
  beetle: { name: 'سوسک', icon: 'beetle', rarity: 'uncommon', color: '#9b7a52' },
  firefly: { name: 'کرم شب‌تاب', icon: 'firefly', rarity: 'rare', color: '#ffe07a' },
};

// سقف جهانی حشرات — مجموع دو سیستم (این فایل + CozyScene/Butterflies) از
// GLOBAL_FIREFLIES/GLOBAL_BUTTERFLIES بیشتر نمی‌شود. سهم این فایل = قابل‌گرفتن.
const COUNTS = {
  low: { butterfly: 2, beetle: 3, firefly: 2 },
  medium: { butterfly: 3, beetle: 4, firefly: 3 },
  high: { butterfly: BUTTERFLY_SPLIT.catchable, beetle: 5, firefly: FIREFLY_SPLIT.catchable },
};

const BUTTERFLY_COLORS = ['#ffd166', '#ff9ecd', '#9ad0ff', '#c9a6ff', '#ffe6a8'];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBug(type, x, z, y, rand) {
  const meta = BUG_TYPES[type];
  return {
    type,
    name: meta.name,
    icon: meta.icon,
    rarity: meta.rarity,
    color: type === 'butterfly' ? BUTTERFLY_COLORS[Math.floor(rand() * BUTTERFLY_COLORS.length)] : meta.color,
    x,
    z,
    y,
    phase: rand() * Math.PI * 2,
    speed: type === 'beetle' ? 0.22 + rand() * 0.18 : 0.5 + rand() * 0.5,
    radius: type === 'beetle' ? 0.6 + rand() * 0.9 : 1.2 + rand() * 1.6,
    scale: type === 'butterfly' ? 0.9 + rand() * 0.5 : type === 'beetle' ? 0.8 + rand() * 0.4 : 1,
  };
}

// اعتبارسنجی نقطه: خشکی، نه روی مسیر، و دور از مرکز کمپ (بسته به نوع)
function validSpot(x, z, minCamp) {
  if (isInWater(x, z)) return false;
  if (getGroundHeight(x, z) < WATER_LEVEL + 0.3) return false;
  if (pathDistance(x, z) < 1.5) return false;
  if (Math.hypot(x, z) < minCamp) return false;
  return true;
}

function buildList(tier) {
  const rand = mulberry32(73021);
  const counts = COUNTS[tier] || COUNTS.medium;
  const list = [];

  // پروانه‌ها: نیمی نزدیک گل‌ها، نیمی در چمن‌زار اطراف کمپ
  const flowers = QUEST_SPOTS.collectibles;
  for (let i = 0; i < counts.butterfly; i += 1) {
    let x = 0;
    let z = 0;
    let ok = false;
    for (let tries = 0; tries < 24 && !ok; tries += 1) {
      if (i % 2 === 0 && flowers.length) {
        const f = flowers[(i + tries) % flowers.length];
        x = f.x + (rand() - 0.5) * 7;
        z = f.z + (rand() - 0.5) * 7;
      } else {
        x = -18 + rand() * 38;
        z = -24 + rand() * 48;
      }
      ok = validSpot(x, z, CAMP_RADIUS - 6);
    }
    if (ok) list.push(makeBug('butterfly', x, z, 0.8 + rand() * 0.9, rand));
  }

  // سوسک‌ها: کف جنگل، دور از کمپ
  for (let i = 0; i < counts.beetle; i += 1) {
    let x = 0;
    let z = 0;
    let ok = false;
    for (let tries = 0; tries < 24 && !ok; tries += 1) {
      x = -76 + rand() * 52;
      z = -82 + rand() * 160;
      ok = validSpot(x, z, CAMP_RADIUS + 3);
    }
    if (ok) list.push(makeBug('beetle', x, z, 0, rand));
  }

  // کرم‌های شب‌تاب: اطراف برکه
  for (let i = 0; i < counts.firefly; i += 1) {
    let x = 0;
    let z = 0;
    let ok = false;
    for (let tries = 0; tries < 24 && !ok; tries += 1) {
      const angle = rand() * Math.PI * 2;
      const radius = POND.radius + 1 + rand() * 8;
      x = POND.x + Math.cos(angle) * radius;
      z = POND.z + Math.sin(angle) * radius;
      ok = validSpot(x, z, 0);
    }
    if (ok) list.push(makeBug('firefly', x, z, 0.9 + rand() * 0.8, rand));
  }

  return list;
}

// ---------------------------------------------------------------------------
// وضعیت زنده — بیرون React
// ---------------------------------------------------------------------------
export const bugWorld = {
  list: [],
  pos: new Float32Array(0),
  caught: new Uint8Array(0),
};

const cache = new Map();

export function getBugList(tier) {
  const key = COUNTS[tier] ? tier : 'medium';
  let list = cache.get(key);
  if (!list) {
    list = buildList(key);
    cache.set(key, list);
  }
  if (bugWorld.list !== list) {
    bugWorld.list = list;
    bugWorld.pos = new Float32Array(list.length * 3);
    bugWorld.caught = new Uint8Array(list.length);
    list.forEach((b, i) => {
      bugWorld.pos[i * 3] = b.x;
      bugWorld.pos[i * 3 + 1] = b.y;
      bugWorld.pos[i * 3 + 2] = b.z;
    });
  }
  return list;
}

export function nearestBugDistance(x, z) {
  const { list, pos, caught } = bugWorld;
  let best = Infinity;
  for (let i = 0; i < list.length; i += 1) {
    if (caught[i]) continue;
    const dx = pos[i * 3] - x;
    const dz = pos[i * 3 + 2] - z;
    const d = Math.hypot(dx, dz);
    if (d < best) best = d;
  }
  return best;
}

// گرفتن نزدیک‌ترین حشره در شعاع داده‌شده؛ خروجی = آیتم اینونتوری یا null
export function tryCatchBug(x, z, radius = 1.6) {
  const { list, pos, caught } = bugWorld;
  let best = -1;
  let bestD = radius;
  for (let i = 0; i < list.length; i += 1) {
    if (caught[i]) continue;
    const d = Math.hypot(pos[i * 3] - x, pos[i * 3 + 2] - z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best < 0) return null;
  caught[best] = 1;
  const b = list[best];
  return {
    uid: `${b.type}-${Date.now().toString(36)}-${best}`,
    id: b.type,
    name: b.name,
    icon: b.icon,
    rarity: b.rarity,
    rarityColor: b.color,
    caughtAt: Date.now(),
  };
}
