# گزارش وضعیت «کمپ دنج جنگل» (Cozy Forest Campfire)

مقایسه‌ی کد فعلی با ۷ هدف پروژه. ✅ پیاده‌سازی شده و در بیلد سالم، ⚠️ کار می‌کند ولی با محدودیت، ❌ ناقص بود و در این دور اصلاح شد.

---

## ۱. Pointer Lock و دوربین

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| دکمه «شروع بازی» → `document.body.requestPointerLock()` | ✅ | `StartScreen` → `usePointerLook.lock()` |
| هوک `usePointerLook` با yaw/pitch | ✅ | `hooks/usePointerLook.js` — حرکت موس فقط در حالت قفل |
| محدودیت pitch بین -۶۰ تا +۶۰ درجه | ✅ | `PITCH_LIMIT = 60°` با clamp |
| حرکت WASD نسبت به جهت نگاه | ✅ | `PlayerController` — `sin/cos(camYaw)` |
| دوربین ۲.۵ واحد پشت / ۱.۵ بالاتر + lerp ۰.۱ | ✅ | `CAM_DIST=2.5`، `CAM_HEIGHT=1.5`، `CAM_LERP=0.1` |
| کلیدها فقط در حالت بازی (نه در منوی توقف) | ❌ → ✅ | قبلاً با ESC و منوی توقف هم E/F/G/M/ایموت اجرا می‌شد؛ حالا با `activeRef` گیت می‌شود |
| ورود به اسکله ممکن باشد | ❌ → ✅ | `BOUNDS.maxX=72` راه اسکله (x=74) را می‌بست؛ حالا در نوار اسکله تا انتهای آن مجاز است |

## ۲. محیط و آسمان

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| آسمان شب | ✅ | شیدر گرادیان `NightSky` + `background #070d1c` |
| Starfield با ۲۰۰۰ ذره (Points) | ✅ | `Starfield` (۲۰۰۰) + `Stars count=2200` از drei |
| ماه (کره‌ی emissive) | ✅ | `Moon` + هاله + pointLight |
| Fog آبی تیره | ✅ | `<fog args={['#101c30', 30, 150]} />` |

## ۳. کاراکترهای یکتا (حداکثر ۹)

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| ۹ فایل کاراکتر در `public/game-models/characters/` | ✅ | همه موجود و در `characterConfig.js` با ارتفاع/minY/prefix کلیپ |
| اختصاص تصادفی و یکتا | ✅ | `POST /api/calls/game/claim-character` — انتخاب از کاراکترهای آزاد |
| آزادسازی هنگام خروج | ✅ | `release-character` + `useClaimCharacter` با تأخیر ۱s برای StrictMode |
| retry بعد از خطا | ❌ → ✅ | قبلاً Promise رد‌شده برای همیشه کش می‌شد و دیگر تلاشی نمی‌شد؛ حالا از `inflight` حذف می‌شود |
| ظرفیت ۹ نفر | ✅ | `GAME_CAPACITY = 9`، ۴۰۹ در حالت پر |

## ۴. صدای ویس (LiveKit)

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| `<LiveKitRoom>` + `<RoomAudioRenderer />` | ✅ | `components/GameVoice.jsx` |
| `<MicAutoEnable />` بعد از Start | ✅ | با `setMicrophoneEnabled(micEnabled)` |
| Spatial: ارسال X,Y,Z با `setAttributes` | ⚠️ → ✅ | کد بود ولی `y` ثابت `'0'` و بدون throttle؛ حالا Y واقعی + throttle (LiveKit نرخ metadata را محدود می‌کند) |
| مجوز `canUpdateOwnMetadata` در توکن | ❌ → ✅ | بدون این grant، `setAttributes` رد می‌شد و Spatial کار نمی‌کرد |
| Canvas با آماده شدن توکن remount نشود | ❌ → ✅ | قبلاً `GameVoice` والدِ Canvas بود؛ حالا sibling است |
| وضعیت میکروفن در HUD از LiveKit (نه Ably) | ❌ → ✅ | `voiceReady` در استور + `setVoiceError`؛ قبلاً `syncStatus` نمایش داده می‌شد |
| کاهش صدا با فاصله‌ی ۳D | ✅ | `useSpatialVoice` هر ۱۰۰ms روی `audioTrackPublications` |

