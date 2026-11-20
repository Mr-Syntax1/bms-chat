// چیدمان ثابت (deterministic) صحنه‌ی کمپ؛ همه‌ی کلاینت‌ها یک محیط یکسان می‌بینند
export const CAMP_RADIUS = 20;
export const FIRE_KEEPOUT = 1.8;
export const SPAWN = { x: 0, z: 8.5 };
export const VAN = { x: -10.5, z: -6.5, rotation: 0.62 };
export const SEAT_COUNT = 5;

// تولید عدد شبه‌تصادفی با seed ثابت → درخت‌ها در همه‌ی کلاینت‌ها هم‌مکان‌اند
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// جای نشستن‌ها: روی کنده‌های دور آتش، بازیکن رو به مرکز
export const SEAT_RADIUS = 3.78;
export const SEAT_HEIGHT = 0.42;

export const SEAT_SPOTS = Array.from({ length: SEAT_COUNT }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI * 2) / SEAT_COUNT;
  return {
    x: Math.cos(angle) * SEAT_RADIUS,
    z: Math.sin(angle) * SEAT_RADIUS,
    rotation: Math.atan2(-Math.cos(angle), -Math.sin(angle)),
  };
});

// درخت‌های Low-poly با InstancedMesh رندر می‌شوند
export const TREES = (() => {
  const rand = mulberry32(20261121);
  const list = [];
  for (let i = 0; i < 46; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = 9 + Math.pow(rand(), 0.55) * 21;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.hypot(x - VAN.x, z - VAN.z) < 5.2) continue;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 3.2) continue;
    list.push({
      x,
      z,
      scale: 0.8 + rand() * 0.85,
      rotation: rand() * Math.PI * 2,
      tint: rand(),
    });
  }
  return list;
})();

// سنگ‌های تزئینی اطراف آتش
export const FIRE_STONES = (() => {
  const rand = mulberry32(1337);
  return Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2 + rand() * 0.2;
    const radius = FIRE_KEEPOUT - 0.15;
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      scale: 0.24 + rand() * 0.14,
      rotation: rand() * Math.PI,
    };
  });
})();

// هاله‌ی نوری ثابت روی زمین (برای گرمای بصری آتش)
export const EMBER_COLORS = ['#ff8a3d', '#ff5f2e', '#ffc46b'];
