# Cozy Forest Campfire — AI Handoff

**آخرین به‌روزرسانی:** 2026-11-23
**فاز فعلی:** PHASE 1 ✅ بسته شد (شامل Phase 1b) — آماده‌ی ورود به PHASE 2
**وضعیت یک‌خطی:** زمین heightmap با دیواره‌ی صخره و آبشار زنده، جنگل سه‌لایه با LOD (۳.۵۸M → ۰.۹۱M مثلث)، مسیر خاکی + پل + سنگ‌های عبور، برکه‌ی زنده، باران/مه، سایه‌بان و ذرات، برخورد دوربین، فیزیک پرش/شنا/سرشتن روی شیب و چرخه‌ی روز/شب پیاده شد. ESLint و بیلد تمیز — **اعتبارسنجی بصری انجام نشده**.

> این فایل منبع واحد حقیقت پیشرفت است. هر جلسه‌ی جدید اول همین را بخواند.
> معماری بازی در `frontend/src/game/README.md` (فارسی) مستند می‌شود.

---

## 1. Summary

بازی فعلی: کمپ جنگلی شبانه، مولتی‌پلیر با Ably (`game-state-<roomId>`)، صدای فضایی LiveKit،
زنجیره‌ی مأموریت (نقشه → فانوس → کلید → صندوقچه)، تنظیمات کیفیت/صدا، ۹ کاراکتر، آتش کمپ،
ساحل/اسکله/فانوس دریایی، گیتار و مارشمالو. زمین فعلی تخت است (`y=0`) و جنگل کوتاه/کم‌پشت.

**هدف پروژه:** تبدیل این صحنه به یک بازی کمپی مولتی‌پلیر cozy و premium، در فازهای ۰..۵.

---

## 2. DONE ✅

### Phase 0 — مانیفست دارایی‌ها و بهینه‌سازی (کامل)

| # | کار | وضعیت | تأیید |
|---|-----|-------|-------|
| 0.1 | `frontend/src/game/assetManifest.js` — منبع واحد حقیقت دارایی‌ها | ✅ | ۱۸۹ ورودی: ۱۴۴ فایل موجود + ۴۵ placeholder (فاز 1b: `ambience.rain`) |
| 0.2 | مهاجرت تمام مسیرهای خام به کلیدهای مانیفست | ✅ | ۲۰ فایل ویرایش شد؛ هیچ مسیر هاردکد `game-models/` یا `sounds/` در `src/game` نمانده |
| 0.3 | `scripts/verify-assets.mjs` + اسکریپت `verify:assets` | ✅ | `entries=188 present=144 missing=0 placeholders=44 orphans=0 heavy=4 payload=21.11MB → OK` |
| 0.4 | ارتقای `scripts/inspect-glb.mjs` → `game/assetReport.json` | ✅ | bbox/minY/center، مثلث، بافت (تشخیص PNG/JPEG/WebP از هدر)، skinned، استخوان‌های سر/گردن/دست/پا، لیست کلیپ‌ها + مدت، پرچم draco/meshopt |
| 0.5 | `scripts/optimize-glb.mjs` + اسکریپت `optimize:glb` | ✅ | `dedup → prune → weld → resample → textureCompress(webp) → draco`؛ خروجی در `public/game-models/opt/<same path>`، اصل فایل‌ها دست‌نخورده |
| 0.6 | بهینه‌سازی ۳۴ جفت فایل | ✅ | ۴۴.۶۷MB → ۴.۷۲MB (‎−۸۹.۴٪‎)؛ ۶ کاراکتر اضافه ۱.۶۹MB → ۰.۳۸MB (‎−۷۷.۳٪‎) |
| 0.7 | اعتبارسنجی با `gltf-validator` | ✅ | ۳۹ فایل opt: **۰ error**، ۱۹ warning (همه از قبل در اصل فایل‌ها هم بودند: `NODE_SKINNED_MESH_*`، `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE`) |
| 0.8 | `synth.js` — پوشش کامل صداهای غایب | ✅ | ۴۰+ فکتوری رویه‌ای (آتش، جیرجیرک، آب، رودخانه، آبشار، اقیانوس، جغد، قورباغه، پرنده‌ی شب، خش‌خش برگ، قدم‌صدا grass/sand/wood/stone، پرش، فرود، پاشش، شنا، گاز ماهی، خوردن، UI، ایموت، چادر، توت، حشره، توپ، کوئست، بلاب NPC، سرخ‌کردن، حباب قابلمه، برگرداندن، پختن، سوختن، روشن‌کردن آتش، مارشمالو) |
| 0.9 | `audio.js` — fallback شفاف به synth | ✅ | `loadBuffer(url, synthKey)`؛ `url === null` مستقیم synth می‌سازد؛ `SYNTH_BY_URL` از مانیفست |
| 0.10 | مستندسازی در `frontend/src/game/README.md` | ✅ | بخش «فاز ۰» با جدول فیلدهای مانیفست، جدول preload group، جدول بهینه‌سازی، اسکریپت‌ها، پاسخ سؤالات باز؛ ردیف wind قدیمی به `🚫 حذف‌شده` اصلاح شد |
| 0.11 | کیفیت کد | ✅ | `npx eslint src/game --ext .js,.jsx` → exit 0؛ `npm run build` → ✓ built in 3.98s |
| 0.12 | تست دودی headless Chrome | ✅ | canvas mount شد، **۵۸۴ mesh / ۱۷۱ geometry / ۵۳ texture / ۵۰ program**، ۵۲ از ۵۲ درخواست مدل `200`، صفر خطای سمت بازی (فقط Ably auth expected چون بک‌اند خاموش است)، اسکرین‌شات غیرتخت (std کانال‌ها ۱۶..۲۴، entropy ۵.۷) |