## ۵. مپ، مدل‌ها و مأموریت

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| مپ ۲۰۰×۲۰۰: جنگل + ساحل + آب shader | ✅ | `sceneLayout` + `Ground.jsx` (شیدر sine) |
| ۱۵۰ درخت با InstancedMesh از ۳ گونه | ❌ → ✅ | قبلاً فقط ۲ گونه و بدون `trees/Pine.glb`؛ حالا `opt/Pine` + `trees/Pine` + `trees/Pine2` |
| ۲۰ نخل (۳ مدل) | ✅ | `PALMS` + `InstancedGLB` |
| بندر، ۲ قایق، فانوس دریایی با PointLight پالس‌دار | ✅ | `Beach.jsx` |
| صدف/ستاره روی شن (۳۰) | ✅ | `BEACH_SHELLS` |
| کمپ: RV، آتش تپنده، میز، کوله، گیتار، مارشمالو | ✅ | `Van` / `Campfire` / `CampDecor` |
| چادرها، بوته، گل، قارچ، سنگ با InstancedMesh | ✅ | `CampDecor` + `Decorations` (هر دو InstancedMesh) |
| Tent2/Tent3 با scale هک‌شده | ❌ → ✅ | `models/Fitted.jsx`: نرمال‌سازی ارتفاع + وسط‌چین XZ (bbox چند صد هزار واحدی را درست می‌کند) |
| مدل‌های استفاده‌نشده (Key، Lantern، PicnicTable2) | ❌ → ✅ | `Key.glb` کلید شناور بعد از ماهیگیری، `Lantern` تزئینی کمپ، `PicnicTable2` میز دوم |
| ترتیب اجباری مأموریت | ❌ → ✅ | نقشه ۳ → فانوس ۵ → ماهیگیری → صندوقچه؛ در استور و `questRegistry.isLocked` اعمال می‌شود |
| ۳ تکه نقشه با E | ✅ | `ParchamentOpen` شناور + Sparkles |
| ۵ فانوس: PointLight نارنجی + Particle | ✅ | `PostLantern` + نور + Sparkles + `StarBurst` |
| ماهیگیری: انیمیشن + Key + صدای آب | ❌ → ✅ | قبلاً Key رندر نمی‌شد و صدای آب نداشت؛ حالا `FishingRod` تاب می‌خورد، `Key` بالای اسکله می‌چرخد، `water.mp3` پخش می‌شود |
| صندوقچه: Key لازم + نور طلایی + Particle + پیام | ⚠️ → ✅ | قبلاً مدل در شن فرو بود و درب جدا نمی‌شد؛ حالا `Fitted` روی سطح + چرخش درب + نور ۷۰ + Sparkles |
| تابلوها (۳) و ۱۰ صدف/ستاره | ✅ | `WoodenSign` + `Collectible` |

## ۶. صداها (فقط mp3/m4a)

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| `campfire.mp3` روی آتش (loop, distance=20) | ✅ | `AmbientAudio` |
| `crickets.mp3` در جنگل (loop, distance=40) | ✅ | ۴ منبع مکانی |
| صدای باد | 🚫 حذف‌شده | صدای باد عمداً وجود ندارد و نباید اضافه شود (طبق قواعد پروژه) |
| `guitar1.m4a` / `guitar2.mp3` / `guitar3.m4a` با G | ✅ | تصادفی + `publishPlayerAction` برای بقیه |
| `yum.mp3` / صدای آب | ✅ | `yum.mp3` موجود؛ `water.mp3` حذف شد و به `water-drop-stone.mp3` + synth `water` منتقل شد |
| fallback رویه‌ای برای m4a | ❌ → ✅ | regex `proceduralKey` فقط `mp3|ogg|wav` را می‌گرفت |

## ۷. انیمیشن و UX

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| Idle / Walk / Run / Sit / Guitar | ✅ | `Character.jsx` — کلیپ + bob/tilt رویه‌ای برای مدل‌های بدون ریگ |
| Emote با ۱-۵ (Wave/Dance/Laugh/Celebrate/Sleep) | ✅ | `EMOTES` + رویداد Ably |
| HUD شیشه‌ای (نام، کاراکتر، تعداد، میکروفن) | ✅ | `GlassHUD` — وضعیت میکروفن حالا واقعی است |
| Quest Tracker + Inventory | ✅ | `QuestTracker` / `Inventory` |
| نشانگر «E» بالای اشیاء (Html) | ⚠️ → ✅ | آیتم‌های مأموریت داشتند؛ آتش و ون نداشتند → اضافه شد |
| Toast + راهنمای ۱۰ ثانیه‌ای + دکمه خروج + crosshair | ✅ | `Toasts` / `ControlsHint` / دکمه X / `Crosshair` |
| نشانگر «قفل» برای مراحل بعدی | ❌ → ✅ | HUD و بالای شیء قفل را با 🔒 نشان می‌دهند |

---

## فاز ۰ — مانیفست دارایی‌ها و بهینه‌سازی

### منبع واحد حقیقت: `game/assetManifest.js`

همه‌ی مدل‌ها و صداها با **کلید منطقی** آدرس می‌گیرند، نه مسیر خام:

```js
import { MODELS, SOUNDS, modelUrl, soundUrl } from '../assetManifest';

modelUrl('npc.grandpa');   // '/game-models/npc/Grandpa.glb'
soundUrl('fishing.cast');  // '/sounds/casting-fishing-rod-for-game-fishing.mp3'
```

هر ورودی شکل `{ url, kind, heavy, placeholder, opt?, synth?, fallback?, note? }` دارد:

