#!/usr/bin/env node
// ---------------------------------------------------------------------------
// inspect-glb.mjs — گزارش کامل هر GLB زیر public/game-models
//
// برای هر فایل گزارش می‌دهد:
//   bbox ارتفاع / minY / مرکز XZ، تعداد مثلث، تعداد mesh/material/texture،
//   اندازه‌ی هر تکسچر (PNG/JPEG از بافر داخلی)، skinned یا نه،
//   نام استخوان‌های مهم (head/neck/hand/foot/hips)،
//   نام و مدت هر animation clip.
//
// خروجی: frontend/src/game/assetReport.json  (+ چاپ خلاصه در ترمینال)
// اجرا:  node scripts/inspect-glb.mjs
//        node scripts/inspect-glb.mjs --dir public/game-models --out src/game/assetReport.json
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const scanDir = path.resolve(frontendRoot, arg('--dir', 'public/game-models'));
const outFile = path.resolve(frontendRoot, arg('--out', 'src/game/assetReport.json'));

// ---------------------------------------------------------------------------
// GLB reader
// ---------------------------------------------------------------------------
function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) return null;
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32LE(offset);
    const type = buf.readUInt32LE(offset + 4);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
    else if (type === 0x004e4942) bin = data;
    offset += 8 + len + ((4 - (len % 4)) % 4);
  }
  return json ? { json, bin, bytes: buf.length } : null;
}

// ---------------------------------------------------------------------------
// ماتریس 4x4 (column-major مثل three.js)
// ---------------------------------------------------------------------------
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

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

function compose(t = [0, 0, 0], r = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = r;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const [sx, sy, sz] = s;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1,
  ];
}

const nodeMatrix = (node) => node.matrix || compose(node.translation, node.rotation, node.scale);

function transformPoint(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

// ---------------------------------------------------------------------------
// اندازه‌ی تصویر از هدر PNG / JPEG
// ---------------------------------------------------------------------------
function imageSize(buf, mime) {
  try {
    if (mime === 'image/png' || (buf[0] === 0x89 && buf[1] === 0x50)) {
      // IHDR در بایت ۱۶ و ۲۰
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
    if (mime === 'image/jpeg' || (buf[0] === 0xff && buf[1] === 0xd8)) {
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) { i += 1; continue; }
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
        }
        i += 2 + len;
      }
    }
    if (mime === 'image/webp' || (buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50)) {
      const fmt = buf.toString('ascii', 12, 16);
      if (fmt === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
      if (fmt === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
      }
      if (fmt === 'VP8X') {
        return { w: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)), h: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)) };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

// ---------------------------------------------------------------------------
// تحلیل یک GLB
// ---------------------------------------------------------------------------
const BONE_PATTERNS = {
  head: /head(?!.*(gear|set|light|phone))/i,
  neck: /neck/i,
  handL: /(left.*hand|hand.*l|^l_?hand|hand_l)/i,
  handR: /(right.*hand|hand.*r|^r_?hand|hand_r)/i,
  footL: /(left.*foot|foot.*l|toe.*l)/i,
  footR: /(right.*foot|foot.*r|toe.*r)/i,
  hips: /(hips|pelvis)/i,
  spine: /spine/i,
};