**اعداد payload:**

| سنجه | قبل | بعد | کاهش |
|------|-----|-----|------|
| مدل‌های initial (core+beach+quest) | ۲۴.۰۰ MB | ۴.۲۸ MB | ‎−۸۲.۲٪‎ |
| کل مدل‌های مانیفست | ۵۰.۴۹ MB | ۱۲.۵۲ MB | ‎−۷۵.۲٪‎ |
| ۳۴ جفت فایل بهینه‌شده | ۴۴.۶۷ MB | ۴.۷۲ MB | ‎−۸۹.۴٪‎ |
| **INITIAL load واقعی** (core+beach+quest + ۹ کاراکتر + صداهای fire/crickets) | — | **۵.۷۸ MB** | — |
| کل صداها (lazy) | — | ۱۰.۵۴ MB | — |

### Phase 1 — زمین زنده، جنگل بلند، آبشار (کامل)

| # | کار | وضعیت | تأیید |
|---|-----|-------|-------|
| 1.1 | `game/terrain.js` — منبع واحد حقیقت زمین (بدون import از sceneLayout) | ✅ | `getGroundHeight`, `getGroundNormal`, `getGroundSlope`, `WATER_LEVEL=-1.15`, `isInWater`, `getWaterDepth`, `getWalkSurfaceY`, `groundColorAt`, `isPlantable` |
| 1.2 | `sceneLayout.js` ثابت‌های زمین را از `terrain.js` دوباره export می‌کند | ✅ | بدون شکستن هیچ import موجود |
| 1.3 | `Ground.jsx` بازنویسی: heightmap با vertex color و subdivision تطبیقی | ✅ | ۹۶/۱۴۴/۱۹۲ تقسیم (low/medium/high)، یک draw call، رنگ چمن/خاک/شن/شن خیس/سنگ/خزه/لای |
| 1.4 | سه پهنه‌ی آبی با شیدر مشترک و خط ساحلی واقعی | ✅ | دریا با بایسکشن ۲۲ مرحله‌ای، برکه و حوضچه با شعاع تلاقی در ۷۲ جهت، رودخانه در امتداد `RIVER.points` |
| 1.5 | `Waterfall.jsx`: صفحه‌ی شیدری + استخر فوم + ذرات پاشش | ✅ | ارتفاع از `getWaterfallTopY()` (=۱۳.۵۹) مشتق می‌شود، نه عدد جادویی |
| 1.6 | `Forest.jsx` بازنویسی: سه لایه (near GLB / far سیلوئت / backdrop ring) + بایاس `scaleY` | ✅ | بودجه‌ی مثلث **۳.۵۸M → ۰.۹۱M** (‎−۷۵٪‎) با چیدمان یکسان |
| 1.7 | `hooks/usePlayerMotion.js` — استخراج فیزیک از `PlayerController` | ✅ | گرانش/پرش/پله/فرود/شنا/قدم‌صدا؛ همه در state ماژول، صفر re-render |
| 1.8 | لبه‌ی کلید پرش (`jumpHeld`) | ✅ | نگه‌داشتن Space دقیقاً **۱** پرش می‌دهد (تست: `holdJumps: 1`) |
| 1.9 | سکوی اسکله روی آب (`DOCK_PLATFORM` + `getWalkSurfaceY`) | ✅ | `dockSurfaceY=-0.85` (روی سکو)، `dockGroundY=-4.48` (بستر)، `dockDepth=0` — بازیکن شنا نمی‌کند |
| 1.10 | `envState.js` + چرخه‌ی روز/شب در آسمان، مه، پس‌زمینه و نورها | ✅ | ۸ keyframe؛ تست: night→dawn→day→dusk→night با daylight ۰..۱ و ambient ۰.۱۶..۰.۶۲ |
| 1.11 | صداهای مکانی آبشار و رودخانه | ✅ | `waterfall-in-the-rainforest.mp3` و `stream-loop.mp3` موجودند؛ فالبک synth `waterfall`/`stream` |
| 1.12 | هم‌ترازی همه‌ی اشیا با زمین (`InstancedGLB groundAlign`) | ✅ | نخل، صدف، مسیر سنگی، تزئینات، تله‌های درخت، بازیکنان ریموت |
| 1.13 | کیفیت کد و بیلد | ✅ | `npx eslint src/game` → ۰ خطا؛ `npm run build` → ✓ ۴.۱۹s |
| 1.14 | تست دودی headless با audit عددی زمین | ✅ | `campH=0`, `campFlatness=0`, `cliffWallH=13.7`, `cliffSlope=0.847`, `treesUnderwater=0`, `jumpPeak=1.12`, `swimY=-1.62` |

### Phase 1b — مسیرها، پل، برکه، هوا، سایه‌بان، دوربین (تکمیل فاز ۱)