| فیلد | معنا |
| --- | --- |
| `url` | مسیر نهایی؛ `null` یعنی فایل نیست → placeholder |
| `kind` | `'model'` یا `'sound'` |
| `heavy` | فایل بزرگ (>۵۰۰KB) → باید lazy یا بهینه استفاده شود |
| `placeholder` | فایل واقعی نداریم؛ primitive یا synth جایگزین می‌شود |
| `opt: true` | از نسخه‌ی بهینه‌شده در `game-models/opt/` استفاده کن |
| `synth` | (صدا) کلید کارخانه‌ی رویه‌ای در `synth.js` |
| `fallback` | (مدل) توضیح شکل primitive جایگزین |

**قاعده‌ی طلایی:** هیچ کد جدیدی مسیر `/game-models/...` یا `/sounds/...` ننویسد.
`characterConfig.js`، `sounds.js`، `preload.js`، `props.jsx` و بقیه‌ی مدل‌ها همگی از manifest می‌خوانند.

### گروه‌های پیش‌بارگذاری (`PRELOAD_GROUPS`)

| گروه | چه زمانی لود می‌شود | حجم تقریبی |
| --- | --- | --- |
| `core` | همان ابتدای ورود | ~1.3 MB |
| `beach` | ابتدای ورود (فعلاً) | ~0.8 MB |
| `quest` | ابتدای ورود | ~0.5 MB |
| `npc` | فاز ۴ — با `preloadGroup('npc')` | ~2.9 MB |
| `animals` | فاز ۳ | ~0.4 MB |
| `cooking` / `food` | فاز ۳ | ~0.5 MB |
| `comfort` | فاز ۳ | ~0.4 MB |
| `wearables` | فاز ۲ | ~0.1 MB |

`preloadAllModels()` فقط `core + beach + quest` و ۹ کاراکتر را لود می‌کند.
گروه‌های دیگر با `preloadGroup(name)` در زمان idle گرم می‌شوند.

### بهینه‌سازی GLB (`scripts/optimize-glb.mjs`)

مراحل: `dedup → prune → weld → resample → textureCompress(webp, ≤1024/≤512) → draco`

خروجی در `public/game-models/opt/` با حفظ نام و ساختار پوشه؛ **فایل‌های اصلی دست نمی‌خورند.**

نتیجه‌ی اجرا روی ۲۸ فایل اولویت‌دار:

| سنجه | قبل | بعد |
| --- | --- | --- |
| حجم همان ۲۸ فایل | 42.98 MB | 4.33 MB (−۸۹.۹٪) |
| مدل‌های ورود اولیه (core+chars) | 24.00 MB | 4.28 MB (−۸۲.۲٪) |
| کل مدل‌های manifest | 50.49 MB | 12.52 MB |

نکته: `npc/Adventurer.glb` نسخه‌ی opt **استفاده نمی‌شود** چون فشرده‌سازی به اسکین آن آسیب می‌زند
(`NODE_SKINNED_MESH_NON_ROOT`)؛ اصل فایل رفرنس می‌شود.

### اسکریپت‌های ابزار

```bash
npm run verify:assets   # بررسی case-sensitive مسیرها + یتیم‌ها + جدول خلاصه
npm run inspect:glb     # گزارش bbox/مثلث/تکسچر/استخوان/کلیپ → src/game/assetReport.json
npm run optimize:glb    # ساخت نسخه‌های opt (--all / --only X,Y / --dry)
```

### پاسخ سؤالات باز (از `assetReport.json`)

| سؤال | پاسخ |
| --- | --- |
| BirchTrees تک‌درخت است یا بیشه؟ | **بیشه**: ۵ مش (`BirchTree_1..5`)، عرض ۱۸.۵ واحد |
| Bridge یا Woodbridge؟ | `Bridge` ابعاد ۲۸×۲۸×۶۵ و pivot در x≈۷۲؛ `Woodbridge` ۱۳۰۹ واحد عرض با minY=۲۲۰ → `Bridge` برای رودخانه مناسب‌تر است (باید نرمال شود) |
| RockPathRoundSmall سنگ است یا نوار؟ | **تک‌سنگ گرد** ۱.۱×۱.۳۵ واحد → برای stepping stone عالی، برای مسیر باید instanced تکرار شود |
| Umbrellaandchairs صندلی دارد؟ | بله؛ bbox ۳۶۱×۳۹۴×۳۷۱ با ۲ تکسچر ۱۰۲۴ → باید `Fitted` شود |
| Pot vs Cauldron | Pot: ارتفاع ۰.۳۳، عرض ۰.۷۷ (دیگ آویزان بزرگ‌تر) · Cauldron: ۰.۲۵×۰.۳۶ (دیگ کوچک‌تر) |
| NPCهای ریگ‌دار | فقط `Adventurer` (کامل با head/neck/hand) و `Witch` (۱ کلیپ). Grandpa/Littlegirl/Cow/Gnome **بدون ریگ** → bob رویه‌ای |
| حیوانات ریگ‌دار | هیچ‌کدام ریگ/کلیپ ندارند → همه باید انیمیشن رویه‌ای بگیرند |

