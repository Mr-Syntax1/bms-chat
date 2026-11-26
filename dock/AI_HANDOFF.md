# AI_HANDOFF — BMS Cozy Forest

آخرین به‌روزرسانی: 2026-11-26
فاز فعلی: PHASE 3d — DONE ✅ (چیدن گیاه) · PHASE 3c — DONE ✅ (حشرات و حیات وحش) · PHASE 3b — DONE ✅ (ماهیگیری) · PHASE 3a — DONE ✅ (پخت‌وپز) · **PHASE 2: 100% COMPLETE** 🎉

## 1) خلاصه
بازی هم‌اکنون: زمین ناهموار + جنگل بلند + آبشار/رودخانه + کمپ/ساحل (Phase 1)،
حس زنده‌بودن کاراکتر + نقاط استراحت (Phase 2a)، چرخ ایموت Q + نام‌شناور + حباب چت (Phase 2b)،
انتخاب کاراکتر پیش از بازی + کمد لباس کامل (Phase 2c)، محیط واکنشی به اندازه‌ی گروه،
تعامل هدفمند با بازیکن نزدیک و مرورگر کمپ‌های فعال (Phase 2d)، سیستم پخت‌وپز با ۴ ایستگاه و
۴ سطح کیفیت (Phase 3a)، سیستم ماهیگیری (Phase 3b)، حیات وحش و حشرات (Phase 3c)، و از این دور:
**چیدن گیاه** — ۳۶ گیاه قابل چیدن در ۶ گونه (قارچ جنگلی/قارچ مرغ جنگل/توت/گیاه معطر/میوه کاج/گل وحشی)
با spawn ثابت seed‌دار، ری‌اسپاون ۱۰..۱۵ دقیقه‌ای بیرون React، چیدن با F، ۴ دستور پخت جدید و
بخش «گیاهان چیده‌شده» در دفترچه. همچنین **رفع لگ تماس گروهی ۳+ نفره** در WebRTC mesh.

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
| ۴ ایستگاه پخت: گریل سنگی کنار آتش + دیگ آویزان روی سه‌پایه + دیگ بزرگ + ماهیتابه | `components/CookingStation.jsx` (جدید), `components/CozyScene.jsx`, `recipes.js` (جدید) | eslint + build |
| ثبت ایستگاه‌ها در رجیستری تعامل + نزدیکی ۲ متری با E («برای پختن») | `interactionRegistry.js` (`registerCookingStation`/`findNearbyCookingStation`), `components/PlayerController.jsx` | eslint + build |
| UI پخت: انتخاب دستور، ۴ اسلات مواد با موجودی، نوار پیشرفت ناحیه‌بندی‌شده (سبز→زرد→طلایی→سرخ)، دکمه‌های پختن/برگرداندن/هم‌زدن، کارت نتیجه | `ui/CookingUI.jsx` (جدید) | eslint + build |
| مینی‌گیم: نگه‌داشتن E = شروع، رها کردن = پایان؛ خام/عالی/سوخته بر اساس زمان + الزام flip/stir | `recipes.js`, `ui/CookingUI.jsx` | eslint + build |
| ۵ دستور داده‌محور: استیک، تخم‌مرغ سرخ‌شده، ذرت کبابی، خورش کمپ، پنکیک (با tiers خام/معمولی/عالی/سوخته) | `recipes.js` | eslint + build |
| اینونتوری مواد + لیست غذاهای پخته‌شده در store؛ خوردن غذا با کلیک (کاهش از لیست + توست) | `stores/usePlayerStore.js` (`ingredients`, `foods`, `consumeIngredients`, `addFood`, `eatFood`) | eslint + build |
| نمایش غذا روی ایستگاه (مدل GLB می‌چرخد از نتیجه) + تکان دیگ/ماهیتابه | `components/CookingStation.jsx` | eslint + build |
| صدا: sizzle/pot_bubble حین پخت، flip، cook_done، burn + کلیدهای جدید sounds.js | `sounds.js`, `ui/CookingUI.jsx`, `audio.js` (موجود) | eslint + build |
| انیمیشن پخت روی کاراکتر: `cooking-stir` و `cooking-flip` (رویه‌ای + کلیپ‌های ریگ) | `components/Character.jsx`, `models/characterConfig.js` | eslint + build |
| پخش اکشن پخت با رویداد موجود `player-action` (سایر بازیکنان حرکت پخت را می‌بینند) | `ui/CookingUI.jsx`, `hooks/useGameSync.js` (موجود) | eslint + build |
| گرم‌کردن مدل‌های پخت/غذا بعد از ورود (idle) | `GameOverlay.jsx`, `preload.js` (`preloadGroup`) | eslint + build |
| ۶ نقطه‌ی ماهیگیری (۴ رودخانه + ۱ ساحل + ۱ اسکله) با سطل Bucket.glb + بابِر رویه‌ای قرمز/سفید + نخ + حلقه‌ی موج | `fishingSpots.js` (جدید), `components/FishingBobber.jsx` (جدید), `components/CozyScene.jsx` | eslint + build |
| ثبت نقاط ماهیگیری در رجیستری تعامل + اولویت E (آیتم → پخت → ماهیگیری → استراحت) + برچسب «برای ماهیگیری» | `interactionRegistry.js`, `hooks/useFishingSpots.js` (جدید), `components/PlayerController.jsx`, `GameOverlay.jsx` | eslint + build |
| مینی‌گیم ۴ مرحله‌ای: شارژ قدرت پرتاب (نگه‌داشتن E) → انتظار تصادفی ۳..۸s → پنجره‌ی گزش ۱.۵s → کشش با نگه‌داشتن شاخص در ناحیه‌ی سبز ۳s | `fishData.js` (جدید), `ui/FishingUI.jsx` (جدید) | eslint + build |
| ۷ گونه‌ی ماهی (قرمز/کپور/باس/قزل‌آلا/آبی/مارماهی/کوی طلایی) با کمیابی وزن‌دار + ۲ آشغال (کفش/قوطی) با ۱۳٪ احتمال | `fishData.js` | eslint + build |
| اینونتوری صید در store + توست + بخش «ماهی‌های صیدشده» در دفترچه | `stores/usePlayerStore.js` (`fishCaught`, `addFish`, `fishingState`, `setFishingState`), `ui/QuestLog.jsx` | eslint + build |
| صدا: cast (mp3)، reel loop (mp3)، catch (mp3)، bite (synth `fish_bite`) | `sounds.js`, `synth.js`, `ui/FishingUI.jsx` | eslint + build |
| پخش اکشن `fishing-hold` با رویداد `player-action` (بقیه ژست و چوب را می‌بینند) | `ui/FishingUI.jsx`, `hooks/useGameSync.js` | eslint + build |
| ژست ماهیگیری روی کاراکتر + چوب FishingRod.glb در دست | `components/Character.jsx`, `components/HeldProps.jsx`, `models/characterConfig.js` (`CLIP_SUFFIX`) | eslint + build |
| مینی‌گیم بیرون React (رفرنس‌ها) + نوارهای tension/power/bite با rAF + لرزش کارت هنگام گزش | `fishData.js`, `ui/FishingUI.jsx`, `index.css` (`.fishing-shake`) | eslint + build |
| پولیش عمومی ۳b: صفر ایموجی در UI بازی (مجموعه‌ی SVG `GameIcon`) | `ui/icons.jsx` (جدید) + همه‌ی فایل‌های UI/داده‌ی بازی | eslint + build |
| پولیش عمومی ۳b: `cursor-pointer` روی همه‌ی کنترل‌های کلیک‌پذیر | `GameOverlay.jsx`, `ui/GameHUD.jsx`, `ui/PauseMenu.jsx`, `ui/QuestLog.jsx`, `ui/Wardrobe.jsx`, `ui/CharacterSelector.jsx`, `ui/FishingUI.jsx` | eslint + build |
| پولیش عمومی ۳b: حذف کامل صدای قدم (بدون فایل/سازنده) | `hooks/usePlayerMotion.js`, `synth.js`, `assetManifest.js` | eslint + build |
| پولیش عمومی ۳b: آسمان واقعی‌تر — ستاره‌ها با opacity/size بهتر + ماه درخشان با هاله‌ی نبضی و نور نقطه‌ای قوی‌تر | `components/CozyScene.jsx` | eslint + build |
| پولیش عمومی ۳b: راهنمای کلیدها هم‌راستا در ControlsHint/PauseMenu/SettingsPanel (+Q/L/C/ماهیگیری/پخت) | `GameOverlay.jsx`, `ui/PauseMenu.jsx`, `ui/SettingsPanel.jsx` | eslint + build |
| ۳c: حیات وحش — ۵ گونه (خرگوش/گوزن/اردک/جغد/تشی) با مدل‌های موجود، پرسه‌زدن تصادفی + فرار ۳ واحدی، AI ۱۰Hz، ارتفاع زمین، اردک روی برکه | `components/Wildlife.jsx` (جدید), `components/CozyScene.jsx` | eslint + build |
| ۳c: نوازش خرگوش — ایستادن بی‌حرکت ۳ ثانیه نزدیک خرگوش → قلب‌های شناور | `components/Wildlife.jsx` | eslint + build |
| ۳c: حشرات رویه‌ای InstancedMesh — پروانه (بال مثلثی + بدن)، سوسک (کره + ۶ پا)، کرم شب‌تاب (کره درخشان)؛ wander با sine، AI ۱۲Hz | `components/Bugs.jsx` (جدید), `bugData.js` (جدید) | eslint + build |
| ۳c: گرفتن حشره با F (نزدیکی ۲.۴ واحد) + تور دستی رویه‌ای + ژست `bug-catch` + صداهای bug_net/bug_catch | `components/PlayerController.jsx`, `components/HeldProps.jsx`, `components/Character.jsx`, `models/characterConfig.js`, `sounds.js` | eslint + build |
| ۳c: اینونتوری حشرات (`bugsCaught`) + بخش «حشرات گرفته‌شده» در دفترچه + آیکون‌های SVG (butterfly/beetle/firefly/net) | `stores/usePlayerStore.js`, `ui/QuestLog.jsx`, `ui/icons.jsx` | eslint + build |
| ۳c: پرامپت «گرفتن حشره» با آیکون SVG (بدون ایموجی) + `nearBug` در store | `ui/InteractionPrompt.jsx`, `stores/usePlayerStore.js` | eslint + build |
| 🐞 رفع باگ: کلید C کمد اصلاً هندلر نداشت — افزودن toggle کامل (باز=unlock موس، بسته=lock، ESC هم می‌بندد) | `GameOverlay.jsx` | eslint + build |
| ۳c: پیش‌بارگذاری گروه animals بعد از ورود (idle) | `GameOverlay.jsx`, `preload.js` (موجود) | eslint + build |
| ۳d: ۶ گونه گیاه قابل چیدن داده‌محور (قارچ جنگلی/قارچ مرغ جنگل/توت/گیاه معطر/میوه کاج/گل وحشی) با کمیابی، زیستگاه و زمان ری‌اسپاون ۱۰..۱۵ دقیقه | `forageData.js` (جدید) | eslint + build |
| ۳d: ۳۶ نقطه‌ی spawn ثابت با seed (mulberry32) — قارچ نزدیک تنه، قارچ نادر عمق جنگل، میوه کاج زیر کاج، توت لبه جنگل، گیاه/گل چمن‌زار | `forageData.js` | eslint + build |
| ۳d: وضعیت زنده بیرون React — `picked: Uint8Array` + `respawnAt: Float64Array` + یک `setInterval` ماژول‌سطح (بدون setState در چرخه‌ی ری‌اسپاون) | `forageData.js` | eslint + build |
| ۳d: رندر ۳بعدی گیاهان — قارچ/قارچ نادر/گل با GLB موجود (`Fitted`)، توت/گیاه/میوه کاج رویه‌ای؛ یک `useFrame` مشترک برای visibility + bob + پالس حلقه‌ی درخشش | `components/ForageItems.jsx` (جدید), `components/CozyScene.jsx` | eslint + build |
| ۳d: چیدن با F — اولویت جدید F: گیاه (≤۲) → حشره (≤۲.۴) → چراغ ون؛ ژست `forage-pick` + صدا `berry_pick.mp3` + پخش اکشن شبکه‌ای | `components/PlayerController.jsx`, `models/characterConfig.js`, `sounds.js` | eslint + build |
| ۳d: انیمیشن خم شدن به جلو برای چیدن روی مدل‌های بدون ریگ | `components/Character.jsx` | eslint + build |
| ۳d: پرامپت «چیدن <نام گیاه>» با آیکون SVG همان گیاه + `nearForage` در store (مقایسه بر اساس index) | `ui/InteractionPrompt.jsx`, `stores/usePlayerStore.js` | eslint + build |
| ۳d: اینونتوری گیاهان (`forageItems` + `addForageItem` که هم‌زمان `ingredients` را زیاد می‌کند) + بخش گروه‌بندی‌شده‌ی «گیاهان چیده‌شده» در دفترچه | `stores/usePlayerStore.js`, `ui/QuestLog.jsx` | eslint + build |
| ۳d: ۴ دستور پخت جدید از گیاهان — خورش قارچ، پای توت، قارچ کبابی، دمنوش گل + ۵ ماده‌ی جدید در INGREDIENTS | `recipes.js`, `ui/CookingUI.jsx` (موجود) | eslint + build |
| ۳d: آیکون‌های SVG جدید berry/herb/pinecone/flower (+pie/mug) در مجموعه‌ی GameIcon | `ui/icons.jsx` | eslint + build |
| ۳d: پیش‌بارگذاری گروه forage (Mushrooms/MushroomLaetiporus/Flowers/Bush) بعد از ورود | `assetManifest.js`, `GameOverlay.jsx` | eslint + build |
| 🐞 رفع لگ تماس گروهی ۳+ نفره: پروفایل ویدیوی تطبیقی (بیت‌ریت/فریم/رزولوشن بر اساس تعداد peer) + اعمال دوباره هنگام اضافه/حذف peer + `degradationPreference='balanced'` برای ۳+ | `hooks/useGroupWebRTC.js` | eslint + build |
| 🐞 رفع لگ تماس گروهی: امضای پایدار `resyncPeer` (فقط شناسه‌ی ترک، بدون mute) تا srcObject با mute/unmute بازسازی نشود | `hooks/useGroupWebRTC.js` | eslint + build |
| 🐞 رفع لگ تماس گروهی: یک AudioContext مشترک برای همه‌ی کاشی‌ها به‌جای یکی per participant (جلوگیری از اتمام سقف context مرورگر) | `components/GroupCallModal.jsx` | eslint + build |

