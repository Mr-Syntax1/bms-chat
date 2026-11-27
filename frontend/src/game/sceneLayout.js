// چیدمان ثابت (deterministic) کمپ؛ همه‌ی کلاینت‌ها محیط یکسان می‌بینند
//
// ثابت‌های مربوط به «شکل زمین» در terrain.js زندگی می‌کنند و از اینجا دوباره
// export می‌شوند تا بقیه‌ی کد همچنان از sceneLayout استفاده کند.
import {
  MAP_SIZE,
  HALF_MAP,
  CAMP_RADIUS,
  SAND_START_X,
  WATER_START_X,
  WATER_LEVEL,
  isPlantable,
  pathDistance,
  isInWater,
  WATERFALL,
} from './terrain';

export {
  MAP_SIZE,
  HALF_MAP,
  CAMP_RADIUS,
  SAND_START_X,
  WATER_START_X,
  WATER_LEVEL,
};

export const FIRE_KEEPOUT = 1.9;
export const SPAWN = { x: 0, z: 10.5 };
export const VAN = { x: -11.5, z: -7.2, rotation: 0.62 };
export const SEAT_COUNT = 6;

// مرز حرکت بازیکن — ورود به آب مجاز است (شنا)، ولی از نقشه بیرون نمی‌رود
export const BOUNDS = { minX: -188, maxX: 188, minZ: -188, maxZ: 188 };

// اسکله، فانوس دریایی، قایق‌ها و صندوق گنج
export const DOCK = { x: 74, z: 0, length: 16, width: 3.4 };
export const LIGHTHOUSE = { x: 68, z: 40 };
export const BOATS = [
  { x: 82, z: 6, rotation: -0.5, scale: 0.009 },
  { x: 84, z: -9, rotation: 0.9, scale: 0.011 },
];

// ---------------------------------------------------------------------------
// موقعیت آیتم‌های مأموریت (قبل از درختان تعریف می‌شود تا از تداخل جلوگیری شود)
// ---------------------------------------------------------------------------
export const QUEST_SPOTS = {
  parchments: [
    { x: -14, z: 8, rotation: 0.4 },
    { x: -22, z: -12, rotation: 1.2 },
    { x: -8, z: -20, rotation: 2.1 },
  ],
  lanterns: [
    { x: -18, z: 2 },
    { x: -26, z: 14 },
    { x: -12, z: 18 },
    { x: -30, z: -4 },
    { x: -20, z: -22 },
  ],
  fishingRod: { x: 75.5, z: 1.1, rotation: 0.7 },
  chest: { x: 66, z: 34 },
  signs: [
    { x: 6, z: 14, rotation: -0.6, text: 'اینجا بوی چوب سوخته و خاطره می‌دهد…' },
    { x: 40, z: -8, rotation: 1.1, text: 'ساحل همیشه صدای کسی را نگه می‌دارد.' },
    { x: 64, z: 22, rotation: 2.4, text: 'فانوس دریایی فقط برای گمشده‌ها روشن است.' },
  ],
  collectibles: Array.from({ length: 10 }, (_, i) => ({
    x: 44 + (i % 5) * 6.5,
    z: -20 + Math.floor(i / 5) * 34 + (i % 2) * 3,
    rotation: i * 0.7,
    variant: i % 3,
  })),
};

// نقاطی که نباید درخت/تزئینات رویشان بیفتد (آیتم‌ها باید قابل دسترسی باشند)
const QUEST_KEEPOUT = [
  ...QUEST_SPOTS.parchments.map((p) => ({ x: p.x, z: p.z, r: 3.4 })),
  ...QUEST_SPOTS.lanterns.map((p) => ({ x: p.x, z: p.z, r: 3.4 })),
  ...QUEST_SPOTS.signs.map((p) => ({ x: p.x, z: p.z, r: 3 })),
  { x: QUEST_SPOTS.fishingRod.x, z: QUEST_SPOTS.fishingRod.z, r: 3.4 },
  { x: QUEST_SPOTS.chest.x, z: QUEST_SPOTS.chest.z, r: 4 },
];

const isNearQuestSpot = (x, z) =>
  QUEST_KEEPOUT.some((spot) => Math.hypot(spot.x - x, spot.z - z) < spot.r);

// تولید عدد شبه‌تصادفی با seed ثابت
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// صندلی‌ها: کنده‌های دور آتش
// ---------------------------------------------------------------------------
export const SEAT_RADIUS = 4.1;
export const SEAT_HEIGHT = 0.52;

