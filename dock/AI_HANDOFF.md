# AI_HANDOFF — BMS Cozy Forest

آخرین به‌روزرسانی: 2026-11-25
فاز فعلی: PHASE 2d — 100% DONE ✅ · **PHASE 2: 100% COMPLETE** 🎉

## 1) خلاصه
بازی هم‌اکنون: زمین ناهموار + جنگل بلند + آبشار/رودخانه + کمپ/ساحل (Phase 1)،
حس زنده‌بودن کاراکتر + نقاط استراحت (Phase 2a)، چرخ ایموت Q + نام‌شناور + حباب چت (Phase 2b)،
انتخاب کاراکتر پیش از بازی + کمد لباس کامل (Phase 2c)، و از این دور: محیط واکنشی به اندازه‌ی گروه،
تعامل هدفمند با بازیکن نزدیک (بغل/دست‌تکون) و مرورگر کمپ‌های فعال (Phase 2d).

## 2) DONE ✅
| مورد | فایل‌ها | چطور تأیید شد |
|---|---|---|
| چرخ ایموت شعاعی با نگه‌داشتن Q، انتخاب با موس (pointer-lock هم پشتیبانی می‌شود) | `ui/EmoteWheel.jsx` (جدید) | eslint + build |
| ۸ ایموت: wave/dance/cheer/laugh/sit/sleep/hug/highfive + پخش `emote_pop.mp3` | `ui/EmoteWheel.jsx`, `sounds.js` | eslint + build |
| شبکه‌سازی ایموت با رویداد موجود `player-action` و مدت زمان | `ui/EmoteWheel.jsx`, `hooks/useGameSync.js` | eslint + build |
| hug/highfive دو نفره: شریک در فاصله‌ی ≤۲ متر انتخاب و هم‌گام می‌شود (دو طرف) | `ui/EmoteWheel.jsx`, `hooks/useGameSync.js` | eslint + build |
| کلیپ‌های جدید ایموت در CLIP_SUFFIX (cheer/highfive/hug/sit) | `models/characterConfig.js` | eslint + build |
| انیمیشن رویه‌ای ایموت‌های جدید (cheer/highfive/hug/sit) | `components/Character.jsx` | eslint + build |
| نام‌شناور ریموت با Html/occlude + محو شدن ۲۴→۳۰ متر (بدون re-render) | `components/NameTag.jsx` (جدید) | eslint + build |
| حباب چت بالای سر با دنباله و پنهان‌شدن ۵ ثانیه‌ای | `components/ChatBubble.jsx` (جدید) | eslint + build |
| اشتراک پیام‌های اتاق و پرکردن حباب/لاگ (بدون re-render) | `hooks/useChatBubbles.js` (جدید) | eslint + build |
| لاگ سه‌پیامی گوشه‌ی پایین-راست | `GameOverlay.jsx`, `stores/usePlayerStore.js` (`chatLog`, `pushChatLog`) | eslint + build |
| ثبت چرخ ایموت و لاگ چت در Overlay | `GameOverlay.jsx` | eslint + build |
| میان‌برهای 1..5 به ایموت‌های جدید هم‌راستا شدند (Digit4 = cheer) | `components/PlayerController.jsx` | eslint + build |
| حباب چت محلی هم بالای سر خود بازیکن نمایش داده می‌شود | `components/PlayerController.jsx` | eslint + build |
| پرچم `uiFlags.emoteWheelOpen` بیرون از React برای HUD/دوربین | `stores/usePlayerStore.js` | eslint + build |
| انتخاب کاراکتر پیش از بازی: گرید ۹ کاراکتر + پیش‌نمایش سه‌بعدی چرخان | `ui/CharacterSelector.jsx` (جدید) | eslint + build |
| ذخیره‌ی انتخاب در `preferred-character` و ارسال به claim-character (اولویت، fallback تصادفی) | `ui/CharacterSelector.jsx`, `hooks/useClaimCharacter.js`, `backend/src/routes/calls.js` | eslint + build |
| کمد لباس با ۴ تب: کلاه(۸)/عینک(۲)/پیراهن(۶ رنگ + ۳ طرح)/اکسسوری(کوله + شال) | `ui/Wardrobe.jsx` (جدید) | eslint + build |
| پیش‌نمایش سه‌بعدی زنده در کمد با آیتم‌های فعلی | `ui/CharacterSelector.jsx` (`CharacterPreview`), `ui/Wardrobe.jsx` | eslint + build |
| اتصال کلاه/عینک به بون Head (یا آفست سر) + مقیاس هر کاراکتر | `components/Character.jsx`, `models/characterConfig.js` | eslint + build |
| پیراهن: tint + بافت stripes/dots روی تنه‌ی مدل | `models/wardrobeConfig.js`, `components/Character.jsx` | eslint + build |
| Unlockables قفل با راهنما (جادوگر/تاج گل/گوش گربه/عینک آفتابی/شال) | `ui/Wardrobe.jsx`, `models/wardrobeConfig.js` | eslint + build |
| ذخیره‌سازی `wardrobe-<userId>` + بارگذاری در store | `models/wardrobeConfig.js`, `stores/usePlayerStore.js`, `GameOverlay.jsx` | eslint + build |
| پخش `equip_cloth.mp3` هنگام تعویض لباس | `ui/Wardrobe.jsx`, `sounds.js` | eslint + build |
| پخش کمد از طریق `player-move` + presence و رندر روی ریموت‌ها | `hooks/useGameSync.js`, `stores/usePlayerStore.js`, `components/RemotePlayers.jsx` | eslint + build |
| دکمه‌ی کمد در HUD کنار تنظیمات | `ui/GameHUD.jsx`, `GameOverlay.jsx` | eslint + build |
| کاراکتر محلی کمد را از store می‌گیرد (بدون re-render اضافه) | `components/PlayerController.jsx` | eslint + build |
| کمپ شلوغ (۳+ نفر): ۵۰٪ کرم‌شب‌تاب/پولن/برگ بیشتر | `components/CozyScene.jsx`, `components/CanopyFX.jsx`, `stores/usePlayerStore.js` | eslint + build |
| کمپ شلوغ: آتش ۱.۳ برابر روشن‌تر و جیرجیرک‌ها ۳۵٪ بلندتر | `components/Campfire.jsx`, `components/AmbientAudio.jsx`, `stores/usePlayerStore.js` (`campMood`) | eslint + build |
| تعامل هدفمند E: نزدیک‌ترین بازیکن ≤۲.۵ متر → بغل (≤۱.۶) یا دست‌تکون + `targetId` در payload | `components/PlayerController.jsx`, `hooks/useGameSync.js` | eslint + build |
| پاسخ متقابل طرف مقابل وقتی `targetId` او را هدف گرفته | `hooks/useGameSync.js` | eslint + build |
| اندپوینت `GET /api/calls/game/campsites` (roomId + تعداد بازیکن) | `backend/src/routes/calls.js` | node --check |
| ثبت roomId در claim-character برای شمارش کمپ‌ها | `backend/src/routes/calls.js`, `hooks/useClaimCharacter.js` | node --check |
| مرورگر کمپ‌ها با تعداد بازیکن/ظرفیت + ورود با تغییر اتاق و باز کردن بازی | `ui/CampsiteBrowser.jsx` (جدید), `components/Chat.jsx`, `components/ChatHeader.jsx` | eslint + build |

