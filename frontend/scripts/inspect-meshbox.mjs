import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

globalThis.self = globalThis;

const dir = process.argv[2];
const only = process.argv[3];
const loader = new GLTFLoader();
function load(file) {
  const buf = fs.readFileSync(path.join(dir, file));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => loader.parse(ab, '', resolve, reject));
}

const v = new THREE.Vector3();
const files = only ? [only] : fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.glb'));

for (const file of files) {
  let gltf;
  try { gltf = await load(file); } catch { continue; }
  const scene = gltf.scene;
  scene.updateWorldMatrix(true, true);
  console.log(`\n=== ${file}`);
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    let minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    let n = 0;
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
      minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
      n += 1;
    }
    console.log(
      `  ${o.name} [${mats.map((m) => m?.name).join(',')}] verts=${n}` +
      ` X[${minX.toFixed(2)},${maxX.toFixed(2)}] Y[${minY.toFixed(2)},${maxY.toFixed(2)}] Z[${minZ.toFixed(2)},${maxZ.toFixed(2)}]`
    );
  });
}
