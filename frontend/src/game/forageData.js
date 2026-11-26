// ---------------------------------------------------------------------------
// forageData.js — سیستم چیدن گیاه (Phase 3d)
//
//  • داده‌محور: افزودن آیتم = یک ورودی در FORAGE_TYPES.
//  • هیچ GLB جدیدی ساخته نمی‌شود؛ از مدل‌های موجود (Mushrooms / MushroomLaetiporus /
//    Flowers / BushbyQuaternius) استفاده می‌شود و بقیه رویه‌ای‌اند.
//  • تایمر ری‌اسپاون بیرون React است: یک Float64Array از timestampها + یک setInterval
//    ماژول‌سطح. هیچ setState در چرخه‌ی ری‌اسپاون وجود ندارد.
//  • وضعیت «چیده‌شده» در Uint8Array نگه داشته می‌شود تا رندر هر فریم بدون re-render باشد.
// ---------------------------------------------------------------------------
import { TREES } from './sceneLayout';
import {
  getGroundHeight,
  isInWater,
  pathDistance,
  WATER_LEVEL,
  CAMP_RADIUS,
} from './terrain';

// ---------------------------------------------------------------------------
// انواع آیتم قابل چیدن
// ---------------------------------------------------------------------------
export const FORAGE_TYPES = {
  mushroom: {
    id: 'mushroom',
    name: 'قارچ جنگلی',
    icon: 'mushroom',
    rarity: 'common',
    biome: 'forest',
    respawnTime: 12 * 60 * 1000, // ۱۲ دقیقه
    uses: ['mushroom-stew', 'grilled-mushroom'],
    color: '#c9a06a',
  },
  laetiporus: {
    id: 'laetiporus',
    name: 'قارچ مرغ جنگل',
    icon: 'mushroom',
    rarity: 'rare',
    biome: 'forest',
    respawnTime: 15 * 60 * 1000, // ۱۵ دقیقه
    uses: ['mushroom-stew', 'grilled-mushroom'],
    color: '#ffb347',
  },
  berries: {
    id: 'berries',
    name: 'توت جنگلی',
    icon: 'berry',
    rarity: 'common',
    biome: 'edge',
    respawnTime: 10 * 60 * 1000, // ۱۰ دقیقه
    uses: ['berry-pie', 'pancakes'],
    color: '#e05656',
  },
  herb: {
    id: 'herb',
    name: 'گیاه معطر',
    icon: 'herb',
    rarity: 'uncommon',
    biome: 'meadow',
    respawnTime: 11 * 60 * 1000, // ۱۱ دقیقه
    uses: ['mushroom-stew'],
    color: '#7fd08a',
  },
  pinecone: {
    id: 'pinecone',
    name: 'میوه کاج',
    icon: 'pinecone',
    rarity: 'common',
    biome: 'pine',
    respawnTime: 13 * 60 * 1000, // ۱۳ دقیقه
    uses: ['berry-pie'],
    color: '#8a5a34',
  },
  flower: {
    id: 'flower',
    name: 'گل وحشی',
    icon: 'flower',
    rarity: 'uncommon',
    biome: 'meadow',
    respawnTime: 14 * 60 * 1000, // ۱۴ دقیقه
    uses: ['flower-tea'],
    color: '#ff9ecd',
  },
};