دستورهای تأیید: `npx eslint src/game` + `npx eslint src/components/Chat.jsx src/components/ChatHeader.jsx` (exit 0)، `node --check backend/src/routes/calls.js` (exit 0) و `npm run build` (exit 0).

## 3) IN PROGRESS 🔄
هیچ‌چیز نیمه‌کاره در 2d. Phase 2 کامل شد.

## 4) NOT DONE ⬜ (به‌ترتیب)
- Phase 3+ طبق MASTER_PROMPT (منتظر دستور).

## 5) PLACEHOLDERS STILL IN USE
- `wearables.*` همه procedural هستند (کلاه/عینک/شال در `Hat.jsx`/`Glasses.jsx`).
- کوله‌پشتی از GLB موجود (`structures.backpack`).
- صداهای ایموت/لباس فایل واقعی دارند (`ui.emotePop`, `ui.equipCloth`).
- حباب چت از استایل CSS داخلی استفاده می‌کند (بدون تصویر).

## 6) تصمیم‌ها و انحراف‌ها
- چرخ ایموت DOM روی Canvas است (z-70) تا با pointer lock هم کار کند؛ انتخاب با movementX/Y و رها کردن Q.
- حباب چت با اشتراک مستقیم روی همان کانال Ably اتاق (`new-message`) انجام می‌شود؛ store چت دست‌نخورده ماند.
- داده‌ی hot (موقعیت موس/انتخاب) بیرون React نگه داشته شد؛ state فقط برای باز/بسته و ایموت فعال.
- برای hug/highfive شناسه‌ی شریک در payload ارسال می‌شود، ولی طرف مقابل بر اساس فاصله‌ی واقعی هم تصمیم می‌گیرد (مقاوم به اختلاف شبکه).
- NameTag جایگزین Html دستی قبلی در RemotePlayers شد و VoiceBubble داخل آن حفظ شد.
- انتخاب کاراکتر پیش از claim انجام می‌شود؛ بک‌اند اگر کاراکتر ترجیحی آزاد نباشد تصادفی می‌دهد (بدون تغییر auth/claim flow).
- پیش‌نمایش سه‌بعدی یک Canvas مستقل و سبک است (fov 45، بدون postprocessing) تا انتخاب/کمد سنگین نشود.
- کلاه/عینک به بون Head بایند می‌شوند و هر فریم موقعیت جهانی آن را با `worldToLocal` دنبال می‌کنند (بدون re-render).
- اگر کمد در payload نباشد (بازیکن قدیمی)، `NO_WARDROBE` باعث می‌شود هیچ آیتم/تینتی اعمال نشود.
- کمد ریموت فقط با تغییر JSON در useFrame (state) رندر می‌شود، نه هر فریم.
- حس گروه با `campMood` (بیرون React) در حلقه‌ی فریم خوانده می‌شود؛ store فقط یک boolean مشتق‌شده (`peerCount >= 3`) برای رندر تعداد ذرات می‌دهد.
- تعامل هدفمند از همان رویداد `player-action` استفاده می‌کند (فیلد جدید `targetId`)؛ منطق دو‌نفره‌ی hug/highfive قبلی حفظ شد.
- کمپ‌ها بر اساس `roomId` هر claim شمارش می‌شوند (پیش‌فرض `camp-main`)؛ بدون ذخیره‌سازی دائمی، فقط حافظه.

