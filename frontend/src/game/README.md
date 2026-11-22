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
| `wind.mp3` سراسری | ❌ → ✅ | فایل نبود (404)؛ با ffmpeg ساخته شد + بستر `createGlobalLoop` |
| `guitar1.m4a` / `guitar2.mp3` / `guitar3.m4a` با G | ✅ | تصادفی + `publishPlayerAction` برای بقیه |
| `yum.mp3` / `water.mp3` | ❌ → ✅ | هر دو ساخته شدند؛ fallback رویه‌ای هم برای `.m4a` فعال شد |
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

## وضعیت بیلد

```
npx eslint src/game --ext .js,.jsx   →  0 خطا
npm run build                        →  موفق
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
