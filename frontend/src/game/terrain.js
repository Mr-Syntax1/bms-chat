// ---------------------------------------------------------------------------
// terrain.js — منبع واحد حقیقت «شکل زمین»
//
// این فایل هیچ‌چیزی از sceneLayout یا کامپوننت‌ها import نمی‌کند تا چرخه ایجاد
// نشود. ثابت‌های مشترک (اندازه‌ی نقشه، شعاع کمپ، مرز ساحل و آب) اینجا تعریف
// می‌شوند و sceneLayout آن‌ها را دوباره export می‌کند.
//
// همه‌ی محاسبات قطعی (deterministic) و بدون تخصیص حافظه‌اند تا بشود در هر فریم
// برای بازیکن صدا زد.
// ---------------------------------------------------------------------------

// دنیای بزرگ‌تر (Phase 5): ۴ برابر مساحت قبلی — کمپ همان مرکز می‌ماند
export const MAP_SIZE = 400;
export const HALF_MAP = MAP_SIZE / 2;
export const CAMP_RADIUS = 15;
export const SAND_START_X = 32;
export const WATER_START_X = 74;

// سطح آب مشترک همه‌ی پهنه‌های آبی (دریا، برکه، رودخانه)
export const WATER_LEVEL = -1.15;

// دشت صاف مرکز کمپ و حلقه‌ی گذار به تپه‌ها
export const CAMP_FLAT_RADIUS = 13;
export const CAMP_BLEND_RADIUS = 26;

// صخره‌ی شمالی — دیواره‌ی تقریباً عمودی (۳ واحد افقی برای ۱۳ واحد ارتفاع)
export const CLIFF_START_Z = -52;
export const CLIFF_END_Z = -55.5;
const CLIFF_HEIGHT = 13.5;

// برکه‌ی مستقل در غرب (آب از رودخانه به آن می‌ریزد)
export const POND = { x: -62, z: -34, radius: 12, depth: 2.4 };

// آبشار: از دیواره سرازیر می‌شود و کمی جلوتر در حوضچه فرود می‌آید
export const WATERFALL = {
  x: -40,
  width: 3.6,
  wallZ: -55.5, // لبه‌ی بالایی دیواره
  baseZ: -48, // محل فرود
  bottomY: -1.15,
};
// حوضچه‌ی فرود — فقط جلوی دیواره کنده می‌شود (دیواره دست‌نخورده می‌ماند)
export const PLUNGE = { x: WATERFALL.x, z: WATERFALL.baseZ, radius: 6.5, depth: 1.8 };

// ساحل: بعد از این x سطح آب رندر می‌شود (زیر شن پنهان است تا خط ساحل طبیعی شود)
export const OCEAN_START_X = 60;

// ---------------------------------------------------------------------------
// کمکی‌ها (بدون تخصیص)
// ---------------------------------------------------------------------------
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

