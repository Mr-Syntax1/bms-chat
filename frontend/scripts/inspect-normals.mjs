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

const files = only ? [only] : fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.glb'));
const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();

for (const file of files) {
  let gltf;
  try { gltf = await load(file); } catch { continue; }
  const scene = gltf.scene;
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const h = box.max.y - box.min.y;
  const w = box.max.x - box.min.x;

  // head band: top 22% of height; central band: |x| < 30% width
  const yLo = box.min.y + h * 0.72;
  const xLim = w * 0.3;

  let posZ = 0, negZ = 0, posX = 0, negX = 0, total = 0;
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    const idx = o.geometry.index;
    const tri = idx ? idx.count / 3 : pos.count / 3;
    for (let t = 0; t < tri; t += 1) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      vA.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
      vB.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
      vC.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
      const cy = (vA.y + vB.y + vC.y) / 3;
      const cx = (vA.x + vB.x + vC.x) / 3;
      if (cy < yLo || Math.abs(cx) > xLim) continue;
      e1.subVectors(vB, vA); e2.subVectors(vC, vA);
      n.crossVectors(e1, e2);
      const area = n.length() / 2;
      if (area === 0) continue;
      n.normalize();
      const az = n.z * area;
      const ax = n.x * area;
      if (az > 0) posZ += az; else negZ -= az;
      if (ax > 0) posX += ax; else negX -= ax;
      total += area;
    }
  });

  console.log(`\n=== ${file}`);
  console.log(`  head-band area=${total.toFixed(3)}  normals: +Z=${posZ.toFixed(3)} -Z=${negZ.toFixed(3)}  +X=${posX.toFixed(3)} -X=${negX.toFixed(3)}`);
  const zBias = posZ - negZ;
  const xBias = posX - negX;
  const zRel = total ? zBias / total : 0;
  const xRel = total ? xBias / total : 0;
  console.log(`  zBias=${zRel.toFixed(3)} xBias=${xRel.toFixed(3)}`);
  if (Math.abs(zRel) > Math.abs(xRel)) {
    console.log(`  ⇒ face normal points ${zRel > 0 ? '+Z (offset 0)' : '-Z (offset PI)'}`);
  } else {
    console.log(`  ⇒ face normal points ${xRel > 0 ? '+X (offset -PI/2)' : '-X (offset +PI/2)'}`);
  }
}
