const fs = require('fs');
const path = require('path');

// --- ریاضی ماتریس 4x4 (column-major مثل three.js) ---
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 4; j += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[k * 4 + j] * b[i * 4 + k];
      out[i * 4 + j] = sum;
    }
  }
  return out;
}

function compose(translation = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1]) {
  const [x, y, z, w] = rotation;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const [sx, sy, sz] = scale;

  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    translation[0], translation[1], translation[2], 1,
  ];
}

function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  return compose(node.translation, node.rotation, node.scale);
}

function transformPoint(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

function readGlb(file) {
  const buf = fs.readFileSync(file);
  let offset = 12;
  let json = null;
  while (offset < buf.length) {
    const len = buf.readUInt32LE(offset);
    const type = buf.readUInt32LE(offset + 4);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
    offset += 8 + len + ((4 - (len % 4)) % 4);
  }
  return json;
}

function worldBounds(json) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  const walk = (index, parentMatrix) => {
    const node = json.nodes[index];
    if (!node) return;
    const matrix = multiply(parentMatrix, nodeMatrix(node));
    if (node.mesh !== undefined) {
      for (const prim of json.meshes[node.mesh].primitives || []) {
        const acc = json.accessors?.[prim.attributes?.POSITION];
        if (!acc?.min || !acc?.max) continue;
        // ۸ گوشه‌ی جعبه را تبدیل کن
        for (let i = 0; i < 8; i += 1) {
          const corner = [
            i & 1 ? acc.max[0] : acc.min[0],
            i & 2 ? acc.max[1] : acc.min[1],
            i & 4 ? acc.max[2] : acc.min[2],
          ];
          const p = transformPoint(matrix, corner);
          for (let a = 0; a < 3; a += 1) {
            min[a] = Math.min(min[a], p[a]);
            max[a] = Math.max(max[a], p[a]);
          }
        }
      }
    }
    for (const child of node.children || []) walk(child, matrix);
  };

  const scene = json.scenes?.[json.scene ?? 0];
  for (const root of scene?.nodes || []) walk(root, identity());
  if (min[0] === Infinity) return null;
  const r = (v) => Math.round(v * 100) / 100;
  return {
    size: [r(max[0] - min[0]), r(max[1] - min[1]), r(max[2] - min[2])],
    min: min.map(r),
    max: max.map(r),
  };
}

const files = process.argv.slice(2);
for (const f of files) {
  const json = readGlb(f);
  const b = worldBounds(json);
  console.log(`\n${path.basename(f)}`);
  console.log('  animations:', (json.animations || []).map((a) => a.name).join(', ') || '(none)');
  console.log('  world bbox:', JSON.stringify(b));
}