دستورهای تأیید: `npx eslint src/game` (exit 0) و `npm run build` (exit 0).

## 3) IN PROGRESS 🔄
هیچ‌چیز نیمه‌کاره در 3d. Phase 3d کامل شد.

## 4) NOT DONE ⬜ (به‌ترتیب)
- Phase 3e — ساحل/تفریح؛ Phase 3f — دکور کمپ (منتظر دستور «next»).
- چیدن گیاه: ذخیره‌سازی دائمی ری‌اسپاون/اینونتوری (فعلاً در حافظه‌ی صفحه) و همگام‌سازی چیدن بین بازیکنان (فعلاً هر کلاینت مستقل می‌چیند).
- گسترش دستورهای پخت از ۹ به ۵۰+ و Recipe Book با دستورهای کشف‌نشده (طبق MASTER_PROMPT).
- خوردن با انیمیشن لقمه/پف گونه + ذرات خرده و صداهای eat_crunch/eat_gulp (فعلاً فقط حذف از لیست + توست).
- یخ‌دان اشتراکی (Icebox) و ظرف‌های Mug/Thermos.
- ماهیگیری: دفترچه‌ی ماهی‌ها با رکورد/وزن‌های کشف‌شده (فعلاً لیست ساده) + بردن ماهی به یخ‌دان.

