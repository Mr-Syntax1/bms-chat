// ---------------------------------------------------------------------------
// world/ChunkManager.js — فلور اطراف بازیکن (Phase 5)
//
//  • درختان دیگر استریم نمی‌شوند: کل جنگل یک‌بار و برای همیشه رندر می‌شود
//    (StreamedWorld) تا هیچ درختی با جابه‌جایی بازیکن ناپدید نشود.
//  • فقط فلور ریز (چمن/گل/سنگ/قارچ) در شعاع FLORA_RADIUS اطراف بازیکن
//    نگه داشته می‌شود؛ این‌ها آن‌قدر کوچک‌اند که تغییرشان دیده نمی‌شود.
// ---------------------------------------------------------------------------
import { getChunkFlora, worldToChunk, CHUNK_SIZE } from './chunkGen';

// فلور (چمن/گل/سنگ/قارچ) فقط تا این فاصله از بازیکن رندر می‌شود.
export const FLORA_RADIUS = 96;
const FLORA_CHUNK_RADIUS = Math.ceil(FLORA_RADIUS / CHUNK_SIZE);

export const chunkState = {
  signature: '',
  center: { cx: 0, cz: 0 },
  loaded: 0,
};

// آمار سبک برای پنل دیباگ (خارج از React، بدون state)
export const chunkStats = { chunks: 0, trees: 0, flora: 0, lod0: 0, lod1: 0, lod2: 0 };

/**
 * فلور چانک‌های اطراف بازیکن را جمع می‌کند.
 * اگر مجموعه تغییر نکند، null برمی‌گردد (بدون alloc).
 * @param {number} px
 * @param {number} pz
 * @param {number} grassMul ضریب چگالی چمن (از preset)
 */
export function computeFloraSet(px, pz, grassMul = 1) {
  const { cx, cz } = worldToChunk(px, pz);
  const signature = `${cx},${cz},${grassMul}`;
  if (signature === chunkState.signature) return null;

  chunkState.signature = signature;
  chunkState.center = { cx, cz };

  const flora = { grass: [], flowers: [], rocks: [], mushrooms: [] };
  const radius2 = FLORA_RADIUS * FLORA_RADIUS;
  let loaded = 0;

  for (let dz = -FLORA_CHUNK_RADIUS; dz <= FLORA_CHUNK_RADIUS; dz += 1) {
    for (let dx = -FLORA_CHUNK_RADIUS; dx <= FLORA_CHUNK_RADIUS; dx += 1) {
      const ccx = cx + dx;
      const ccz = cz + dz;
      const ddx = ccx * CHUNK_SIZE + CHUNK_SIZE * 0.5 - px;
      const ddz = ccz * CHUNK_SIZE + CHUNK_SIZE * 0.5 - pz;
      if (ddx * ddx + ddz * ddz > radius2) continue;

      const f = getChunkFlora(ccx, ccz, grassMul);
      loaded += 1;
      for (let i = 0; i < f.grass.length; i += 1) flora.grass.push(f.grass[i]);
      for (let i = 0; i < f.flowers.length; i += 1) flora.flowers.push(f.flowers[i]);
      for (let i = 0; i < f.rocks.length; i += 1) flora.rocks.push(f.rocks[i]);
      for (let i = 0; i < f.mushrooms.length; i += 1) flora.mushrooms.push(f.mushrooms[i]);
    }
  }

  chunkState.loaded = loaded;
  chunkStats.chunks = loaded;
  chunkStats.flora =
    flora.grass.length + flora.flowers.length + flora.rocks.length + flora.mushrooms.length;

  return { flora, signature };
}

export function resetChunkState() {
  chunkState.signature = '';
  chunkState.loaded = 0;
  chunkStats.chunks = 0;
  chunkStats.flora = 0;
}