| # | کار | وضعیت | تأیید |
|---|-----|-------|-------|
| 1.15 | `terrain.js`: `getGroundHeight` (مسیرها را ۷۵٪ تخت می‌کند) + ترکیب رنگ خاکی مسیر در `groundColorAt` | ✅ | عددی: بدون NaN روی شبکه‌ی ±۹۰ |
| 1.16 | `BRIDGE` خودکار روی نوار رودخانه در مسیر برکه | ✅ | `halfLength 5.1`, `halfWidth 1.55`, `topY≈-0.48`, مرکز `(-51.5,-23.5)` |
| 1.17 | `STEPPING_STONES`: ۱۰ سنگ، `topY = WATER_LEVEL+0.18` | ✅ | عددی: سطح راه‌رو پیوسته `-0.97` بدون شکاف |
| 1.18 | `platformYAt` / `getWalkSurfaceY` / `getWaterDepth` روی پل و سنگ‌ها | ✅ | سطح پل پیوسته در طول مسیر |
| 1.19 | `components/Paths.jsx`: `DirtPaths`، `Bridge` (تخته+نرده+پایه)، `SteppingStones` | ✅ | ESLint تمیز؛ **بصری تأیید نشده** |
| 1.20 | `components/PondLife.jsx`: نیلوفر (۰/۸/۱۴ بر اساس کیفیت) + قورباغه‌ی جهنده | ✅ | فقط medium/high؛ **مقیاس بصری تأیید نشده** |
| 1.21 | `components/Weather.jsx`: باران (۰/۴۲۰/۹۰۰ خط)، `FogBanks`، `useRainAudio` | ✅ | ESLint تمیز؛ **ظاهر باران تأیید نشده** |
| 1.22 | `components/CanopyFX.jsx`: `LightShafts`، `Pollen`، `FallingLeaves` | ✅ | فقط medium/high؛ **بصری تأیید نشده** |
| 1.23 | `useSettingsStore`: تنظیم `weather` (`clear`\|`rain`، پایدار) + `weatherFogFor` در `envState.js` | ✅ | در `SettingsPanel` با SegmentedControl وصل شد |
| 1.24 | `cameraTuning.js` + برخورد دوربین با زمین/تنه + FOV kick در `PlayerController` | ✅ | سابه ۶ نمونه، حداقل فاصله ۰.۷۵ |
| 1.25 | `usePlayerMotion`: coyote time، jump buffer، پرش متغیر، سرشتن روی شیب | ✅ | `slopeSlide()` بر اساس `getGroundNormal` |
| 1.26 | `sceneLayout.js` + `Forest.jsx`: درختان سه‌سطحی + `LANDMARK_GIANTS` (۳۰..۳۶m) | ✅ | عددی: ۸۰۰ درخت → `{giant:5, canopy:108, mid:369, understory:318}`، ارتفاع ۴.۰۱..۳۴.۰، **۰ درخت در آب، ۰ درخت روی مسیر** |
| 1.27 | `fishingSpots.js` + `hooks/useFishingSpots.js`: ۶ نقطه‌ی ماهیگیری با صدا و توست | ✅ | در `GameOverlay` وصل شد؛ سیستم کامل صید در Phase 3 |
| 1.28 | `synth.js` فکتوری `rain` + `ambience.rain` placeholder | ✅ | `makeRainBuffer` ثبت شد |
| 1.29 | کیفیت کد و بیلد (پس از 1.15..1.28) | ✅ | `npx eslint src/game --ext .js,.jsx` → exit 0؛ `npm run build` → ✓ built |

> ⚠️ **همه‌ی موارد 1.19..1.22 فقط از نظر کد/بیلد تأیید شده‌اند، نه بصری.** تراز تخته‌های پل، مقیاس نیلوفر/قورباغه، ظاهر باران و سیلوئت درختان بلند در مرورگر واقعی دیده نشده‌اند.

**اعداد Phase 1:**

| سنجه | قبل | بعد |
|------|-----|-----|
| مثلث صحنه (high) | ۳٬۵۷۷٬۲۵۹ | **۹۱۴٬۳۰۷** (‎−۷۴.۴٪‎) |
| درختان با GLB کامل | ۸۰۰ | ۱۰۱ (بقیه سیلوئت دو-مخروطی) |
| mesh های صحنه | ۵۷۱ | ۵۲۴ |
| تکرارهای instanced | ۸٬۹۷۹ | ۸٬۹۷۹ (بدون تغییر) |

---

## 3. IN PROGRESS 🔄

**Phase 1c — رفع رگرسیون بصری. کد تمام شد، در انتظار تأیید بصری کاربر.**

| # | کار | نوع | تأیید عددی |
|---|-----|-----|-----------|
| 1c.1 | `Forest.jsx` سیلوئت دور: شکاف ۱.۱..۷.۵ واحدی بین تنه و تاج، شعاع تاج `0.043×H` | 🔧 اصلاح | شکاف منفی (هم‌پوشانی)، تاج دقیقاً `H`، `r/h = 0.31` |
| 1c.2 | درختان `tier==='giant'` از LOD سیلوئت معاف شدند | 🔧 اصلاح | ۴ از ۵ غول قبلاً مخروط بودند |
| 1c.3 | `BackdropForest` حلقه‌ی ۲۲۰ مخروط | ⛔ **غیرفعال** (`return null`) | ۱۷۱ از ۲۲۰ مخروط بیرون از صفحه‌ی ۲۰۰×۲۰۰ زمین |
| 1c.4 | `Ground.jsx` `aShore` برکه/رودخانه معکوس بود (`0`=مرکز) | 🔧 اصلاح | فوم فقط روی ساحل |
| 1c.5 | رنگ آب `#3f9e9c`/`#123a52` → `#1d4f5c`/`#0a1c2b` | 🔧 اصلاح | — |
| 1c.6 | `Waterfall.jsx` صفحه ۱۴.۷ واحدی معلق در هوا (زمین زیرش `-0.07`) | 🔧 اصلاح | لنگر `(13.59,-55.5)`→`(-1.15,-48)` دقیق |
| 1c.7 | `terrain.js` چمن ۲۵٪ روشن‌تر، خاک کمپ `0.55`→`0.7` | 🔧 اصلاح | — |
| 1c.8 | `envState.js` ambient شب `0.16`→`0.22` | 🔧 اصلاح | — |
| 1c.9 | `CanopyFX.jsx` ستون نور `0.04..0.20`→`0.02..0.08` | 🔧 اصلاح | — |