## 5) PLACEHOLDERS STILL IN USE
- `wearables.*` همه procedural هستند (کلاه/عینک/شال در `Hat.jsx`/`Glasses.jsx`).
- کوله‌پشتی از GLB موجود (`structures.backpack`).
- صداهای ایموت/لباس/پخت فایل واقعی دارند (`ui.emotePop`, `ui.equipCloth`, `cooking.*`).
- حباب چت از استایل CSS داخلی استفاده می‌کند (بدون تصویر).
- سه‌پایه‌ی دیگ آویزان (`cooking.tripod`) هنوز procedural است (۳ سیلندر چوب + زنجیر).
- گریل شبکه/پایه‌ی سنگی procedural است و از آتش موجود بهره می‌برد.
- مدل‌های غذایی موجود استفاده می‌شوند؛ دستورهای بدون مدل (خورش/پنکیک/استیک همه مدل دارند فعلاً).
- مواد خام (گوشت/تخم/آرد/شیر/هویج) فقط شناسه‌ی اینونتوری با آیکون SVG (`GameIcon`) هستند، بدون مدل ۳بعدی.
- 3b: ماهی صیدشده با `FISH_MODEL_KEY` (animals.goldfish) نمایش داده می‌شود؛ سطل/چوب از GLB موجود، بابِر procedural است.
- 3b: صدای گزش از synth (`fish_bite`) می‌آید؛ cast/reel/catch فایل mp3 واقعی دارند.
- 3b: آیکون‌ها همه SVG درون‌خطی (`ui/icons.jsx` → `GameIcon`) هستند؛ هیچ ایموجی در UI بازی نمانده.
- 3c: حشرات کاملاً رویه‌ای‌اند (بدون GLB): پروانه از دو مثلث بال + استوانه‌ی بدن، سوسک از کره‌ی کشیده + ۶ استوانه‌ی پا، کرم شب‌تاب از کره‌ی emissive. همه با `InstancedMesh`.
- 3c: تور حشره (`HeldNet`) رویه‌ای است: استوانه‌ی دسته + torus حلقه + مخروط شفاف توری.
- 3c: حیوانات از `useModelParts` استفاده می‌کنند (همان الگوی PondLife) تا بدون SkeletonUtils سبک بمانند؛ مدل‌ها ریگ‌دار نیستند و انیمیشن رویه‌ای (bob/tilt) دارند.
- 3d: قارچ جنگلی/قارچ مرغ جنگل/گل وحشی از GLBهای موجود (`undergrowth.mushrooms`/`edibleMushroom`/`flowers`) رندر می‌شوند؛ توت (بوته‌ی `BushbyQuaternius` + کره‌های قرمز)، گیاه معطر (مخروط‌های سبز) و میوه کاج (مخروط + torus) رویه‌ای‌اند. هیچ GLB جدیدی اضافه نشد.
- 3d: حلقه‌ی درخشش additive زیر هر گیاه با پالس opacity در همان `useFrame` مشترک `ForageItems` آپدیت می‌شود (بدون material جدید per frame).

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
- 3a: داده‌ی زنده‌ی مینی‌گیم پخت در `cooking` (module-level در `recipes.js`) است و React فقط روی رویدادهای گسسته (start/result/reset/flip/stir) رندر می‌شود؛ حلقه‌ی پیشرفت با rAF بیرون از چرخه‌ی رندر بار را آپدیت می‌کند.
- 3a: «نگه‌داشتن E» هم با کیبورد و هم با pointerdown/up روی دکمه کار می‌کند؛ رها شدن بار زودتر از ناحیه‌ی طلایی = معمولی/خام، پس از آن = سوخته.
- 3a: کیفیت از نسبت زمان به `cookTime` محاسبه می‌شود (نواحی در `BAR_ZONES`)؛ اگر نوار پر شود و کاربر رها نکند خودکار «سوخته» می‌شود.
- 3a: پن بدون برگرداندن = خام، دیگ بدون ۳ بار هم‌زدن = حداکثر معمولی.
- 3a: UI پخت با mount شدن ایستگاه قفل موس را آزاد می‌کند و هنگام بستن دوباره قفل می‌کند (بدون تغییر usePointerLook).
- 3a: seek خوردن فعلاً ساده است (کلیک روی غذا در دفترچه → حذف + توست سیری)؛ انیمیشن خوردن به فاز ۳b/۳e موکول شد.
- 3a: موقعیت ایستگاه‌ها دستی در `recipes.js` (STATIONS) است تا از درخت/ون/صندلی دور بماند.
- 3b: داده‌ی زنده‌ی ماهیگیری در `fishing` (module-level در `fishData.js`) است؛ React فقط روی رویدادهای گسسته (start/charge/cast/bite/reel/result/reset) رندر می‌شود و نوارها با rAF مستقیم آپدیت می‌شوند.
- 3b: پنجره‌ی گزش محدود است؛ دیر زدن E = فرار ماهی. کشش نیازمند نگه‌داشتن شاخص در ناحیه‌ی سبز برای `REEL_HOLD_TIME` است.
- 3b: وزن/گونه با مولد شبه‌تصادفی و جدول کمیابی وزن‌دار انتخاب می‌شود؛ آشغال (`junk`) با وزن 0 و بدون ارزش غذایی.
- 3b: UI ماهیگیری هنگام mount قفل موس را آزاد و هنگام reset دوباره قفل می‌کند (همان الگوی پخت).
- 3b: صفر ایموجی — همه‌ی آیکون‌ها از `GameIcon` با خروجی SVG؛ `CLIP_SUFFIX['fishing-hold']='Weapon'` برای مدل‌های ریگ‌دار.
- 3b: صدای قدم کاملاً حذف شد (بدون فایل، بدون سازنده‌ی synth) تا محیط ساکت/دنج بماند.
- 3c: داده‌ی زنده‌ی حشرات در `bugWorld` (module-level در `bugData.js`) است — `pos` یک Float32Array و `caught` یک Uint8Array؛ گرفتن بدون re-render هر فریم ممکن است و فقط گرفتن یک‌بار state را آپدیت می‌کند.
- 3c: AI حشرات ۱۲Hz (sine wander) و حیوانات ۱۰Hz (wander/flee) آپدیت می‌شود؛ موقعیت‌ها در ref هستند.
- 3c: F دو کار دارد: اگر حشره‌ای در ۲.۴ واحد باشد تور می‌زند، وگرنه چراغ ون را toggle می‌کند (سازگاری با رفتار قبلی).
- 3c: نوازش خرگوش فقط وقتی `local.moving === false` است شمارش می‌شود (۳ ثانیه)، سپس ۲.۵ ثانیه قلب نشان داده می‌شود.
- 3c: باگ کلید C — هیچ‌جا هندلر `KeyC` وجود نداشت (فقط دکمه‌ی HUD کار می‌کرد). حالا در `GameOverlay` toggle می‌شود؛ هنگام باز شدن موس unlock و هنگام بسته شدن دوباره lock می‌شود و ESC هم کمد را می‌بندد.
- 3d: تایمر ری‌اسپاون ماژول‌سطح است (`ensureRespawnTimer`, ۱ ثانیه) و در Node با `unref()` مانع خروج پروسه نمی‌شود؛ هیچ setState‌ای در چرخه‌ی ری‌اسپاون نیست — فقط `ForageItems` هر فریم `picked[i]` را می‌خواند.
- 3d: چیدمان با seed ثابت 90217 است تا همه‌ی کلاینت‌ها مکان یکسان ببینند؛ چیدن اما محلی است (همگام‌سازی چیدن بین بازیکنان در فاز بعد).
- 3d: F سه‌کاره شد با اولویت گیاه → حشره → چراغ ون؛ برای جلوگیری از تصادم، چیدن فقط وقتی `state.action` خالی است انجام می‌شود.
- 3d: گیاهان چیده‌شده هم به `forageItems` (برای نمایش گروه‌بندی‌شده) و هم به `ingredients` (برای دستورهای پخت) اضافه می‌شوند؛ شناسه‌ی `mushroom` قارچ از قبل در ingredients بود و حالا با چیدن زیاد می‌شود.
- 3d: گروه preload «forage» فقط ۴ مدل موجود را warm می‌کند و بعد از ورود (idle، ۱.۲s) اجرا می‌شود تا فریم اول سنگین نشود.
- 🐞 تماس گروهی ۳+ نفره: علت اصلی این بود که `perPeerBitrate` فقط هنگام ساخت اتصال اعمال می‌شد؛ با ورود نفر سوم، فرستنده‌های موجود همچنان بیت‌ریت ۲ نفره می‌فرستادند و آپلود اشباع می‌شد. حالا `applyVideoSenderProfile()` در پایان `createPeer` و `closePeer` دوباره اجرا می‌شود و `videoParamsFor` رزولوشن/فریم را هم با تعداد peer کم می‌کند (۳ نفر: ۱.۵×، ۲۴fps؛ ۴ نفر: ۱.۷۵×، ۲۰fps؛ ۵+: ۲×، ۱۵fps).
- 🐞 تماس گروهی: `degradationPreference` برای ۳+ نفر `balanced` شد (قبلاً `maintain-framerate` کیفیت را در شرایط اشباع کاملاً خراب می‌کرد)؛ برای ۱..۲ نفر همان `maintain-framerate` می‌ماند.
- 🐞 تماس گروهی: `resyncPeer` دیگر mute/unmute را در امضا لحاظ نمی‌کند؛ فقط تغییر مجموعه‌ی ترک‌ها `MediaStream` تازه می‌سازد تا `srcObject` روی `<video>` هر بار بازسازی نشود (منبع فلیکر/فریز).
- 🐞 تماس گروهی: `useSpeaking` از یک `AudioContext` مشترک ماژول‌سطح استفاده می‌کند؛ قبلاً هر کاشی یک context می‌ساخت که در ۳+ نفر به سقف context مرورگر می‌خورد.

