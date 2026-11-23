#!/usr/bin/env node
// ---------------------------------------------------------------------------
// verify-assets.mjs
//  1) بررسی می‌کند هر مسیر manifest با «حروف دقیق» روی دیسک وجود دارد
//     (ویندوز case-insensitive است ولی production لینوکس است)
//  2) فایل‌های public/ که هیچ‌جا رفرنس نشده‌اند را لیست می‌کند
//  3) جدول خلاصه چاپ می‌کند و با کد خروج غیرصفر در صورت خطا برمی‌گردد
//
// اجرا:  node scripts/verify-assets.mjs
//        node scripts/verify-assets.mjs --json   (خروجی JSON برای CI)
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');
const publicRoot = path.join(frontendRoot, 'public');

// manifest را با import داینامیک می‌خوانیم (ESM + alias ندارد، مسیر نسبی)
const manifestPath = path.join(frontendRoot, 'src/game/assetManifest.js');
const manifest = await import(url.pathToFileURL(manifestPath).href);
const { MODEL_ENTRIES, SOUND_ENTRIES, allModelUrls, allSoundUrls, placeholderModels, placeholderSounds } = manifest;

const AS_JSON = process.argv.includes('--json');

// ---------------------------------------------------------------------------
// 1) بررسی وجود فایل با حروف دقیق
// ---------------------------------------------------------------------------
// یک ایندکس از همه‌ی فایل‌های public می‌سازیم (مسیر نسبی با /)
function walk(dir, base = dir, acc = new Set()) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, acc);
    else if (entry.isFile()) acc.add(path.relative(base, full).split(path.sep).join('/'));
  }
  return acc;
}

const publicFiles = walk(publicRoot);

const allEntries = [
  ...Object.entries(MODEL_ENTRIES).map(([k, e]) => ({ key: k, ...e, kindLabel: 'model' })),
  ...Object.entries(SOUND_ENTRIES).map(([k, e]) => ({ key: k, ...e, kindLabel: 'sound' })),
];

const missing = [];
const present = [];
const placeholders = [];