---

## فاز ۱ — زمین زنده، جنگل بلند، آبشار

### `game/terrain.js` — منبع واحد حقیقت زمین

هیچ چیزی از `sceneLayout` یا کامپوننت‌ها import نمی‌کند (جلوگیری از چرخه).
`sceneLayout` ثابت‌های مشترک را از اینجا دوباره export می‌کند.

| نماد | معنا |
|------|------|
| `getGroundHeight(x, z)` | ارتفاع زمین. خط لوله‌ی ثابت: تپه‌های نرم → دیواره‌ی صخره → ساحل/بستر دریا → مسطح‌سازی کمپ → بستر رودخانه → برکه → حوضچه‌ی آبشار |
| `getGroundNormal`, `getGroundSlope` | نرمال با اختلاف محدود؛ شیب ۰..۱ (۰.۸۴ روی دیواره‌ی صخره) |
| `WATER_LEVEL = -1.15` | سطح مشترک دریا، برکه، رودخانه، حوضچه |
| `CAMP_FLAT_RADIUS = 13`, `CAMP_BLEND_RADIUS = 26` | داخل ۱۳ کاملاً تخت (y=0)، بعد از ۲۶ دست‌نخورده |
| `CLIFF_START_Z = -52`, `CLIFF_END_Z = -55.5` | دیواره‌ی شمالی؛ ۱۳.۵ واحد ارتفاع در ۳.۵ واحد افقی |
| `POND`, `PLUNGE`, `WATERFALL`, `RIVER` | مختصات پهنه‌های آبی |
| `isInWater`, `getWaterDepth` | پرس‌وجوی آب (عمق ۰ = خشکی) |
| `getWalkSurfaceY` | زمین یا سکوی اسکله — فیزیک و رندر از همین می‌خوانند |
| `platformYAt`, `DOCK_PLATFORM` | سکوی چوبی اسکله که روی آب معلق است |
| `groundColorAt(x, z, h, out)` | رنگ vertex: چمن/خاک/شن/شن خیس/سنگ/خزه/لای |
| `isPlantable(x, z, maxSlope)` | آیا درخت اینجا می‌روید؟ (نه در آب، نه شیب تند) |

### `components/Ground.jsx` — heightmap + سه پهنه‌ی آبی

* زمین یک `PlaneGeometry` با ۹۶/۱۴۴/۱۹۲ تقسیم (low/medium/high)، ارتفاع هر رأس از `getGroundHeight` و رنگ از `groundColorAt` → یک draw call، `vertexColors`.
* **دریا**: نوار با خط ساحلی واقعی (بایسکشن روی `getGroundHeight` به‌ازای هر ردیف z) — آب دقیقاً از جایی شروع می‌شود که زمین زیر سطح آب می‌رود.
* **برکه** و **حوضچه‌ی آبشار**: دیسک با شعاع تلاقی محاسبه‌شده در ۷۲ جهت.
* **رودخانه**: نوار در امتداد `RIVER.points` با نرمال افقی.
* شیدر مشترک آب: موج سینوسی، `aShore` برای عمق/فوم، فوم روی لبه، `depthWrite={false}`, `renderOrder={1}`.
* `AmbientSetup` هر ۱۵ فریم از `envState` می‌خواند: شدت ambient، رنگ/جهت/شدت خورشید (گرم در طلوع/غروب)، شدت ماه.

### `components/Waterfall.jsx` — آبشار

* صفحه‌ی شیدری عمودی در نیمه‌ی راه بین لبه‌ی دیواره و محل فرود، با رگه‌های آب، خم سهمی، فوم پایین و لبه‌ها.
* دو لایه (جلو/عقب) برای ضخامت.
* `SplashPool`: سه حلقه‌ی شفاف با پالس شعاعی.
* `SprayParticles`: InstancedMesh با حرکت رویه‌ای (بدون آپدیت CPU per-instance).
* ارتفاع آبشار از `getWaterfallTopY()` می‌آید، نه عدد جادویی.

### `components/Forest.jsx` — جنگل سه‌لایه + LOD

| لایه | توضیح |
|------|-------|
| نزدیک (GLB کامل) | فقط در شعاع ۲۲/۳۰/۳۸ (low/medium/high) — `trees-near-*` |
| دور (سیلوئت) | دو مخروط ساده (تنه + تاج) برای بقیه — یک draw call |
| backdrop | حلقه‌ی ۹۰/۱۵۰/۲۲۰ سیلوئت بسیار بلند در ۱۰۴..۱۴۸ واحد، پس‌زمینه‌ی اتمسفری |

* `scaleY` با فاصله از کمپ زیاد می‌شود (`1 + depth*0.75`)، پس جنگل عمق‌دار و «کهن» دیده می‌شود.
* درختان روی شیب تند کمی کج می‌شوند (`tilt`).
* رنگ برگ با لایه تیره‌تر می‌شود (عمق اتمسفری).
* `buildTrees` فقط جایی درخت می‌گذارد که `isPlantable` تأیید کند (نه در آب، نه شیب > ۰.۵).