## 7) مشکلات شناخته‌شده / تست دستی
- 🚨 (2026-11-26) رگرسیون سوکت رفع شد: اگر دوباره «آنلاین/اتاق‌ها/تیک پیام» خالی شد، اول مطمئن شوید افکت اتصال در `App.jsx` (وابسته به `authUser?.id`) هست و `connectSocket` هیچ‌جای دیگری هم صدا زده نمی‌شود (دو بار connect = رفتار عجیب).
- تست دو مرورگر: hug باید در هر دو طرف اجرا شود و پس از ۳.۴ ثانیه پایان یابد.
- چرخ ایموت در حالت pointer lock باید با حرکت موس انتخاب کند؛ در حالت آزاد با موقعیت مطلق.
- اگر حباب چت دیده نشد، مطمئن شوید اتاق چت فعال است (کانال `presence:room-*` subscribed).
- محو شدن نام‌شناور در فاصله‌ی ۲۴–۳۰ متر خطی است (بدون fade ناگهانی).
- ارتفاع کلاه روی بون Head تقریبی است (+0.18)؛ اگر روی مدلی شناور/فرورفته بود، `HEAD_ANCHORS[model].z` را تنظیم کنید.
- اگر کاراکتر ترجیحی آزاد نبود، کاراکتر تصادفی داده می‌شود (طبق طراحی).
- تعامل هدفمند با E فقط وقتی آیتم تعاملی نزدیک نباشد فعال است؛ برای تست دو مرورگر با فاصله‌ی < ۲.۵ متر.
- فهرست کمپ‌ها پس از restart بک‌اند خالی می‌شود (in-memory)؛ «بازخوانی» را بزنید.
- 3a: گریل در `x≈4, z=0` کنار آتش است؛ اگر روی کنده یا صندلی افتاد، `STATIONS.grill.pos` را کمی جابه‌جا کنید.
- 3a: اگر مدل Pot/Cauldron/Fryingpan آفست عجیب داشت، ارتفاع `Fitted height` در `CookingStation.jsx` را تنظیم کنید.
- 3a: مواد اولیه فعلاً ثابت در store (۳ گوشت، ۳ تخم…)؛ چیدن گیاه در Phase 3d آن را پویا می‌کند.
- 3a: مینی‌گیم به «نرخ فریم» حساس نیست (dt از rAF) اما در تب پس‌زمینه ممکن است پخت خودکار سوخته شود.
- 3b: ۶ نقطه‌ی ماهیگیری دستی‌چین‌اند؛ اگر بابِر/سطل روی آب یا داخل تنه افتاد، `offset` همان نقطه در `fishingSpots.js` را تنظیم کنید.
- 3b: چوب در دست با `HeldProps` حول لنگر پروپ رندر می‌شود؛ اگر روی مدل chibi بزرگ بود، `anchor.scale` را کم کنید.
- 3b: اگر کارت گزش لرزش نداشت، کلاس `.fishing-shake` در `index.css` را بررسی کنید.
- 3b: صیدها در store هستند و با رفرش پاک می‌شوند (ذخیره‌سازی دائمی در فازهای بعد).
- 3c: نقاط spawn حیوانات/حشرات دستی‌چین با seed ثابت‌اند؛ اگر خرگوش/گوزن داخل درخت یا روی شیب افتاد، بازه‌های `buildSpawns`/`buildList` را تنظیم کنید.
- 3c: خرگوش/گوزن/تشی با فاصله‌ی ۳ واحد فرار می‌کنند؛ اگر می‌خواهید راحت‌تر نزدیک شوید، `FLEE_RANGE` را در `Wildlife.jsx` کم کنید.
- 3c: گرفتن حشره شعاع ۱.۹ واحدی تور دارد (پرامپت در ۲.۴ ظاهر می‌شود)؛ اگر احساس کردید حشره گرفته نمی‌شود، شعاع `tryCatchBug` را افزایش دهید.
- 3c: اردک‌ها داخل برکه شنا می‌کنند؛ اگر روی خشکی/زیر آب دیده شدند، `POND` در `terrain.js` را بررسی کنید.
- 3c: اگر کلید C کمد باز نشد، مطمئن شوید موس قفل است (دکمه‌ی ورود زده شده) و پنل دیگری (پخت/ماهیگیری/دفترچه/تنظیمات) باز نیست.
- 3d: گیاهان با seed ثابت چیده شده‌اند؛ اگر قارچ/گل داخل تنه یا روی شیب افتاد، بازه‌های `buildList` در `forageData.js` را تنظیم کنید.
- 3d: برد چیدن ۲.۰ واحد است (پرامپت هم همان‌جا ظاهر می‌شود)؛ برای راحت‌تر شدن `findNearestForage`/`tryPickForage` را افزایش دهید.
- 3d: ری‌اسپاون ۱۰..۱۵ دقیقه است؛ برای تست سریع `respawnTime` هر نوع در `FORAGE_TYPES` را موقتاً کم کنید.
- 3d: اگر گیاهی پس از چیدن ناپدید نشد، مطمئن شوید `ForageItems` داخل `Suspense`/Canvas مانت است و `forageWorld.picked` همان نمونه‌ای است که `tryPickForage` می‌نویسد.
- 3d: چیدن بین بازیکنان همگام نیست (هر کلاینت لیست مستقل دارد)؛ این محدودیت شناخته‌شده است.
- 🐞 تماس گروهی: اگر هنوز در ۳+ نفر لگ بود، اول `chrome://webrtc-internals` را ببینید — `maxBitrate` هر sender باید با تعداد peer پایین آمده باشد. اگر آپلود دستگاه کم است، `UPLOAD_BUDGET` را در `useGroupWebRTC.js` کم کنید.
- 🐞 تماس گروهی: در شبکه‌های بدون TURN (فقط STUN)، mesh ۳+ نفره ذاتاً سنگین است؛ متغیرهای `VITE_TURN_*`/`VITE_METERED_*` را تنظیم کنید.

