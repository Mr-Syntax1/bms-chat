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

  const bones = [];
  scene.traverse((o) => {
    if (o.isBone) bones.push(o);
  });
  if (!bones.length) {
    console.log(`\n=== ${file} (no rig)`);
    continue;
  }

  // foot → toe direction (bones ending in _end that are children of foot bones)
  const dirs = [];
  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  for (const bone of bones) {
    if (!/foot|toe/i.test(bone.name)) continue;
    for (const child of bone.children) {
      if (!child.isBone) continue;
      bone.getWorldPosition(v);
      child.getWorldPosition(w);
      dirs.push({ from: bone.name, to: child.name, dx: w.x - v.x, dz: w.z - v.z });
    }
  }

  // head/nose direction: use head bone vs hips
  const head = bones.find((b) => /head/i.test(b.name) && !/end/i.test(b.name));
  const hips = bones.find((b) => /hips|pelvis|core/i.test(b.name));

  console.log(`\n=== ${file}`);
  if (dirs.length) {
    const dz = dirs.reduce((s, d) => s + d.dz, 0) / dirs.length;
    const dx = dirs.reduce((s, d) => s + d.dx, 0) / dirs.length;
    console.log(`  foot->toe dx=${dx.toFixed(3)} dz=${dz.toFixed(3)}`);
    console.log(`  ⇒ model forward axis is ${Math.abs(dz) > Math.abs(dx) ? (dz > 0 ? '+Z' : '-Z') : (dx > 0 ? '+X' : '-X')}`);
    console.log(`  ⇒ suggested offset: ${dz > 0 ? '0' : 'Math.PI'}`);
  }
  if (head && hips) {
    head.getWorldPosition(v);
    hips.getWorldPosition(w);
    console.log(`  head-hips dx=${(v.x - w.x).toFixed(3)} dz=${(v.z - w.z).toFixed(3)}`);
  }
  const handNames = bones.filter((b) => /hand/i.test(b.name)).map((b) => b.name);
  console.log(`  handBones=${handNames.join(', ') || '-'}`);
}
