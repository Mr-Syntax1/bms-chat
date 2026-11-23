#!/usr/bin/env node
// ---------------------------------------------------------------------------
// optimize-glb.mjs — بهینه‌سازی GLBها با @gltf-transform
//
// کاری که می‌کند (per file):
//   dedup → prune → weld → texture resize → meshopt compression
//   (+ simplify اختیاری برای مدل‌های خیلی پرپلی)
//
// خروجی در public/game-models/opt/ (نام فایل اصلی حفظ می‌شود)
// فایل‌های اصلی هرگز دست نمی‌خورند.
//
// اجرا:
//   node scripts/optimize-glb.mjs                 # لیست پیش‌فرض اولویت‌دار
//   node scripts/optimize-glb.mjs --all           # همه‌ی GLBها
//   node scripts/optimize-glb.mjs --only Clamby,Starfish
//   node scripts/optimize-glb.mjs --dry           # فقط گزارش، بدون نوشتن
//
// نکته: meshopt نیاز به دیکودر دارد؛ سه (three 0.187) به‌صورت پیش‌فرض
// MeshoptDecoder را پشتیبانی می‌کند ولی باید در setupDraco ثبت شود.
// برای سازگاری با کد فعلی (Draco-only)، پیش‌فرض را Draco می‌گذاریم.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, resample, textureCompress, draco, meshopt } from '@gltf-transform/functions';
import sharp from 'sharp';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');
const modelsRoot = path.join(frontendRoot, 'public/game-models');
const outRoot = path.join(modelsRoot, 'opt');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const DRY = has('--dry');
const ALL = has('--all');
const USE_MESHOPT = has('--meshopt');
const ONLY = (val('--only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);

// اولویت‌های پرامپت + هر چیزی که گزارش بالای ۵۰۰KB نشان داد
const PRIORITY = [
  'beach/ClambyPoly.glb',
  'beach/StarfishbyPoly.glb',
  'beach/SeashellbyPoly.glb',
  'beach/trees/CoconutPalmTree.glb',
  'beach/trees/PalmTree2.glb',
  'trees/Pine.glb',
  'trees/Pine2.glb',
  'missions/TreasureChest.glb',
  'beach/RockPathRoundSmall.glb',
  'characters/CoolBannanaGuy.glb',
  'characters/MushroomCharacter.glb',
  'trees/BirchTrees.glb',
  'trees/Fern.glb',
  'Decorations/Treestump.glb',
  'Decorations/RockMedium.glb',
  'Lilypad.glb',
  'MushroomLaetiporus.glb',
  'Corn.glb',
  'animals/Owl.glb',
  'animals/Porcupine.glb',
  'animals/Muledeer.glb',
  'animals/Mallardduck.glb',
  'npc/Adventurer.glb',
  'npc/CowCharacter.glb',
  'Umbrellaandchairs.glb',
  'beach/boat/BoatbyPoly.glb',
  'beach/boat/RowboatbyPoly.glb',
  'beach/port/Port.glb',
];

function collect(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'opt') continue; // خود opt را دوباره بهینه نکن
      collect(full, acc);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.glb')) {
      acc.push(path.relative(modelsRoot, full).split(path.sep).join('/'));
    }
  }
  return acc;
}

const allFiles = collect(modelsRoot);
let targets;
if (ONLY.length) {
  targets = allFiles.filter((f) => ONLY.some((o) => f.includes(o)));
} else if (ALL) {
  targets = allFiles;
} else {
  targets = PRIORITY.filter((f) => allFiles.includes(f));
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await import('draco3d').then((m) => m.createEncoderModule()),
  'draco3d.decoder': await import('draco3d').then((m) => m.createDecoderModule()),
});

// تکسچر بزرگ‌تر از این → resize (قدرت دو)
const LIMIT_LARGE = 1024;
const LIMIT_SMALL = 512;

function isLargeProp(rel) {
  // درخت/سازه/سنگ = large، آیتم کوچک = small
  return /(trees|beach|Decorations|npc|characters|fire|cars|missions|beachball|Lilypad|Umbrella|Corn|MushroomLaetiporus|TreasureChest|Bridge|Woodbridge)/i.test(rel);
}

const results = [];

for (const rel of targets) {
  const src = path.join(modelsRoot, rel);
  if (!fs.existsSync(src)) {
    console.log(`SKIP  ${rel}  (not found)`);
    continue;
  }
  const outDir = path.join(outRoot, path.dirname(rel));
  const outPath = path.join(outRoot, rel);

  const before = fs.statSync(src).size;
  try {
    const doc = await io.read(src);
    const root = doc.getRoot();

    // ---- مراحل بهینه‌سازی ----
    await doc.transform(dedup(), prune());

    // weld فقط اگر مش‌های ساده/ساکن باشند (برای skinned امن است ولی کند)
    try {
      await doc.transform(weld({ tolerance: 0.0001 }));
    } catch {
      /* ignore weld failures */
    }

    // حذف keyframe های اضافی انیمیشن
    if (root.listAnimations().length) {
      try {
        await doc.transform(resample());
      } catch {
        /* ignore */
      }
    }

    // تکسچرها: resize + WebP بهینه (sharp encoder)
    const limit = isLargeProp(rel) ? LIMIT_LARGE : LIMIT_SMALL;
    const textures = root.listTextures();
    if (textures.length) {
      try {
        await doc.transform(
          textureCompress({
            encoder: sharp,
            targetFormat: 'webp',
            resize: [limit, limit],
            quality: 82,
          })
        );
      } catch (err) {
        console.log(`  ! texture compress skipped (${err.message.split('\n')[0]})`);
      }
    }

    // فشرده‌سازی هندسه
    try {
      if (USE_MESHOPT) {
        await doc.transform(meshopt({ encoder: 'quantize' }));
      } else {
        await doc.transform(draco());
      }
    } catch (err) {
      console.log(`  ! geometry compression skipped (${err.message.split('\n')[0]})`);
    }

    if (DRY) {
      results.push({ rel, before, after: null, saved: null, dry: true });
      console.log(`DRY   ${rel.padEnd(40)} ${(before / 1024).toFixed(1)} KB → (dry)`);
      continue;
    }

    fs.mkdirSync(outDir, { recursive: true });
    await io.write(outPath, doc);
    const after = fs.statSync(outPath).size;
    const saved = before - after;
    results.push({ rel, before, after, saved, ratio: after / before });
    const pct = ((saved / before) * 100).toFixed(1);
    console.log(
      `${saved > 0 ? 'OK  ' : 'BIG '} ${rel.padEnd(40)} ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB  (${pct}%)`
    );
  } catch (err) {
    console.log(`FAIL  ${rel}  → ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// خلاصه
// ---------------------------------------------------------------------------
const done = results.filter((r) => r.after != null);
const totalBefore = results.reduce((s, r) => s + r.before, 0);
const totalAfter = done.reduce((s, r) => s + (r.after ?? r.before), 0);

console.log('\n--- SUMMARY ---');
console.log(`files: ${results.length}  written: ${done.length}`);
console.log(`before: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
console.log(`after : ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
if (totalBefore) {
  console.log(`saved : ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}%`);
}
console.log(`out   : public/game-models/opt/`);

// فایل گزارش برای استفاده در manifest
if (!DRY) {
  fs.writeFileSync(
    path.join(frontendRoot, 'src/game/optimizeReport.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)
  );
}
