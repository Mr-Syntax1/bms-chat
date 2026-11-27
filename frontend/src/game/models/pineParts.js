import './setupDraco';
import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { modelUrl } from '../assetManifest';

// ---------------------------------------------------------------------------
// pineParts.js — تنها منبع درخت بازی: trees/PineTrees.glb
//
//  • فایل PineTrees.glb یک «گروه» از ۹ کاج کوچک در یک مش است (ارتفاع کل ۰.۷۸
//    واحد، پهنا ۱.۷۸ واحد). اگر همان گروه instanced شود، با scale شدن به
//    ارتفاع هدف، عرضش چند برابر ارتفاع می‌شود و جنگل به توده‌ی سبز تبدیل
//    می‌شود. پس یک درخت تک از دل فایل استخراج می‌شود:
//      ۱) مراکز تنه‌ها از رأس‌های مش چوبی خوشه‌بندی می‌شوند
//      ۲) هر مثلث به نزدیک‌ترین تنه نسبت داده می‌شود
//      ۳) درختِ نزدیک به مرکز فایل نگه داشته می‌شود
//    نتیجه: ۲ قطعه (چوب + برگ) با نسبت طبیعی، آماده‌ی InstancedMesh.
//  • هیچ فایل درخت دیگری (Pine/Pine2/Birch/Fern) استفاده نمی‌شود.
// ---------------------------------------------------------------------------

// اندازه‌ی واقعی فایل روی دیسک — برای نمایش در پنل دیباگ (?debug / Ctrl+Shift+P)
export const TREE_MODEL_BYTES = 99604;

const CELL = 0.3; // شعاع خوشه‌بندی تنه‌ها در فضای ورلد مدل
const cache = new Map();

function buildSingleTree(scene) {
  scene.updateWorldMatrix(true, true);

  // همه‌ی مش‌ها را در فضای ورلد کپی می‌کنیم تا محاسبات یکدست باشد
  const meshes = [];
  scene.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    meshes.push({ geometry, material: child.material });
  });
  if (!meshes.length) return null;

  // ۱) مراکز تنه‌ها از رأس‌های مش چوبی (اولین مش فایل)
  const trunkPos = meshes[0].geometry.attributes.position;
  const cellMap = new Map();
  const centers = [];
  for (let i = 0; i < trunkPos.count; i += 1) {
    const x = trunkPos.getX(i);
    const z = trunkPos.getZ(i);
    const key = `${Math.round(x / CELL)},${Math.round(z / CELL)}`;
    let cell = cellMap.get(key);
    if (!cell) {
      cell = { x: 0, z: 0, n: 0 };
      cellMap.set(key, cell);
      centers.push(cell);
    }
    cell.x += x;
    cell.z += z;
    cell.n += 1;
  }
  if (!centers.length) return null;
  centers.forEach((c) => {
    c.x /= c.n;
    c.z /= c.n;
  });

  // ۲) درختی که تنه‌اش به مرکز فایل نزدیک‌تر است
  let pick = centers[0];
  let best = Infinity;
  for (const c of centers) {
    const d = c.x * c.x + c.z * c.z;
    if (d < best) {
      best = d;
      pick = c;
    }
  }

  // ۳) مثلث‌های متعلق به همان درخت را نگه می‌داریم
  const box = new THREE.Box3();
  const parts = [];
  for (const { geometry, material } of meshes) {
    const pos = geometry.attributes.position;
    const index = geometry.index;
    const triCount = (index ? index.count : pos.count) / 3;
    const keep = [];

    for (let t = 0; t < triCount; t += 1) {
      let cx = 0;
      let cz = 0;
      for (let k = 0; k < 3; k += 1) {
        const vi = index ? index.getX(t * 3 + k) : t * 3 + k;
        cx += pos.getX(vi);
        cz += pos.getZ(vi);
      }
      cx /= 3;
      cz /= 3;
      let nearest = centers[0];
      let nd = Infinity;
      for (const c of centers) {
        const d = (c.x - cx) * (c.x - cx) + (c.z - cz) * (c.z - cz);
        if (d < nd) {
          nd = d;
          nearest = c;
        }
      }
      if (nearest === pick) keep.push(t);
    }

    if (!keep.length) continue;

    // هندسه‌ی جدید فقط با مثلث‌های همین درخت
    const out = new THREE.BufferGeometry();
    for (const name of Object.keys(geometry.attributes)) {
      const src = geometry.attributes[name];
      const itemSize = src.itemSize;
      const arr = new Float32Array(keep.length * 3 * itemSize);
      let o = 0;
      for (let t = 0; t < keep.length; t += 1) {
        for (let k = 0; k < 3; k += 1) {
          const vi = index ? index.getX(keep[t] * 3 + k) : keep[t] * 3 + k;
          for (let c = 0; c < itemSize; c += 1) arr[o++] = src.array[vi * itemSize + c];
        }
      }
      out.setAttribute(name, new THREE.BufferAttribute(arr, itemSize));
    }
    out.computeBoundingBox();
    out.computeBoundingSphere();
    box.union(out.boundingBox);
    parts.push({ geometry: out, material, matrix: new THREE.Matrix4() });
  }

  if (!parts.length) return null;

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  return {
    parts,
    height: size.y || 1,
    baseY: -box.min.y,
    centerX: center.x,
    centerZ: center.z,
  };
}

/**
 * قطعات یک درخت تک برای InstancedMesh (کش‌شده و مشترک بین همه‌ی چانک‌ها).
 * @param {string} url
 */
export function usePineModel(url = modelUrl('trees.pine')) {
  const { scene } = useGLTF(url);

  return useMemo(() => {
    if (!url) return { parts: [], height: 1, baseY: 0, centerX: 0, centerZ: 0 };
    const hit = cache.get(url);
    if (hit) return hit;
    const data = buildSingleTree(scene);
    const result = data || { parts: [], height: 1, baseY: 0, centerX: 0, centerZ: 0 };
    cache.set(url, result);
    return result;
  }, [scene, url]);
}

// preload با کلید manifest (مسیر خام اینجا نوشته نمی‌شود)
const PRELOAD_KEY = 'trees.pine';
const preloadUrl = modelUrl(PRELOAD_KEY);
if (preloadUrl) useGLTF.preload(preloadUrl);