**بودجه‌ی مثلث:** ۳.۵۸M → **۰.۹۱M** (‎−۷۵٪‎) با همین LOD، بدون تغییر چیدمان.

### `hooks/usePlayerMotion.js` — فیزیک زمین

جدا شد از `PlayerController` (که ۵۰۰+ خط بود) تا هر دو قابل خواندن بمانند.

| قابلیت | جزئیات |
|--------|--------|
| گرانش/پرش | `GRAVITY = -22`, `JUMP_SPEED = 7.2` → اوج ~۱.۱ واحد |
| لبه‌ی کلید | `jumpHeld` → نگه‌داشتن Space فقط **یک** پرش می‌دهد |
| پله | `STEP_HEIGHT = 0.55` — پله‌های کوچک بدون پرش |
| فرود | صدای `land_soft` با حجم متناسب سرعت فرود |
| شنا | عمق > ۱.۱۵ → شناوری ۰.۴۲ زیر سطح، سرعت ×۰.۶۲، پاشش ورود |
| قدم‌صدا | بر اساس **مسافت** (۱.۷۵ واحد)، نه زمان — grass/sand/wood/stone |
| سکو | روی `DOCK_PLATFORM` می‌ایستد، نه شنا می‌کند |

همه‌ی state در سطح ماژول (`physics`) است — صفر re-render، صفر تخصیص در فریم.

### `game/envState.js` — چرخه‌ی روز/شب

* `updateEnvState(t)` با ۸ keyframe (night → dawn → day → dusk) و درون‌یابی smooth.
* خروجی: `daylight`, `warmth`, `phase`, `ambientIntensity`, `fogNear/Far`.
* `DAY_LENGTH = 420` ثانیه (۷ دقیقه برای یک چرخه‌ی کامل).
* `skyColorsFor(phase)` رنگ گرادیان آسمان.
* آسمان، مه، پس‌زمینه و نورها هر ۱۵..۲۰ فریم از این می‌خوانند (نه هر فریم).
* با `preset.envAnimation === false` (کیفیت کم) چرخه ثابت می‌ماند.

### صداهای جدید (مکانی)

`AmbientAudio` علاوه بر آتش و جیرجیرک:
* **آبشار**: منبع مکانی در `WATERFALL.baseZ`، `refDistance 9`, `maxDistance 62` — از دور شنیده می‌شود.
* **رودخانه**: چند منبع در امتداد `RIVER.points`، دامنه‌ی کوتاه‌تر.

هیچ صدای بادی وجود ندارد.

---

## فاز ۱ب — مسیر، پل، برکه، هوا، سایه‌بان

### مسیرها و گذرگاه‌ها (`terrain.js` + `components/Paths.jsx`)

* `getGroundHeight` علاوه بر ارتفاع، زمین را **روی مسیرها ۷۵٪ تخت می‌کند** (`pathProximity` → `blend`) تا راه‌رفتن روی `PATHS` ناهموار نباشد.
* `groundColorAt` رنگ خاک مسیر (`COL.dirtPath` / `COL.dirtPathDark`) را در vertex color ترکیب می‌کند.
* `PATHS` هم‌زمان هم شکل ارتفاع را تعیین می‌کند و هم نوار رنگی `DirtPaths` را (decal با taper و `PATH_DECAL_LIFT=0.035`) — در کیفیت low (`grassDensity < 0.45`) نوار حذف می‌شود ولی تسطیح ارتفاع می‌ماند.
* `BRIDGE` خودکار است: نوار رودخانه در مسیر «برکه» اسکن می‌شود و مرکز/طول/عرض/ارتفاع پل از همان‌جا می‌آید (`halfLength 5.1`, `halfWidth 1.55`, `topY ≈ -0.48`).
* `STEPPING_STONES`: ۱۰ سنگ در راستای نرمال رودخانه، `topY = WATER_LEVEL + 0.18`.
* `platformYAt(x, z)` سه شکل را می‌شناسد: مستطیل چرخیده‌ی پل، دایره‌های سنگ، سکوی اسکله. `getWalkSurfaceY` و `getWaterDepth` هر دو از همین عبور می‌کنند.
* **پل و سنگ‌ها رویه‌ای‌اند، نه GLB.** bbox مدل‌های `Bridge.glb` / `Woodbridge.glb` بی‌معنی است (h=28 و h=264)؛ کلیدهای `paths.bridge` / `paths.woodBridge` در مانیفست استفاده نمی‌شوند.

### برکه‌ی زنده (`components/PondLife.jsx`)

* نیلوفر: ۰ / ۸ / ۱۴ برگ (low/medium/high) با `y = WATER_LEVEL + 0.045` و باب موج.
* قورباغه: `animals/Frog.glb` با `targetHeight 0.34` (مدل اصلی ۸۵.۶۸ ارتفاع دارد) و چرخه‌ی جهش ۹ ثانیه‌ای.

