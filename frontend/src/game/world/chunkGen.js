// ---------------------------------------------------------------------------
// world/chunkGen.js — تولید قطعی محتوای فلور (Phase 5)
//
//  • همه‌ی کلاینت‌ها با seed یکسان، محتوای یکسان می‌بینند؛ فقط «کدام چانک
//    فلور رندر شود» به موقعیت هر بازیکن بستگی دارد.
//  • درختان استریم نمی‌شوند (StreamedWorld کل جنگل را یک‌بار می‌سازد)؛ این
//    فایل فقط فلور ریز (چمن/گل/سنگ/قارچ) را تولید و کش می‌کند.
// ---------------------------------------------------------------------------
import {
  getGroundHeight,
  getGroundSlope,
  isInWater,
  pathDistance,
  WATER_LEVEL,
  CAMP_RADIUS,
  SAND_START_X,
} from '../terrain';

export const CHUNK_SIZE = 32;

export const chunkKey = (cx, cz) => `${cx},${cz}`;

export const worldToChunk = (x, z) => ({
  cx: Math.floor(x / CHUNK_SIZE),
  cz: Math.floor(z / CHUNK_SIZE),
});

export const chunkCenter = (cx, cz) => ({
  x: cx * CHUNK_SIZE + CHUNK_SIZE * 0.5,
  z: cz * CHUNK_SIZE + CHUNK_SIZE * 0.5,
});

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// seed قطعی از مختصات چانک — مستقل از ترتیب/زمان
function chunkSeed(cx, cz) {
  let h = 0x9e3779b9 ^ (cx * 0x85ebca6b) ^ (cz * 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x27d4eb2d);
  h ^= h >>> 15;
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// فلور رویه‌ای هر چانک (چمن/گل/سنگ/قارچ تزئینی)
// ---------------------------------------------------------------------------
const floraCache = new Map();
const FLORA_CACHE_LIMIT = 700;

function plantable(x, z) {
  if (isInWater(x, z)) return false;
  if (x > SAND_START_X - 2) return false;
  if (Math.hypot(x, z) < CAMP_RADIUS - 2) return false;
  if (getGroundHeight(x, z) < WATER_LEVEL + 0.4) return false;
  if (pathDistance(x, z) < 1.6) return false;
  return getGroundSlope(x, z) < 0.42;
}

/**
 * محتوای فلور یک چانک — فقط یک‌بار محاسبه و کش می‌شود.
 * @param {number} grassMul  ضریب چگالی چمن (از preset)
 * @returns {{grass:Array, flowers:Array, rocks:Array, mushrooms:Array}}
 */
export function getChunkFlora(cx, cz, grassMul = 1) {
  const densityTier = grassMul < 0.5 ? 0 : grassMul < 0.8 ? 1 : 2;
  const key = `${chunkKey(cx, cz)}|${densityTier}`;
  const cached = floraCache.get(key);
  if (cached) return cached;

  const rand = mulberry32(chunkSeed(cx, cz) ^ 0x5bd1e995);
  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;
  const grass = [];
  const flowers = [];
  const rocks = [];
  const mushrooms = [];

  const tryPlace = (arr, count, tries, minGap, jitter) => {
    let placed = 0;
    for (let t = 0; t < tries && placed < count; t += 1) {
      const x = baseX + rand() * CHUNK_SIZE;
      const z = baseZ + rand() * CHUNK_SIZE;
      if (!plantable(x, z)) continue;
      let ok = true;
      for (let i = 0; i < arr.length; i += 1) {
        if (Math.abs(arr[i].x - x) < minGap && Math.abs(arr[i].z - z) < minGap) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      arr.push({
        x,
        z,
        scale: 0.7 + rand() * jitter,
        rotation: rand() * Math.PI * 2,
        tint: rand(),
      });
      placed += 1;
    }
  };

  const grassCount = densityTier === 0 ? 0 : densityTier === 1 ? 28 : 46;
  tryPlace(grass, grassCount, grassCount * 3, 1.1, 0.9);
  tryPlace(flowers, 7, 60, 1.8, 0.6);
  tryPlace(rocks, 4, 40, 2.6, 0.8);
  tryPlace(mushrooms, 5, 60, 1.6, 0.7);

  const data = { grass, flowers, rocks, mushrooms };

  if (floraCache.size > FLORA_CACHE_LIMIT) floraCache.clear();
  floraCache.set(key, data);
  return data;
}
