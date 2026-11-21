// چیدمان ثابت (deterministic) کمپ؛ همه‌ی کلاینت‌ها محیط یکسان می‌بینند
export const CAMP_RADIUS = 15; // شعاع دایره‌ی باز و دنج مرکزی (بدون درخت)
export const WALK_RADIUS = 54; // تا این شعاع بازیکن می‌تواند به داخل جنگل برود
export const GROUND_RADIUS = 62; // شعاع زمین چمن
export const FIRE_KEEPOUT = 1.9; // فاصله‌ی ممنوعه از آتش
export const SPAWN = { x: 0, z: 10.5 };
export const VAN = { x: -11.5, z: -7.2, rotation: 0.62 };
export const SEAT_COUNT = 6;

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
// مسیرها: چهار راهروی باز بین درختان تا بازیکن بتواند وارد جنگل شود
// ---------------------------------------------------------------------------
export const PATHS = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle) => ({
  angle,
  halfWidth: 0.16, // رادیان
}));

// آیا این زاویه داخل یکی از مسیرها است؟
export function isOnPath(angle) {
  for (const path of PATHS) {
    let diff = Math.abs(((angle - path.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (diff < path.halfWidth) return true;
  }
  return false;
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
// درختان: حلقه‌های متراکم از شعاع CAMP_RADIUS تا WALK_RADIUS + 8
// حلقه‌ی اول بسیار نزدیک به کمپ است تا حس «محاصره در جنگل» ایجاد شود
// ---------------------------------------------------------------------------
export const TREES = (() => {
  const rand = mulberry32(20261121);
  const list = [];

  const rings = [
    { radius: 15.8, count: 46, spread: 1.1, scale: [1.05, 1.4] },
    { radius: 19.5, count: 56, spread: 1.9, scale: [1.0, 1.45] },
    { radius: 24, count: 62, spread: 2.6, scale: [0.95, 1.45] },
    { radius: 30, count: 66, spread: 3.2, scale: [0.9, 1.5] },
    { radius: 37, count: 68, spread: 3.8, scale: [0.85, 1.4] },
    { radius: 45, count: 60, spread: 4.2, scale: [0.8, 1.3] },
    { radius: 54, count: 52, spread: 4.6, scale: [0.75, 1.2] },
  ];

  for (const ring of rings) {
    for (let i = 0; i < ring.count; i += 1) {
      const baseAngle = (i / ring.count) * Math.PI * 2;
      const angle = baseAngle + (rand() - 0.5) * 0.13;
      if (isOnPath(angle)) continue; // راهروها باز می‌مانند

      const radius = ring.radius + (rand() - 0.5) * ring.spread;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // ون و نقطه‌ی اسپاون را خالی نگه دار
      if (Math.hypot(x - VAN.x, z - VAN.z) < 6.5) continue;
      if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 4) continue;

      const [minS, maxS] = ring.scale;
      list.push({
        x,
        z,
        scale: minS + rand() * (maxS - minS),
        rotation: rand() * Math.PI * 2,
        tint: rand(),
      });
    }
  }
  return list;
})();

// ---------------------------------------------------------------------------
// تزئینات پراکنده در جنگل (چادر، سنگ، کنده‌ی قارچ‌دار، کنده‌ی تبر)
// ---------------------------------------------------------------------------
export const DECORATIONS = (() => {
  const rand = mulberry32(777001);
  const items = [];

  const place = (type, count, minR, maxR, scaleRange, yawRange = [0, Math.PI * 2]) => {
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
        (isOnPath(Math.atan2(z, x)) ||
          Math.hypot(x - VAN.x, z - VAN.z) < 4.2 ||
          Math.hypot(x, z) < FIRE_KEEPOUT + 1.6 ||
          items.some((it) => Math.hypot(it.x - x, it.z - z) < 2.2))
      );

      const [minS, maxS] = scaleRange;
      items.push({
        type,
        x,
        z,
        scale: minS + rand() * (maxS - minS),
        rotation: yawRange[0] + rand() * (yawRange[1] - yawRange[0]),
      });
    }
  };

  // داخل کمپ: حس دنج و زندگی (نزدیک آتش و ون)
  place('logFungus', 5, 6.5, 13, [1.1, 1.6]);
  place('rocks', 6, 7, 13.5, [0.8, 1.3]);
  place('tent', 2, 9, 13.5, [1.0, 1.25]);
  place('logAxe', 3, 7.5, 13, [1.0, 1.4]);

  // لابه‌لای درختان
  place('tent', 4, 19, 40, [0.95, 1.25]);
  place('rocks', 12, 17, 46, [0.7, 1.4]);
  place('logFungus', 8, 18, 44, [0.9, 1.5]);
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
