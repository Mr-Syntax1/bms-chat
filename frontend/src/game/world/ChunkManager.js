// ---------------------------------------------------------------------------
// world/ChunkManager.js — استریمینگ چانک‌ها (Phase 5)
//
//  • دنیا به چانک‌های ۳۲×۳۲ تقسیم می‌شود. هر ۰.۵ ثانیه موقعیت بازیکن خوانده
//    می‌شود و مجموعه‌ی چانک‌های فعال (شعاع از preset) بازسازی می‌شود.
//  • محتوا قطعی است (seed ثابت) → همه‌ی کلاینت‌ها چانک یکسان دارند؛ فقط
//    «کدام چانک رندر شود» به بازیکن بستگی دارد.
//  • خروجی یک «امضای» سبک است؛ فقط وقتی مجموعه‌ی چانک‌ها عوض شود، رندر
//    دوباره ساخته می‌شود (نه هر فریم).
// ---------------------------------------------------------------------------
import { getChunkTrees, getChunkFlora, worldToChunk, chunkKey } from './chunkGen';

const EMPTY_GROUPS = { near: [], far: [] };
const EMPTY_FLORA = { grass: [], flowers: [], rocks: [], mushrooms: [] };

// فاصله‌ی LOD درختان پیش‌فرض (واحد) — از preset هم قابل تنظیم است
const DEFAULT_LOD = 46;

export const chunkState = {
  signature: '',
  radius: 0,
  center: { cx: 0, cz: 0 },
  loaded: 0,
};

// آمار سبک برای پنل دیباگ (خارج از React، بدون state)
export const chunkStats = { chunks: 0, trees: 0, flora: 0 };

function buildForRadius(px, pz, radius, density, grassMul, lodDistance) {
  const { cx, cz } = worldToChunk(px, pz);
  const near = [];
  const far = [];
  const flora = { grass: [], flowers: [], rocks: [], mushrooms: [] };
  let loaded = 0;

  const lod = lodDistance || DEFAULT_LOD;
  const nearR2 = lod * lod;

  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const ccx = cx + dx;
      const ccz = cz + dz;
      const trees = getChunkTrees(ccx, ccz, density);
      if (trees.length) {
        loaded += 1;
        for (let i = 0; i < trees.length; i += 1) {
          const t = trees[i];
          const ddx = t.x - px;
          const ddz = t.z - pz;
          if (ddx * ddx + ddz * ddz <= nearR2) near.push(t);
          else far.push(t);
        }
      }

      const f = getChunkFlora(ccx, ccz, grassMul);
      for (let i = 0; i < f.grass.length; i += 1) flora.grass.push(f.grass[i]);
      for (let i = 0; i < f.flowers.length; i += 1) flora.flowers.push(f.flowers[i]);
      for (let i = 0; i < f.rocks.length; i += 1) flora.rocks.push(f.rocks[i]);
      for (let i = 0; i < f.mushrooms.length; i += 1) flora.mushrooms.push(f.mushrooms[i]);
    }
  }

  return { groups: { near, far }, flora, loaded, center: { cx, cz } };
}

/**
 * بر اساس موقعیت بازیکن و شعاع چانک، مجموعه‌ی فعال را برمی‌گرداند.
 * اگر مجموعه تغییر نکند، همان آبجکت قبلی برگردانده می‌شود (بدون alloc).
 * @param {number} px
 * @param {number} pz
 * @param {number} radius  شعاع چانک (۲..۶)
 * @param {number} density سقف تعداد درخت (از preset)
 * @param {number} grassMul ضریب چگالی چمن (از preset)
 * @param {number} lodDistance فاصله‌ی LOD درخت (از preset)
 */
export function computeChunkSet(px, pz, radius, density = 2600, grassMul = 1, lodDistance = DEFAULT_LOD) {
  const { cx, cz } = worldToChunk(px, pz);
  const signature = `${cx},${cz},${radius},${density},${grassMul},${lodDistance}`;
  if (signature === chunkState.signature) return null;

  chunkState.signature = signature;
  chunkState.radius = radius;
  chunkState.center = { cx, cz };

  const { groups, flora, loaded } = buildForRadius(px, pz, radius, density, grassMul, lodDistance);
  chunkState.loaded = loaded;
  chunkStats.chunks = loaded;
  chunkStats.trees = (groups.near?.length || 0) + (groups.far?.length || 0);
  chunkStats.flora =
    (flora.grass?.length || 0) +
    (flora.flowers?.length || 0) +
    (flora.rocks?.length || 0) +
    (flora.mushrooms?.length || 0);
  return { groups, flora, signature };
}

export function resetChunkState() {
  chunkState.signature = '';
  chunkState.loaded = 0;
  chunkStats.chunks = 0;
  chunkStats.trees = 0;
  chunkStats.flora = 0;
}

export { EMPTY_GROUPS, EMPTY_FLORA, chunkKey };