// سقف هم‌زمان ۳۰..۴۰ آیتم (اینجا ۳۶)
const COUNTS = {
  mushroom: 8,
  laetiporus: 3,
  berries: 7,
  herb: 6,
  pinecone: 7,
  flower: 5,
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// درختان جنگلی و کاجی (برای قارچ نزدیک تنه و میوه‌ی کاج زیر کاج)
const FOREST_TREES = TREES.filter(
  (t) => t.x < 14 && Math.hypot(t.x, t.z) > CAMP_RADIUS + 2
);
const DEEP_TREES = TREES.filter((t) => t.x < -14);
const PINE_TREES = TREES.filter(
  (t) => t.variant !== 2 && t.x < 14 && Math.hypot(t.x, t.z) > CAMP_RADIUS + 2
);

function validGround(x, z) {
  if (isInWater(x, z)) return false;
  if (getGroundHeight(x, z) < WATER_LEVEL + 0.35) return false;
  return true;
}

function farFromOthers(list, x, z, min) {
  for (let i = 0; i < list.length; i += 1) {
    if (Math.hypot(list[i].x - x, list[i].z - z) < min) return false;
  }
  return true;
}

// تولید نقاط اولیه با seed ثابت تا همه‌ی کلاینت‌ها چیدمان یکسان ببینند
function buildList() {
  const rand = mulberry32(90217);
  const list = [];

  const push = (type, x, z, scale) => {
    const meta = FORAGE_TYPES[type];
    list.push({
      index: list.length,
      type,
      name: meta.name,
      icon: meta.icon,
      rarity: meta.rarity,
      color: meta.color,
      x,
      z,
      y: getGroundHeight(x, z),
      scale: scale ?? 0.85 + rand() * 0.3,
      rotation: rand() * Math.PI * 2,
      phase: rand() * Math.PI * 2,
    });
  };

  const nearTrees = (type, count, pool, minTreeX) => {
    for (let i = 0; i < count; i += 1) {
      for (let tries = 0; tries < 48; tries += 1) {
        if (!pool.length) break;
        const tree = pool[Math.floor(rand() * pool.length)];
        if (tree.x > minTreeX) continue;
        const angle = rand() * Math.PI * 2;
        const r = 0.7 + rand() * 1.7;
        const x = tree.x + Math.cos(angle) * r;
        const z = tree.z + Math.sin(angle) * r;
        if (!validGround(x, z)) continue;
        if (!farFromOthers(list, x, z, 2)) continue;
        push(type, x, z);
        break;
      }
    }
  };

  // قارچ‌ها: کف جنگل نزدیک تنه‌ها
  nearTrees('mushroom', COUNTS.mushroom, FOREST_TREES, 12);
  // قارچ نادر: عمق جنگل
  nearTrees('laetiporus', COUNTS.laetiporus, DEEP_TREES, -14);
  // میوه‌ی کاج: زیر کاج‌ها
  nearTrees('pinecone', COUNTS.pinecone, PINE_TREES, 12);

  // توت: لبه‌ی جنگل / پاکت‌ها (روی Bush)
  for (let i = 0; i < COUNTS.berries; i += 1) {
    for (let tries = 0; tries < 60; tries += 1) {
      const angle = rand() * Math.PI * 2;
      const r = CAMP_RADIUS + 4 + rand() * 22;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (x > 26) continue;
      if (!validGround(x, z)) continue;
      if (pathDistance(x, z) < 1.4) continue;
      if (!farFromOthers(list, x, z, 2.4)) continue;
      push('berries', x, z, 0.9 + rand() * 0.3);
      break;
    }
  }

  // گیاه معطر: چمن‌زار اطراف کمپ
  for (let i = 0; i < COUNTS.herb; i += 1) {
    for (let tries = 0; tries < 60; tries += 1) {
      const angle = rand() * Math.PI * 2;
      const r = CAMP_RADIUS + 1 + rand() * 7;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (!validGround(x, z)) continue;
      if (pathDistance(x, z) < 1.2) continue;
      if (!farFromOthers(list, x, z, 2)) continue;
      push('herb', x, z);
      break;
    }
  }

  // گل وحشی: چمن‌زار و لبه‌ی مسیرها
  for (let i = 0; i < COUNTS.flower; i += 1) {
    for (let tries = 0; tries < 60; tries += 1) {
      const angle = rand() * Math.PI * 2;
      const r = CAMP_RADIUS + rand() * 28;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (!validGround(x, z)) continue;
      const pd = pathDistance(x, z);
      if (pd < 1.4 || pd > 5.5) continue;
      if (!farFromOthers(list, x, z, 2)) continue;
      push('flower', x, z, 0.75 + rand() * 0.3);
      break;
    }
  }

  return list;
}

// ---------------------------------------------------------------------------
// وضعیت زنده — بیرون React
// ---------------------------------------------------------------------------
export const forageWorld = {
  list: [],
  picked: new Uint8Array(0),
  respawnAt: new Float64Array(0),
};

let cached = null;
let respawnTimer = null;

// تایمر ماژول‌سطح: هر ثانیه آیتم‌های سررسیده را برمی‌گرداند (بدون React)
function ensureRespawnTimer() {
  if (respawnTimer) return;
  respawnTimer = setInterval(() => {
    const now = Date.now();
    const { picked, respawnAt } = forageWorld;
    for (let i = 0; i < respawnAt.length; i += 1) {
      if (picked[i] && now >= respawnAt[i]) {
        picked[i] = 0;
        respawnAt[i] = 0;
      }
    }
  }, 1000);
  // در محیط Node (تست) تایمر مانع خروج نشود
  if (typeof respawnTimer?.unref === 'function') respawnTimer.unref();
}

export function getForageList() {
  if (!cached) cached = buildList();
  if (forageWorld.list !== cached) {
    forageWorld.list = cached;
    forageWorld.picked = new Uint8Array(cached.length);
    forageWorld.respawnAt = new Float64Array(cached.length);
    ensureRespawnTimer();
  }
  return cached;
}

// نزدیک‌ترین آیتم چیده‌نشده در شعاع مشخص
export function findNearestForage(x, z, radius = 2) {
  if (forageWorld.list.length === 0) getForageList();
  const { list, picked } = forageWorld;
  let best = -1;
  let bestDist = radius;
  for (let i = 0; i < list.length; i += 1) {
    if (picked[i]) continue;
    const d = Math.hypot(list[i].x - x, list[i].z - z);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best >= 0 ? { index: best, item: list[best], distance: bestDist } : null;
}

export function nearestForageDistance(x, z) {
  const found = findNearestForage(x, z, Infinity);
  return found ? found.distance : Infinity;
}

// چیدن نزدیک‌ترین آیتم؛ خروجی = آیتم اینونتوری یا null
export function tryPickForage(x, z, radius = 2) {
  if (forageWorld.list.length === 0) getForageList();
  const found = findNearestForage(x, z, radius);
  if (!found) return null;
  const { index, item } = found;
  const meta = FORAGE_TYPES[item.type];
  forageWorld.picked[index] = 1;
  forageWorld.respawnAt[index] = Date.now() + meta.respawnTime;
  return {
    uid: `${item.type}-${Date.now().toString(36)}-${index}`,
    id: meta.id,
    name: meta.name,
    icon: meta.icon,
    rarity: meta.rarity,
    rarityColor: meta.color,
    pickedAt: Date.now(),
  };
}
