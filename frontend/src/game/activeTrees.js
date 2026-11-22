// ---------------------------------------------------------------------------
// رجیستری درختان فعال + گرید فضایی برای برخورد سریع
// Forest تعداد رندرشده را اینجا می‌نویسد و PlayerController از همان فهرست
// استفاده می‌کند (هیچ درخت نامرئی برای برخورد وجود ندارد).
// ---------------------------------------------------------------------------
const CELL = 4;

let activeTrees = [];
let grid = new Map();
let gridN = 0;

const key = (cx, cz) => cx * 73856093 ^ (cz * 19349663);

export function setActiveTrees(trees) {
  activeTrees = Array.isArray(trees) ? trees : [];
  grid = new Map();
  // فقط درختانی که در ناحیه‌ی قابل حرکت بازیکن‌اند لازم‌اند
  for (const t of activeTrees) {
    if (t.x > 40 || t.x < -100) continue;
    const cx = Math.floor(t.x / CELL);
    const cz = Math.floor(t.z / CELL);
    const k = key(cx, cz);
    let bucket = grid.get(k);
    if (!bucket) {
      bucket = [];
      grid.set(k, bucket);
    }
    bucket.push(t);
  }
  gridN = activeTrees.length;
}

export function getActiveTrees() {
  return activeTrees;
}

export function getTreeGridSize() {
  return gridN;
}

/**
 * درختان نزدیک به یک نقطه را برمی‌گرداند (فقط سلول‌های ۳×۳ اطراف).
 * @returns {Array} درختان کاندید برخورد
 */
export function getNearbyTrees(x, z, out = []) {
  out.length = 0;
  const cx = Math.floor(x / CELL);
  const cz = Math.floor(z / CELL);
  for (let ix = -1; ix <= 1; ix += 1) {
    for (let iz = -1; iz <= 1; iz += 1) {
      const bucket = grid.get(key(cx + ix, cz + iz));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i += 1) out.push(bucket[i]);
    }
  }
  return out;
}
