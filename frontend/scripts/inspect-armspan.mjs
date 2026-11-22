import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

globalThis.self = globalThis;

const dir = process.argv[2];
const loader = new GLTFLoader();

function load(file) {
  const buf = fs.readFileSync(path.join(dir, file));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => loader.parse(ab, '', resolve, reject));
}

// برای هر مدل: ارتفاع کل، و «کمر/دست» را با هیستوگرام عرض X در باند ارتفاعی تخمین می‌زنیم
for (const file of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.glb'))) {
  let gltf;
  try {
    gltf = await load(file);
  } catch {
    continue;
  }
  const scene = gltf.scene;
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const h = box.max.y - box.min.y;
  if (!Number.isFinite(h) || h <= 0) continue;

  const v = new THREE.Vector3();
  // حداکثر عرض (بازوها) در باند ۴۵٪..۷۰٪ ارتفاع = سطح دست/کمر
  let maxHalfWidth = 0;
  const band = { lo: box.min.y + h * 0.45, hi: box.min.y + h * 0.7 };
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 4000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      if (v.y < band.lo || v.y > band.hi) continue;
      if (Math.abs(v.x) > maxHalfWidth) maxHalfWidth = Math.abs(v.x);
    }
  });

  // ارتفاع «مرکز جرم» نیمه‌ی بالای بدن ≈ جای دست
  console.log(`\n=== ${file}`);
  console.log(`  height=${h.toFixed(2)}  minY=${box.min.y.toFixed(2)}  halfWidth(arms)=${maxHalfWidth.toFixed(2)}`);
  console.log(`  width/height ratio = ${(maxHalfWidth * 2 / h).toFixed(2)}`);
}
