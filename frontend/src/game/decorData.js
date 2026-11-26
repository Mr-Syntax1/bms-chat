// ---------------------------------------------------------------------------
// decorData.js — سیستم دکوراسیون کمپ (Phase 3f)
//
//  • داده‌محور: افزودن آیتم = یک ورودی در DECOR_CATALOG (فقط مدل‌های موجود).
//  • وضعیت «پیش‌نمایش» (ghost) بیرون React در decorWorld نگه داشته می‌شود؛
//    هیچ setStateای در حرکت موس رخ نمی‌دهد.
//  • ذخیره‌سازی در localStorage به‌ازای هر roomId + همگام‌سازی با Ably
//    (place-decor / move-decor / remove-decor / decor-sync).
// ---------------------------------------------------------------------------
import { getGroundHeight, getGroundSlope, isInWater, WATER_LEVEL } from './terrain';
import { getNearbyTrees } from './activeTrees';
import { VAN, FIRE_KEEPOUT } from './sceneLayout';

export const DECOR_LIMIT = 15;
export const DECOR_COOLDOWN = 1000;
export const DECOR_BOUNDS_RADIUS = 26;
export const DECOR_MAX_TOTAL = 120;

export const DECOR_CATEGORIES = [
  { id: 'tents', label: 'چادرها' },
  { id: 'light', label: 'روشنایی' },
  { id: 'furniture', label: 'لوازم' },
  { id: 'decor', label: 'تزئینات' },
  { id: 'sign', label: 'نشانه' },
];

// height = ارتفاع نهایی مدل پس از نرمال‌سازی (Fitted-style)
// radius = شعاع برخورد/جای‌گذاری برای جلوگیری از تداخل
export const DECOR_CATALOG = [
  // چادرها
  { id: 'tent', name: 'چادر', icon: 'tent', category: 'tents', modelKey: 'structures.tent', height: 2.0, radius: 1.4, sound: 'tent' },
  { id: 'tent2', name: 'چادر بزرگ', icon: 'tent', category: 'tents', modelKey: 'structures.tent2', height: 2.4, radius: 1.5, sound: 'tent' },
  { id: 'tent3', name: 'چادر کوهی', icon: 'tent', category: 'tents', modelKey: 'structures.tent3', height: 2.6, radius: 1.5, sound: 'tent' },
  // روشنایی
  { id: 'lantern', name: 'فانوس', icon: 'lantern', category: 'light', modelKey: 'structures.lantern', height: 0.9, radius: 0.35, light: true },
  { id: 'postLantern', name: 'فانوس پایه‌دار', icon: 'lantern', category: 'light', modelKey: 'structures.postLantern', height: 1.9, radius: 0.4, light: true },
  { id: 'stringLights', name: 'ریسه‌ی نور', icon: 'firefly', category: 'light', modelKey: 'comfort.stringLights', height: 1.6, radius: 0.6, light: true },
  // لوازم
  { id: 'picnicTable', name: 'میز پیک‌نیک', icon: 'table', category: 'furniture', modelKey: 'structures.picnicTable', height: 1.0, radius: 1.2 },
  { id: 'picnicTable2', name: 'میز چوبی', icon: 'table', category: 'furniture', modelKey: 'structures.picnicTable2', height: 0.95, radius: 1.2 },
  { id: 'backpack', name: 'کوله', icon: 'backpack', category: 'furniture', modelKey: 'structures.backpack', height: 0.7, radius: 0.4 },
  { id: 'bedroll', name: 'کیسه‌خواب', icon: 'bedroll', category: 'furniture', modelKey: 'comfort.bedroll', height: 0.22, radius: 0.8 },
  { id: 'hammock', name: 'هامک', icon: 'hammock', category: 'furniture', modelKey: 'comfort.hammock', height: 1.1, radius: 1.2 },
  { id: 'icebox', name: 'یخ‌دان', icon: 'cooler', category: 'furniture', modelKey: 'comfort.icebox', height: 0.7, radius: 0.5 },
  { id: 'thermos', name: 'فلاسک', icon: 'thermos', category: 'furniture', modelKey: 'comfort.thermos', height: 0.35, radius: 0.2 },
  { id: 'mug', name: 'لیوان', icon: 'mug', category: 'furniture', modelKey: 'comfort.mug', height: 0.16, radius: 0.15 },
  // تزئینات
  { id: 'rug', name: 'فرش', icon: 'rug', category: 'decor', modelKey: 'comfort.rug', height: 0.07, radius: 1.2 },
  { id: 'flag', name: 'پرچم', icon: 'flag', category: 'decor', modelKey: 'comfort.flag', height: 1.7, radius: 0.4 },
  { id: 'umbrella', name: 'چتر ساحلی', icon: 'umbrella', category: 'decor', modelKey: 'beach.umbrella', height: 2.2, radius: 1.0 },
  { id: 'flowers', name: 'گل‌ها', icon: 'flower', category: 'decor', modelKey: 'undergrowth.flowers', height: 0.45, radius: 0.45 },
  { id: 'mushrooms', name: 'قارچ‌ها', icon: 'mushroom', category: 'decor', modelKey: 'undergrowth.mushrooms', height: 0.3, radius: 0.35 },
  { id: 'rocks', name: 'سنگ', icon: 'rocks', category: 'decor', modelKey: 'rocks.rocks', height: 0.45, radius: 0.6 },
  { id: 'choppedLog', name: 'کنده‌چوب', icon: 'log', category: 'decor', modelKey: 'rocks.choppedLog', height: 0.55, radius: 0.7 },
  { id: 'bonfire', name: 'آتشدان', icon: 'flame', category: 'decor', modelKey: 'structures.bonfire', height: 0.8, radius: 1.0 },
  // نشانه
  { id: 'woodenSign', name: 'تخته‌ی چوبی', icon: 'sign', category: 'sign', modelKey: 'structures.sign', height: 1.5, radius: 0.4 },
  // پاداش کوئست‌های NPC (Phase 4) — تا تحویل مأموریت قفل‌اند
  { id: 'adventurer-quest', name: 'سنگ بلوط طلایی', icon: 'acorn', category: 'decor', modelKey: 'rocks.rocks', height: 0.5, radius: 0.6, unlock: 'adventurer-quest' },
  { id: 'gnome-quest', name: 'سنگ گنوم جنگل', icon: 'rocks', category: 'decor', modelKey: 'rocks.rocks2', height: 0.55, radius: 0.65, unlock: 'gnome-quest' },
];