## 8) اجرا و تأیید
```
cd frontend
npx eslint src/game
npm run build
npm run dev
```
کلیدها: نگه‌داشتن Q = چرخ ایموت · 1..5 میان‌بر · E تعامل/نشستن/بغل بازیکن نزدیک · **E نزدیک ایستگاه پخت = نگه‌داشتن برای پختن** · **E نزدیک نقطه‌ی ماهیگیری = مینی‌گیم ماهیگیری** · G گیتار · M مارشمالو · L دفترچه · C کمد · **F = چیدن گیاه (اولویت) / گرفتن حشره با تور / چراغ ون**.
کمد از دکمه‌ی کمد (آیکون SVG) در HUD **یا کلید C** و مرور کمپ‌ها از دکمه‌ی چادر در هدر چت باز می‌شود. غذاهای پخته‌شده، ماهی‌های صیدشده، حشرات گرفته‌شده و گیاهان چیده‌شده در دفترچه (آیکون طومار) دیده می‌شوند.

## 9) env / endpoint / store / localStorage جدید
- store: `chatLog` + `pushChatLog`؛ `uiFlags`؛ `chatBubbleMap`؛ `wardrobe` + `setWardrobe`؛ `campMood` (module-level)؛ `ingredients` + `addIngredient` + `consumeIngredients`؛ `foods` + `addFood` + `eatFood`؛ `cookingStation` + `openCooking` + `closeCooking`؛ `fishCaught` + `addFish`؛ `fishingState` + `setFishingState`؛ `bugsCaught` + `addBug`؛ `nearBug` + `setNearBug`؛ **`forageItems` + `addForageItem`؛ `nearForage` + `setNearForage`**.
- endpoint جدید: `GET /api/calls/game/campsites`؛ `POST /api/calls/game/claim-character` اکنون `{ preferred?, roomId? }` می‌پذیرد.
- localStorage: `preferred-character` و `wardrobe-<userId>` (بدون کلید جدید در 3d؛ گیاهان هنوز ذخیره نمی‌شوند).

