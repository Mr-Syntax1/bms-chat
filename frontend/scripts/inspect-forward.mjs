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

const v = new THREE.Vector3();

for (const file of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.glb'))) {
  let gltf;
  try { gltf = await load(file); } catch { continue; }
  const scene = gltf.scene;
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const h = box.max.y - box.min.y;
  const midZ = (box.min.z + box.max.z) / 2;

  const headCut = box.min.y + h * 0.78;
  const feetCut = box.min.y + h * 0.10;

  let headSum = 0, headN = 0, headMaxPos = -Infinity, headMaxNeg = Infinity;
  let feetSum = 0, feetN = 0, feetMaxPos = -Infinity, feetMaxNeg = Infinity;

  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 6000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      if (v.y >= headCut) {
        headSum += v.z; headN += 1;
        headMaxPos = Math.max(headMaxPos, v.z); headMaxNeg = Math.min(headMaxNeg, v.z);
      } else if (v.y <= feetCut) {
        feetSum += v.z; feetN += 1;
        feetMaxPos = Math.max(feetMaxPos, v.z); feetMaxNeg = Math.min(feetMaxNeg, v.z);
      }
    }
  });

  const headMean = headN ? headSum / headN : 0;
  const feetMean = feetN ? feetSum / feetN : 0;

  // Forward = direction with more protrusion at head height (face/nose), corroborated by feet
  const headBias = headMaxPos - midZ - (midZ - headMaxNeg);
  const feetBias = feetMaxPos - midZ - (midZ - feetMaxNeg);
  const meanBias = (headMean - midZ) + (feetMean - midZ);

  console.log(`\n=== ${file}`);
  console.log(`  head: meanZ=${headMean.toFixed(2)} protrude(+Z)=${(headMaxPos - midZ).toFixed(2)} protrude(-Z)=${(midZ - headMaxNeg).toFixed(2)}`);
  console.log(`  feet: meanZ=${feetMean.toFixed(2)} protrude(+Z)=${(feetMaxPos - midZ).toFixed(2)} protrude(-Z)=${(midZ - feetMaxNeg).toFixed(2)}`);
  console.log(`  headBias=${headBias.toFixed(2)} feetBias=${feetBias.toFixed(2)} meanBias=${meanBias.toFixed(2)}`);
  console.log(`  ⇒ faces ${meanBias >= 0 ? '+Z (offset 0)' : '-Z (offset PI)'}`);
}