function smoothstep(a, b, v) {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// چند لایه سینوس/کسینوس با فرکانس‌های ناهماهنگ — بافت تپه‌ای نرم و ارزان
function fbm(x, z) {
  return (
    Math.sin(x * 0.031 + z * 0.019 + 1.7) * 0.55 +
    Math.sin(x * 0.072 - z * 0.058 - 0.9) * 0.28 +
    Math.sin((x + z) * 0.014 + 2.3) * 0.7 +
    Math.cos(x * 0.121 + z * 0.097) * 0.12
  );
}

// ---------------------------------------------------------------------------
// رودخانه: خط شکسته‌ی مرکزی از برکه به سمت غرب/جنوب
// ---------------------------------------------------------------------------
const RIVER_WIDTH = 6.4;

const RIVER_POINTS = [
  { x: PLUNGE.x, z: PLUNGE.z + 4 },
  { x: -48, z: -34 },
  { x: -56, z: -10 },
  { x: -64, z: 14 },
  { x: -74, z: 36 },
  { x: -88, z: 54 },
  { x: -102, z: 68 },
];

const RIVER_SEGMENTS = (() => {
  const segs = [];
  for (let i = 0; i < RIVER_POINTS.length - 1; i += 1) {
    const a = RIVER_POINTS[i];
    const b = RIVER_POINTS[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    segs.push({ ax: a.x, az: a.z, dx, dz, len2: dx * dx + dz * dz || 1 });
  }
  return segs;
})();

export const RIVER = { points: RIVER_POINTS, width: RIVER_WIDTH };

export function riverDistance(x, z) {
  let best = Infinity;
  for (let i = 0; i < RIVER_SEGMENTS.length; i += 1) {
    const s = RIVER_SEGMENTS[i];
    let t = ((x - s.ax) * s.dx + (z - s.az) * s.dz) / s.len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = s.ax + s.dx * t;
    const pz = s.az + s.dz * t;
    const dx = x - px;
    const dz = z - pz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < best) best = d;
  }
  return best;
}

export function pondDistance(x, z) {
  const dx = x - POND.x;
  const dz = z - POND.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function plungeDistance(x, z) {
  const dx = x - PLUNGE.x;
  const dz = z - PLUNGE.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// ---------------------------------------------------------------------------
// مسیرهای خاکی — خط شکسته‌ی مرکزی. زمین نزدیک مسیر کمی مسطح می‌شود و رنگ
// خاک می‌گیرد (decal از طریق vertex color، بدون مش جداگانه).
// ---------------------------------------------------------------------------
const PATH_WIDTH = 2.1;

const PATH_LINES = {
  // کمپ → آبشار
  waterfall: [
    { x: 6, z: 2 },
    { x: -6, z: -6 },
    { x: -18, z: -16 },
    { x: -30, z: -28 },
    { x: -38, z: -40 },
    { x: -40, z: -46 },
  ],
  // کمپ → فانوس دریایی (روی ساحل)
  lighthouse: [
    { x: 16, z: 6 },
    { x: 30, z: 10 },
    { x: 44, z: 18 },
    { x: 56, z: 28 },
    { x: 64, z: 36 },
  ],
  // کمپ → برکه (از رودخانه با پل عبور می‌کند)
  pond: [
    { x: -8, z: 0 },
    { x: -24, z: -8 },
    { x: -38, z: -16 },
    { x: -56, z: -26 },
    { x: -60, z: -30 },
  ],
  // کمپ → ساحل ماهیگیری رودخانه
  river: [
    { x: -8, z: 2 },
    { x: -20, z: 0 },
    { x: -32, z: -2 },
    { x: -44, z: -4 },
    { x: -54, z: -8 },
  ],
};

export const PATHS = PATH_LINES;

const PATH_SEGMENTS = (() => {
  const pad = PATH_WIDTH * 1.7;
  const segs = [];
  for (const pts of Object.values(PATH_LINES)) {
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      segs.push({
        ax: a.x,
        az: a.z,
        dx,
        dz,
        len2: dx * dx + dz * dz || 1,
        minX: Math.min(a.x, b.x) - pad,
        maxX: Math.max(a.x, b.x) + pad,
        minZ: Math.min(a.z, b.z) - pad,
        maxZ: Math.max(a.z, b.z) + pad,
      });
    }
  }
  return segs;
})();

// نزدیک‌ترین نقطه‌ی روی مسیر — بافر ماژول‌سطح، بدون تخصیص
const _path = { d: Infinity, x: 0, z: 0 };

function nearestPath(x, z) {
  let best = Infinity;
  let bx = 0;
  let bz = 0;
  for (let i = 0; i < PATH_SEGMENTS.length; i += 1) {
    const s = PATH_SEGMENTS[i];
    if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
    let t = ((x - s.ax) * s.dx + (z - s.az) * s.dz) / s.len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = s.ax + s.dx * t;
    const pz = s.az + s.dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) {
      best = d;
      bx = px;
      bz = pz;
    }
  }
  _path.d = best;
  _path.x = bx;
  _path.z = bz;
  return _path;
}

export function pathDistance(x, z) {
  return nearestPath(x, z).d;
}

// ۱ = روی مسیر، ۰ = بیرون از حاشیه‌ی مسیر
export function pathProximity(x, z) {
  const d = nearestPath(x, z).d;
  return 1 - smoothstep(PATH_WIDTH * 0.45, PATH_WIDTH * 1.6, d);
}

// ---------------------------------------------------------------------------
// ارتفاع زمین — خط لوله‌ی ثابت و قابل پیش‌بینی.
// ترتیب مهم است: هر مرحله‌ی آبی بعد از خشکی می‌آید تا کاسه‌اش حفظ شود.
//   ۱) تپه‌های نرم   ۲) دیواره‌ی صخره   ۳) شیب ساحل/بستر دریا
//   ۴) مسطح‌سازی کمپ   ۵) بستر رودخانه   ۶) برکه   ۷) حوضچه‌ی آبشار
// ---------------------------------------------------------------------------
function rawGroundHeight(x, z) {
  const r = Math.hypot(x, z);

  // ۱) تپه‌های نرم؛ دامنه با فاصله از کمپ زیاد می‌شود
  let h = fbm(x, z) * (0.35 + 2.1 * smoothstep(CAMP_BLEND_RADIUS, CAMP_BLEND_RADIUS + 48, r));

  // ۲) دیواره‌ی صخره‌ی شمالی — با یک «گردنه‌ی» قابل عبور در شمال‌شرق کمپ
  const cliffT = smoothstep(CLIFF_START_Z, CLIFF_END_Z, z);
  const passMask = 1 - 0.92 * (1 - smoothstep(6, 20, Math.abs(x - 34)));
  h += cliffT * cliffT * CLIFF_HEIGHT * passMask;

  // ۳) ساحل و بستر دریا
  h -= smoothstep(SAND_START_X, 68, x) * 0.75;
  h -= smoothstep(68, 92, x) * 3.2;

  // ۴) مسطح‌سازی کمپ — داخل شعاع تخت، بیرون دست‌نخورده
  h *= smoothstep(CAMP_FLAT_RADIUS, CAMP_BLEND_RADIUS, r);

  // ۵) بستر رودخانه
  const rd = riverDistance(x, z);
  if (rd < RIVER_WIDTH * 1.4) {
    const widthT = 1 - smoothstep(RIVER_WIDTH * 0.5, RIVER_WIDTH * 1.35, rd);
    const bank = smoothstep(RIVER_WIDTH * 0.6, RIVER_WIDTH * 0.22, rd);
    const bed = WATER_LEVEL - 0.12 - 0.85 * bank;
    h = lerp(h, bed, widthT * 0.95);
  }

  // ۶) برکه‌ی غربی — کاسه‌ی اجباری
  const pd = pondDistance(x, z);
  if (pd < POND.radius * 1.4) {
    const pondT = 1 - smoothstep(POND.radius * 0.5, POND.radius, pd);
    const bowl = 1 - clamp01(pd / POND.radius) ** 2;
    h = lerp(h, WATER_LEVEL - 0.22 - POND.depth * bowl, pondT);
  }

  // ۷) حوضچه‌ی فرود آبشار — فقط سمت جنوبِ دیواره کنده می‌شود تا صخره سالم بماند
  const pl = plungeDistance(x, z);
  if (pl < PLUNGE.radius * 1.5 && z > CLIFF_START_Z) {
    const wallMask = smoothstep(CLIFF_START_Z, CLIFF_START_Z + 5, z);
    const t = (1 - smoothstep(PLUNGE.radius * 0.45, PLUNGE.radius, pl)) * wallMask;
    const bowl = 1 - clamp01(pl / PLUNGE.radius) ** 2;
    h = lerp(h, WATER_LEVEL - 0.25 - PLUNGE.depth * bowl, t);
  }

  return h;
}

// ---------------------------------------------------------------------------
// ارتفاع نهایی = زمین خام + مسطح‌سازی ملایم روی مسیرهای خاکی.
// مسیرها فقط کمی صاف می‌شوند (نه کاملاً تخت) تا هنوز روی تپه بخوابند.
// ---------------------------------------------------------------------------
export function getGroundHeight(x, z) {
  const h = rawGroundHeight(x, z);
  const onPath = pathProximity(x, z);
  if (onPath <= 0) return h;
  // میانگین‌گیری با نمونه‌های کمی دورتر → شیب مسیر کمتر، لبه‌ها نرم
  const smooth =
    (h +
      rawGroundHeight(x + 1.2, z) +
      rawGroundHeight(x - 1.2, z) +
      rawGroundHeight(x, z + 1.2) +
      rawGroundHeight(x, z - 1.2)) *
    0.2;
  return h + (smooth - h) * onPath * 0.75;
}

// ---------------------------------------------------------------------------
// سکوهای قابل راه‌رفتن (اسکله + پل) — روی آب معلق‌اند و بازیکن رویشان می‌ایستد
// ---------------------------------------------------------------------------
export const DOCK_PLATFORM = {
  minX: 68,
  maxX: 88,
  minZ: -1.9,
  maxZ: 1.9,
  topY: WATER_LEVEL + 0.3,
};

// پل چوبی روی رودخانه — مستطیل چرخیده هم‌راستا با مسیر «pond».
// دهانه‌ی پل با پیمایش مسیر و پیدا کردن لبه‌های آب محاسبه می‌شود تا رندر و فیزیک
// همیشه با هم جور باشند (نه یک عدد جادویی دستی).
export const BRIDGE = (() => {
  const ax = -38;
  const az = -16;
  const bx = -56;
  const bz = -26;
  const len = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / len;
  const uz = (bz - az) / len;
  // نقطه‌ی شروع تقریبی تقاطع: نزدیک‌ترین نقطه‌ی مسیر به رودخانه
  const approxX = -51.5;
  const approxZ = -23.5;

  // لبه‌های «رودخانه» را در امتداد مسیر پیدا کن — فقط نوار رودخانه، نه برکه.
  const STEP = 0.25;
  const RANGE = 14;
  let bestD = 0;
  let bestDist = Infinity;
  for (let d = -RANGE; d <= RANGE; d += STEP) {
    const dist = riverDistance(approxX + ux * d, approxZ + uz * d);
    if (dist < bestDist) {
      bestDist = dist;
      bestD = d;
    }
  }
  // از نقطه‌ی تقاطع به دو طرف برو تا از نوار رودخانه بیرون بزنی
  const inRiver = (d) => riverDistance(approxX + ux * d, approxZ + uz * d) < RIVER_WIDTH * 0.62;
  let first = bestD;
  let last = bestD;
  while (first > -RANGE && inRiver(first - STEP)) first -= STEP;
  while (last < RANGE && inRiver(last + STEP)) last += STEP;

  // کمی حاشیه روی خشکی تا پا محکم بایستد
  const OVERHANG = 1.1;
  const start = first - OVERHANG;
  const end = last + OVERHANG;
  const halfLength = (end - start) * 0.5;
  const center = (first + last) * 0.5;
  const cx = approxX + ux * center;
  const cz = approxZ + uz * center;

  const bankA = getGroundHeight(cx + ux * start, cz + uz * start);
  const bankB = getGroundHeight(cx + ux * end, cz + uz * end);

  return {
    cx,
    cz,
    ux,
    uz,
    nx: -uz,
    nz: ux,
    halfLength,
    halfWidth: 1.55,
    angle: Math.atan2(ux, uz),
    topY: Math.max(bankA, bankB, WATER_LEVEL + 0.55) + 0.12,
    overhang: OVERHANG,
  };
})();

// سنگ‌های عبور از رودخانه — مسیر «river» را در نقطه‌ی کم‌عمق رد می‌کنند.
// هر سنگ یک سکوی دایره‌ای کوچک است تا بازیکن بی‌آنکه شنا کند از رودخانه بگذرد.
export const STEPPING_STONES = (() => {
  const centerX = -57.25;
  const centerZ = -6;
  // نرمالِ تقریبی رودخانه در این نقطه (از شیب خط مرکزی)
  const nx = -0.944;
  const nz = 0.33;
  const count = 10;
  const radius = 0.62;
  // فاصله‌ی کمتر از ۲×شعاع تا مسیر پیوسته بماند (سنگ‌ها کمی هم‌پوشانی دارند)
  const spacing = 1.02;
  const start = -(count - 1) * 0.5 * spacing;
  const stones = [];
  for (let i = 0; i < count; i += 1) {
    const d = start + i * spacing;
    stones.push({
      x: centerX + nx * d,
      z: centerZ + nz * d,
      radius,
      topY: WATER_LEVEL + 0.18,
    });
  }
  return stones;
})();

export function platformYAt(x, z) {
  if (
    x >= DOCK_PLATFORM.minX &&
    x <= DOCK_PLATFORM.maxX &&
    z >= DOCK_PLATFORM.minZ &&
    z <= DOCK_PLATFORM.maxZ
  ) {
    return DOCK_PLATFORM.topY;
  }
  // پل: انتقال به مختصات محلی مستطیل
  const rx = x - BRIDGE.cx;
  const rz = z - BRIDGE.cz;
  const along = rx * BRIDGE.ux + rz * BRIDGE.uz;
  const across = rx * BRIDGE.nx + rz * BRIDGE.nz;
  if (Math.abs(along) <= BRIDGE.halfLength && Math.abs(across) <= BRIDGE.halfWidth) {
    return BRIDGE.topY;
  }
  // سنگ‌های عبور از رودخانه: هر سنگ یک سکوی دایره‌ای کوچک است
  for (let i = 0; i < STEPPING_STONES.length; i += 1) {
    const s = STEPPING_STONES[i];
    if (Math.abs(x - s.x) > s.radius || Math.abs(z - s.z) > s.radius) continue;
    if (Math.hypot(x - s.x, z - s.z) <= s.radius) return s.topY;
  }
  return null;
}

// سطح ایستادن نهایی: یا سکوی مصنوعی، یا زمین
export function getWalkSurfaceY(x, z) {
  const plat = platformYAt(x, z);
  if (plat !== null) return plat;
  return getGroundHeight(x, z);
}

// بالای آبشار = لبه‌ی دیواره در همان x
export function getWaterfallTopY() {
  return getGroundHeight(WATERFALL.x, WATERFALL.wallZ - 0.5);
}

// نرمال زمین با اختلاف محدود (برای هم‌ترازی اشیا)
export function getGroundNormal(x, z, out = { x: 0, y: 1, z: 0 }) {
  const e = 0.6;
  const hL = getGroundHeight(x - e, z);
  const hR = getGroundHeight(x + e, z);
  const hD = getGroundHeight(x, z - e);
  const hU = getGroundHeight(x, z + e);
  let nx = hL - hR;
  let ny = 2 * e;
  let nz = hD - hU;
  const len = Math.hypot(nx, ny, nz) || 1;
  out.x = nx / len;
  out.y = ny / len;
  out.z = nz / len;
  return out;
}

// بافر مشترک نرمال — باید پیش از اولین استفاده تعریف شود
const _normalScratch = { x: 0, y: 1, z: 0 };

// شیب زمین: ۰ = کاملاً صاف، ۱ = عمودی
export function getGroundSlope(x, z) {
  const n = getGroundNormal(x, z, _normalScratch);
  return 1 - clamp01(n.y);
}

// ---------------------------------------------------------------------------
// آب
// ---------------------------------------------------------------------------
export function isInWater(x, z) {
  if (x > OCEAN_START_X) return true;
  if (pondDistance(x, z) < POND.radius) return true;
  if (plungeDistance(x, z) < PLUNGE.radius) return true;
  if (riverDistance(x, z) < RIVER_WIDTH * 0.72) return true;
  return false;
}

export function waterSurfaceAt() {
  return WATER_LEVEL;
}

// عمق آب در نقطه (۰ یا منفی = خشکی)
export function getWaterDepth(x, z) {
  if (platformYAt(x, z) !== null) return 0;
  if (!isInWater(x, z)) return 0;
  return WATER_LEVEL - getGroundHeight(x, z);
}

// ---------------------------------------------------------------------------
// رنگ زمین (برای vertex color) — خروجی: [r, g, b] در بازه‌ی ۰..۱
// ---------------------------------------------------------------------------
const COL = {
  grassA: [0.245, 0.4, 0.262],
  grassB: [0.35, 0.5, 0.325],
  grassDry: [0.46, 0.49, 0.31],
  soil: [0.39, 0.32, 0.235],
  sandLight: [0.855, 0.775, 0.585],
  sandDark: [0.735, 0.645, 0.47],
  wetSand: [0.52, 0.47, 0.36],
  rock: [0.41, 0.41, 0.42],
  rockDark: [0.29, 0.29, 0.305],
  moss: [0.3, 0.41, 0.265],
  silt: [0.235, 0.255, 0.22],
  dirtPath: [0.42, 0.335, 0.235],
  dirtPathDark: [0.315, 0.245, 0.175],
};

function mixInto(out, a, b, t) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
}