function analyze(file, rel) {
  const parsed = readGlb(file);
  if (!parsed) return { error: 'not a GLB' };
  const { json, bin, bytes } = parsed;
  const accessors = json.accessors || [];
  const meshes = json.meshes || [];
  const nodes = json.nodes || [];
  const anims = json.animations || [];
  const textures = json.textures || [];
  const images = json.images || [];
  const materials = json.materials || [];
  const skins = json.skins || [];

  // ---- bbox دنیا + مثلث‌ها ----
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;
  let primitives = 0;
  const meshNames = [];

  const walk = (index, parentMatrix) => {
    const node = nodes[index];
    if (!node) return;
    const matrix = multiply(parentMatrix, nodeMatrix(node));
    if (node.mesh !== undefined) {
      const mesh = meshes[node.mesh];
      if (mesh) {
        meshNames.push(mesh.name || `mesh${node.mesh}`);
        for (const prim of mesh.primitives || []) {
          primitives += 1;
          const acc = accessors[prim.attributes?.POSITION];
          if (acc) {
            if (acc.count) {
              const idxAcc = prim.indices !== undefined ? accessors[prim.indices] : null;
              triangles += Math.floor((idxAcc?.count ?? acc.count) / 3);
            }
            if (acc.min && acc.max) {
              for (let c = 0; c < 8; c += 1) {
                const corner = [
                  c & 1 ? acc.max[0] : acc.min[0],
                  c & 2 ? acc.max[1] : acc.min[1],
                  c & 4 ? acc.max[2] : acc.min[2],
                ];
                const p = transformPoint(matrix, corner);
                for (let a = 0; a < 3; a += 1) {
                  if (p[a] < min[a]) min[a] = p[a];
                  if (p[a] > max[a]) max[a] = p[a];
                }
              }
            }
          }
        }
      }
    }
    for (const child of node.children || []) walk(child, matrix);
  };

  const scene = json.scenes?.[json.scene ?? 0];
  for (const root of scene?.nodes || []) walk(root, IDENTITY);

  const hasBBox = min[0] !== Infinity;
  const r3 = (v) => Math.round(v * 1000) / 1000;

  // ---- استخوان‌ها ----
  const nodeNames = nodes.map((n) => n.name || '').filter(Boolean);
  const bones = {};
  for (const [key, re] of Object.entries(BONE_PATTERNS)) {
    const found = nodeNames.find((n) => re.test(n));
    if (found) bones[key] = found;
  }
  const skinned = skins.length > 0 || nodes.some((n) => n.skin !== undefined);

  // ---- کلیپ‌ها ----
  const clips = anims.map((a) => {
    let duration = 0;
    for (const sampler of a.samplers || []) {
      const acc = accessors[sampler.input];
      const t = acc?.max?.[0];
      if (Number.isFinite(t) && t > duration) duration = t;
    }
    return { name: a.name || '(unnamed)', duration: Math.round(duration * 100) / 100, channels: (a.channels || []).length };
  });

  // ---- تکسچرها ----
  const textureSizes = [];
  for (const img of images) {
    let size = null;
    if (img.bufferView !== undefined && bin) {
      const bv = json.bufferViews[img.bufferView];
      if (bv) {
        const start = bv.byteOffset || 0;
        const slice = bin.subarray(start, start + bv.byteLength);
        size = imageSize(slice, img.mimeType);
      }
    }
    textureSizes.push({
      name: img.name || img.mimeType || 'image',
      mime: img.mimeType || '',
      width: size?.w ?? null,
      height: size?.h ?? null,
      bytes: img.bufferView !== undefined ? json.bufferViews[img.bufferView]?.byteLength ?? null : null,
    });
  }
  const maxTex = textureSizes.reduce((m, t) => Math.max(m, t.width || 0, t.height || 0), 0);

  // ---- accessor با فشرده‌سازی Draco؟ ----
  const draco = (json.extensionsUsed || []).includes('KHR_draco_mesh_compression');
  const meshopt = (json.extensionsUsed || []).includes('EXT_meshopt_compression');

  return {
    file: rel,
    bytes,
    kb: Math.round((bytes / 1024) * 10) / 10,
    heavy: bytes > 500 * 1024,
    bbox: hasBBox
      ? {
        height: r3(max[1] - min[1]),
        width: r3(max[0] - min[0]),
        depth: r3(max[2] - min[2]),
        minY: r3(min[1]),
        centerX: r3((min[0] + max[0]) / 2),
        centerZ: r3((min[2] + max[2]) / 2),
        min: min.map(r3),
        max: max.map(r3),
      }
      : null,
    triangles,
    primitives,
    meshes: meshes.length,
    materials: materials.length,
    textures: textureSizes.length,
    maxTextureSize: maxTex,
    textureSizes,
    skinned,
    bones,
    clips,
    compressed: { draco, meshopt },
    nodes: nodes.length,
    meshNames: [...new Set(meshNames)].slice(0, 12),
  };
}

// ---------------------------------------------------------------------------
// پیمایش پوشه
// ---------------------------------------------------------------------------
function collect(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, acc);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.glb')) acc.push(full);
  }
  return acc;
}

const files = collect(scanDir).sort();
const report = {
  generatedAt: new Date().toISOString(),
  root: 'public/game-models',
  count: files.length,
  totalMB: 0,
  entries: {},
};

let totalBytes = 0;
const rows = [];

for (const full of files) {
  const rel = path.relative(scanDir, full).split(path.sep).join('/');
  let info;
  try {
    info = analyze(full, rel);
  } catch (err) {
    info = { file: rel, error: err.message };
  }
  report.entries[rel] = info;
  if (info.bytes) totalBytes += info.bytes;
  rows.push(info);
}

