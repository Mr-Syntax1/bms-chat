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

const EYE_RE = /eye|eye_white|eye_black|eyes|pupil|mouth|face|nose|visor/i;
const v = new THREE.Vector3();

for (const file of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.glb'))) {
  let gltf;
  try { gltf = await load(file); } catch { continue; }

  const scene = gltf.scene;
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const midZ = (box.min.z + box.max.z) / 2;

  const eyeCentroids = [];
  let bodySumZ = 0;
  let bodyCount = 0;

  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const tag = `${o.name} ${mats.map((m) => m?.name || '').join(' ')}`;
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 3000));
    let sumZ = 0;
    let n = 0;
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      sumZ += v.z;
      n += 1;
      bodySumZ += v.z;
      bodyCount += 1;
    }
    if (EYE_RE.test(tag) && n) {
      eyeCentroids.push({ name: o.name, mat: mats[0]?.name, meanZ: sumZ / n, n });
    }
  });

  const bodyMeanZ = bodyCount ? bodySumZ / bodyCount : 0;
  console.log(`\n=== ${file}`);
  console.log(`  bbox z ${box.min.z.toFixed(2)}..${box.max.z.toFixed(2)} mid=${midZ.toFixed(2)} bodyMeanZ=${bodyMeanZ.toFixed(2)}`);
  if (!eyeCentroids.length) {
    console.log('  no eye/face meshes found');
    continue;
  }
  for (const e of eyeCentroids) {
    const delta = e.meanZ - midZ;
    console.log(`  ${e.name} [${e.mat}] meanZ=${e.meanZ.toFixed(3)} delta=${delta.toFixed(3)} ⇒ ${delta > 0 ? '+Z' : '-Z'}`);
  }
}
