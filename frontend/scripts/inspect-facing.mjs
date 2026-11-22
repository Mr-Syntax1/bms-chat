import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];

function readGlbJson(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) return null;
  const length = buf.readUInt32LE(12);
  const type = buf.readUInt32LE(16);
  if (type !== 0x4e4f534a) return null;
  return JSON.parse(buf.subarray(20, 20 + length).toString('utf8'));
}

function mul(a, b) {
  const out = new Array(16).fill(0);
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      let s = 0;
      for (let k = 0; k < 4; k += 1) s += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = s;
    }
  }
  return out;
}

function trs(node) {
  if (node.matrix) return node.matrix.slice();
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  const [qx, qy, qz, qw] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

function transformPoint(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

function collect(json) {
  const nodes = json.nodes || [];
  const world = new Map();
  const walk = (idx, parent) => {
    const node = nodes[idx];
    const local = trs(node);
    const m = mul(parent, local);
    world.set(idx, m);
    (node.children || []).forEach((c) => walk(c, m));
  };
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  (json.scenes?.[json.scene ?? 0]?.nodes || []).forEach((n) => walk(n, identity));
  return { nodes, world };
}

for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.glb')) continue;
  const file = path.join(dir, entry.name);
  let json;
  try {
    json = readGlbJson(file);
  } catch {
    continue;
  }
  if (!json) continue;

  const { nodes, world } = collect(json);
  console.log(`\n=== ${entry.name}`);

  // heuristic: ankle → toe direction = forward for rigged characters
  const byName = new Map();
  nodes.forEach((n, i) => n.name && byName.set(n.name, i));
  const pairs = [];
  for (const [name, idx] of byName) {
    const toe = byName.get(`${name}_end`);
    if (toe === undefined) continue;
    if (!/foot|toe/i.test(name)) continue;
    const a = transformPoint(world.get(idx), [0, 0, 0]);
    const b = transformPoint(world.get(toe), [0, 0, 0]);
    pairs.push({ name, dx: b[0] - a[0], dy: b[1] - a[1], dz: b[2] - a[2] });
  }
  if (pairs.length) {
    const dz = pairs.reduce((s, p) => s + p.dz, 0) / pairs.length;
    const dx = pairs.reduce((s, p) => s + p.dx, 0) / pairs.length;
    console.log(`  foot->toe dx=${dx.toFixed(3)} dz=${dz.toFixed(3)} → forward is ${dz > 0 ? '+Z' : '-Z'}`);
  } else {
    // bbox from accessor min/max
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    const meshes = json.meshes || [];
    const accessors = json.accessors || [];
    meshes.forEach((mesh) => {
      mesh.primitives.forEach((prim) => {
        const acc = accessors[prim.attributes?.POSITION];
        if (!acc?.min || !acc?.max) return;
        for (let i = 0; i < 3; i += 1) {
          min[i] = Math.min(min[i], acc.min[i]);
          max[i] = Math.max(max[i], acc.max[i]);
        }
      });
    });
    if (Number.isFinite(min[0])) {
      const size = max.map((v, i) => v - min[i]);
      console.log(`  bbox size x=${size[0].toFixed(2)} y=${size[1].toFixed(2)} z=${size[2].toFixed(2)}`);
      console.log(`  bbox zMin=${min[2].toFixed(2)} zMax=${max[2].toFixed(2)} (asymmetry ${((max[2] + min[2]) / 2).toFixed(2)})`);
    }
    const roots = (json.scenes?.[json.scene ?? 0]?.nodes || []).map((i) => nodes[i]);
    roots.forEach((n) => console.log(`  root "${n.name}" rot=${JSON.stringify(n.rotation || null)} scale=${JSON.stringify(n.scale || null)}`));
  }
}