const FIRE_SEATS = Array.from({ length: SEAT_COUNT }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI * 2) / SEAT_COUNT;
  return {
    x: Math.cos(angle) * SEAT_RADIUS,
    z: Math.sin(angle) * SEAT_RADIUS,
    rotation: Math.atan2(-Math.cos(angle), -Math.sin(angle)),
    rest: 'sit',
  };
});

// نقاط استراحت: هاموک، کیسه‌خواب، کنده‌های نشیمن و میز پیک‌نیک
// restY = ارتفاع گروه بازیکن نسبت به سطح زمین (نشستن خودش ۰.۳۵ پایین می‌آید)
export const REST_SPOTS = [
  { key: 'rest-hammock', label: 'دراز کشیدن در هاموک', x: 7.4, z: 7.2, rotation: -0.6, rest: 'sleep', restY: 0.72 },
  { key: 'rest-bedroll', label: 'خوابیدن روی کیسه‌خواب', x: 4.2, z: 2.4, rotation: 2.4, rest: 'sleep', restY: 0.02 },
  { key: 'rest-stump-a', label: 'نشستن روی کنده', x: 5.4, z: -2.2, rotation: -1.18, rest: 'sit', restY: 0.2 },
  { key: 'rest-stump-b', label: 'نشستن روی کنده', x: 2.2, z: -5.4, rotation: -0.39, rest: 'sit', restY: 0.2 },
  { key: 'rest-picnic-a', label: 'نشستن سر میز', x: -5.75, z: 7.23, rotation: -2.64, rest: 'sit', restY: 0.1 },
  { key: 'rest-picnic-b', label: 'نشستن سر میز', x: -12.47, z: -2.41, rotation: 1.79, rest: 'sit', restY: 0.1 },
].map((spot, i) => ({ ...spot, seatIndex: SEAT_COUNT + i, radius: 1.8 }));

// ایندکس‌ها بین همه‌ی کلاینت‌ها یکسان: ۶ صندلی آتش + نقاط استراحت
export const SEAT_SPOTS = [
  ...FIRE_SEATS,
  ...REST_SPOTS.map(({ x, z, rotation, rest, restY, key }) => ({ x, z, rotation, rest, restY, key })),
];

// ---------------------------------------------------------------------------
// درختان جنگل — چیدمان biome-aware با طبقات ارتفاعی.
//
//   understory ۴..۷   |  mid ۸..۱۴  |  canopy ۱۵..۲۸  |  giant ۳۰..۳۸
//
// درختان غول فقط نزدیک آبشار و پشت کمپ رشد می‌کنند. شعاع برخورد از عرض تنه
// می‌آید، نه ارتفاع، تا درخت بلند دیوار نامرئی نسازد.
// ---------------------------------------------------------------------------
const TREE_MAX = 2600;

// biome ها: جنگل انبوه (شمال/غرب)، چمن‌زار (شرق)، بیشه‌ی قارچ (جنوب)
function densityWeight(x, z) {
  if (x >= 96) return 0; // ساحل/دریا
  const r = Math.hypot(x, z);
  if (r < CAMP_RADIUS + 5) return 0;
  const fromCamp = Math.min(1, (r - CAMP_RADIUS) / 60);
  const west = Math.max(0, -x) / 188;
  const north = Math.max(0, -z) / 188;
  const east = Math.max(0, x) / 188;
  const south = Math.max(0, z) / 188;
  let w = 0.22 + 0.55 * fromCamp + 0.35 * west + 0.3 * north;
  w -= east * 0.5;
  w += south * 0.12;
  return Math.max(0, Math.min(1, w));
}

// آیا این نقطه در منطقه‌ی مجاز درختان غول است؟
function isGiantZone(x, z) {
  const behindCamp = z < -30 && z > -130 && x > -120 && x < -8;
  const nearWaterfall = Math.hypot(x - WATERFALL.x, z - (WATERFALL.baseZ + 6)) < 40;
  const deepWest = x < -120;
  return behindCamp || nearWaterfall || deepWest;
}

// انتخاب طبقه‌ی ارتفاعی — وزن‌ها به‌گونه‌ای که جنگل «کهن» به نظر برسد
function pickTier(rand, giantOk) {
  const roll = rand();
  if (giantOk && roll > 0.93) return { tier: 'giant', min: 30, max: 38 };
  if (roll > 0.72) return { tier: 'canopy', min: 15, max: 28 };
  if (roll > 0.34) return { tier: 'mid', min: 8, max: 14 };
  return { tier: 'understory', min: 4, max: 7 };
}