### هوا (`components/Weather.jsx` + `stores/useSettingsStore.js`)

* تنظیم `weather`: `'clear' | 'rain'`، در `localStorage` ذخیره می‌شود، در `SettingsPanel` با `SegmentedControl`.
* باران: ۰ / ۴۲۰ / ۹۰۰ خط (low/medium/high) در یک بافر ماژول (`getRainData`)، دوربین را دنبال می‌کند.
* `FogBanks`: ۴ دیسک چرخان، فقط وقتی `envAnimation` روشن است.
* مه باران از `weatherFogFor('rain')` در `envState.js` می‌آید و در حلقه‌ی مه `CozyScene` اعمال می‌شود — حتی با خاموش بودن `envAnimation`.
* صدای باران از synth (`makeRainBuffer`) با کلید placeholder `ambience.rain`.

### سایه‌بان و ذرات (`components/CanopyFX.jsx`)

* `LightShafts`: ۵ مخروط additive که شفافیتشان از `envState.daylight` می‌آید.
* `Pollen`: ۹۰/۱۸۰ نقطه؛ `FallingLeaves`: ۲۶/۴۸ صفحه‌ی instanced با چرخه‌ی سقوط مستقل. هر دو فقط medium/high.

### دوربین و حرکت (`cameraTuning.js`, `PlayerController.jsx`, `usePlayerMotion.js`)

* برخورد دوربین: ۶ نمونه در طول بوم، تست زمین/آب/تنه‌ی درخت، حداقل فاصله ۰.۷۵.
* FOV kick: `applyFovKick(camera, running, delta)` — ۶۲ → ۶۸ هنگام دویدن. تغییر FOV بیرون از کامپوننت است چون `react-hooks/immutability` هر آرگومان hook را immutable می‌داند.
* `usePlayerMotion`: `COYOTE_TIME 0.12`، `JUMP_BUFFER_TIME 0.1`، `JUMP_CUT 0.45` (پرش متغیر)، `slopeSlide()` با `SLIDE_SLOPE 0.62`.

### ماهیگیری سبک (`fishingSpots.js` + `hooks/useFishingSpots.js`)

* ۶ نقطه (۴ لبه‌ی رودخانه + ساحل + اسکله) با `registerQuestItem` (شعاع ۲.۶، کول‌داون ۲۴۰۰ms).
* با E: صدای پرتاب → پاشش → کشیدن، سپس توست «ماهی گاز گرفت! 🎣».
* سیستم کامل صید (بوبِر، گاز واقعی، کشیدن، ماهی) در Phase 3 ساخته می‌شود.

### درختان سه‌سطحی (`sceneLayout.js` + `Forest.jsx`)

* `makeTree` هر درخت را به `{ targetHeight, tier, xzScale, collision }` تبدیل می‌کند؛ `Forest` از `targetHeight / height` مقیاس می‌سازد.
* سطح‌ها: `giant` (فقط در ناحیه‌ی غول‌ها، `>0.93`)، `canopy` (`.72..0.93`)، `mid` (`.34..0.72`)، `understory`.
* `LANDMARK_GIANTS`: ۶ درخت ثابت ۳۰..۳۶ متری پشت کمپ/کنار آبشار که **اول** کاشته می‌شوند.
* فاصله‌گذاری وابسته به سطح: ۹ / ۴.۶ / ۳.۴ — تاج‌پوش‌ها هوای بیشتری می‌گیرند.
* حذف خودکار: `pathDistance < 2.6`، `isInWater`، و شیب غیرقابل‌کاشت.
* عدد فعلی با `buildTrees(800)`: `{giant:5, canopy:108, mid:369, understory:318}`، ارتفاع ۴.۰۱..۳۴.۰، صفر درخت در آب و صفر روی مسیر.

---

## فاز ۱ج — رفع رگرسیون بصری

سه باگ هندسی/رنگی که فاز ۱ب وارد کرده بود:

| باگ | علت | اصلاح |
|-----|-----|-------|
| درختان مخروطی شناور | سیلوئت دور: تنه `0.42H` ولی تاج از `0.92H` شروع می‌شد (شکاف ۱.۱..۷.۵ واحد) و شعاع تاج `0.043×H` | تنه `0.81H` (ارتفاع `0.34H`)، تاج از `0.30H` با ارتفاع `0.7H` و شعاع `0.22H` |
| غول‌ها هم مخروط بودند | شرط LOD `tier` را نمی‌شناخت؛ ۴ از ۵ غول فاصله ۳۳..۷۲ داشتند | `tier === 'giant'` همیشه GLB کامل |
| دیوار مخروطی در آسمان | `BackdropForest` در شعاع ۱۰۴..۱۴۸ می‌کاشت، زمین فقط ±۱۰۰ است (۱۷۱/۲۲۰ بیرون) | **غیرفعال شد** (`return null`) |
| آب نئون و نوار سفید | `aShore` در برکه/رودخانه معکوس بود (۰=مرکز) → `foam` روی بدنه‌ی آب | `0`=ساحل، `1`=عمیق در هر سه پهنه |
| آبشار معلق در هوا | صفحه با `HEIGHT = 14.74` و شیب ثابت `0.12rad` در `z=-51.75` (زمین `-0.07`) | `HEIGHT = hypot(14.74, 7.5) = 16.54`، `TILT = -atan2(7.5,14.74)`، لنگر روی لبه و حوضچه |
| زمین تاریک | پالت چمن `[0.145..0.216]` + ambient شب `0.16` | پالت ۲۵٪ روشن‌تر، خاک کمپ `0.7`، ambient `0.22` |
| گوه‌های روشن بین تنه‌ها | `LightShafts` با `0.04..0.20` opacity additive | `0.02..0.08` |

