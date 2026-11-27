#!/usr/bin/env node
// ---------------------------------------------------------------------------
// inspect-characters.mjs — تحلیل اختصاصی هر کاراکتر GLB
//
// برای هر فایل زیر public/game-models/characters گزارش می‌دهد:
//   • bbox کامل (min/max/center/height/width/depth) + minY + groundOffset
//   • skinned یا static بودن
//   • همه‌ی نام استخوان‌ها + موقعیت جهانی استخوان‌های کلیدی
//   • همه‌ی animation clip ها + مدت + تعداد کانال
//   • جهت «جلو»ی مدل با چند سیگنال مستقل و رأی‌گیری:
//       1) دست‌بودن ریگ (چپ/راست واقعی → forward = up × right)
//       2) مش‌های نام‌دار صورت (face/eye/screen/mouth…) و مرکزشان
//       3) برجستگی سر/پا نسبت به مرکز bbox
//       4) فرورفتگی نرمال‌ها (حفره‌ی چشم/دهان سمت صورت است)
//   • اندازه‌ی تکسچرها، تعداد مثلث، مش/متریال، لیست مش‌ها
//   • لنگرهای کمد (کلاه/عینک/کوله/پیراهن) در «فضای بصری»:
//       مدل رو به +Z چرخیده، پاها روی y=0، ارتفاع TARGET_HEIGHT.
//       دقیقاً همان فضایی که Character.jsx آیتم‌ها را می‌چیند.
//
// خروجی: src/game/characterReport.json
// اجرا:  node scripts/inspect-characters.mjs
//        node scripts/inspect-characters.mjs --dir public/game-models/characters \
//                                            --out src/game/characterReport.json
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

globalThis.self = globalThis;