**اسکرین‌شات‌ها:** `dock/shots/before-*.png` و `dock/shots/after-*.png` — ۵ نما، ۱۲۸۰×۷۲۰، کیفیت high، از همان نقطه‌ی دوربین.
پیکسل تغییریافته: کمپ ۱۶٪، جنگل ۱۸.۸٪، رودخانه ۲۷.۱٪، آبشار ۴۲.۹٪، ساحل ۲۳.۶٪.

**باقی‌مانده‌ی Phase 2 (طبق درخواست کاربر متوقف شد):** علف رویه‌ای → GLB، حذف صدای قدم.

### Phase 2 طراحی (پس از تأیید بصری Phase 1c)
1. **حیات کاراکتر:** idle ثانویه، ایموت‌های واقعی، squash/stretch فرود.
2. **نقاط استراحت:** `REST_SPOTS` بعد از `SEAT_SPOTS` در `sceneLayout.js`.
3. **کمد لباس:** `wearables.*` روی `Head`/`Hips` از `characterConfig.js`.
4. **اجتماعی:** حباب چت (`player-chat` + کلید T)، لیست لابی از `GET /api/calls/game/campsites`.

> قبل از هر تغییر در مولتی‌پلیر، `useGameSync.js`/`RemotePlayers.jsx` را بخوانید؛ payload اضافه باید backward-compatible باشد.

---

## 4. NOT DONE ⬜

### Phase 1 ✅ (کامل شد — جزئیات در بخش ۲)

### Phase 2..5
- ⬜ **Phase 2** — طبق بخش ۳ بالا؛ هنوز هیچ کدی نوشته نشده.
- ⬜ Phase 3: سیستم کامل ماهیگیری (قالب چوب، بوبِر، گاز، کشیدن، ماهی)، آشپزی، NPC/کوئست.
- ⬜ Phase 4..5: طبق `dock/MASTER_PROMPT.md`.

---

## 5. PLACEHOLDERS STILL IN USE

۴۵ ورودی placeholder در مانیفست. هر کدام در `assetManifest.js` فیلد `placeholder: true` و `note` دارند و با `npm run verify:assets` لیست می‌شوند.

**مدل‌ها (۳۰) — همه رویه‌ای ساخته می‌شوند:**

| گروه | کلیدها |
|------|--------|
| درخت | `trees.oak`، `trees.deadTree` |
| زیرجنگل | `undergrowth.berryBush`، `undergrowth.berries`، `undergrowth.honey`، `undergrowth.herbs`، `undergrowth.pinecone` |
| سنگ | `rocks.cliff` |
| حیوانات | `animals.fox`، `animals.squirrel` |
| ماهیگیری | `fishing.bobber`، `fishing.bugNet`، `fishing.oldShoe` |
| آشپزی | `cooking.tripod`، `cooking.sausage`، `cooking.soupBowl` |
| غذا | `food.plate` |
| ساحل | `beach.campingChair` |
| سازه | `structures.noticeBoard` |
| پوشیدنی | `wearables.partyHat`، `wizardHat`، `chefHat`، `beanie`، `strawHat`، `baseballCap`، `flowerCrown`، `catEars`، `roundGlasses`، `sunglasses`، `scarf` |

**صداها (۱۵) — همه از سلکشن `synth.js`:**

`ambience.musicEvening` → `music_evening`، `ambience.frogs` → `frog`، `ambience.nightBirds` → `nightbirds`،
`ambience.leavesRustle` → `leaves_rustle`، `ambience.rain` → `rain`، `player.footstepsGrass|Sand|Wood|Stone` → `footstep_*`،
`player.jump` → `jump`، `player.landSoft` → `land_soft`، `player.splashSmall` → `splash_small`،
`player.waterEnter` → `water_enter`، `player.swimLoop` → `swim_loop`، `fishing.bite` → `fish_bite`

**سیاست:** placeholder یعنی «بدون فایل، با fallback رویه‌ای» — هیچ‌وقت باعث کرش یا سکوت نمی‌شود.

---

## 6. Decisions and deviations