اسکرین‌شات‌های before/after در `dock/shots/`. **بصری تأیید نشده** (مدل تصویر نمی‌بیند؛ فقط آمار پیکسلی).

---

## فاز ۳a — سیستم پخت‌وپز

### ایستگاه‌ها (`CookingStation.jsx` + `recipes.js:STATIONS`)

| ایستگاه | مدل | موقعیت | اکشن |
|---------|-----|--------|------|
| گریل | شبکه‌ی فلزی procedural روی پایه‌ی سنگی کنار آتش | `x≈4, z=0` | `cooking-stir` |
| دیگ آویزان | `Pot.glb` روی سه‌پایه‌ی چوبی procedural | `x≈-5.4, z≈-5.2` | `cooking-stir` |
| دیگ بزرگ | `Cauldron.glb` | `x≈-1.2, z≈-7.2` | `cooking-stir` |
| ماهیتابه | `Fryingpan.glb` روی اجاق سنگی | `x≈-8, z≈2.8` | `cooking-flip` |

هر ایستگاه با `registerCookingStation` در رجیستری تعامل ثبت می‌شود؛ `findNearbyCookingStation` در `PlayerController` نزدیک‌ترین ایستگاه تا ۲ متر را برمی‌گرداند و `nearInteractable` می‌شود. E → `openCooking(id)`.

### مینی‌گیم (`recipes.js` + `ui/CookingUI.jsx`)

* وضعیت زنده در `cooking` (module-level) — بیرون React. فقط رویدادهای گسسته (start/result/reset/flip/stir) با `subscribeCooking` باعث رندر می‌شوند.
* نوار پیشرفت با `requestAnimationFrame` بیرون از چرخه‌ی رندر آپدیت می‌شود (`cooking.progress`).
* زمان کل نوار = `cookTime × COOK_TAIL(1.6)`. نواحی: خام `<0.6`، معمولی، طلایی `0.88..1.12`، سوخته `>1.45`.
* نگه‌داشتن E (یا pointerdown روی «پختن») = شروع؛ رها کردن = `finishCook` → کیفیت. پر شدن کامل نوار = سوخته‌ی خودکار.
* `requiresFlip` (ماهیتابه): بدون برگرداندن → خام. `requiresStir` (دیگ‌ها): کمتر از ۳ هم‌زدن → سقف «معمولی».

### داده و اینونتوری

* `RECIPES` (۵ مورد): استیک، تخم‌مرغ سرخ‌شده، ذرت کبابی، خورش کمپ، پنکیک. هر کدام `{ id, name, emoji, station, ingredients, cookTime, requiresFlip, requiresStir, modelKey, qualityTiers }`.
* `matchRecipe(station, ids)` ترتیب مواد را نادیده می‌گیرد.
* store: `ingredients` (شمارش مواد)، `foods` (غذاهای پخته)، `consumeIngredients`، `addFood`، `eatFood`. غذاها در دفترچه (📜) نمایش و با کلیک خورده می‌شوند.

### صدا و انیمیشن

* `FRY_LOOP_SOUND` (سوس‌وسوز ماهیتابه) یا `POT_BUBBLE_SOUND` به‌صورت Positional loop حین پخت؛ `FLIP_SOUND` برای برگرداندن/هم‌زدن؛ `COOK_DONE_SOUND` یا `BURN_SOUND` در پایان.
* اکشن‌های `cooking-stir`/`cooking-flip` هم در `Character.jsx` (رویه‌ای) و هم در `CLIP_SUFFIX` (مدل‌های ریگ‌دار) پشتیبانی می‌شوند.
* رویداد `player-action` با `action: 'cooking-*'` و مدت تقریبی → بازیکنان دیگر حرکت پخت را می‌بینند.

---

## فاز ۳f — دکوراسیون کمپ

### ورود به حالت چیدمان

* کلید **B** در حالت بازی (موس قفل): قفل آزاد می‌شود تا پنل کاتالوگ کلیک‌پذیر باشد و کلیک روی زمین کار کند. **ESC** اول از حالت دکور خارج می‌شود و موس را دوباره قفل می‌کند (PauseMenu در این حالت نمایش داده نمی‌شود).
* در حالت دکور، چرخش دوربین با حرکت موس دستی اعمال می‌شود (`GameOverlay`) و کلیدهای بازی (`WASD`/`E`/`F`/`G`/`M`/`Q` ایموت) غیرفعال‌اند تا با چرخش/مقیاس آیتم تعارض نداشته باشند.