const here = path.dirname(url.fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const scanDir = path.resolve(frontendRoot, arg('--dir', 'public/game-models/characters'));
const outFile = path.resolve(frontendRoot, arg('--out', 'src/game/characterReport.json'));

// ارتفاع هدف بازی (هم‌راستا با TARGET_HEIGHT در characterConfig.js)
const TARGET_HEIGHT = 1.75;

// ---------------------------------------------------------------------------
// خواندن مستقیم GLB (تکسچرها / کلیپ‌ها / بایت)
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

function imageSize(buf, mime) {
  try {
    if (mime === 'image/png' || (buf[0] === 0x89 && buf[1] === 0x50)) {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
    if (mime === 'image/jpeg' || (buf[0] === 0xff && buf[1] === 0xd8)) {
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) { i += 1; continue; }
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
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
        return {
          w: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
          h: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
        };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function textureInfo(parsed) {
  const out = [];
  if (!parsed) return out;
  const { json, bin } = parsed;
  for (const img of json.images || []) {
    let size = null;
    if (img.bufferView !== undefined && bin) {
      const bv = json.bufferViews[img.bufferView];
      if (bv) {
        const start = bv.byteOffset || 0;
        size = imageSize(bin.subarray(start, start + bv.byteLength), img.mimeType);
      }
    }
    out.push({
      name: img.name || img.mimeType || 'image',
      mime: img.mimeType || '',
      width: size?.w ?? null,
      height: size?.h ?? null,
      bytes: img.bufferView !== undefined ? json.bufferViews[img.bufferView]?.byteLength ?? null : null,
    });
  }
  return out;
}

function clipInfo(parsed) {
  if (!parsed) return [];
  const { json } = parsed;
  const accessors = json.accessors || [];
  return (json.animations || []).map((a) => {
    let duration = 0;
    for (const sampler of a.samplers || []) {
      const acc = accessors[sampler.input];
      const t = acc?.max?.[0];
      if (Number.isFinite(t) && t > duration) duration = t;
    }
    return {
      name: a.name || '(unnamed)',
      duration: Math.round(duration * 100) / 100,
      channels: (a.channels || []).length,
      samplers: (a.samplers || []).length,
    };
  });
}

// ---------------------------------------------------------------------------
// بارگذاری با GLTFLoader
// ---------------------------------------------------------------------------
const loader = new GLTFLoader();
function loadGltf(file) {
  const buf = fs.readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => loader.parse(ab, '', resolve, reject));
}

const BONE_PATTERNS = {
  head: /^head$|head(?!.*(gear|set|light|phone))/i,
  neck: /neck/i,
  spine: /spine/i,
  hips: /(hips|pelvis)/i,
  chest: /chest|torso|upperbody|spine2/i,
  leftArm: /(left.*(arm|shoulder)|upper_?arm.*_?l\b|^l_?(arm|shoulder))/i,
  rightArm: /(right.*(arm|shoulder)|upper_?arm.*_?r\b|^r_?(arm|shoulder))/i,
  leftHand: /(left.*hand|hand.*_?l\b|^l_?hand)/i,
  rightHand: /(right.*hand|hand.*_?r\b|^r_?hand)/i,
  leftFoot: /(left.*(foot|ankle)|foot.*_?l\b|toe.*_?l\b)/i,
  rightFoot: /(right.*(foot|ankle)|foot.*_?r\b|toe.*_?r\b)/i,
};

// استخوان‌های چپ/راست — الگوهای رایج:
//   L_Thigh, thighL_11, pelvisL_9, forearmL, LeftArm, Arm_L, left_hand
// حرف L/R باید یا بعد از جداکننده باشد یا بلافاصله بعد از حرف کوچک و قبل از
// جداکننده/رقم/پایان — تا «GLTF» یا کلمات عادی اشتباه گرفته نشوند.
const LEFT_BONE_RE =
  /(?:^|[_.\s-])L(?:[_.\s-]|\d|$)|[a-z]L(?:[_.\s-]|\d|$)|(?:^|[_.\s-])left(?:[_.\s-]|\d|$)/;
const RIGHT_BONE_RE =
  /(?:^|[_.\s-])R(?:[_.\s-]|\d|$)|[a-z]R(?:[_.\s-]|\d|$)|(?:^|[_.\s-])right(?:[_.\s-]|\d|$)/;

const FACE_NAME_RE = /face|eye|eyes|visor|screen|glow|mouth|nose|snout|muzzle|beak|cheek|brow/i;

const r3 = (v) => Math.round(v * 1000) / 1000;
const vec3 = (v) => [r3(v.x), r3(v.y), r3(v.z)];

// نمونه‌برداری از رأس‌ها با اعمال skinning برای مش‌های اسکلتی.
// هندسه‌ی خام SkinnedMesh در bind space است؛ getVertexPosition آن را به فضای
// محلیِ پس از skinning می‌برد و سپس matrixWorld به فضای جهانی تبدیل می‌کند.
function forEachVertex(scene, maxSamples, cb) {
  const v = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const p = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(p.count / maxSamples));
    for (let i = 0; i < p.count; i += step) {
      if (o.isSkinnedMesh && typeof o.getVertexPosition === 'function') {
        o.getVertexPosition(i, v);
      } else {
        v.fromBufferAttribute(p, i);
      }
      v.applyMatrix4(o.matrixWorld);
      cb(v, o, i);
    }
  });
}

// چرخش نقطه حول Y — هم‌راستا با three.js rotation.y
function rotateY(x, z, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [x * c + z * s, -x * s + z * c];
}

// آفست چرخش لازم تا محور جلوی بومی مدل به +Z برود (همان facingOffset در بازی)
function axisToRotation(axis) {
  if (axis === 'z') return 0;
  if (axis === '-z') return Math.PI;
  if (axis === 'x') return -Math.PI / 2;
  return Math.PI / 2; // '-x'
}

