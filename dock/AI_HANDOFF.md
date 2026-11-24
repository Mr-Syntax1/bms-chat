# AI_HANDOFF — BMS Cozy Forest

## فاز فعلی
PHASE 1: 100% COMPLETE ✅ — آماده‌ی Phase 2

## وضعیت تسک‌ها

| تسک | وضعیت |
|---|---|
| Forest.jsx — حذف کامل شاخه‌ی مخروط/سیلوئت، فقط InstancedGLB | DONE ✅ |
| Forest.jsx — ۳ واریانت Pine / Pine2 / Birch با انتخاب seed‌شده | DONE ✅ |
| Forest.jsx — Y هر درخت از `getGroundHeight` | DONE ✅ |
| BackdropForest — خروجی null (بدون مخروط افق) | DONE ✅ |
| GrassField.jsx — حذف هندسه‌ی شیدری، InstancedGLB از `grassyellowing.glb` | DONE ✅ |
| GrassField.jsx — ادغام زیرمش‌ها با `mergeGeometries` + اعمال `matrixWorld` | DONE ✅ |
| GrassField.jsx — چگالی ۷۰۰/۱۲۰۰/۲۰۰۰ بر اساس `grassDensity` | DONE ✅ |
| assetManifest.js — مسیرهای opt درختان + `undergrowth.grass` | DONE ✅ |
| assetManifest.js — `rocks.cliff` از placeholder به `opt/Decorations/RockMedium.glb` | DONE ✅ |
| preset — treeDensity به ۳۰۰/۵۰۰/۸۰۰ | DONE ✅ |
| Fix 1 — CanopyFX: رنگ ستون نور به `#FF9A4D`، شفافیت `0.005..0.015` | DONE ✅ |
| Fix 2 — envState: مه ۶۰٪ کمتر، آسمان شب `#0a0e27`→`#1a1040`، ambient شب ۰.۲۲ | DONE ✅ |
| Fix 3 — Campfire: سنگ‌های دور آتش با `InstancedGLB` از `opt/Rocks.glb` (۷ عدد) | DONE ✅ |
| Fix 4 — Beach: تخته‌های اسکله `#8B6F47` + تنوع رنگ هر تخته | DONE ✅ |
| پل چوبی در Paths.jsx procedural (طبق مجوز prompt) | DONE ✅ |
| بک‌گراند درختان دور (LOD) — عمداً حذف شد | DONE ✅ |
| `npx eslint src/game` | DONE ✅ (exit 0) |
| `npm run build` | DONE ✅ (exit 0) |

## فایل‌های تغییر‌یافته (این دور)
- `frontend/src/game/components/CanopyFX.jsx`
- `frontend/src/game/envState.js`
- `frontend/src/game/components/Campfire.jsx`
- `frontend/src/game/components/Beach.jsx`

## مشکلات شناخته‌شده
- `game-models/opt/Pine.glb` به‌عنوان orphan گزارش می‌شود (استفاده نمی‌شود).
- `FIRE_STONES` در sceneLayout دیگر مصرف نمی‌شود (export باقی مانده، بی‌ضرر).

## قدم بعدی
شروع Phase 2 — سیستم تعامل/NPC/کوئست.

## دستورها
```
npx eslint src/game
npm run build
npm run verify:assets
```