### کاتالوگ (`decorData.js`)

* `DECOR_CATALOG`: ۲۳ آیتم در ۵ دسته (`tents`/`light`/`furniture`/`decor`/`sign`). هر آیتم `{ id, name, icon, category, modelKey, height, radius, light?, sound? }` — فقط مدل‌های موجود در `assetManifest`.
* `DECOR_BY_ID` نگاشت سریع؛ افزودن آیتم = یک ورودی جدید (بدون تغییر کد رندر).
* محدودیت‌ها: `DECOR_LIMIT=15` هر بازیکن، `DECOR_BOUNDS_RADIUS=26` شعاع کمپ، `DECOR_COOLDOWN=1000ms` بین دو جای‌گذاری، `DECOR_MAX_TOTAL=120` سقف ذخیره‌سازی.

### پیش‌نمایش و اعتبارسنجی

* `decorWorld` (module-level، بیرون React): `{ mode, rotation, scale, ghost: { x, y, z, visible, valid } }` — حرکت موس هیچ `setState`ای ایجاد نمی‌کند.
* `raycastTerrain(origin, direction)`: مارش ۱.۱ واحدی روی `getGroundHeight` + ۸ گام بایسکشن (بدون raycast مش زمین).
* `canPlaceDecor` رد می‌کند: بیرون محدوده، نزدیک آتش (`FIRE_KEEPOUT`)، روی آب/سطح آب، شیب تند (`getGroundSlope > 0.55`)، روی ون، روی تنه‌ی درخت (گرید `getNearbyTrees`)، تداخل با آیتم دیگر، و سقف ۱۵ آیتم.
* شبح با دو متریال مشترک سبز/قرمز (تعویض فقط هنگام تغییر اعتبار) + حلقه‌ی شعاع زیر آن؛ `BoundsRing` محدوده‌ی مجاز را نشان می‌دهد.

### تعامل

| ورودی | عمل |
|-------|-----|
| کلیک چپ | جای‌گذاری آیتم انتخاب‌شده در نقطه‌ی شبح |
| Shift + کلیک چپ | برداشتن آیتم خودی برای جابه‌جایی (انتشار `move-decor` با کلیک بعدی) |
| راست‌کلیک | حذف آیتم خودی در شعاع ۲.۴ واحد |
| Q / E | چرخش π/8 |
| + / − | مقیاس ۰.۶..۱.۶ (گام ۰.۱) |
| ESC | خروج از حالت چیدمان |

### شبکه و ذخیره‌سازی (`decorSync.js`)

* رویدادها روی کانال موجود `player-action`: `place-decor`، `move-decor`، `remove-decor`، `decor-sync`. در `useGameSync` **قبل از** گارد `remoteMap` بررسی می‌شوند تا آیتم بازیکنان ناشناس/رفته هم اعمال شود.
* مالکیت: فقط `ownerId === userId` می‌تواند جابه‌جا/حذف کند (هم محلی هم در `applyDecorMessage`).
* `decor-sync` هنگام ready و presence-enter فرستاده می‌شود؛ گیرنده آیتم‌های همان فرستنده را با نسخه‌ی او جایگزین می‌کند تا حذف‌ها هم منتقل شوند.
* `localStorage` کلید `camp-decor-<roomId>`؛ ورودی‌ها با `sanitizeDecorList` اعتبارسنجی می‌شوند (uid، id معتبر، مختصات متناهی، scale clamp).

### صدا و دارایی

* `PLACE_ITEM_SOUND` برای جای‌گذاری/حذف، `TENT_ZIP_SOUND` برای چادرها (positional).
* گروه preload `decor` (۲۳ مدل) بعد از ورود warm می‌شود؛ آیکون‌های SVG جدید در `ui/icons.jsx`.

---

## وضعیت بیلد

```
npx eslint src/game --ext .js,.jsx   →  0 خطا
npm run build                        →  موفق (~۴s)
npm run verify:assets                →  0 missing / 0 orphan
```

خطاهای lint باقی‌مانده در `CallModal.jsx`، `ChatInput.jsx`، `Login.jsx`، `Register.jsx`، `Profile.jsx`، `Settings.jsx`، `useWebRTC.js`، `VoiceMessage.jsx` از قبل وجود داشته‌اند و به بازی مربوط نیستند.

## متغیرهای محیطی لازم در Suga

**Backend** (پنل Suga → Environment Variables):

```
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=<api key>
LIVEKIT_API_SECRET=<api secret>
```

**Frontend** (build-time):

```
VITE_API_URL=https://<backend-domain>
```

بدون LiveKit، بازی کامل کار می‌کند و فقط دکمه‌ی میکروفن پیام «صدا در دسترس نیست» می‌دهد.
