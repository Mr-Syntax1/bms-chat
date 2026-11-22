// چیدمان ثابت (deterministic) کمپ؛ همه‌ی کلاینت‌ها محیط یکسان می‌بینند
export const MAP_SIZE = 200; // نقشه ۲۰۰×۲۰۰
export const HALF_MAP = MAP_SIZE / 2;
export const CAMP_RADIUS = 15; // شعاع دایره‌ی باز و دنج مرکزی (بدون درخت)
export const SAND_START_X = 32; // از این x به بعد شن ساحل
export const WATER_START_X = 74; // از این x به بعد آب
export const FIRE_KEEPOUT = 1.9;
export const SPAWN = { x: 0, z: 10.5 };
export const VAN = { x: -11.5, z: -7.2, rotation: 0.62 };
export const SEAT_COUNT = 6;

// مرز حرکت بازیکن (نمی‌تواند وارد آب شود)
export const BOUNDS = { minX: -95, maxX: WATER_START_X - 2, minZ: -95, maxZ: 95 };

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

export const SEAT_SPOTS = Array.from({ length: SEAT_COUNT }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI * 2) / SEAT_COUNT;
  return {
    x: Math.cos(angle) * SEAT_RADIUS,
    z: Math.sin(angle) * SEAT_RADIUS,
    rotation: Math.atan2(-Math.cos(angle), -Math.sin(angle)),
  };
});

// ---------------------------------------------------------------------------
// درختان جنگل: ۱۵۰ درخت در نیمه‌ی غربی (x < 26)
// ---------------------------------------------------------------------------
export const TREES = (() => {
  const rand = mulberry32(20261121);
  const list = [];
  let guard = 0;

  while (list.length < 150 && guard < 4000) {
    guard += 1;
    const x = -95 + rand() * 121; // -95 .. 26
    const z = -95 + rand() * 190;

    if (Math.hypot(x, z) < CAMP_RADIUS + 4) continue; // کمپ باز بماند
    if (Math.hypot(x - VAN.x, z - VAN.z) < 6.5) continue;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 4) continue;
    if (isNearQuestSpot(x, z)) continue;
    if (list.some((t) => Math.hypot(t.x - x, t.z - z) < 3.4)) continue;

    // ۰ = opt/Pine ، ۱ = trees/Pine2 ، ۲ = trees/Pine
    const variantRoll = rand();

    list.push({
      x,
      z,
      scale: 0.8 + rand() * 0.7,
      rotation: rand() * Math.PI * 2,
      tint: rand(),
      variant: variantRoll > 0.72 ? 2 : variantRoll > 0.4 ? 1 : 0,
    });
  }
  return list;
})();

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