- **پوشه‌ی `dock/`** طبق پروتکل ساخته شد. `docs/AI_HANDOFF.md` خالی شد و فقط به این فایل اشاره می‌کند.
- **`water.mp3` حذف شد** (از قبل در ریپو نبود). `WATER_SOUND` حالا به `water-drop-stone.mp3` اشاره می‌کند + synth `water` به‌عنوان فالبک.
- **هیچ صدای باد، هرگز.** ردیف قدیمی wind از جدول صدای README حذف و به `🚫 حذف‌شده` تغییر کرد.
- **`npc/Adventurer.glb` نسخه‌ی opt استفاده نمی‌شود** — بهینه‌سازی هشدارهای `NODE_SKINNED_MESH_NON_ROOT` تولید می‌کرد که روی ریگ اثر می‌گذارد. مانیفست به فایل اصلی اشاره می‌کند (۱۹۰۰KB، یکی از ۴ heavy باقی‌مانده).
- **چهار ورودی `heavy` باقی ماند:** `characters.banana` (636KB)، `characters.mushroom` (600KB)، `npc.adventurer` (1899KB)، `npc.cow` (602KB) — این‌ها lazy-load می‌شوند و در INITIAL load نیستند.
- **`EXT_texture_webp` + `KHR_draco_mesh_compression` هر دو لازم‌اند.** three.js 0.187 و GLTFLoader هر دو را پشتیبانی می‌کند؛ دیکودر Draco از قبل در `public/draco/` است (تنظیم در `setupDraco.js`).
- **نرمال‌سازی bbox اجباری.** چند GLB bbox بی‌معنا دارند (Lantern ارتفاع ۱٬۳۳۵٬۲۲۶ — Icebox ۱٬۸۲۴٬۰۶۸ — Tent2 ۳۱۶٬۴۵۳ — Thermos ۳۶۸٬۷۸۵ — Hammock ۱۷۸٬۰۷۲ — Mug ۶۳ — Umbrella ۲۴۲). همه از `Fitted.jsx` رد می‌شوند.
- **هیچ حیوانی ریگ/انیمیشن ندارد** → همه‌ی حرکت حیوانات باید رویه‌ای باشد (`assetReport.json` این را تأیید می‌کند؛ فقط `Adventurer` و `Witch` از NPCها skinned هستند).
- **`Citizen.glb` کلیپ `Run` ندارد** → `clipOverrides.run = 'Sprint'` در `characterConfig.js`.
- **رمزگذاری PowerShell:** `Get-Content`/`Set-Content` متن فارسی UTF-8 را خراب می‌کند. فایل‌ها فقط با ابزار `write`/`edit` یا `fs.writeFileSync(..., 'utf8')` نوشته می‌شوند. مویبِیک در خروجی ترمینال طبیعی است و ایراد فایل نیست — با `node -e "…includes('\uFFFD')"` تأیید شود.
- **ترتیب خط لوله در `getGroundHeight` مهم است.** هر مرحله‌ی آبی باید **بعد** از خشکی بیاید وگرنه کاسه‌ی برکه/حوضچه با مسطح‌سازی کمپ یا بستر رودخانه بازنویسی می‌شود. ترتیب فعلی: تپه → صخره → ساحل → کمپ → رودخانه → برکه → حوضچه.
- **صخره باید دیواره باشد، نه شیب.** `CLIFF_START_Z=-52` تا `CLIFF_END_Z=-55.5` (۳.۵ واحد افقی برای ۱۳.۵ واحد ارتفاع) → شیب ۰.۸۵ که عملاً دیوار است. بازه‌های پهن‌تر «تپه» می‌سازند نه آبشار.
- **حوضچه‌ی فرود فقط سمت جنوب دیواره کنده می‌شود** (`z > CLIFF_START_Z` + ماسک `smoothstep`)، وگرنه صخره را می‌خورد و آبشار در هوا می‌ماند.
- **LOD درختان اجباری است.** ۸۰۰ درخت با GLB کامل (۳٬۳۷۰..۴٬۹۶۴ مثلث) = ۳.۵۸M مثلث. با آستانه‌ی ۲۲/۳۰/۳۸ فقط ~۱۰۰ درخت GLB کامل می‌گیرند و بقیه دو-مخروطی می‌شوند → ۰.۹۱M.
- **`gl.info.render` در زمان `useFrame` هنوز صفر است** (شمارنده‌ها بعد از رندر ریست می‌شوند). برای تست، یا `gl.info.autoReset=false` بگذارید یا (بهتر) مثلث‌ها را از گراف صحنه بشمارید.
- **`gl.readPixels` روی رپر three نیست** — باید از `gl.getContext().readPixels` استفاده کرد.
- **`Suspense` با `fallback={null}` بدون ErrorBoundary** خطاها را کامل می‌بلعد و صحنه خالی می‌ماند بدون هیچ لاگ. برای دیباگ همیشه `<Boundary>` بگذارید.
- **متغیر ماژول قبل از استفاده.** `_normalScratch` قبلاً بعد از `getGroundSlope` تعریف شده بود؛ چون `buildTrees` در سطح ماژول `sceneLayout` اجرا می‌شود، این یک TDZ واقعی بود. حالا قبل از تابع تعریف می‌شود.

### تصمیم‌های Phase 1b

