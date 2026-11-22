import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

globalThis.self = globalThis;

const dir = process.argv[2];
const SIZE = 96;
const RAMP = ' .:-=+*#%@';

const loader = new GLTFLoader();
function load(file) {
  const buf = fs.readFileSync(path.join(dir, file));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => loader.parse(ab, '', resolve, reject));
}

function renderAscii(scene, camDir, label) {
  const box = new THREE.Box3().setFromObject(scene);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = Math.max(size.x, size.y, size.z) * 0.62;

  const cam = new THREE.PerspectiveCamera(35, 1, 0.01, radius * 40);
  cam.position.copy(center).addScaledVector(camDir.clone().normalize(), radius * 3.4);
  cam.lookAt(center);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();

  const light = new THREE.Vector3(0.4, 0.9, 0.7).normalize();
  const buf = new Float32Array(SIZE * SIZE).fill(-1);
  const depth = new Float32Array(SIZE * SIZE).fill(Infinity);

  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();

  const proj = (p) => {
    const c = p.clone().project(cam);
    return { x: ((c.x + 1) / 2) * SIZE, y: ((1 - c.y) / 2) * SIZE, z: c.z };
  };

  scene.updateWorldMatrix(true, true);
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    const idx = o.geometry.index;
    const tri = idx ? idx.count / 3 : pos.count / 3;
    const step = Math.max(1, Math.floor(tri / 40000));
    for (let t = 0; t < tri; t += step) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      vA.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
      vB.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
      vC.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
      e1.subVectors(vB, vA); e2.subVectors(vC, vA);
      n.crossVectors(e1, e2).normalize();
      const shade = 0.22 + 0.78 * Math.abs(n.dot(light));

      const a = proj(vA.clone()), b = proj(vB.clone()), c = proj(vC.clone());
      const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
      const maxX = Math.min(SIZE - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
      const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
      const maxY = Math.min(SIZE - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
      const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
      if (Math.abs(area) < 1e-6) continue;
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const w0 = ((b.x - a.x) * (y + 0.5 - a.y) - (x + 0.5 - a.x) * (b.y - a.y)) / area;
          const w1 = ((c.x - b.x) * (y + 0.5 - b.y) - (x + 0.5 - b.x) * (c.y - b.y)) / area;
          const w2 = ((a.x - c.x) * (y + 0.5 - c.y) - (x + 0.5 - c.x) * (a.y - c.y)) / area;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const z = w0 * a.z + w1 * b.z + w2 * c.z;
          const p = y * SIZE + x;
          if (z >= depth[p]) continue;
          depth[p] = z;
          buf[p] = shade;
        }
      }
    }
  });

  console.log(`\n----- ${label} -----`);
  for (let y = 0; y < SIZE; y += 2) {
    let line = '';
    for (let x = 0; x < SIZE; x += 1) {
      const s = buf[y * SIZE + x];
      line += s < 0 ? ' ' : RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.round(s * (RAMP.length - 1))))];
    }
    if (line.trim()) console.log(line.replace(/\s+$/, ''));
  }
}

for (const file of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.glb'))) {
  let gltf;
  try { gltf = await load(file); } catch { continue; }
  const base = file.replace(/\.glb$/i, '');
  renderAscii(gltf.scene, new THREE.Vector3(0, 0.12, 1), `${base} viewed from +Z`);
  renderAscii(gltf.scene, new THREE.Vector3(0, 0.12, -1), `${base} viewed from -Z`);
}