## 10) Changelog (جدیدترین اول)
- 2026-11-26 — Phase 3d: چیدن گیاه — ۶ گونه × ۳۶ نقطه‌ی seed‌دار (قارچ جنگلی/قارچ مرغ جنگل/توت/گیاه معطر/میوه کاج/گل وحشی)، رندر با ۴ GLB موجود + ۳ مدل رویه‌ای، وضعیت `picked`/`respawnAt` بیرون React با تایمر ماژول‌سطح، چیدن با F (اولویت گیاه → حشره → چراغ)، ژست `forage-pick` + صدای berry_pick، اینونتوری گروه‌بندی‌شده در دفترچه، ۴ دستور پخت جدید (خورش قارچ/پای توت/قارچ کبابی/دمنوش گل)، آیکون‌های SVG جدید. **رفع لگ تماس گروهی ۳+ نفره**: پروفایل ویدیوی تطبیقی + اعمال دوباره هنگام تغییر تعداد peer + `balanced` برای ۳+، امضای پایدار `resyncPeer`، AudioContext مشترک برای کاشی‌ها. eslint ✅ build ✅
- 2026-11-26 — Phase 3c: حشرات و حیات وحش — ۵ گونه حیوان با AI پرسه/فرار ۱۰Hz و ارتفاع زمین (خرگوش/گوزن جنگل، اردک برکه، جغد/تشی لبه‌ی جنگل)، نوازش خرگوش با قلب شناور، حشرات رویه‌ای InstancedMesh (پروانه/سوسک/کرم شب‌تاب) با wander ۱۲Hz، گرفتن با F + تور دستی + ژست `bug-catch` + صداهای bug_net/bug_catch، اینونتوری حشرات در دفترچه، آیکون‌های SVG جدید. **رفع باگ کلید C کمد** (هندلر گم‌شده + ESC). eslint ✅ build ✅
- 2026-11-26 — 🐞 **رفع باگ کلیک روی توست Sileo (عدم ناوبری به DM):** توست `sileo` هیچ `onClick` روی خودِ توست ندارد (فقط `button: { title, onClick }` طبق `dist/index.d.ts`). `useChat.js`: افزودن پل ناوبری `setChatNavigator` + دکمه‌ی «مشاهده» و description کلیک‌پذیر که برای DM به `/chat` با `state.dmTarget` و برای گروه به `state.roomToJoin` (+ `ts` یکتا) ناوبری می‌کند. `App.jsx`: کامپوننت `NavigationBridge` داخل `BrowserRouter` که `useNavigate` را به هوک تزریق می‌کند (تا کلیک از `/profile` یا `/settings` هم کار کند). `Chat.jsx`: افکت `location.state` هم در mount اجرا می‌شود، `roomToJoin` را هم پشتیبانی می‌کند و با `handledNavRef` از اجرای دوباره (StrictMode) جلوگیری می‌کند. eslint ✅ build ✅
- 2026-11-26 — 🚨 **رفع رگرسیون سوکت (اتصال گم‌شده بعد از انتقال `useChat` به App):** در commit `92cd31f` افکت `connectSocket()/disconnectSocket()` از `Chat.jsx` حذف شد ولی در `App.jsx` دوباره اضافه نشد؛ نتیجه: Ably هرگز وصل نمی‌شد و `connected` هیچ‌وقت `true` نمی‌شد (کاربران آنلاین خالی، اتاق‌ها خالی، آیکون پیام در حالت ساعت می‌ماند). `useChat.js`: افزودن `sessionUserId` به‌عنوان state تا effect حضور بعد از پر شدن `currentUserRef` دوباره اجرا شود؛ وابستگی effect حضور به `[connected, sessionUserId]`؛ گارد StrictMode روی تایمر `ably.close` (`closeTimerRef`) تا remount سریع اتصال جدید را نکشد؛ `disconnectSocket` حالا `sessionUserId` را هم null می‌کند؛ match کردن optimistic در هندلر `new-message` با `String(senderId)` مقاوم شد. `App.jsx`: افکت اتصال سطح App با گارد `authUser?.id` (اتصال فقط بعد از مشخص شدن کاربر). eslint ✅ build ✅
- 2026-11-25 — Phase 3b: ماهیگیری کامل — ۶ نقطه روی رودخانه/ساحل/اسکله (سطل + بابِر + نخ + موج)، مینی‌گیم ۴ مرحله‌ای (شارژ پرتاب → انتظار → گزش → کشش)، ۷ گونه + ۲ آشغال با کمیابی وزن‌دار، صدا (cast/reel/catch/bite-synth)، ژست و چوب در دست، اینونتوری صید در دفترچه، پخش اکشن شبکه‌ای. پولیش: صفر ایموجی (مجموعه‌ی SVG `GameIcon`)، `cursor-pointer`، حذف صدای قدم، آسمان با ستاره/ماه واقعی‌تر، راهنمای کلیدها. eslint ✅ build ✅
- 2026-11-25 — Phase 3a: سیستم پخت‌وپز — ۴ ایستگاه (گریل/دیگ آویزان روی سه‌پایه procedural/دیگ بزرگ/ماهیتابه)، مینی‌گیم زمان‌بندی نگه‌داشتن E، ۴ سطح کیفیت، flip/stir، ۵ دستور داده‌محور، نمایش غذا روی ایستگاه، صداها، انیمیشن پخت، اینونتوری غذا در دفترچه. eslint ✅ build ✅
- 2026-11-25 — Phase 2d: محیط واکنشی به اندازه‌ی گروه (کرم‌شب‌تاب/آتش/جیرجیرک)، تعامل هدفمند E با پاسخ متقابل، و مرورگر کمپ‌های فعال. **PHASE 2 کامل شد.** build ✅
- 2026-11-25 — Phase 2c: انتخاب کاراکتر پیش از بازی + کمد کامل (کلاه/عینک/پیراهن/اکسسوری رویه‌ای) با پیش‌نمایش سه‌بعدی، ذخیره‌سازی، Unlockables و پخش Ably. build ✅
- 2026-11-25 — Phase 2b: چرخ ایموت Q + ۸ ایموت + hug/highfive دو نفره، نام‌شناور با محو فاصله، حباب چت ۵ ثانیه‌ای + لاگ سه‌پیامی. build ✅
- 2026-11-25 — Phase 2a: character feel (squash/stretch، head-bob، blink، look-at، idle variations، quest hop) + rest spots. build ✅
- 2026-11-24 — Phase 1: terrain/forest/waterfall/visual fixes/campfire rocks/dock کامل. build ✅