// درختان غول نشانه‌گذاری‌شده — نقاط دستی‌چین نزدیک آبشار و پشت کمپ.
// این‌ها همیشه وجود دارند تا افق «جنگل کهن» داشته باشد.
const LANDMARK_GIANTS = [
  { x: -46, z: -40, height: 36 },
  { x: -33, z: -44, height: 33 },
  { x: -52, z: -33, height: 31 },
  { x: -14, z: -30, height: 34 },
  { x: -22, z: -38, height: 32 },
  { x: -6, z: -26, height: 30 },
];

function makeTree(rand, x, z, tierInfo, targetHeight) {
  const xzScale = 0.62 * (targetHeight / 8.2) ** 0.45 * (0.86 + rand() * 0.28);
  return {
    x,
    z,
    targetHeight,
    tier: tierInfo,
    xzScale,
    collision: 0.16 + xzScale * 0.17,
    // سازگاری با کدهای قدیمی که scale می‌خوانند
    scale: xzScale,
    rotation: rand() * Math.PI * 2,
    tint: rand(),
    variant: rand() > 0.72 ? 2 : rand() > 0.4 ? 1 : 0,
  };
}

export function buildTrees(limit = TREE_MAX) {
  const rand = mulberry32(20261121);
  const list = [];

  // گرید فضایی برای تست فاصله‌ی O(1) (۲۶۰۰ درخت با some خطی بسیار کند می‌شد)
  const CELL = 10;
  const grid = new Map();
  const gkey = (cx, cz) => `${cx},${cz}`;
  const fits = (x, z, spacing) => {
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    const reach = Math.ceil(spacing / CELL);
    for (let ix = -reach; ix <= reach; ix += 1) {
      for (let iz = -reach; iz <= reach; iz += 1) {
        const bucket = grid.get(gkey(cx + ix, cz + iz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i += 1) {
          const t = bucket[i];
          const dx = t.x - x;
          const dz = t.z - z;
          if (dx * dx + dz * dz < spacing * spacing) return false;
        }
      }
    }
    return true;
  };
  const insert = (tree) => {
    const k = gkey(Math.floor(tree.x / CELL), Math.floor(tree.z / CELL));
    let bucket = grid.get(k);
    if (!bucket) {
      bucket = [];
      grid.set(k, bucket);
    }
    bucket.push(tree);
  };

  // ۱) درختان غول نشانه‌گذاری‌شده (همیشه حاضر)
  for (const giant of LANDMARK_GIANTS) {
    if (!isPlantable(giant.x, giant.z, 0.62)) continue;
    const tree = makeTree(rand, giant.x, giant.z, 'giant', giant.height);
    list.push(tree);
    insert(tree);
  }

  // ۲) بقیه‌ی جنگل — کل وسعت ۴۰۰×۴۰۰ (منهای ساحل/دریا)
  const HALF = 188;
  let guard = 0;
  while (list.length < limit && guard < limit * 30) {
    guard += 1;
    const x = -HALF + rand() * (HALF + 96); // -188 .. 96
    const z = -HALF + rand() * (HALF * 2);

    if (Math.hypot(x, z) < CAMP_RADIUS + 4) continue; // کمپ باز بماند
    if (Math.hypot(x - VAN.x, z - VAN.z) < 6.5) continue;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 4) continue;
    if (isNearQuestSpot(x, z)) continue;
    // مسیر باز بین کمپ و اسکله باید قابل عبور بماند
    if (Math.abs(z) < 4.5 && x > 6 && x < SAND_START_X) continue;
    // هیچ درختی روی مسیرهای خاکی یا داخل پهنه‌ی آب نباشد
    if (pathDistance(x, z) < 2.6) continue;
    if (isInWater(x, z)) continue;
    // روی آب و شیب تند درخت نمی‌کاریم
    if (!isPlantable(x, z, 0.5)) continue;

    // تراکم گرادیانی (biome-aware): در لبه‌ها بعضی نقاط رد می‌شوند
    if (rand() > densityWeight(x, z)) continue;

    const tierInfo = pickTier(rand, isGiantZone(x, z));
    const targetHeight = tierInfo.min + rand() * (tierInfo.max - tierInfo.min);

    // فاصله‌ی حداقلی متناسب با اندازه‌ی درخت (غول‌ها فضای بیشتری می‌خواهند)
    const spacing = tierInfo.tier === 'giant' ? 9 : tierInfo.tier === 'canopy' ? 4.2 : 3.0;
    if (!fits(x, z, spacing)) continue;

    const tree = makeTree(rand, x, z, tierInfo.tier, targetHeight);
    list.push(tree);
    insert(tree);
  }
  return list;
}

