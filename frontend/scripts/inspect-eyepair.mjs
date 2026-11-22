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

const EYE_RE = /eye|pupil|iris/i;
const files = only ? [only] : fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.glb'));
const v = new THREE.Vector3();

for (const file of files) {
  let gltf;
  try { gltf = await load(file); } catch { continue; }
  const scene = gltf.scene;
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const h = box.max.y - box.min.y;
  const headY = box.min.y + h * 0.6;

  const pts = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const tag = `${o.name} ${mats.map((m) => m?.name || '').join(' ')}`;
    if (!EYE_RE.test(tag)) return;
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 5000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      if (v.y < headY) continue;
      pts.push(v.clone());
    }
  });

  console.log(`\n=== ${file}`);
  if (pts.length < 20) {
    console.log('  insufficient eye vertices');
    continue;
  }

  // split along X and along Z, measure which split gives two tighter, better-separated clusters
  const score = (axis) => {
    const vals = pts.map((p) => p[axis]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const left = pts.filter((p) => p[axis] < mean);
    const right = pts.filter((p) => p[axis] >= mean);
    if (!left.length || !right.length) return { sep: 0, tight: Infinity };
    const c = (arr) => {
      const s = new THREE.Vector3();
      arr.forEach((p) => s.add(p));
      return s.divideScalar(arr.length);
    };
    const cl = c(left), cr = c(right);
    const spread = (arr, cc) => arr.reduce((s, p) => s + p.distanceToSquared(cc), 0) / arr.length;
    return {
      sep: cl.distanceTo(cr),
      tight: (spread(left, cl) + spread(right, cr)) / 2,
      cl, cr,
    };
  };

  const sx = score('x');
  const sz = score('z');
  console.log(`  X-split sep=${sx.sep.toFixed(3)} tight=${sx.tight.toFixed(4)}`);
  console.log(`  Z-split sep=${sz.sep.toFixed(3)} tight=${sz.tight.toFixed(4)}`);

  // eyes are separated along the LEFT-RIGHT axis (larger separation, tighter clusters)
  const lateral = sx.sep > sz.sep ? 'X' : 'Z';
  const forwardAxis = lateral === 'X' ? 'Z' : 'X';
  console.log(`  ⇒ lateral axis = ${lateral}, forward axis = ${forwardAxis}`);

  const fwd = forwardAxis === 'Z' ? 'z' : 'x';
  const eyeMean = pts.reduce((s, p) => s + p[fwd], 0) / pts.length;
  const mid = (box.min[fwd] + box.max[fwd]) / 2;
  console.log(`  eye centroid ${fwd}=${eyeMean.toFixed(3)} body mid ${fwd}=${mid.toFixed(3)} delta=${(eyeMean - mid).toFixed(3)}`);
  console.log(`  ⇒ faces ${forwardAxis}${eyeMean - mid >= 0 ? '+' : '-'}`);

  const off = forwardAxis === 'Z'
    ? (eyeMean - mid >= 0 ? 0 : Math.PI)
    : (eyeMean - mid >= 0 ? -Math.PI / 2 : Math.PI / 2);
  console.log(`  ⇒ CHARACTER_FACING_OFFSET ≈ ${off === 0 ? '0' : off === Math.PI ? 'Math.PI' : off > 0 ? 'Math.PI / 2' : '-Math.PI / 2'}`);
}
