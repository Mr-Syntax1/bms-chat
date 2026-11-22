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
  try { gltf = await load(file); } catch { continue; }
  console.log(`\n=== ${file}`);
  const meshNames = [];
  const matNames = new Set();
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      meshNames.push(`${o.name}[${o.material?.name || '?'}]`);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m?.name && matNames.add(m.name));
    }
  });
  console.log(`  meshes(${meshNames.length}): ${meshNames.slice(0, 40).join(', ')}`);
  console.log(`  materials: ${Array.from(matNames).join(', ') || '-'}`);

  // Root motion from animations: find hips/root translation track
  for (const clip of gltf.animations) {
    if (!/walk|run|sprint/i.test(clip.name)) continue;
    const track = clip.tracks.find((t) => /hips|root|core/i.test(t.name) && t.name.endsWith('.position'));
    if (!track) continue;
    const first = new THREE.Vector3(track.values[0], track.values[1], track.values[2]);
    const last = new THREE.Vector3(
      track.values[track.values.length - 3],
      track.values[track.values.length - 2],
      track.values[track.values.length - 1
      ]);
    const d = last.clone().sub(first);
    console.log(`  ${clip.name} rootMotion dx=${d.x.toFixed(3)} dz=${d.z.toFixed(3)} → forward ${Math.abs(d.z) > Math.abs(d.x) ? (d.z > 0 ? '+Z' : '-Z') : (d.x > 0 ? '+X' : '-X')}`);
  }
}
