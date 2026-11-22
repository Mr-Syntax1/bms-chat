import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

globalThis.self = globalThis;

const dir = process.argv[2];
const outDir = process.argv[3] || './.model-previews';
fs.mkdirSync(outDir, { recursive: true });

const SIZE = 220;

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(file, rgb, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

const loader = new GLTFLoader();
function load(file) {
  const buf = fs.readFileSync(path.join(dir, file));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => loader.parse(ab, '', resolve, reject));
}

function render(scene, camDir, outFile) {
  const box = new THREE.Box3().setFromObject(scene);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = Math.max(size.x, size.y, size.z) * 0.62;

  const cam = new THREE.PerspectiveCamera(35, 1, 0.01, radius * 30);
  cam.position.copy(center).addScaledVector(camDir, radius * 3.2);
  cam.lookAt(center);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();

  const light = new THREE.Vector3(0.5, 1, 0.9).normalize();
  const rgb = Buffer.alloc(SIZE * SIZE * 3, 0);
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    rgb[i * 3] = 24; rgb[i * 3 + 1] = 22; rgb[i * 3 + 2] = 34;
  }
  const depth = new Float32Array(SIZE * SIZE).fill(Infinity);

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();

  const toScreen = (p) => {
    const ndc = p.clone().project(cam);
    return { x: ((ndc.x + 1) / 2) * SIZE, y: ((1 - ndc.y) / 2) * SIZE, z: ndc.z };
  };

  scene.updateWorldMatrix(true, true);
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    const idx = o.geometry.index;
    const triCount = idx ? idx.count / 3 : pos.count / 3;
    const step = Math.max(1, Math.floor(triCount / 26000));
    for (let t = 0; t < triCount; t += step) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      vA.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
      vB.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
      vC.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
      e1.subVectors(vB, vA);
      e2.subVectors(vC, vA);
      normal.crossVectors(e1, e2).normalize();
      const shade = 0.28 + 0.72 * Math.abs(normal.dot(light));
      const r = Math.round(232 * shade);
      const g = Math.round(196 * shade);
      const b = Math.round(150 * shade);

      pA.copy(vA); pB.copy(vB); pC.copy(vC);
      const sA = toScreen(pA);
      const sB = toScreen(pB);
      const sC = toScreen(pC);
      const minX = Math.max(0, Math.floor(Math.min(sA.x, sB.x, sC.x)));
      const maxX = Math.min(SIZE - 1, Math.ceil(Math.max(sA.x, sB.x, sC.x)));
      const minY = Math.max(0, Math.floor(Math.min(sA.y, sB.y, sC.y)));
      const maxY = Math.min(SIZE - 1, Math.ceil(Math.max(sA.y, sB.y, sC.y)));
      const area = (sB.x - sA.x) * (sC.y - sA.y) - (sC.x - sA.x) * (sB.y - sA.y);
      if (Math.abs(area) < 0.0001) continue;
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const w0 = ((sB.x - sA.x) * (y + 0.5 - sA.y) - (x + 0.5 - sA.x) * (sB.y - sA.y)) / area;
          const w1 = ((sC.x - sB.x) * (y + 0.5 - sB.y) - (x + 0.5 - sB.x) * (sC.y - sB.y)) / area;
          const w2 = ((sA.x - sC.x) * (y + 0.5 - sC.y) - (x + 0.5 - sC.x) * (sA.y - sC.y)) / area;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const z = w0 * sA.z + w1 * sB.z + w2 * sC.z;
          const p = y * SIZE + x;
          if (z >= depth[p]) continue;
          depth[p] = z;
          rgb[p * 3] = r; rgb[p * 3 + 1] = g; rgb[p * 3 + 2] = b;
        }
      }
    }
  });

  writePng(outFile, rgb, SIZE, SIZE);
}

for (const file of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.glb'))) {
  let gltf;
  try {
    gltf = await load(file);
  } catch (err) {
    console.log(`${file}: load error ${err.message}`);
    continue;
  }
  const base = file.replace(/\.glb$/i, '');
  render(gltf.scene, new THREE.Vector3(0, 0, 1), path.join(outDir, `${base}__front+Z.png`));
  render(gltf.scene, new THREE.Vector3(0, 0, -1), path.join(outDir, `${base}__front-Z.png`));
  console.log(`${base}: rendered (+Z / -Z)`);
}