function analyzeCharacter(file, rel, parsed) {
  const bytes = parsed?.bytes ?? fs.statSync(file).size;
  const report = {
    file: rel,
    name: path.basename(file, path.extname(file)),
    bytes,
    kb: Math.round((bytes / 1024) * 10) / 10,
    skinned: false,
    bones: { all: [], named: {} },
    bonePositions: {},
    animations: clipInfo(parsed),
    textures: textureInfo(parsed),
    maxTextureSize: 0,
    triangles: 0,
    meshes: 0,
    materials: 0,
    meshList: [],
    bbox: null,
    forward: null,
    visual: null,
    anchors: null,
    fallbackAnchors: null,
  };
  report.maxTextureSize = report.textures.reduce((m, t) => Math.max(m, t.width || 0, t.height || 0), 0);

  const gltf = globalThis.__gltf;
  const scene = gltf.scene;
  scene.updateWorldMatrix(true, true);

  // ---- مش‌ها / مثلث / متریال ----
  const mats = new Set();
  const bones = [];
  const meshBox = new Map(); // mesh → Box3 واقعی از رأس‌ها
  const meshVertexCount = new Map();
  const measureMesh = (o) => {
    const b = new THREE.Box3();
    const tmp = new THREE.Vector3();
    const p = o.geometry?.attributes?.position;
    if (!p) return b;
    for (let i = 0; i < p.count; i += 1) {
      if (o.isSkinnedMesh && typeof o.getVertexPosition === 'function') o.getVertexPosition(i, tmp);
      else tmp.fromBufferAttribute(p, i);
      tmp.applyMatrix4(o.matrixWorld);
      b.expandByPoint(tmp);
    }
    return b;
  };
  scene.traverse((o) => {
    if (o.isBone) bones.push(o);
    if (!o.isMesh) return;
    report.meshes += 1;
    const g = o.geometry;
    if (g) {
      const count = g.index ? g.index.count : g.attributes?.position?.count ?? 0;
      report.triangles += Math.floor(count / 3);
    }
    const m = o.material;
    (Array.isArray(m) ? m : [m]).forEach((mm) => mm && mats.add(mm));
    if (o.isSkinnedMesh) report.skinned = true;

    const mb = measureMesh(o);
    meshBox.set(o, mb);
    meshVertexCount.set(o, g?.attributes?.position?.count ?? 0);
    const mc = new THREE.Vector3();
    const ms = new THREE.Vector3();
    mb.getCenter(mc);
    mb.getSize(ms);
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    report.meshList.push({
      name: o.name || '(unnamed)',
      material: mat?.name || '',
      color: mat?.color ? `#${mat.color.getHexString()}` : null,
      center: vec3(mc),
      size: vec3(ms),
      vertices: g?.attributes?.position?.count ?? 0,
    });
  });
  report.materials = mats.size;

  // ---- bbox واقعی از رأس‌ها ----
  // توجه: Box3.setFromObject از AABB هر مش استفاده می‌کند و اگر زیرگره‌ها
  // چرخیده باشند، AABB متورم می‌شود (مثلاً cute_axolotl: 4.85 دروغی در برابر
  // 3.58 واقعی). پس bbox را از رأس‌های واقعی می‌سازیم.
  const box = new THREE.Box3();
  for (const mb of meshBox.values()) box.union(mb);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const height = size.y || 0.0001;
  report.bbox = {
    min: vec3(box.min),
    max: vec3(box.max),
    center: vec3(center),
    height: r3(size.y),
    width: r3(size.x),
    depth: r3(size.z),
    minY: r3(box.min.y),
    maxY: r3(box.max.y),
    centerX: r3(center.x),
    centerZ: r3(center.z),
  };

  // ---- استخوان‌ها ----
  report.bones.all = bones.map((b) => b.name).filter(Boolean);
  for (const [key, re] of Object.entries(BONE_PATTERNS)) {
    const found = bones.find((b) => re.test(b.name));
    if (found) {
      report.bones.named[key] = found.name;
      const p = new THREE.Vector3();
      found.getWorldPosition(p);
      report.bonePositions[key] = vec3(p);
    }
  }

  // ---- سیگنال ۱: مش‌های نام‌دار صورت ----
  const faceMeshes = report.meshList.filter((m) => FACE_NAME_RE.test(`${m.name} ${m.material}`));
  let faceSignal = null;
  if (faceMeshes.length) {
    const vol = (m) => Math.max(1e-6, m.size[0] * m.size[1] * m.size[2]);
    const totalVol = faceMeshes.reduce((s, m) => s + vol(m), 0);
    let fx = 0, fy = 0, fz = 0;
    for (const m of faceMeshes) {
      const w = vol(m) / totalVol;
      fx += m.center[0] * w;
      fy += m.center[1] * w;
      fz += m.center[2] * w;
    }
    faceSignal = {
      meshes: faceMeshes.map((m) => m.name),
      centroid: [r3(fx), r3(fy), r3(fz)],
      offsetFromCenter: [r3(fx - center.x), r3(fz - center.z)],
    };
  }

  // ---- سیگنال ۲: دست‌بودن ریگ (L/R) ----
  const wp = (b) => {
    const p = new THREE.Vector3();
    b.getWorldPosition(p);
    return p;
  };
  const leftBones = bones.filter((b) => LEFT_BONE_RE.test(b.name));
  const rightBones = bones.filter((b) => RIGHT_BONE_RE.test(b.name));
  let handedSignal = null;
  if (leftBones.length && rightBones.length) {
    const avg = (arr) => {
      const a = new THREE.Vector3();
      arr.forEach((b) => a.add(wp(b)));
      return a.multiplyScalar(1 / arr.length);
    };
    const L = avg(leftBones);
    const R = avg(rightBones);
    // right = R - L ; forward = up × right = (rz, 0, -rx)
    const rx = R.x - L.x;
    const rz = R.z - L.z;
    const fwdX = rz;
    const fwdZ = -rx;
    let axis;
    if (Math.abs(fwdX) >= Math.abs(fwdZ)) axis = fwdX > 0 ? 'x' : '-x';
    else axis = fwdZ > 0 ? 'z' : '-z';
    handedSignal = {
      leftBones: leftBones.length,
      rightBones: rightBones.length,
      leftAvg: vec3(L),
      rightAvg: vec3(R),
      rightVector: [r3(rx), r3(rz)],
      forwardVector: [r3(fwdX), r3(fwdZ)],
      axis,
    };
  }

  // ---- سیگنال ۳: برجستگی سر/پا ----
  const v = new THREE.Vector3();
  const midX = (box.min.x + box.max.x) / 2;
  const midZ = (box.min.z + box.max.z) / 2;
  const headCut = box.min.y + height * 0.78;
  const feetCut = box.min.y + height * 0.10;

  let headN = 0, headSumX = 0, headSumY = 0, headSumZ = 0;
  let headMaxX = -Infinity, headMinX = Infinity, headMaxZ = -Infinity, headMinZ = Infinity;
  let feetN = 0, feetMaxX = -Infinity, feetMinX = Infinity, feetMaxZ = -Infinity, feetMinZ = Infinity;

  forEachVertex(scene, 8000, (pv) => {
    if (pv.y >= headCut) {
      headN += 1;
      headSumX += pv.x; headSumY += pv.y; headSumZ += pv.z;
      headMaxX = Math.max(headMaxX, pv.x); headMinX = Math.min(headMinX, pv.x);
      headMaxZ = Math.max(headMaxZ, pv.z); headMinZ = Math.min(headMinZ, pv.z);
    } else if (pv.y <= feetCut) {
      feetN += 1;
      feetMaxX = Math.max(feetMaxX, pv.x); feetMinX = Math.min(feetMinX, pv.x);
      feetMaxZ = Math.max(feetMaxZ, pv.z); feetMinZ = Math.min(feetMinZ, pv.z);
    }
  });

  const protrude = {
    headZ: headN ? (headMaxZ - midZ) - (midZ - headMinZ) : 0,
    headX: headN ? (headMaxX - midX) - (midX - headMinX) : 0,
    feetZ: feetN ? (feetMaxZ - midZ) - (midZ - feetMinZ) : 0,
    feetX: feetN ? (feetMaxX - midX) - (midX - feetMinX) : 0,
  };
  const protrusionSignal = {
    headZ: r3(protrude.headZ),
    headX: r3(protrude.headX),
    feetZ: r3(protrude.feetZ),
    feetX: r3(protrude.feetX),
  };

  // ---- سیگنال ۴: چگالی مثلث‌های نیمه‌ی سر (سمت صورت = جزئیات بیشتر) ----
  // چشم/دهان/مژه/بینی همه در سمت صورت‌اند، پس آن نیمه مثلث بیشتری دارد.
  const density = { xp: 0, xn: 0, zp: 0, zn: 0 };
  {
    const lo = box.min.y + height * 0.58;
    const hi = box.min.y + height * 0.98;
    const tmp = new THREE.Vector3();
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const geo = o.geometry;
      const idx = geo.index;
      const tris = idx ? idx.count / 3 : (geo.attributes?.position?.count ?? 0) / 3;
      const step = Math.max(1, Math.floor(tris / 30000));
      for (let t = 0; t < tris; t += step) {
        const i0 = idx ? idx.getX(t * 3) : t * 3;
        if (o.isSkinnedMesh && typeof o.getVertexPosition === 'function') {
          o.getVertexPosition(i0, tmp);
        } else {
          tmp.fromBufferAttribute(geo.attributes.position, i0);
        }
        tmp.applyMatrix4(o.matrixWorld);
        if (tmp.y < lo || tmp.y > hi) continue;
        const dx = tmp.x - center.x;
        const dz = tmp.z - center.z;
        if (Math.abs(dx) >= Math.abs(dz)) density[dx > 0 ? 'xp' : 'xn'] += 1;
        else density[dz > 0 ? 'zp' : 'zn'] += 1;
      }
    });
  }
  const densitySignal = Object.fromEntries(Object.entries(density).map(([k, val]) => [k, val]));
  let densityAxis = null;
  {
    const pairs = [
      ['x', density.xp, '-x', density.xn],
      ['z', density.zp, '-z', density.zn],
    ];
    // محور با بیشترین تفاوت بین دو نیمه
    let bestDiff = 0;
    for (const [aPos, nPos, aNeg, nNeg] of pairs) {
      const total = nPos + nNeg;
      if (total < 20) continue;
      const diff = Math.abs(nPos - nNeg) / total;
      if (diff > bestDiff) {
        bestDiff = diff;
        densityAxis = nPos >= nNeg ? aPos : aNeg;
      }
    }
    if (bestDiff < 0.18) densityAxis = null;
  }

  // ---- سیگنال ۴: فرورفتگی نرمال‌ها (حفره‌ی چشم/دهان) ----
  const nm = new THREE.Matrix3();
  const n = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const concave = { xp: 0, xn: 0, zp: 0, zn: 0 };
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position || !o.geometry.attributes.normal) return;
    const p = o.geometry.attributes.position;
    const na = o.geometry.attributes.normal;
    nm.getNormalMatrix(o.matrixWorld);
    const step = Math.max(1, Math.floor(p.count / 20000));
    for (let i = 0; i < p.count; i += step) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      if (v.y < box.min.y + height * 0.55 || v.y > box.min.y + height * 0.98) continue;
      n.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
      radial.set(v.x - center.x, 0, v.z - center.z);
      if (radial.lengthSq() < 1e-8) continue;
      radial.normalize();
      const c = -n.dot(radial); // >0 = concave (رو به داخل)
      if (c <= 0) continue;
      if (Math.abs(v.x - center.x) >= Math.abs(v.z - center.z)) {
        if (v.x > center.x) concave.xp += c; else concave.xn += c;
      } else {
        if (v.z > center.z) concave.zp += c; else concave.zn += c;
      }
    }
  });
  const concavitySignal = Object.fromEntries(Object.entries(concave).map(([k, val]) => [k, r3(val)]));
  const concMax = Math.max(concave.xp, concave.xn, concave.zp, concave.zn);
  let concavityAxis = null;
  if (concMax > 1) {
    if (concMax === concave.xp) concavityAxis = 'x';
    else if (concMax === concave.xn) concavityAxis = '-x';
    else if (concMax === concave.zp) concavityAxis = 'z';
    else concavityAxis = '-z';
  }

  // ---- تصمیم نهایی جهت جلو (رأی‌گیری وزنی) ----
  const votes = { z: 0, '-z': 0, x: 0, '-x': 0 };
  const evidence = [];
  const addVote = (axis, weight, why) => {
    if (!axis) return;
    votes[axis] += weight;
    evidence.push(`${why} → ${axis}`);
  };
  if (handedSignal?.axis) addVote(handedSignal.axis, 3, `rig L/R (${handedSignal.forwardVector.join(',')})`);
  if (faceSignal) {
    const [dx, dz] = faceSignal.offsetFromCenter;
    const ax = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'x' : '-x') : dz > 0 ? 'z' : '-z';
    if (Math.max(Math.abs(dx), Math.abs(dz)) > Math.max(size.x, size.z) * 0.03) {
      addVote(ax, 3, `face meshes (${faceSignal.meshes.join(',')})`);
    }
  }
  if (densityAxis) addVote(densityAxis, 2, `head triangle density (${densityAxis})`);
  if (concavityAxis) addVote(concavityAxis, 1, `normal concavity (${concMax.toFixed(1)})`);
  {
    const ax = Math.abs(protrude.headX) >= Math.abs(protrude.headZ)
      ? (protrude.headX > 0 ? 'x' : '-x')
      : (protrude.headZ > 0 ? 'z' : '-z');
    if (Math.max(Math.abs(protrude.headX), Math.abs(protrude.headZ)) > Math.max(size.x, size.z) * 0.01) {
      addVote(ax, 1, 'head protrusion');
    }
  }
  votes.z += 0.5; // پیش‌فرض صنعت glTF

  let axis = 'z';
  let best = -Infinity;
  for (const [a, score] of Object.entries(votes)) {
    if (score > best) { best = score; axis = a; }
  }
  const totalVotes = Object.values(votes).reduce((s, x) => s + x, 0);
  const ratio = best / totalVotes;
  const confidence = ratio > 0.68 ? 'high' : ratio > 0.5 ? 'medium' : 'low';
  const forwardRotation = axisToRotation(axis);

  report.forward = {
    axis,
    rotation: r3(forwardRotation),
    confidence,
    votes: Object.fromEntries(Object.entries(votes).map(([k, val]) => [k, r3(val)])),
    evidence,
    signals: { face: faceSignal, handedness: handedSignal, protrusion: protrusionSignal, concavity: concavitySignal, density: densitySignal },
    note:
      confidence === 'low'
        ? 'نشانه‌های هندسی هم‌سو نیستند؛ با Ctrl+Shift+F و کلیدهای [ و ] در بازی تنظیم زنده کنید'
        : 'چند سیگنال مستقل هم‌سو هستند',
  };

  // ---- تبدیل به فضای بصری (رو به +Z، پا روی y=0، ارتفاع TARGET_HEIGHT) ----
  // در Character.jsx مدل حول مبدأ خودش با rotation.y=forwardRotation می‌چرخد،
  // با scale=TARGET/height بزرگ می‌شود، و پاها با groundOffset روی زمین می‌نشینند.
  // پس لنگرها در همین فضای «بصری» محاسبه می‌شوند: Y نسبت به minY، XZ چرخیده و مقیاس‌شده.
  const s = TARGET_HEIGHT / height;
  const axisIsX = axis === 'x' || axis === '-x';

  // ابر نقطه‌ی کامل در فضای بصری برای اندازه‌گیری‌های درصدی (مقاوم به گوش/آبشش)
  const cloud = [];
  forEachVertex(scene, 30000, (pv) => {
    const [vx, vz] = rotateY(pv.x, pv.z, forwardRotation);
    cloud.push([vx * s, (pv.y - box.min.y) * s, vz * s]);
  });

  const pct = (arr, q) => {
    if (!arr.length) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
    return sorted[i];
  };
  const band = (loY, hiY) => cloud.filter((p) => p[1] >= loY && p[1] <= hiY);

  const headTopY = TARGET_HEIGHT;
  const crown = band(headTopY * 0.94, headTopY); // بالاترین ۶٪ — روی تاج سر
  const faceBand = band(headTopY * 0.62, headTopY * 0.86); // صورت/خط چشم
  const eyeBand = band(headTopY * 0.66, headTopY * 0.82);
  const torsoBand = band(TARGET_HEIGHT * 0.42, TARGET_HEIGHT * 0.62);

  const bandStats = (pts) => {
    if (!pts.length) return null;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const zs = pts.map((p) => p[2]);
    return {
      n: pts.length,
      x5: pct(xs, 0.05), x50: pct(xs, 0.5), x95: pct(xs, 0.95),
      y5: pct(ys, 0.05), y50: pct(ys, 0.5), y95: pct(ys, 0.95),
      z5: pct(zs, 0.05), z50: pct(zs, 0.5), z95: pct(zs, 0.95),
    };
  };
  const crownStats = bandStats(crown);
  const faceStats = bandStats(faceBand);
  const eyeStats = bandStats(eyeBand);
  const torsoStats = bandStats(torsoBand);

  // اجزای لنگر (اگر باند خالی بود، از bbox بصری مدل استفاده می‌شود)
  const fallbackCrown = { x50: 0, z50: 0 };
  const crownX = crownStats ? r3(crownStats.x50) : fallbackCrown.x50;
  const crownZ = crownStats ? r3(crownStats.z50) : fallbackCrown.z50;

  const faceX = faceStats ? r3(faceStats.x50) : 0;
  const faceZ = faceStats ? r3(faceStats.z50) : 0;
  const faceWidth = faceStats ? r3(faceStats.x95 - faceStats.x5) : bodyWidthFallback();
  const faceDepth = faceStats ? r3(faceStats.z95 - faceStats.z5) : 0.4;
  const faceFrontZ = faceStats ? r3(faceStats.z95) : 0.2;

  function bodyWidthFallback() {
    return r3((axisIsX ? size.z : size.x) * s);
  }

  const eyeY = eyeStats ? r3((eyeStats.y5 + eyeStats.y95) / 2) : r3(headTopY * 0.78);
  const eyeX = eyeStats ? r3(eyeStats.x50) : faceX;
  const eyeFrontZ = eyeStats ? r3(eyeStats.z95) : faceFrontZ;

  const bodyWidth = bodyWidthFallback();
  const visualWidthRaw = axisIsX ? size.z : size.x;
  const visualDepthRaw = axisIsX ? size.x : size.z;
  const bodyDepth = r3(visualDepthRaw * s);

  const torsoY = torsoStats ? r3(torsoStats.y50) : r3(TARGET_HEIGHT * 0.55);
  const torsoBackZ = torsoStats ? r3(torsoStats.z5) : r3(-bodyDepth * 0.5);

  // مقیاس‌ها از عرض واقعی صورت (نه bbox کل، تا گوش/آبشش بزرگ‌نمایی نکند)
  const faceRadius = Math.max(faceWidth, faceDepth) / 2 || 0.22;
  const hatScale = r3(Math.min(1.5, Math.max(0.4, faceRadius / 0.22)));
  const glassesScale = r3(Math.min(1.35, Math.max(0.38, faceRadius / 0.24)));
  const backpackScale = r3(Math.min(1.4, Math.max(0.4, (bodyWidth / 0.62) * 0.8)));

  report.visual = {
    scale: r3(s),
    width: bodyWidth,
    depth: bodyDepth,
    headCenter: [faceX, eyeY, faceZ],
    headWidth: faceWidth,
    headDepth: faceDepth,
    headRadius: r3(faceRadius),
    headTopY: r3(headTopY),
    eyeY,
    torsoY,
    groundOffset: r3(-box.min.y * s),
    modelOriginVisual: (() => {
      const [ox, oz] = rotateY(-center.x, -center.z, forwardRotation);
      return [r3(ox * s), r3(oz * s)];
    })(),
    bands: { crown: crownStats, face: faceStats, eye: eyeStats, torso: torsoStats },
  };

  const hatY = r3(headTopY - 0.02);
  const glassesY = r3(eyeY - 0.02);
  const glassesZPos = r3(eyeFrontZ + 0.02);
  const backpackZPos = r3(torsoBackZ - 0.02);

  // پروپ دست (گیتار/چوب ماهیگیری/تور): کنار تنه، ارتفاع سینه
  const torsoWidth = torsoStats ? r3(torsoStats.x95 - torsoStats.x5) : bodyWidth;
  const propX = r3(Math.max(0.16, Math.min(0.7, torsoWidth * 0.55)));
  const propY = r3(torsoStats ? torsoStats.y50 : torsoY);
  const propZ = r3(torsoStats ? torsoStats.z50 : 0);
  const propScale = r3(Math.min(1.2, Math.max(0.5, bodyWidth / 0.95)));

  report.anchors = {
    hat: { bone: report.bones.named.head || null, x: crownX, y: hatY, z: crownZ, scale: hatScale },
    glasses: { bone: report.bones.named.head || null, x: eyeX, y: glassesY, z: glassesZPos, scale: glassesScale },
    backpack: {
      bone: report.bones.named.spine || report.bones.named.chest || null,
      x: 0,
      y: torsoY,
      z: backpackZPos,
      scale: backpackScale,
    },
    prop: { x: propX, y: propY, z: propZ, scale: propScale },
    shirt: { minT: 0.3, maxT: 0.82, tint: true },
  };
  report.fallbackAnchors = {
    hat: { x: crownX, y: hatY, z: crownZ, scale: hatScale },
    glasses: { x: eyeX, y: glassesY, z: glassesZPos, scale: glassesScale },
    backpack: { x: 0, y: torsoY, z: backpackZPos, scale: backpackScale },
    prop: { x: propX, y: propY, z: propZ, scale: propScale },
  };

  // ---- نگاشت انیمیشن ----
  const clips = report.animations.map((a) => a.name);
  const pick = (patterns) => {
    for (const re of patterns) {
      const found = clips.find((c) => re.test(c));
      if (found) return found;
    }
    return null;
  };
  const only = clips.length === 1 ? clips[0] : null;
  report.animationMap = {
    idle: pick([/idle/i, /breath/i, /stand/i]) || only,
    walk: pick([/walk/i, /move/i]) || only,
    run: pick([/run/i, /sprint/i]) || only,
    jump: pick([/jump/i, /hop/i]) || null,
    wave: pick([/wave/i, /hello/i]) || null,
    dance: pick([/dance/i]) || null,
    sit: pick([/sit/i]) || null,
    sleep: pick([/sleep/i, /death/i]) || null,
    mode: clips.length ? 'clips' : 'procedural',
    all: clips,
  };

  return report;
}