report.totalMB = Math.round((totalBytes / 1024 / 1024) * 100) / 100;

// ---------------------------------------------------------------------------
// پاسخ به سؤالات باز فاز ۰ (به‌صورت خودکار از گزارش)
// ---------------------------------------------------------------------------
const get = (k) => report.entries[k] || null;
const openQuestions = {
  birchTrees: (() => {
    const b = get('trees/BirchTrees.glb');
    if (!b?.bbox) return null;
    const ratio = b.bbox.width / Math.max(b.bbox.depth, 0.001);
    const many = b.meshes > 3 || (b.meshNames || []).length > 3;
    return {
      width: b.bbox.width, depth: b.bbox.depth, height: b.bbox.height,
      meshes: b.meshes, meshNames: b.meshNames,
      verdict: many || ratio > 3 ? 'grove (چند درخت در یک فایل)' : 'single tree (تک‌درخت)',
    };
  })(),
  bridges: {
    bridge: get('Bridge.glb')?.bbox,
    woodBridge: get('Woodbridge.glb')?.bbox,
    note: 'کدام کشیده‌تر/پهن‌تر است برای عبور از رودخانه',
  },
  rockPath: (() => {
    const p = get('beach/RockPathRoundSmall.glb');
    if (!p?.bbox) return null;
    return { bbox: p.bbox, verdict: p.bbox.width / Math.max(p.bbox.depth, 0.001) > 4 ? 'strip (نوار مسیر)' : 'single stone (تک‌سنگ)' };
  })(),
  umbrellaAndChairs: get('Umbrellaandchairs.glb')?.bbox,
  potVsCauldron: {
    pot: get('Pot.glb')?.bbox,
    cauldron: get('Cauldron.glb')?.bbox,
  },
  rigged: Object.fromEntries(
    rows
      .filter((r) => r.file && (r.file.startsWith('npc/') || r.file.startsWith('animals/') || r.file.startsWith('characters/')))
      .map((r) => [r.file, { skinned: r.skinned, bones: r.bones, clips: (r.clips || []).map((c) => c.name) }])
  ),
};
report.openQuestions = openQuestions;

// ---------------------------------------------------------------------------
// خروجی
// ---------------------------------------------------------------------------
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

// خلاصه ترمینال
const pad = (s, n) => String(s).padEnd(n);
console.log(`\nGLB INSPECT — ${files.length} files, ${report.totalMB} MB total\n`);
console.log(`${pad('file', 44)} ${pad('KB', 8)} ${pad('H', 7)} ${pad('minY', 7)} ${pad('tris', 8)} ${pad('tex', 6)} ${pad('sk', 3)} clips`);
console.log('-'.repeat(120));
for (const r of rows) {
  if (r.error) {
    console.log(`${pad(r.file, 44)} ERROR ${r.error}`);
    continue;
  }
  const b = r.bbox;
  console.log(
    `${pad(r.file, 44)} ${pad(r.kb, 8)} ${pad(b ? b.height : '-', 7)} ${pad(b ? b.minY : '-', 7)} ${pad(r.triangles, 8)} ${pad(`${r.textures}${r.maxTextureSize ? `@${r.maxTextureSize}` : ''}`, 6)} ${pad(r.skinned ? 'Y' : '-', 3)} ${r.clips.map((c) => c.name).join(',')}`
  );
}

console.log('\n--- Open questions ---');
console.log('BirchTrees:', JSON.stringify(openQuestions.birchTrees));
console.log('RockPath  :', JSON.stringify(openQuestions.rockPath));
console.log('Bridge    :', JSON.stringify(openQuestions.bridges.bridge));
console.log('Woodbridge:', JSON.stringify(openQuestions.bridges.woodBridge));
console.log('Pot       :', JSON.stringify(openQuestions.potVsCauldron.pot));
console.log('Cauldron  :', JSON.stringify(openQuestions.potVsCauldron.cauldron));
console.log('UmbChairs :', JSON.stringify(openQuestions.umbrellaAndChairs));
console.log('\nrigged npc/animals:');
for (const [k, v] of Object.entries(openQuestions.rigged)) {
  if (k.startsWith('npc/') || k.startsWith('animals/')) {
    console.log(`  ${pad(k, 32)} skinned=${v.skinned ? 'Y' : '-'} bones=${Object.keys(v.bones).join(',') || '-'} clips=${v.clips.join(',') || '-'}`);
  }
}
console.log(`\n→ ${path.relative(frontendRoot, outFile)}\n`);