## 7) مشکلات شناخته‌شده / تست دستی
- تست دو مرورگر: hug باید در هر دو طرف اجرا شود و پس از ۳.۴ ثانیه پایان یابد.
- چرخ ایموت در حالت pointer lock باید با حرکت موس انتخاب کند؛ در حالت آزاد با موقعیت مطلق.
- اگر حباب چت دیده نشد، مطمئن شوید اتاق چت فعال است (کانال `presence:room-*` subscribed).
- محو شدن نام‌شناور در فاصله‌ی ۲۴–۳۰ متر خطی است (بدون fade ناگهانی).
- ارتفاع کلاه روی بون Head تقریبی است (+0.18)؛ اگر روی مدلی شناور/فرورفته بود، `HEAD_ANCHORS[model].z` را تنظیم کنید.
- اگر کاراکتر ترجیحی آزاد نبود، کاراکتر تصادفی داده می‌شود (طبق طراحی).
- تعامل هدفمند با E فقط وقتی آیتم تعاملی نزدیک نباشد فعال است؛ برای تست دو مرورگر با فاصله‌ی < ۲.۵ متر.
- فهرست کمپ‌ها پس از restart بک‌اند خالی می‌شود (in-memory)؛ «بازخوانی» را بزنید.

## 8) اجرا و تأیید
```
cd frontend
npx eslint src/game
npm run build
npm run dev
```
کلیدها: نگه‌داشتن Q = چرخ ایموت · 1..5 میان‌بر · E تعامل/نشستن/بغل بازیکن نزدیک · G گیتار · M مارشمالو.
کمد از دکمه‌ی 👕 در HUD و مرور کمپ‌ها از دکمه‌ی ⛺ در هدر چت باز می‌شود.

## 9) env / endpoint / store / localStorage جدید
- store: `chatLog` + `pushChatLog`؛ `uiFlags`؛ `chatBubbleMap`؛ `wardrobe` + `setWardrobe`؛ `campMood` (module-level).
- endpoint جدید: `GET /api/calls/game/campsites`؛ `POST /api/calls/game/claim-character` اکنون `{ preferred?, roomId? }` می‌پذیرد.
- localStorage: `preferred-character` و `wardrobe-<userId>` (بدون کلید جدید در 2d).

## 10) Changelog (جدیدترین اول)
- 2026-11-25 — Phase 2d: محیط واکنشی به اندازه‌ی گروه (کرم‌شب‌تاب/آتش/جیرجیرک)، تعامل هدفمند E با پاسخ متقابل، و مرورگر کمپ‌های فعال. **PHASE 2 کامل شد.** build ✅
- 2026-11-25 — Phase 2c: انتخاب کاراکتر پیش از بازی + کمد کامل (کلاه/عینک/پیراهن/اکسسوری رویه‌ای) با پیش‌نمایش سه‌بعدی، ذخیره‌سازی، Unlockables و پخش Ably. build ✅
- 2026-11-25 — Phase 2b: چرخ ایموت Q + ۸ ایموت + hug/highfive دو نفره، نام‌شناور با محو فاصله، حباب چت ۵ ثانیه‌ای + لاگ سه‌پیامی. build ✅
- 2026-11-25 — Phase 2a: character feel (squash/stretch، head-bob، blink، look-at، idle variations، quest hop) + rest spots. build ✅
- 2026-11-24 — Phase 1: terrain/forest/waterfall/visual fixes/campfire rocks/dock کامل. build ✅