// ---------------------------------------------------------------------------
// اجرا
// ---------------------------------------------------------------------------
const files = fs
  .readdirSync(scanDir)
  .filter((f) => f.toLowerCase().endsWith('.glb'))
  .sort();

const report = {
  generatedAt: new Date().toISOString(),
  root: path.relative(frontendRoot, scanDir).split(path.sep).join('/'),
  targetHeight: TARGET_HEIGHT,
  count: files.length,
  characters: {},
};

const rows = [];
for (const name of files) {
  const full = path.join(scanDir, name);
  const rel = `${path.basename(scanDir)}/${name}`;
  let info;
  try {
    const parsed = readGlb(full);
    const gltf = await loadGltf(full);
    globalThis.__gltf = gltf;
    info = analyzeCharacter(full, rel, parsed);
  } catch (err) {
    info = { file: rel, name: path.basename(name, '.glb'), error: err.message };
  } finally {
    delete globalThis.__gltf;
  }
  const key = path.basename(name, path.extname(name));
  report.characters[key] = info;
  rows.push({ key, ...info });
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

// ---------------------------------------------------------------------------
// خلاصه ترمینال
// ---------------------------------------------------------------------------
const pad = (s, n) => String(s).padEnd(n);
console.log(`\nCHARACTER INSPECT — ${files.length} files\n`);
console.log(
  `${pad('character', 26)} ${pad('KB', 8)} ${pad('H', 7)} ${pad('minY', 8)} ${pad('tris', 8)} ${pad('tex', 9)} ${pad('rig', 4)} ${pad('fwd', 5)} ${pad('conf', 7)} clips`
);
console.log('-'.repeat(132));
for (const r of rows) {
  if (r.error) {
    console.log(`${pad(r.key, 26)} ERROR ${r.error}`);
    continue;
  }
  const b = r.bbox;
  console.log(
    `${pad(r.key, 26)} ${pad(r.kb, 8)} ${pad(b.height, 7)} ${pad(b.minY, 8)} ${pad(r.triangles, 8)} ${pad(
      `${r.textures.length}${r.maxTextureSize ? `@${r.maxTextureSize}` : ''}`,
      9
    )} ${pad(r.skinned ? 'Y' : '-', 4)} ${pad(r.forward.axis, 5)} ${pad(r.forward.confidence, 7)} ${
      r.animations.map((c) => `${c.name}(${c.duration}s)`).join(',') || '-'
    }`
  );
}

console.log('\n--- Forward evidence ---');
for (const r of rows) {
  if (r.error) continue;
  console.log(`  ${pad(r.key, 26)} axis=${pad(r.forward.axis, 4)} → ${r.forward.evidence.join(' | ')}`);
}

console.log('\n--- Visual anchors (forward=+Z, feet=y0, TARGET=1.75) ---');
for (const r of rows) {
  if (r.error) continue;
  const a = r.anchors;
  console.log(
    `  ${pad(r.key, 26)} ground=${pad(r.visual.groundOffset, 8)} hat(y=${a.hat.y}, z=${a.hat.z}, s=${a.hat.scale}) glasses(y=${a.glasses.y}, z=${a.glasses.z}, s=${a.glasses.scale}) pack(y=${a.backpack.y}, z=${a.backpack.z}, s=${a.backpack.scale})`
  );
}

console.log('\n--- Bones ---');
for (const r of rows) {
  if (r.error) continue;
  const named = Object.entries(r.bones.named).map(([k, val]) => `${k}=${val}`).join(', ');
  console.log(`  ${pad(r.key, 26)} ${named || '(بدون استخوان)'}`);
}

console.log(`\n→ ${path.relative(frontendRoot, outFile)}\n`);