- **پل و سنگ‌های عبور رویه‌ای هستند، نه GLB.** `Bridge.glb` (h=28.2 w=28.0 d=64.8 middleY=-3.07) و `Woodbridge.glb` (h=264.6 w=1309.1 d=280) bbox کاملاً بی‌معنی دارند و بدون دیدن بصری نمی‌توان pivot و مقیاس را حدس زد. به‌جای ریسک، پل از تخته/نرده/پایه‌ی رویه‌ای ساخته شد که دقیقاً با `BRIDGE` در `terrain.js` هم‌تراز است. کلیدهای `paths.bridge` و `paths.woodBridge` در مانیفست **استفاده نمی‌شوند**. → **انحراف آگاهانه**
- **مسیرها هم رویه‌ای‌اند** (نوار decal با taper و `PATH_DECAL_LIFT=0.035`) و در کیفیت low (وقتی `grassDensity < 0.45`) مخفی می‌شوند؛ سطح تخت‌شدن مسیر در `getGroundHeight` مستقل از کیفیت همیشه اعمال می‌شود.
- **رنگ خاک مسیر در vertex color زمین** ترکیب می‌شود (`COL.dirtPath`/`COL.dirtPathDark`) تا decal در فاصله‌ی دور ناپیدا نشود.
- **`BRIDGE` به‌صورت خودکار محاسبه می‌شود** با اسکن نوار رودخانه در مسیر «برکه»؛ اگر `RIVER.points` تغییر کند پل خودش جابه‌جا می‌شود.
- **مقیاس قورباغه کوچک است** چون `animals/Frog.glb` ارتفاع طبیعی ۸۵.۶۸ است؛ `targetHeight` در `PondLife` برابر ۰.۳۴ گذاشته شده. **بصری تأیید نشده.**
- **باران با تنظیم `weather` کنترل می‌شود، نه چرخه‌ی روز/شب**؛ مه و رنگ آسمان در باران با `weatherFogFor()` در `envState.js` تغییر می‌کند و حلقه‌ی مه حتی وقتی `envAnimation` خاموش است در باران اجرا می‌شود.
- **صدای باران از synth است** (`makeRainBuffer`) — بدون فایل صوتی، طبق سیاست placeholder. **صدای باد همچنان ممنوع است.**
- **`useFishingSpots` فقط طعمه/توست است، نه سیستم صید.** قالب کامل ماهیگیری در Phase 3 ساخته می‌شود؛ الان فقط تعامل proximity + صدا + پیام است.

### تصمیم‌های Phase 1c (رفع رگرسیون بصری)

- **`BackdropForest` غیرفعال شد، حذف نشد.** `return null` در تابع، کد قبلی در git باقی مانده تا اگر روزی پوشش زمین بزرگ شد بازیابی شود. دلیل: مخروط‌ها در شعاع ۱۰۴..۱۴۸ کاشته می‌شدند ولی زمین فقط ۲۰۰×۲۰۰ (±۱۰۰) است — ۱۷۱ از ۲۲۰ مخروط هیچ سطحی زیرشان نداشتند و `getGroundHeight` مقدار بی‌معنی می‌داد.
- **سیلوئت دور بازنویسی نشد، فقط ۴ عددش اصلاح شد.** تنه `0.42H` بود و تاج از `0.92H` شروع می‌شد → شکاف هوایی واقعی. حالا تاج از `0.30H` شروع می‌شود (هم‌پوشانی با تنه) و ارتفاعش `0.7H` است، پس سقف تاج دقیقاً روی `H` می‌افتد.
- **غول‌ها دیگر هیچ‌وقت سیلوئت نمی‌شوند.** `tier === 'giant'` در شرط LOD معاف شد؛ در غیر این صورت ۴ از ۵ درخت شاخص (فاصله ۳۳..۷۲ از مرکز) روی کیفیت high هم مخروط می‌شدند.
- **آبشار با وتر کشیده می‌شود، نه اختلاف ارتفاع.** صفحه قبلاً `HEIGHT = TOP_Y - bottomY = 14.74` بود و با شیب ثابت `0.12rad` در `SHEET_Z = -51.75` می‌ایستاد، جایی که زمین `-0.07` است → ۱۴ واحد صفحه در هوا. حالا `HEIGHT = hypot(14.74, 7.5) = 16.54` و `TILT = -atan2(7.5, 14.74) = -0.471rad`؛ لنگرها دقیقاً روی لبه‌ی دیواره `(13.59, -55.5)` و حوضچه `(-1.15, -48)` می‌افتند. **ریاضی تأیید شد، بصری نه.**
- **`aShore` قرارداد یکسان گرفت: `0` = ساحل، `1` = عمیق.** قبلاً دریا همین بود ولی رودخانه `abs(t-0.5)*2` (۰=مرکز) و برکه `t*t` (۱=لبه) بودند. نتیجه: نوار فوم سفید یک‌دست در وسط رودخانه و لبه‌ی برکه. حالا `smoothstep(0.14, 0.0, vShore)` فقط روی ساحل `1` می‌دهد.
- **رنگ آب فقط دو ثابت عوض شد، ریاضی موج دست نخورد.** `uShallow #3f9e9c → #1d4f5c`، `uDeep #123a52 → #0a1c2b`، `uFoam #dceef2 → #9fb8c4`. آب حالا شبانه/تیره است، نه فیروزه‌ای نئون.
- **ستون‌های نور `CanopyFX` کم‌رنگ شدند** (`0.04..0.20` → `0.02..0.08`). این‌ها مخروط additive با `DoubleSide` بودند و در شب به‌شکل گوه‌های روشن بین تنه‌ها دیده می‌شدند.
- **پالت زمین ۲۵٪ روشن‌تر شد، ساختار heightmap دست‌نخورده.** `grassA/grassB/grassDry/moss/soil` روشن‌تر، خاک کمپ `0.55 → 0.7`، و کف ambient شب `0.16 → 0.22`. علت تاریکی: رنگ بدنه‌ی زمین در شب فقط با ambient ۰.۱۶ نور می‌گرفت.
- **اسکرین‌شات‌ها با پروب CDP خام گرفته شدند** (`ws` از قبل در `node_modules` بود؛ puppeteer/playwright نصب نشد). **مدل تصویر نمی‌بیند** — اعتبارسنجی فقط با آمار پیکسلی (میانگین/انحراف معیار/درصد سفید/باند‌های عمودی) انجام شد، نه با چشم.
- **دو اسکرین‌شات اول خالی گرفتند** (sd=0، دقیقاً رنگ `clear`) چون `Page.captureScreenshot` قبل از اولین فریم درخواستی اجرا می‌شد. راه‌حل: `gl.render(scene, camera)` صریح + تلاش مجدد تا `sd > 3`. بدون این، ارزیابی «همه‌چیز خراب است» می‌شد در حالی که صحنه سالم بود.

