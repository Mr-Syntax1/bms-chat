import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

globalThis.self = globalThis;

const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.glb'));

const loader = new GLTFLoader();

function load(file) {
  const buf = fs.readFileSync(path.join(dir, file));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => {
    loader.parse(ab, '', resolve, reject);
  });
}

for (const file of files) {
  try {
    const gltf = await load(file);
    const scene = gltf.scene;
    scene.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const boneNames = [];
    let skinned = 0;
    const handNames = [];
    scene.traverse((o) => {
      if (o.isBone) boneNames.push(o.name);
      if (o.isSkinnedMesh) skinned += 1;
      if (o.isBone && /hand/i.test(o.name)) handNames.push(o.name);
    });

    console.log(`\n=== ${file}`);
    console.log(`  size=(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}) minY=${box.min.y.toFixed(2)}`);
    console.log(`  center=(${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
    console.log(`  skinnedMeshes=${skinned} bones=${boneNames.length}`);
    console.log(`  hands=${handNames.join(', ') || '-'}`);
    console.log(`  clips=${gltf.animations.map((a) => a.name).join(', ') || '-'}`);

    // Determine forward: find hand bones L/R world positions and hips/head for reference
    const hips = scene.getObjectByName('Hips') || scene.getObjectByName('hips');
    if (hips && handNames.length) {
      const hp = new THREE.Vector3();
      hips.getWorldPosition(hp);
      for (const hn of handNames) {
        const h = scene.getObjectByName(hn);
        const p = new THREE.Vector3();
        h.getWorldPosition(p);
        console.log(`  ${hn} offset from hips: dx=${(p.x - hp.x).toFixed(2)} dz=${(p.z - hp.z).toFixed(2)}`);
      }
    }
  } catch (err) {
    console.log(`\n=== ${file} ERROR ${err.message}`);
  }
}