for (const entry of allEntries) {
  if (!entry.url) {
    placeholders.push(entry);
    continue;
  }
  const rel = entry.url.replace(/^\//, ''); // remove leading /
  if (publicFiles.has(rel)) {
    present.push({ ...entry, rel });
  } else {
    // آیا نسخه‌ی با case متفاوت وجود دارد؟ (خطای رایج لینوکس)
    const lower = rel.toLowerCase();
    const caseMatch = [...publicFiles].find((f) => f.toLowerCase() === lower);
    missing.push({ ...entry, rel, caseMatch: caseMatch || null });
  }
}

// ---------------------------------------------------------------------------
// 2) فایل‌های یتیم: در public/ هستند ولی هیچ manifest entry به آن‌ها اشاره نمی‌کند
// ---------------------------------------------------------------------------
const referenced = new Set(allEntries.filter((e) => e.url).map((e) => e.url.replace(/^\//, '')));

// اگر نسخه‌ی opt/<path> رفرنس شده باشد، فایل اصلی <path> «یتیم» نیست
const referencedOriginals = new Set();
for (const r of referenced) {
  if (r.startsWith('game-models/opt/')) {
    referencedOriginals.add(r.replace('game-models/opt/', 'game-models/'));
  }
}
// و برعکس: اگر فایل اصلی رفرنس شود ولی opt/<path> هم موجود باشد (رد شده)، opt یتیم نیست
for (const r of referenced) {
  if (r.startsWith('game-models/') && !r.startsWith('game-models/opt/')) {
    const opt = r.replace('game-models/', 'game-models/opt/');
    if (publicFiles.has(opt)) referencedOriginals.add(opt);
  }
}

// فایل‌هایی که عمداً رفرنس نمی‌شوند (duplicate یا فقط از طریق کد مستقیم)
const IGNORED_PREFIXES = ['draco/', 'avatars/'];
// مسیرهای شناخته‌شده‌ی تکراری/جایگزین‌شده که نگه داشته می‌شوند ولی رفرنس نمی‌شوند
const KNOWN_DUPLICATES = new Set([
  'game-models/missions/Lantern.glb', // کپی Decorations/Lantern.glb
  'game-models/characters/Cactoro.glb', // opt/Cactoro.glb (سبک‌تر) استفاده می‌شود
  'game-models/Decorations/LogFungus.glb', // opt/LogFungus.glb (سبک) استفاده می‌شود
]);
const orphans = [...publicFiles].filter((f) => {
  if (referenced.has(f)) return false;
  if (referencedOriginals.has(f)) return false; // اصل <path> با opt/<path> پوشش داده شده
  if (KNOWN_DUPLICATES.has(f)) return false;
  if (IGNORED_PREFIXES.some((p) => f.startsWith(p))) return false;
  if (!/\.(glb|mp3|m4a|ogg|wav)$/i.test(f)) return false;
  return true;
});

// ---------------------------------------------------------------------------
// 3) آمار
// ---------------------------------------------------------------------------
const heavy = present.filter((e) => e.heavy);
const totalBytes = present.reduce((sum, e) => sum + fs.statSync(path.join(publicRoot, e.rel)).size, 0);

const report = {
  ok: missing.length === 0,
  counts: {
    manifestEntries: allEntries.length,
    filesPresent: present.length,
    missingFiles: missing.length,
    placeholders: placeholders.length,
    orphanFiles: orphans.length,
    heavyFiles: heavy.length,
    totalReferencedBytes: totalBytes,
    totalReferencedMB: Math.round((totalBytes / 1024 / 1024) * 100) / 100,
  },
  missing,
  orphans,
  placeholders: placeholders.map((p) => ({ key: p.key, kind: p.kindLabel, fallback: p.fallback || p.synth || '', note: p.note || '' })),
};

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const C = {
    reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    cyan: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m',
  };
  console.log(`\n${C.bold}ASSET VERIFY${C.reset}  ${C.dim}(public/ vs assetManifest.js)${C.reset}\n`);

  if (missing.length) {
    console.log(`${C.red}${C.bold}MISSING FILES (${missing.length})${C.reset}`);
    for (const m of missing) {
      const hint = m.caseMatch ? ` ${C.yellow}(case mismatch → ${m.caseMatch})${C.reset}` : '';
      console.log(`  ${C.red}✗${C.reset} [${m.kindLabel}] ${m.key}  →  ${m.rel}${hint}`);
    }
    console.log();
  } else {
    console.log(`${C.green}✓ همه‌ی مسیرهای manifest روی دیسک با case دقیق موجودند.${C.reset}\n`);
  }

  if (orphans.length) {
    console.log(`${C.yellow}ORPHAN FILES (${orphans.length}) — در public هستند ولی هیچ manifest entry ندارند:${C.reset}`);
    for (const o of orphans) console.log(`  ${C.dim}·${C.reset} ${o}`);
    console.log();
  }

  if (placeholders.length) {
    console.log(`${C.cyan}PLACEHOLDERS (${placeholders.length}) — فایل نداریم، primitive/synth جایگزین می‌شود:${C.reset}`);
    for (const p of placeholders) {
      const alt = p.fallback || p.synth || '';
      console.log(`  ${C.dim}·${C.reset} [${p.kindLabel}] ${p.key}${alt ? `  →  ${C.dim}${alt}${C.reset}` : ''}`);
    }
    console.log();
  }

  const c = report.counts;
  console.log(`${C.bold}SUMMARY${C.reset}`);
  console.log(`  entries=${c.manifestEntries}  present=${c.filesPresent}  missing=${c.missingFiles}  placeholders=${c.placeholders}`);
  console.log(`  orphans=${c.orphanFiles}  heavy=${c.heavyFiles}  payload=${c.totalReferencedMB} MB`);
  console.log(`  ${report.ok ? `${C.green}OK${C.reset}` : `${C.red}FAILED${C.reset}`}\n`);
}

process.exitCode = report.ok ? 0 : 1;