// فهرست پیش‌فرض (HIGH) — کامپوننت Forest می‌تواند نسخه‌ی سبک‌تر بسازد
export const TREES = buildTrees(TREE_MAX);

// ---------------------------------------------------------------------------
// درختان نخل ساحل (۲۰ عدد) — مقیاس نهایی با targetHeight نرمال می‌شود
// ---------------------------------------------------------------------------
export const PALMS = (() => {
  const rand = mulberry32(5150);
  return Array.from({ length: 20 }, () => ({
    x: SAND_START_X + 4 + rand() * (WATER_START_X - SAND_START_X - 12),
    z: -92 + rand() * 184,
    scale: 0.85 + rand() * 0.35,
    rotation: rand() * Math.PI * 2,
    variant: Math.floor(rand() * 3),
  }));
})();

// ---------------------------------------------------------------------------
// صدف/ستاره دریایی تزئینی روی شن (۳۰ عدد)
// ---------------------------------------------------------------------------
export const BEACH_SHELLS = (() => {
  const rand = mulberry32(90210);
  return Array.from({ length: 30 }, () => ({
    x: SAND_START_X + 2 + rand() * (WATER_START_X - SAND_START_X - 6),
    z: -92 + rand() * 184,
    scale: 0.8 + rand() * 0.5,
    rotation: rand() * Math.PI * 2,
    variant: Math.floor(rand() * 3),
  }));
})();

// ---------------------------------------------------------------------------
// تزئینات کمپ و جنگل
// ---------------------------------------------------------------------------
export const DECORATIONS = (() => {
  const rand = mulberry32(777001);
  const items = [];

  const place = (type, count, minR, maxR, scaleRange) => {
    for (let i = 0; i < count; i += 1) {
      let x = 0;
      let z = 0;
      let tries = 0;
      do {
        const angle = rand() * Math.PI * 2;
        const radius = minR + rand() * (maxR - minR);
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        tries += 1;
      } while (
        tries < 28 &&
        (Math.hypot(x - VAN.x, z - VAN.z) < 4.2 ||
          Math.hypot(x, z) < FIRE_KEEPOUT + 1.6 ||
          isNearQuestSpot(x, z) ||
          items.some((it) => Math.hypot(it.x - x, it.z - z) < 2.2))
      );

      const [minS, maxS] = scaleRange;
      items.push({
        type,
        x,
        z,
        scale: minS + rand() * (maxS - minS),
        rotation: rand() * Math.PI * 2,
      });
    }
  };

  place('logFungus', 5, 6.5, 13, [1.1, 1.6]);
  place('rocks', 6, 7, 13.5, [0.8, 1.3]);
  place('tent', 2, 9, 13.5, [1.0, 1.25]);
  place('logAxe', 3, 7.5, 13, [1.0, 1.4]);

  place('tent', 3, 20, 40, [0.95, 1.25]);
  place('rocks', 10, 17, 46, [0.7, 1.4]);
  place('logFungus', 6, 18, 44, [0.9, 1.5]);
  place('logAxe', 4, 20, 42, [1.0, 1.5]);

  return items;
})();

// سنگ‌های تزئینی دور گودال آتش
export const FIRE_STONES = (() => {
  const rand = mulberry32(1337);
  return Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 + rand() * 0.2;
    const radius = FIRE_KEEPOUT - 0.1;
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      scale: 0.22 + rand() * 0.12,
      rotation: rand() * Math.PI,
    };
  });
})();

// مسیر سنگی بین کمپ و اسکله
export const ROCK_PATH = (() => {
  const rand = mulberry32(4242);
  const stones = [];
  for (let x = 14; x < WATER_START_X - 4; x += 1.6) {
    stones.push({
      x: x + (rand() - 0.5) * 0.6,
      z: (rand() - 0.5) * 1.6,
      scale: 1.4 + rand() * 0.6,
      rotation: rand() * Math.PI,
    });
  }
  return stones;
})();