---

## 7. Known issues / risks

- **اعتبارسنجی بصری Phase 1c با چشم انجام نشد.** ۱۰ PNG در `dock/shots/` هست ولی مدل تصویر نمی‌بیند؛ فقط آمار پیکسلی تأیید شده. **تصمیم با کاربر است.** تا آن زمان هیچ‌کدام از موارد 1c.1..1c.9 «تأییدشده» نیستند.
- **`BACKDROP` دیگر در صحنه نیست** → افق دور پشت مه خالی است. اگر کاربر بخواهد، بازگرداندنش نیاز به تولید مخروط‌ها داخل `±HALF_MAP` دارد (نه شعاع ۱۰۴..۱۴۸).
- **علف رویه‌ای هنوز `shaderMaterial` بدون fog/colorspace است** (Phase 3 حلش می‌کند). در نمای شب ممکن است لکه‌های روشن دیده شود.
- **`smoothstep(0.14, 0.0, vShore)` روی بدنه‌های آبی که ساحل ندارند** (حوضچه‌ی آبشار) هنوز فوم کامل می‌دهد — آینه‌ی همان باگ قبلی، ولی آن‌جا چون آبشار رویش است دیده نمی‌شود.
- **۶ نقطه‌ی ماهیگیری روی لبه‌ی آب** (`(-53.4,-0.3)`، `(-56.0,7.7)`، `(-59.8,18.3)`، `(-65.3,30.3)`، ساحل `(54,0)`، اسکله `(79,1.55)`) — مختصات دستی است و با تغییر `RIVER.points` باید دوباره چک شود.
- **ویندوز مسیرها case-insensitive است**، production احتمالاً Linux → بررسی case در `verify-assets.mjs` اجباری است (پیاده شد).
- **`gl.readPixels` روی رپر three نیست** — باید از `gl.getContext().readPixels` استفاده کرد (در تست دودی کشف شد).
- **`Suspense` با `fallback={null}` بدون ErrorBoundary** خطاها را کامل می‌بلعد و صحنه خالی می‌ماند بدون هیچ لاگ. برای دیباگ همیشه `<Boundary>` بگذارید.
- **دو صدا در تست دودی `204` برگرداندند** (`campfire.mp3`، `crickets.mp3`) — این‌ها `<audio>` streaming range requests هستند که CDP به‌عنوان `ERR_ABORTED` نشان می‌دهد؛ با `Invoke-WebRequest` مستقیم `200` می‌دهند. ایراد واقعی نیست.
- **`THREE.Clock` deprecated** (هشدار سه) و **`PCFSoftShadowMap` حذف شده** (هشدار سه) — هر دو از داخل کتابخانه‌ها می‌آیند، نه کد ما.
- **`dev-dist/` در ریپو تولید می‌شود** (vite-plugin-pwa) و untracked است.
- **بک‌اند باید برای تست کامل روشن باشد** وگرنه Ably auth خطای `Failed to fetch` می‌دهد (بی‌خطر، ولی نویزی).

---

## 8. How to run and verify

```bash
cd frontend
npm run dev                  # vite روی 5001
npm run build                # باید ✓ built بدهد (~۴s)
npm run lint                 # eslint .

npm run verify:assets        # ۱۸۸ ورودی؛ missing باید 0 باشد
npm run verify:assets -- --json
npm run inspect:glb          # بازسازی src/game/assetReport.json
npm run optimize:glb -- --dry --all
npm run optimize:glb -- --only trees/Pine.glb,Bonfire.glb

npx eslint src/game --ext .js,.jsx
```

**تست دودی سه‌بعدی (بدون لاگین):** یک صفحه‌ی موقت بسازید که `CozyScene` + `PlayerController` را داخل `Canvas` + `KeyboardControls` + `<Boundary>` mount کند، بعد با Chrome headless و CDP بررسی کنید که `gl.info.render.calls > 0` و `scene.traverse` مش بشمارد و `gl.getContext().readPixels` پیکسل غیرتخت بدهد. فایل‌های موقت را بعد از تأیید پاک کنید.

---

## 9. New env vars / endpoints / store keys / localStorage keys

**npm scripts جدید (`frontend/package.json`):**

| اسکریپت | فرمان |
|---------|-------|
| `verify:assets` | `node scripts/verify-assets.mjs` |
| `inspect:glb` | `node scripts/inspect-glb.mjs` |
| `optimize:glb` | `node scripts/optimize-glb.mjs` |

**devDependencies جدید:** `@gltf-transform/cli`، `sharp`، `draco3d` (و `gltf-validator`، `ws` فقط `--no-save` برای تست).

**فایل‌های جدید در `src/game/`:** `assetManifest.js`، `assetReport.json`، `assetReport-opt.json`، `assetReport-opt-characters.json`، `optimizeReport.json`.

**فایل‌های جدید در `scripts/`:** `verify-assets.mjs`، `optimize-glb.mjs` (و `inspect-glb.mjs` بازنویسی شد).

**بدون تغییر:** هیچ env var، endpoint، store key یا localStorage key جدیدی اضافه نشد. `STORAGE_KEY` همان `cozy-forest-settings-v1` است.

**فایل‌های جدید در `src/game/` (فاز ۱):**

