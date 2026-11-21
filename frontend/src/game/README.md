# گزارش وضعیت «کمپ دنج جنگل» (Cozy Forest Campfire)

بررسی ۵ فاز پروژه در برابر کد فعلی. علامت ✅ یعنی پیاده‌سازی شده و در بیلد سالم است، ❌ یعنی ناقص یا نیازمند اقدام بیرونی.

---

## فاز ۱ — زیرساخت مدل‌ها و بهینه‌سازی

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| مدل‌های glTF در `public/game-models/` | ✅ | ۹ مدل: Pine، RV، Cactoro، Bonfire، Tent، Rocks، LogFungus، LogAxe، ChoppedLog |
| نسخه‌ی بهینه‌شده با gltfjsx (`--transform`) در `opt/` | ✅ | همه‌ی کامپوننت‌ها از `/game-models/opt/*.glb` می‌خوانند |
| دیکودر Draco محلی (بدون CDN) | ✅ | `public/draco/` + `models/setupDraco.js` که قبل از اولین `preload` اجرا می‌شود |
| کامپوننت‌های مدل مقاوم به نام نود | ✅ | از پیمایش صحنه (`useModelClone`) استفاده می‌کنند، نه نام ثابت مش‌ها |
| جنگل با InstancedMesh | ✅ | `Forest.jsx` — یک InstancedMesh به‌ازای هر sub-mesh، ماتریس مشترک |
| محاسبه‌ی دقیق ابعاد مدل | ✅ | `glb-bounds.cjs` + `usePineModel` که bounds را از هندسه می‌گیرد |

> نکته: نسخه‌های gltfjsx اولیه نام مش‌هایی مثل `RV` را `Cube016_2` فرض می‌کردند ولی مدل ۸ primitive دارد؛ به همین دلیل همه‌ی مدل‌ها به حالت traversal تغییر کردند.

## فاز ۲ — چیدمان دنج و صحنه

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| زمین، مسیرهای خاکی، چمن | ✅ | `Ground.jsx` |
| حلقه‌های متراکم درخت (۷ حلقه، شعاع ۱۵.۸ تا ۵۴) | ✅ | `sceneLayout.js` |
| باز شدن راهرو بین درختان | ✅ | `isOnPath` + `PATHS` |
| تزئینات (چادر/سنگ/کنده‌ی قارچ/تبر) | ✅ | `Decorations.jsx` با `TYPE_SCALE` و `GROUND_LIFT` هم‌مقیاس |
| گودال آتش + کنده‌های نشستن | ✅ | `Campfire.jsx` — کنده مماس بر دایره، مارشمالو |
| ون با چراغ قابل کنترل | ✅ | `Van.jsx` + کلید F |
| آسمان شب، ستاره، ابر، کرم شب‌تاب | ✅ | `CozyScene.jsx` |
| بلوم و وینیت | ✅ | `@react-three/postprocessing` |

## فاز ۳ — حرکت، دوربین، کالیژن

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| WASD + Shift دویدن | ✅ | `PlayerController.jsx` |
| دوربین سوم‌شخص با درگ موس | ✅ | `pointermove` روی canvas |
| کالیژن درخت (شعاع تنه) | ✅ | `nearestTree` + `tree.scale * 0.36` |
| کالیژن ون در فضای محلی (با چرخش) | ✅ | push-out جعبه‌ی چرخیده |
| محدوده‌ی گشت و ممنوعیت آتش | ✅ | `WALK_RADIUS`، `FIRE_KEEPOUT` |
| نشستن روی کنده (E) | ✅ | `sitAuto` + `SEAT_SPOTS` |
| کنترل لمسی موبایل | ✅ | `TouchPad` در `GameOverlay.jsx` |

## فاز ۴ — چندنفره (Ably) و آواتارها

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| کانال `game-state-{roomId}` روی Ably | ✅ | `useGameSync.js` — از singleton موجود استفاده می‌کند |
| همگام‌سازی موقعیت (throttle) | ✅ | `publishPosition` با مقایسه‌ی آخرین مقدار |
| presence (ورود/خروج/شمارش) | ✅ | enter/leave + refresh شمارش |
| پاک‌سازی بازیکن بی‌خبر | ✅ | `pruneId` + `PRUNE_TIMEOUT` |
| آواتار Cactoro + انیمیشن | ✅ | `Character.jsx` — کلون اسکلتی، سوییچ کلیپ در `useFrame` |
| ایموت ۱..۵ | ✅ | `Digit1..5` → wave/dance/laugh/celebrate/sleep |
| اکشن G (گیتار) و M (مارشمالو) | ✅ | با مدت‌زمان و `publishPlayerAction` |
| رویدادهای لحظه‌ای اکشن (`player-action`) | ✅ | action / action-end / emote / marshmallow-ready |
| نشستن بازیکن ریموت روی صندلی | ✅ | اینترپولیشن به `SEAT_SPOTS` |

> اصلاح مهم: پکت‌های موقعیت دیگر اکشن/ایموت فعال بازیکنان ریموت را پاک نمی‌کنند (`if ('emote' in payload)`).

## فاز ۵ — صدا

| مورد | وضعیت | توضیح |
| --- | --- | --- |
| AudioListener مشترک + آنلاک با تعامل | ✅ | `audio.js` + `AudioRoot.jsx` |
| صدای مکانی آتش | ✅ | `AmbientAudio.jsx` |
| جیرجیرک در چند نقطه + باد | ✅ | positional + global bed |
| صدای گیتار/yum از موقعیت بازیکن | ✅ | `playPositionalOneShot` |
| فایل‌های MP3 | ❌ | پوشه‌ی `public/sounds/` وجود ندارد |
| جایگزین رویه‌ای (synth) | ✅ | `synth.js` — در صورت خطای لود، بافر ساخته می‌شود |
| چت صوتی Spatial (LiveKit) | ⚠️ | کد کامل است ولی اعتبارنامه‌ی سرور تنظیم نشده |
| کلید میکروفن + کاهش صدا با فاصله | ✅ | `useSpatialVoice.js` هر ۱۰۰ms |

---

## اقدام لازم از سمت شما

**۱. صدای محیطی (اختیاری):** فایل‌ها را در `frontend/public/sounds/` بگذارید تا به‌جای صدای synth از آن‌ها استفاده شود:
`fire.mp3`، `crickets.mp3`، `wind.mp3`، `guitar.mp3`، `yum.mp3`

**۲. چت صوتی Spatial:** در `backend/.env` این سه مقدار را پر کنید (نمونه در `backend/.env.example`):

```
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://your-project.livekit.cloud
```

بدون این‌ها بازی کامل کار می‌کند، فقط دکمه‌ی صدا پیام «صدای گروهی تنظیم نشده» نشان می‌دهد.

---

## وضعیت بیلد

```
npx eslint src/game --ext .js,.jsx   →  0 خطا
npm run build                        →  موفق (GameCanvas ≈ 1.16 MB / 321 kB gzip)
```

خطاهای lint باقی‌مانده در `useWebRTC.js`، `Profile.jsx` و `Settings.jsx` از قبل وجود داشته‌اند و به بازی مربوط نیستند.