export function groundColorAt(x, z, h, out = [0, 0, 0]) {
  const n = getGroundNormal(x, z, _normalScratch);
  const slope = 1 - clamp01(n.y);
  const r = Math.hypot(x, z);

  // پایه: چمن با تنوع
  const variance = clamp01(fbm(x * 1.7, z * 1.7) * 0.5 + 0.5);
  mixInto(out, COL.grassA, COL.grassB, variance);
  if (variance > 0.72) mixInto(out, out, COL.grassDry, (variance - 0.72) * 2.2);

  // کمپ: خاک لگدمال‌شده
  const campT = 1 - smoothstep(CAMP_FLAT_RADIUS * 0.45, CAMP_RADIUS, r);
  if (campT > 0) mixInto(out, out, COL.soil, campT * 0.7);

  // مسیرهای خاکی
  const pathT = pathProximity(x, z);
  if (pathT > 0) {
    const dirt = [0, 0, 0];
    mixInto(dirt, COL.dirtPathDark, COL.dirtPath, clamp01(fbm(x * 4.2, z * 4.2) * 0.5 + 0.5));
    mixInto(out, out, dirt, pathT * 0.82);
  }

  // ساحل
  const sandT = smoothstep(SAND_START_X - 9, SAND_START_X + 3, x);
  if (sandT > 0) {
    const sandMix = (fbm(x * 2.3 + 40, z * 2.3) * 0.5 + 0.5);
    const sand = [0, 0, 0];
    mixInto(sand, COL.sandDark, COL.sandLight, sandMix);
    mixInto(out, out, sand, sandT);
    // شن خیس نزدیک آب
    const wet = 1 - smoothstep(WATER_LEVEL + 0.05, WATER_LEVEL + 0.95, h);
    if (wet > 0 && sandT > 0.5) mixInto(out, out, COL.wetSand, wet * 0.75);
  }

  // سنگ روی شیب‌های تند
  if (slope > 0.28) {
    const rockMix = smoothstep(0.28, 0.62, slope);
    const rock = [0, 0, 0];
    mixInto(rock, COL.rockDark, COL.rock, clamp01(fbm(x * 3.1, z * 3.1) * 0.5 + 0.5));
    mixInto(out, out, rock, rockMix);
  }

  // ارتفاعات بالا: سنگ + خزه
  if (h > 4.5) {
    const highT = smoothstep(4.5, 9.5, h);
    mixInto(out, out, COL.rock, highT * 0.7);
    mixInto(out, out, COL.moss, (1 - highT) * highT * 1.4);
  }

  // زیر آب: لای تیره
  if (h < WATER_LEVEL + 0.25) {
    const siltT = 1 - smoothstep(WATER_LEVEL - 0.9, WATER_LEVEL + 0.25, h);
    mixInto(out, out, COL.silt, siltT * 0.85);
  }

  return out;
}

// ---------------------------------------------------------------------------
// هم‌ترازی اشیا با زمین
// ---------------------------------------------------------------------------
export function groundYAt(x, z) {
  return getGroundHeight(x, z);
}

// آیا این نقطه جای مناسبی برای درخت/تزئین است؟ (نه در آب، نه شیب تند)
export function isPlantable(x, z, maxSlope = 0.42) {
  const h = getGroundHeight(x, z);
  if (h < WATER_LEVEL + 0.55) return false;
  return getGroundSlope(x, z) < maxSlope;
}

export { lerp as lerpTerrain, clamp as clampTerrain, smoothstep as smoothstepTerrain };