| فایل | نقش |
|------|-----|
| `terrain.js` | ارتفاع/نرمال/شیب/آب/رنگ زمین — منبع واحد حقیقت |
| `envState.js` | وضعیت محیطی مشترک + `updateEnvState` + `skyColorsFor` |
| `waterQueries.js` | پرس‌وجوهای مکانی آب (بدون JSX) |
| `hooks/usePlayerMotion.js` | فیزیک پرش/شنا/قدم‌صدا |
| `components/Waterfall.jsx` | آبشار + حوضچه + ذرات |
| `components/Forest.jsx` (بازنویسی) | سه لایه + LOD + `BackdropForest` |

**فایل‌های جدید در `src/game/` (فاز 1b):**

| فایل | نقش |
|------|-----|
| `components/Paths.jsx` | `DirtPaths` + `Bridge` رویه‌ای + `SteppingStones` |
| `components/PondLife.jsx` | نیلوفر + قورباغه‌ی جهنده |
| `components/Weather.jsx` | باران + `FogBanks` + `useRainAudio` |
| `components/CanopyFX.jsx` | `LightShafts` + `Pollen` + `FallingLeaves` |
| `cameraTuning.js` | `FOV_BASE/FOV_RUN/FOV_LERP` + `applyFovKick` |
| `fishingSpots.js` | ۶ نقطه‌ی ماهیگیری + `nearestRiverDistance` |
| `hooks/useFishingSpots.js` | ثبت نقاط در `questRegistry` + صدا/توست |

**کنترل جدید:** `Space` = پرش (`KEY_MAP`).

**کلید مدل جدید:** `ambience.rain` (placeholder → synth `rain`).

**کلید store جدید:** `useSettingsStore.weather` (`'clear'|'rain'`) + `setWeather` — در همان `STORAGE_KEY` (`cozy-forest-settings-v1`) ذخیره می‌شود.

**بدون تغییر:** هیچ env var یا endpoint جدیدی در فاز ۱ اضافه نشد. هیچ کلید store/localStorage جدیدی هم اضافه نشد. `BOUNDS.maxX` از `WATER_START_X - 2` (=۷۲) به `88` رسید تا شنا در دریا ممکن شود.

---

## 10. Changelog

- **2026-11-23** — شروع فاز ۰؛ ساخت `dock/AI_HANDOFF.md`.
- **2026-11-23** — فاز ۰ کامل: مانیفست ۱۸۸ ورودی، مهاجرت ۲۰ فایل، سه اسکریپت دارایی، بهینه‌سازی ۳۴ فایل (‎−۸۹.۴٪‎)، پرکردن ۴۰+ فکتوری synth، مستندسازی README، تست دودی headless (۵۸۴ مش، ۵۲/۵۲ دارایی ۲۰۰، صفر خطای بازی).
- **2026-11-23** — فاز ۱ کامل: `terrain.js` (دیواره‌ی صخره + برکه + حوضچه + رودخانه + ساحل)، `Ground.jsx` heightmap با vertex color و سه پهنه‌ی آبی با خط ساحلی واقعی، `Waterfall.jsx` با شیدر/فوم/ذرات، `Forest.jsx` سه‌لایه با LOD (۳.۵۸M → ۰.۹۱M مثلث)، `usePlayerMotion.js` (پرش با لبه‌ی کلید، شنا، قدم‌صدا بر اساس مسافت، سکوی اسکله)، `envState.js` با چرخه‌ی ۷ دقیقه‌ای روز/شب، صداهای مکانی آبشار/رودخانه. تست دودی: `campH=0`, `campFlatness=0`, `cliffSlope=0.847`, `treesUnderwater=0`, `jumpPeak=1.12`, `holdJumps=1`, `swimY=-1.62`, `dockDepth=0`.
- **2026-11-23** — فاز 1b: `terrain.js` حالا `getGroundHeight` و تخت‌سازی مسیر + رنگ خاک مسیر دارد؛ `BRIDGE` و `STEPPING_STONES` خودکار محاسبه می‌شوند؛ `Paths.jsx`، `PondLife.jsx`، `Weather.jsx`، `CanopyFX.jsx` ساخته و در `CozyScene` mount شدند؛ `weather` + `weatherFogFor` + synth باران؛ برخورد دوربین و FOV kick؛ coyote time / jump buffer / پرش متغیر / سرشتن روی شیب؛ درختان سه‌سطحی با `LANDMARK_GIANTS` (عدد: ۵ غول ۳۰..۳۴m، ۰ درخت در آب/مسیر)؛ ۶ نقطه‌ی ماهیگیری سبک. ESLint و بیلد تمیز. **بصری تأیید نشده.**
- **2026-11-23** — فاز 1c (رفع رگرسیون بصری): سیلوئت درختان دور شکاف هوایی داشت (۱.۱..۷.۵ واحد) و شعاع تاج ۰.۰۴۳×ارتفاع بود → ۴ عدد اصلاح شد. غول‌ها از LOD معاف شدند. `BackdropForest` غیرفعال شد (۱۷۱/۲۲۰ مخروط بیرون از زمین). `aShore` برکه/رودخانه معکوس بود → فوم سفید وسط آب. رنگ آب به پالت شبانه تغییر کرد. صفحه‌ی آبشار ۱۴ واحد در هوا معلق بود → با وتر و شیب واقعی لنگر شد. پالت زمین ۲۵٪ روشن‌تر + ambient شب ۰.۲۲. ستون‌های نور کم‌رنگ شدند. ESLint ۰، بیلد ✓، ۱۰ اسکرین‌شات before/after در `dock/shots/`. **بصری تأیید نشده.**
