import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { CHARACTERS, TARGET_HEIGHT, getPropAnchor } from '../src/game/models/characterConfig.js';

globalThis.self = globalThis;

const dir = process.argv[2];
const loader = new GLTFLoader();

function load(file) {
  const buf = fs.readFileSync(path.join(dir, file));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => loader.parse(ab, '', resolve, reject));
}

const v = new THREE.Vector3();
let fails = 0;

for (const file of Object.keys(CHARACTERS)) {
  const cfg = CHARACTERS[file];
  let gltf;
  try {
    gltf = await load(file);
  } catch {
    console.log(`SKIP ${file}`);
    continue;
  }
  const scene = gltf.scene;
  scene.updateWorldMatrix(true, true);

  const scale = TARGET_HEIGHT / cfg.height;
  const lift = -(cfg.minY || 0) * scale;
  const anchor = getPropAnchor(file);

  // ناحیه‌ی بازو/دست: ۳۵٪..۷۵٪ ارتفاع نرمال‌شده
  const lo = TARGET_HEIGHT * 0.35;
  const hi = TARGET_HEIGHT * 0.75;
  let armHalf = 0;
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 3000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      const yNorm = v.y * scale + lift;
      if (yNorm < lo || yNorm > hi) continue;
      if (Math.abs(v.x) > armHalf) armHalf = Math.abs(v.x * scale);
    }
  });

  // پروپ باید نزدیک لبه‌ی بدن باشد: بیرون از تنه، اما نه شناور دور از آن
  const recommended = Math.round((armHalf + 0.06) * 100) / 100;
  const ok = anchor.x >= armHalf * 0.85 && anchor.x <= armHalf + 0.25;
  if (!ok) fails += 1;

  console.log(
    `${ok ? 'OK  ' : 'FIX '} ${file.padEnd(24)} x=${anchor.x.toFixed(2)}  armHalf=${armHalf.toFixed(2)}  recommended=${recommended}`
  );
}

console.log(`\n${fails === 0 ? 'ALL ANCHORS IN HAND RANGE' : `${fails} anchor(s) need adjusting`}`);
process.exitCode = fails === 0 ? 0 : 1;
