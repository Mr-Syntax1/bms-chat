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

  // gather all vertices in world space, build a coarse histogram along Z at head height
  const v = new THREE.Vector3();
  const zHist = new Map();
  let count = 0;
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 4000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      count += 1;
      if (v.y < box.min.y + (box.max.y - box.min.y) * 0.55) continue;
      const key = Math.round(v.z * 20) / 20;
      zHist.set(key, (zHist.get(key) || 0) + 1);
    }
  });

  let maxZ = -Infinity;
  let maxC = 0;
  for (const [k, c] of zHist) if (c > maxC) { maxC = c; maxZ = k; }

  console.log(`\n=== ${file}`);
  console.log(`  bbox z: ${box.min.z.toFixed(2)} .. ${box.max.z.toFixed(2)}  (x: ${box.min.x.toFixed(2)}..${box.max.x.toFixed(2)})`);
  console.log(`  head-region z mode = ${maxZ.toFixed(2)} → face likely ${maxZ > 0 ? '+Z' : '-Z'}`);
  console.log(`  verts sampled=${count}`);
}