export const DECOR_BY_ID = Object.fromEntries(DECOR_CATALOG.map((item) => [item.id, item]));

// ---------------------------------------------------------------------------
// وضعیت زنده‌ی پیش‌نمایش — بیرون React
// ---------------------------------------------------------------------------
export const decorWorld = {
  mode: false,
  rotation: 0,
  scale: 1,
  // ghost در هر pointermove آپدیت می‌شود
  ghost: { x: 0, y: 0, z: 0, visible: false, valid: false },
};

export function resetGhost() {
  decorWorld.ghost.visible = false;
  decorWorld.ghost.valid = false;
}

// ---------------------------------------------------------------------------
// برخورد و اعتبار مکان
// ---------------------------------------------------------------------------
const treeBuf = [];
const MAX_SLOPE = 0.55;

/**
 * آیا می‌توان آیتم را در این نقطه گذاشت؟
 * @returns {{ok: boolean, reason?: string}}
 */
export function canPlaceDecor(item, x, z, decorations, ownerId, movingUid = null) {
  if (!item) return { ok: false, reason: 'آیتمی انتخاب نشده' };

  const distFromFire = Math.hypot(x, z);
  if (distFromFire > DECOR_BOUNDS_RADIUS) return { ok: false, reason: 'بیرون از محدوده‌ی کمپ' };
  if (distFromFire < FIRE_KEEPOUT + item.radius * 0.6) {
    return { ok: false, reason: 'خیلی نزدیک آتش است' };
  }
  if (isInWater(x, z)) return { ok: false, reason: 'روی آب نمی‌شود' };
  if (getGroundHeight(x, z) < WATER_LEVEL + 0.25) return { ok: false, reason: 'سطح آب است' };
  if (getGroundSlope(x, z) > MAX_SLOPE) return { ok: false, reason: 'شیب تند است' };

  // ون
  if (Math.hypot(x - VAN.x, z - VAN.z) < 3.2 + item.radius) {
    return { ok: false, reason: 'روی ون است' };
  }

  // درختان (فقط سلول‌های اطراف — گرید فضایی)
  const trees = getNearbyTrees(x, z, treeBuf);
  for (let i = 0; i < trees.length; i += 1) {
    const tree = trees[i];
    const trunk = tree.collision ?? tree.scale * 0.5;
    if (Math.hypot(trees[i].x - x, trees[i].z - z) < trunk + item.radius) {
      return { ok: false, reason: 'روی تنه‌ی درخت است' };
    }
  }

  // تزئینات دیگر
  for (let i = 0; i < decorations.length; i += 1) {
    const other = decorations[i];
    if (movingUid && other.uid === movingUid) continue;
    const meta = DECOR_BY_ID[other.id];
    const otherRadius = meta?.radius ?? 0.4;
    if (Math.hypot(other.x - x, other.z - z) < otherRadius + item.radius) {
      return { ok: false, reason: 'با آیتم دیگری تداخل دارد' };
    }
  }

  // سقف هر بازیکن
  if (!movingUid) {
    let own = 0;
    for (let i = 0; i < decorations.length; i += 1) {
      if (String(decorations[i].ownerId) === String(ownerId)) own += 1;
    }
    if (own >= DECOR_LIMIT) return { ok: false, reason: `سقف ${DECOR_LIMIT} آیتم پر است` };
  }

  return { ok: true };
}

