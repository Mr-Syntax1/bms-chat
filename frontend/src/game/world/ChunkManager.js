// ---------------------------------------------------------------------------
// world/ChunkManager.js — استریمینگ چانک‌ها (Phase 5 + پاس کارایی ۵.۱)
//
//  • دنیا به چانک‌های ۳۲×۳۲ تقسیم می‌شود. هر ۰.۵ ثانیه موقعیت بازیکن خوانده
//    می‌شود و مجموعه‌ی چانک‌های فعال (شعاع از preset) بازسازی می‌شود.
//  • محتوا قطعی است (seed ثابت) → همه‌ی کلاینت‌ها چانک یکسان دارند؛ فقط
//    «کدام چانک رندر شود» به بازیکن بستگی دارد.
//  • خروجی یک «امضای» سبک است؛ فقط وقتی مجموعه‌ی چانک‌ها عوض شود، رندر
//    دوباره ساخته می‌شود (نه هر فریم).
//  • LOD سه‌پله‌ای درختان: ۰..۴۰ نزدیک، ۴۰..۸۰ میانی، ۸۰..۱۲۰ دور.
//    درختانِ دورتر از ۱۲۰ واحد حذف می‌شوند — نه چانک‌های نزدیک.
// ---------------------------------------------------------------------------
import { getChunkTrees, getChunkFlora, worldToChunk, chunkKey } from './chunkGen';

const EMPTY_GROUPS = { near: [], far: [], far2: [] };
const EMPTY_FLORA = { grass: [], flowers: [], rocks: [], mushrooms: [] };

// مرزهای LOD درختان (واحد) — طبق مشخصات کارایی: ۴۰ / ۸۰ / ۱۲۰
export const TREE_LOD_NEAR = 40;
export const TREE_LOD_MID = 80;
export const TREE_LOD_FAR = 120;

// فلور (چمن/گل/سنگ/قارچ) فقط تا این فاصله رندر می‌شود. شعاع چانک عمداً
// بزرگ‌تر است تا درخت‌ها ناپدید نشوند، ولی فلورِ ریزِ دور هزینه‌ی بی‌فایده است.
export const FLORA_RADIUS = 90;

// فاصله‌ی حذف چانک — خیلی بزرگ‌تر از شعاع رندر تا با جابه‌جایی بازیکن
// درخت‌ها ناگهان ناپدید نشوند (hysteresis).
export const CHUNK_UNLOAD_DISTANCE = 160;

export const chunkState = {
  signature: '',
  radius: 0,
  center: { cx: 0, cz: 0 },
  loaded: 0,
};

// آمار سبک برای پنل دیباگ (خارج از React، بدون state)
export const chunkStats = { chunks: 0, trees: 0, flora: 0, lod0: 0, lod1: 0, lod2: 0 };

function buildForRadius(px, pz, radius, density, grassMul) {
  const { cx, cz } = worldToChunk(px, pz);
  const near = [];
  const far = [];
  const far2 = [];
  const flora = { grass: [], flowers: [], rocks: [], mushrooms: [] };
  let loaded = 0;

  const nearR2 = TREE_LOD_NEAR * TREE_LOD_NEAR;
  const midR2 = TREE_LOD_MID * TREE_LOD_MID;
  const farR2 = TREE_LOD_FAR * TREE_LOD_FAR;
  const floraR2 = FLORA_RADIUS * FLORA_RADIUS;
  const unloadR2 = CHUNK_UNLOAD_DISTANCE * CHUNK_UNLOAD_DISTANCE;

  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const ccx = cx + dx;
      const ccz = cz + dz;
      // چانک‌های دورتر از فاصله‌ی unload اصلاً ساخته نمی‌شوند (۱۵۰+ واحد)
      const cdx = ccx * 32 + 16 - px;
      const cdz = ccz * 32 + 16 - pz;
      if (cdx * cdx + cdz * cdz > unloadR2) continue;
      const trees = getChunkTrees(ccx, ccz, density);
      if (trees.length) {
        loaded += 1;
        for (let i = 0; i < trees.length; i += 1) {
          const t = trees[i];
          const ddx = t.x - px;
          const ddz = t.z - pz;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 > farR2) continue; // دورتر از ۱۲۰ → اصلاً رندر نشود
          if (d2 <= nearR2) near.push(t);
          else if (d2 <= midR2) far.push(t);
          else far2.push(t);
        }
      }

      const f = getChunkFlora(ccx, ccz, grassMul);
      // فلور فقط در محدوده‌ی FLORA_RADIUS جمع می‌شود (درخت‌ها تا ۱۲۰ می‌مانند)
      const fdx = ccx * 32 + 16 - px;
      const fdz = ccz * 32 + 16 - pz;
      if (fdx * fdx + fdz * fdz <= floraR2) {
        for (let i = 0; i < f.grass.length; i += 1) flora.grass.push(f.grass[i]);
        for (let i = 0; i < f.flowers.length; i += 1) flora.flowers.push(f.flowers[i]);
        for (let i = 0; i < f.rocks.length; i += 1) flora.rocks.push(f.rocks[i]);
        for (let i = 0; i < f.mushrooms.length; i += 1) flora.mushrooms.push(f.mushrooms[i]);
      }
    }
  }

  return { groups: { near, far, far2 }, flora, loaded, center: { cx, cz } };
}

/**
 * بر اساس موقعیت بازیکن و شعاع چانک، مجموعه‌ی فعال را برمی‌گرداند.
 * اگر مجموعه تغییر نکند، null برمی‌گردد (بدون alloc).
 * @param {number} px
 * @param {number} pz
 * @param {number} radius  شعاع چانک (۲..۶)
 * @param {number} density سقف تعداد درخت (از preset)
 * @param {number} grassMul ضریب چگالی چمن (از preset)
 */
export function computeChunkSet(px, pz, radius, density = 2600, grassMul = 1) {
  const { cx, cz } = worldToChunk(px, pz);
  const signature = `${cx},${cz},${radius},${density},${grassMul}`;
  if (signature === chunkState.signature) return null;

  chunkState.signature = signature;
  chunkState.radius = radius;
  chunkState.center = { cx, cz };

  const { groups, flora, loaded } = buildForRadius(px, pz, radius, density, grassMul);
  chunkState.loaded = loaded;
  chunkStats.chunks = loaded;
  chunkStats.trees = groups.near.length + groups.far.length + groups.far2.length;
  chunkStats.lod0 = groups.near.length;
  chunkStats.lod1 = groups.far.length;
  chunkStats.lod2 = groups.far2.length;
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
  chunkStats.lod0 = 0;
  chunkStats.lod1 = 0;
  chunkStats.lod2 = 0;
}

export { EMPTY_GROUPS, EMPTY_FLORA, chunkKey };