export function countOwnedDecor(decorations, ownerId) {
  let count = 0;
  for (let i = 0; i < decorations.length; i += 1) {
    if (String(decorations[i].ownerId) === String(ownerId)) count += 1;
  }
  return count;
}

// نزدیک‌ترین آیتمِ متعلق به همین بازیکن (برای برداشتن/حذف)
export function findOwnedDecorAt(decorations, ownerId, x, z, radius = 2.2) {
  let best = null;
  let bestDist = radius;
  for (let i = 0; i < decorations.length; i += 1) {
    const entry = decorations[i];
    if (String(entry.ownerId) !== String(ownerId)) continue;
    const d = Math.hypot(entry.x - x, entry.z - z);
    if (d < bestDist) {
      bestDist = d;
      best = entry;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// تلاقی پرتو با زمین ناهموار — مارش + بایسکشن (بدون نیاز به مش زمین)
// ---------------------------------------------------------------------------
const _hit = { x: 0, y: 0, z: 0 };

export function raycastTerrain(origin, direction, maxDistance = 120) {
  const STEP = 1.1;
  let prevT = 0;
  let t = STEP;
  let prevAbove = origin.y - getGroundHeight(origin.x, origin.z);

  while (t <= maxDistance) {
    const x = origin.x + direction.x * t;
    const y = origin.y + direction.y * t;
    const z = origin.z + direction.z * t;
    const above = y - getGroundHeight(x, z);

    if (above <= 0 && prevAbove > 0) {
      // بایسکشن برای دقت
      let lo = prevT;
      let hi = t;
      for (let i = 0; i < 8; i += 1) {
        const mid = (lo + hi) * 0.5;
        const mx = origin.x + direction.x * mid;
        const my = origin.y + direction.y * mid;
        const mz = origin.z + direction.z * mid;
        if (my - getGroundHeight(mx, mz) > 0) lo = mid;
        else hi = mid;
      }
      const ft = (lo + hi) * 0.5;
      _hit.x = origin.x + direction.x * ft;
      _hit.y = origin.y + direction.y * ft;
      _hit.z = origin.z + direction.z * ft;
      return _hit;
    }

    prevAbove = above;
    prevT = t;
    t += STEP;
  }
  return null;
}

// ---------------------------------------------------------------------------
// ذخیره‌سازی (localStorage به‌ازای هر roomId)
// ---------------------------------------------------------------------------
const STORAGE_PREFIX = 'camp-decor-';
const MAX_SAVED = 120;

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.uid !== 'string' || entry.uid.length < 3 || entry.uid.length > 64) return null;
  if (!DECOR_BY_ID[entry.id]) return null;
  if (!Number.isFinite(entry.x) || !Number.isFinite(entry.z)) return null;
  const rotation = Number.isFinite(entry.rotation) ? entry.rotation : 0;
  const scale = Number.isFinite(entry.scale) ? Math.min(1.6, Math.max(0.6, entry.scale)) : 1;
  return {
    uid: entry.uid,
    id: entry.id,
    x: Math.round(entry.x * 100) / 100,
    z: Math.round(entry.z * 100) / 100,
    rotation,
    scale,
    ownerId: entry.ownerId != null ? String(entry.ownerId) : 'local',
  };
}

export function sanitizeDecorList(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < list.length && out.length < MAX_SAVED; i += 1) {
    const entry = sanitizeEntry(list[i]);
    if (!entry || seen.has(entry.uid)) continue;
    seen.add(entry.uid);
    out.push(entry);
  }
  return out;
}

export function loadDecor(roomId) {
  if (!roomId || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + roomId);
    if (!raw) return [];
    return sanitizeDecorList(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveDecor(roomId, list) {
  if (!roomId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify(sanitizeDecorList(list).slice(-MAX_SAVED)));
  } catch {
    /* ignore */
  }
}

export function newDecorUid() {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
