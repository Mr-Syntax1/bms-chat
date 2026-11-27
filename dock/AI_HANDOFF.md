# AI_HANDOFF — BMS Cozy Forest

آخرین به‌روزرسانی: 2026-11-27
فاز فعلی: **CHARACTER OVERHAUL (۷ کاراکتر cute) — DONE ✅** · **PHASE 5 (FINAL) — COMPLETE 🎉 (PART 1..6 DONE ✅)** · PHASE 4.5 — DONE ✅ · PHASE 4 — NPCها و مأموریت‌ها — DONE ✅ · PHASE 3f — DONE ✅ (دکوراسیون کمپ) · PERFORMANCE & ANIMATION FIXES — DONE ✅ (FPS چندنفره / فریز تعامل / انیمیشن خوردن و پخت / صدای اقیانوس) · PHASE 3d — DONE ✅ (چیدن گیاه) · PHASE 3c — DONE ✅ (حشرات و حیات وحش) · PHASE 3b — DONE ✅ (ماهیگیری) · PHASE 3a — DONE ✅ (پخت‌وپز) · **PHASE 2: 100% COMPLETE** 🎉

## 1) خلاصه
بازی هم‌اکنون: زمین ناهموار + جنگل بلند + آبشار/رودخانه + کمپ/ساحل (Phase 1)،
حس زنده‌بودن کاراکتر + نقاط استراحت (Phase 2a)، چرخ ایموت Q + نام‌شناور + حباب چت (Phase 2b)،
انتخاب کاراکتر پیش از بازی + کمد لباس کامل (Phase 2c)، محیط واکنشی به اندازه‌ی گروه،
تعامل هدفمند با بازیکن نزدیک و مرورگر کمپ‌های فعال (Phase 2d)، سیستم پخت‌وپز با ۴ ایستگاه و
۴ سطح کیفیت (Phase 3a)، سیستم ماهیگیری (Phase 3b)، حیات وحش و حشرات (Phase 3c)، و از این دور:
**چیدن گیاه** — ۳۶ گیاه قابل چیدن در ۶ گونه (قارچ جنگلی/قارچ مرغ جنگل/توت/گیاه معطر/میوه کاج/گل وحشی)
با spawn ثابت seed‌دار، ری‌اسپاون ۱۰..۱۵ دقیقه‌ای بیرون React، چیدن با F، ۴ دستور پخت جدید و
بخش «گیاهان چیده‌شده» در دفترچه. همچنین **رفع لگ تماس گروهی ۳+ نفره** در WebRTC mesh.
از این دور: **رفع افت FPS با ۲+ بازیکن** (حذف raycast هر فریم `Html occlude`، LOD بازیکنان ریموت،
حذف re-render کمد در هر بسته‌ی موقعیت)، **رفع فریز ۳-۴ ثانیه‌ای تعامل** (مرزهای Suspense مستقل +
جلوگیری از remount/کامپایل مجدد شیدرها)، **انیمیشن خوردن** (لقمه/جویدن/خرده‌نان + eat_crunch/gulp/yum)،
**پولیش انیمیشن پخت** (حرکت دایره‌ای هم‌زدن، جهش برگرداندن، بخار روی ایستگاه‌ها) و **صدای اقیانوس** روی خط ساحلی.
در **Phase 5 (FINAL)** دنیای بازی به یک جنگل شبانه‌ی دنج و وسیع تبدیل شد: **اتمسفر همیشه‌شب** با مهتاب سرد و بدون هیچ نور مصنوعی سفینه‌ای، **دنیای ۴ برابر بزرگ‌تر** با استریمینگ چانک و LOD فاصله‌ای (رندر تجمیعی برای draw call کم)، **رودخانه‌ی جاری** با نی‌های کناره، **پریست‌های گرافیکی چهارسطحی** (کم/متوسط/زیاد/فوق) با سایه‌ی بازیکن‌محور، **پنل دیباگ کارایی** و **juice** (لرزش/پانچ دوربین + انفجار ذرات برداشت) روی تعاملات.

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
| 🚨 رفع افت FPS با ۲+ بازیکن: حذف `occlude` از `Html` نام‌شناور/حباب چت (drei برای هر Html هر فریم یک `raycaster.intersectObjects([scene], true)` می‌زد — علت اصلی ۶۰→۱۰ FPS) | `components/NameTag.jsx`, `components/ChatBubble.jsx` | eslint + build |
| 🚨 رفع افت FPS: LOD بازیکنان ریموت — فراتر از ۷۰ واحد کل گروه `visible=false` و خروج زودهنگام از `useFrame` (بدون لرپ/اسکلت) | `components/RemotePlayers.jsx` | eslint + build |
| 🚨 رفع افت FPS: کمد ریموت با مقایسه‌ی مرجع شیء (نه `JSON.stringify` هر فریم)؛ دیگر با هر بسته‌ی موقعیت re-render نمی‌شود | `components/RemotePlayers.jsx` | eslint + build |
| 🚨 رفع افت FPS/شبکه: `wardrobe` فقط هنگام تغییر در `player-move` فرستاده می‌شود (قبلاً ۱۵ بار در ثانیه payload تازه می‌ساخت) | `hooks/useGameSync.js` | eslint + build |
| 🚨 رفع فریز ۳-۴ ثانیه‌ای E/F: مرزهای Suspense مستقل برای ایستگاه‌های پخت / ماهیگیری / آیتم‌های مأموریت / حشرات / گیاهان / حیات وحش / کاراکتر محلی / ریموت‌ها. قبلاً همه در یک مرز بودند و مونت یک GLB (مثلاً غذای روی ایستگاه) کل صحنه را unmount و `Preload` را دوباره اجرا می‌کرد | `components/CozyScene.jsx`, `components/CookingStation.jsx`, `GameCanvas.jsx`, `components/PlayerController.jsx` | eslint + build |
| 🚨 رفع فریز: `Preload all` در همان مرز صحنه ماند تا کامپایل شیدرها یک‌بار انجام شود و با تعامل تکرار نشود | `GameCanvas.jsx` | eslint + build |
| انیمیشن خوردن: لقمه/جویدن سه‌موجی + سر خوشحال در نیمه‌ی دوم، روی مدل‌های ریگ‌دار و رویه‌ای | `components/Character.jsx`, `models/characterConfig.js` (`CLIP_SUFFIX['eating']='Yes'`) | eslint + build |
| انیمیشن خوردن: ذرات خرده‌نان — یک `InstancedMesh` ۸تایی با صفر تخصیص در هر فریم (پرتاب/چرخش/محو) | `components/Character.jsx` | eslint + build |
| انیمیشن خوردن: `eatData.js` — زمان‌بندی بیرون React + صداهای هم‌گام (crunch ×۲، gulp، yum) + شماره‌ی موج ذرات؛ انتشار اکشن شبکه‌ای در PlayerController | `eatData.js` (جدید), `components/PlayerController.jsx`, `stores/usePlayerStore.js`, `sounds.js` | eslint + build |
| پولیش پخت: حرکت دایره‌ای هم‌زدن (roll+tilt هم‌فاز) و جهش کوچک هم‌گام برگرداندن | `components/Character.jsx` | eslint + build |
| پولیش پخت: بخار روی هر ایستگاه در حین پخت — `InstancedMesh` ۷کره‌ای با بالا رفتن/محو شدن و پهن شدن | `components/CookingStation.jsx` | eslint + build |
| صدای اقیانوس: ۶ منبع مکانی در امتداد خط ساحلی (`OCEAN_START_X`) با rolloff ملایم؛ port از `ambience.ocean` (`ocean.mp3`) + fallback synth | `components/AmbientAudio.jsx`, `sounds.js` (`OCEAN_SOUND` موجود) | eslint + build |
| Phase 3f — کاتالوگ ۲۳ آیتم دکور در ۵ دسته (چادر/روشنایی/لوازم/تزئینات/نشانه) با مدل‌های موجود manifest | `decorData.js` (جدید) | eslint + build |
| حالت چیدمان با B: آزادسازی قفل موس، پنل کاتالوگ، شبح نیمه‌شفاف سبز/قرمز، حلقه‌ی محدوده (۲۶ واحد) | `ui/DecorPanel.jsx` (جدید), `GameOverlay.jsx`, `components/DecorationsScene.jsx` (جدید) | eslint + build |
| جای‌گذاری با ray-march روی زمین ناهموار (بدون raycast مش)، اعتبارسنجی شیب/آب/درخت/ون/تداخل/سقف ۱۵ | `decorData.js` (`raycastTerrain`, `canPlaceDecor`) | eslint + build |
| چرخش Q/E (π/8) و مقیاس +/− (۰.۶..۱.۶)، Shift+کلیک برداشتن، راست‌کلیک حذف (فقط آیتم خودِ بازیکن) | `components/DecorationsScene.jsx` | eslint + build |
| همگام‌سازی Ably: `place-decor`/`move-decor`/`remove-decor`/`decor-sync` روی `player-action` + گارد مالکیت | `decorSync.js` (جدید), `hooks/useGameSync.js` | eslint + build |
| ذخیره‌سازی دائمی در `localStorage` با کلید `camp-decor-<roomId>` + sanitize ورودی | `decorData.js` (`loadDecor`/`saveDecor`/`sanitizeDecorList`) | eslint + build |
| گروه preload `decor` (۲۳ مدل) + آیکون‌های SVG جدید (tent/table/bedroll/hammock/cooler/thermos/rug/flag/umbrella/rocks/log/sign) | `assetManifest.js`, `preload.js`, `ui/icons.jsx` | eslint + build |
| گاردهای تعارض کلید: Q چرخ ایموت و E تعامل در حالت دکور غیرفعال؛ ESC اول از دکور خارج می‌شود | `ui/EmoteWheel.jsx`, `components/PlayerController.jsx`, `GameOverlay.jsx` | eslint + build |
| Phase 4 — داده‌ی NPC: ۶ NPC (پدربزرگ ماهیگیر/آشپز کمپ/جنگلبان/دخترک حشره‌شناس/جادوگر مهتاب شبانه/گنوم جنگل) با موقعیت ثابت، wander، شعاع گفتگو، blip و pitch اختصاصی | `npcData.js` (جدید) | eslint + build |
| Phase 4 — درخت دیالوگ داده‌محور فارسی: گره‌های `{text, choices}` با `text` تابعی بر اساس وضعیت کوئست/دوستی/شب + اکشن‌های accept/complete/gift/story/close | `npcData.js` (`DIALOGUES`, `getDialogueNode`, `getActionNode`) | eslint + build |
| Phase 4 — رندر NPC: کلون اسکلتی امن (`SkeletonUtils.clone`)، نرمال‌سازی bbox، AI ۵Hz (پرسه داخل شعاع خانه + نگاه به بازیکن ≤۵ واحد)، bob idle قطعی (بدون Math.random در رندر) | `components/NPC.jsx` (جدید) | eslint + build |
| Phase 4 — نیم‌پلیت نام + نشانگر «!»/«?» (تازه‌سازی هر ۱ ثانیه از استور) | `components/NPC.jsx` | eslint + build |
| Phase 4 — رجیستری NPC: `registerNpc`/`updateNpcPosition`/`setNpcHidden`/`findNearbyNpc` + اولویت E (آیتم کوئست → NPC → پخت → ماهیگیری → استراحت) | `interactionRegistry.js`, `components/PlayerController.jsx` | eslint + build |
| Phase 4 — جادوگر فقط شب: مش پنهان و `hidden` در رجیستری تا روز با E قابل تعامل نباشد | `components/NPC.jsx`, `interactionRegistry.js` | eslint + build |
| Phase 4 — جعبه‌ی دیالوگ: تایپ‌رایتر ۳۰ms، بلیپ هر ۲ کاراکتر با `playbackRate` = pitch هر NPC، قلب‌های دوستی، نوار پیشرفت کوئست، دکمه‌های انتخاب، ESC (کامل‌کردن سپس بستن) | `components/DialogueBox.jsx` (جدید) | eslint + build |
| Phase 4 — ۶ کوئست NPC در `questSteps.js` (منبع واحد): catch/deliver/find/collect با value(state)، max، consume و reward | `questSteps.js` (`NPC_QUESTS`, `NPC_QUEST_LIST`, `npcQuestValue`, `npcQuestStatus`, `npcMarker`) | eslint + build |
| Phase 4 — دوستی: XP هر NPC، سطح ۱..۵ (`1 + floor(xp/40)`)، هدیه در سطح ۳، داستان شخصی در سطح ۵ | `stores/usePlayerStore.js`, `components/DialogueBox.jsx`, `ui/QuestLog.jsx` | eslint + build |
| Phase 4 — پاداش واقعی: کلاه (straw/catEars/wizard) در کمد، دستور پخت `cow-quest` در ایستگاه پن، دکور `adventurer-quest`/`gnome-quest` در کاتالوگ — همه با `unlock` تا تحویل مأموریت قفل | `recipes.js`, `decorData.js`, `ui/CookingUI.jsx`, `ui/DecorPanel.jsx`, `stores/usePlayerStore.js` | eslint + build |
| Phase 4 — ۶ بلوط طلایی پنهان با درخشش/چرخش + ثبت در `registerQuestItem` + صدای `quest_accept` | `components/HiddenCollectibles.jsx` (جدید), `npcData.js` (`HIDDEN_ACORNS`) | eslint + build |
| Phase 4 — دفترچه با ۴ تب: داستان / NPCها / دوستی / گنج‌ها (بلوط‌ها + کرم شب‌تاب) | `ui/QuestLog.jsx` | eslint + build |
| Phase 4 — پرامپت تعامل NPC با آیکون speech و حاشیه‌ی آبی | `ui/InteractionPrompt.jsx` | eslint + build |
| Phase 4 — پیش‌بارگذاری گروه `npc` بعد از ورود (idle) + preload مدل‌ها در خود `NPC.jsx` | `GameOverlay.jsx`, `components/NPC.jsx` | eslint + build |
| Phase 4 — آیکون‌های SVG جدید heart/acorn/speech/star | `ui/icons.jsx` | eslint + build |
| Phase 4.5 — چالش روزانه: استخر ۱۴ چالشی + انتخاب قطعی ۲ چالش بر اساس تاریخ + ذخیره در `daily-challenge-YYYY-MM-DD` و آینه‌ی `daily-YYYY-MM-DD` | `dailyChallenges.js` (جدید) | eslint + build |
| Phase 4.5 — شمارنده‌ی روزانه در store (`trackDaily`) با هوک روی پخت/صید/چیدن/قارچ/نوازش/حشره/بلوط/کرم‌شب‌تاب/گفتگو + ارزیابی و پاداش XP یک‌باره + ریست خودکار با تغییر تاریخ | `stores/usePlayerStore.js`, `components/Wildlife.jsx` | eslint + build |
| Phase 4.5 — تب «چالش روزانه» در دفترچه (نوار پیشرفت، XP، وضعیت کامل/در جریان) | `ui/QuestLog.jsx` (۵ تب) | eslint + build |
| Phase 4.5 — فلش‌های مسیر چندهدفه: ردیف فلش جهت‌دار + فاصله‌ی متری برای هر کوئست فعال/تحویل با `location`، throttle ۱۰Hz روی DOM (بدون setState در فریم)، مخفی در ≤۳ واحد | `components/QuestTracker.jsx` (جدید), `GameOverlay.jsx`, `questSteps.js` (`location` در ۶ کوئست NPC) | eslint + build |
| Phase 4.5 — `location` برای هر ۶ کوئست NPC (هم‌راستا با `NPC_LIST`) | `questSteps.js` | eslint + build |
| Phase 4.5 — barks محیطی: ۴ bark فارسی برای هر ۶ NPC + تایمر ماژول‌سطح (۳۰..۹۰s، حداقل ۳۰s بین هر NPC، فقط ۵..۸ واحد) + بلیپ با pitch تصادفی | `npcData.js`, `components/NPC.jsx` | eslint + build |
| Phase 4.5 — حباب گفتار bark با تایپ‌رایتر سبک بالای سر NPC (بدون گزینه/قفل موس) | `components/NpcBarkBubble.jsx` (جدید), `components/NPC.jsx`, `stores/usePlayerStore.js` (`npcBark`/`showNpcBark`/`clearNpcBark`) | eslint + build |
| Phase 4.5 — پایداری localStorage: `npc-progress-{userId}` + `acorns-{userId}`، بازیابی در شروع (`hydrateProgress`)، ذخیره‌ی فوری روی تغییر (throttle ۱.۵s) + autosave ۳۰ ثانیه‌ای ماژول‌سطح + ذخیره در unmount | `persistence.js` (جدید), `GameOverlay.jsx`, `stores/usePlayerStore.js` | eslint + build |
| Phase 5/1 — حذف کامل چرخه‌ی روز/شب: `envState` همیشه شب برمی‌گرداند (`isNight` = true)، `DayNightSky` با `NightSky` ثابت جایگزین شد | `envState.js`, `components/CozyScene.jsx` | eslint + build |
| Phase 5/1 — حذف کامل مه: `<fog>`، `scene.fog`، `weatherFogFor`، `fogNear/fogFar` و بانک‌های مه (`FogBanks`) حذف شدند | `envState.js`, `components/CozyScene.jsx`, `components/Weather.jsx` | eslint + build |
| Phase 5/1 — حذف نورهای سفینه‌ای: pointLight ماه (۷۰/۳۰۰)، pointLight دومِ Ground (۴۰/۹۰)، پالس شدید فانوس دریایی، نور سبزآبی صدف — حذف/نرمال شدند؛ فقط مهتاب جهت‌دار + آتش + فانوس‌های گرم ماند | `components/CozyScene.jsx`, `components/Ground.jsx`, `components/Beach.jsx`, `components/QuestItems.jsx`, `components/Van.jsx` | eslint + build |
| Phase 5/1 — نورپردازی شب دنج: `AmbientSetup` ثابت (ambient + hemisphere + مهتاب جهت‌دار با سایه‌ی PCFSoft از preset)، ستون‌های مهتاب در CanopyFX جایگزین ستون‌های نور روز شد | `components/Ground.jsx`, `components/CanopyFX.jsx` | eslint + build |
| Phase 5/2 — چانک استریمینگ: دنیا به چانک‌های ۳۲×۳۲، `computeChunkSet` هر ۰.۵s موقعیت را می‌خواند و فقط با تغییر سلول بازسازی می‌شود؛ محتوا قطعی (seed ثابت) و مشترک بین کلاینت‌ها | `world/ChunkManager.js` (جدید), `world/StreamedWorld.jsx` (جدید), `world/chunkGen.js` (جدید) | eslint + build |
| Phase 5/2 — رندر تجمیعی چانک‌ها با InstancedMesh (درختان near/far با LOD فاصله‌ای، فلور ادغام‌شده بر اساس متریال)؛ حذف `Forest.jsx` و `GrassField.jsx` | `world/Chunk.jsx` (جدید), `world/chunkModel.js` (جدید), `components/CozyScene.jsx` | eslint + build |
| Phase 5/2 — گسترش دنیا ۴×: `MAP_SIZE` ۲۰۰→۴۰۰، `BOUNDS` ±۱۸۸، `TREE_MAX` ۸۰۰→۲۶۰۰ با گرید فضایی O(1) و biome-aware density؛ گردنه‌ی قابل عبور در دیواره‌ی شمالی | `terrain.js`, `sceneLayout.js`, `activeTrees.js` | eslint + build |
| Phase 5/2 — LOD/چگالی از preset: `chunkRadius` ۲/۳/۴، چگالی درخت `treeDensity×۳.۲۵`، چمن از `grassDensity`؛ progressive warmup (شعاع کوچک ۲ ثانیه‌ی اول) | `stores/useSettingsStore.js`, `world/StreamedWorld.jsx` | eslint + build |
| Phase 5/2 — رودخانه: شیدر جریان جهت‌دار فقط برای رودخانه (`uFlow` جدا per-pool) + فوم کشیده + نی‌های کناره (`Cattail.glb` instanced) | `components/Ground.jsx`, `components/Paths.jsx` | eslint + build |
| Phase 5/2 — حذف کامل BirchTrees: entry از manifest و ارجاع‌ها پاک شد؛ فقط Pine/Pine2/opt-Pine | `assetManifest.js`, `world/Chunk.jsx` | eslint + build |
| Phase 5/2 — کاهش کرم‌شب‌تاب: fireflies پریست‌ها ۲۴/۴۲/۶۰ (~۵۰٪ کمتر) | `stores/useSettingsStore.js` | eslint + build |
| 🐞 تکمیل پاس ۵.۱ — سقف واقعی ۵۰ ذره (گرده ۷۰→۶، StarBurst ۶۰→۴، توزیع دقیق سهم‌ها) | `fxBudget.js`, `components/CanopyFX.jsx`, `components/QuestItems.jsx` | eslint + build |
| 🐞 تکمیل پاس ۵.۱ — اعمال واقعی `CHUNK_UNLOAD_DISTANCE=160` در ساخت چانک | `world/ChunkManager.js` | eslint + build |
| 🔧 کاراکترها: باگ «فرو رفتن در زمین» — حلقه‌ی `useFrame` مقدار `inner.position.y` را هر فریم بازنویسی می‌کرد و `lift` (groundOffset) را پاک می‌کرد. حالا `lift` در پایه‌ی `baseY` می‌ماند (`baseY.current = lift` اولیه) | `components/Character.jsx` | eslint + build |
| 🔧 کاراکترها: لنگر کلاه/عینک/کوله/پروپ در فضای «پا روی y=0» اندازه‌گیری شده بود ولی گروه داخلی `lift` بالا آمده؛ حالا یک گروه جبرانی `-lift` همه‌ی لنگرها را هم‌تراز می‌کند (کلاه شناور/عینک افتاده رفع شد) | `components/Character.jsx` | eslint + build |
| 🔧 درختان: مقیاس یکنواخت (`scale.setScalar`) + `widthMul` ±۱۵٪ تصادفی به‌جای مقیاس عرض مستقل از ارتفاع — «میله‌ی نازک عمودی» رفع شد | `sceneLayout.js`, `world/Chunk.jsx` | eslint + build |
| 🔧 درختان: لایه‌ی LOD سوم/بیلبورد غیرفعال (به‌صورت خط نازک دیده می‌شد)؛ درختان دور در همان لایه‌ی میانی رندر می‌شوند | `world/Chunk.jsx`, `world/ChunkManager.js` | eslint + build |
| 🔧 درختان: شعاع چانک حداقل ۵ (۱۶۰ واحد) و `CHUNK_UNLOAD_DISTANCE=200` | `world/StreamedWorld.jsx`, `world/ChunkManager.js` | eslint + build |
| 🔧 NPC: لنگر نام/کلاه از bbox واقعی مدل (`hatY`, `headRadius`) به‌جای ارتفاع ثابت ۲.۲ — کلاه گنوم دیگر شناور نیست | `components/NPC.jsx` | eslint + build |
| ➕ کاراکتر جدید `cute_alien_character` (minY -0.93 → groundOffset 1.066، جلو +Z) جایگزین `cute_cat_in_cute_banana` در manifest/config/selector/بک‌اند | `assetManifest.js`, `models/characterConfig.js`, `ui/CharacterSelector.jsx`, `models/wardrobeConfig.js`, `backend/src/routes/calls.js` | eslint + build + node --check |
| 🗑 `cute_cat_in_cute_banana` از همه‌جا حذف شد (GLB هم از دیسک پاک شد) | — | — |

دستورهای تأیید: `npx eslint src/game` (exit 0) و `npm run build` (exit 0).

## 3) IN PROGRESS 🔄
چیزی در جریان نیست. **Character System Overhaul** کامل است — ۷ کاراکتر cute (اکسولوتل/فضایی/دیو/گوگوگاگا/پونی/ربات/اسکلت) با `characterReport.json` بازتولیدشده روی همه‌ی فایل‌های دیسک (count=7؛ پس از حذف banana و افزودن alien تعداد فایل‌ها ۷ ماند)، config اختصاصی، لنگرهای هم‌تراز و مقیاس درخت یکنواخت. باگ فرو رفتن در زمین، کلاه شناور/عینک افتاده، درخت‌های میله‌ای و کلاه گنوم رفع شدند (eslint 0 error / build موفق).

## 4) NOT DONE ⬜ (به‌ترتیب)
- (هیچ مورد باز مانده‌ای برای Phase 5 نیست.)
- Phase 5 PART 5 — جوهر/پولیش (pickup arc، screen shake، sparkles، صدای UI، موبایل).
- Phase 5 PART 6 — `?debug` overlay + مستندسازی نهایی README.
- پاداش چالش روزانه فعلاً فقط XP است (کازمتیک آنلاک در فاز بعد).
- ذخیره‌سازی دائمی فقط محلی است؛ همگام‌سازی سرور پیشرفت NPC/دوستی/بلوط‌ها در اسکوپ نیست.
- دکور: محدودیت مالکیت یعنی آیتم‌های بازیکنان قبلی فقط با صاحبشان جابه‌جا/حذف می‌شوند (طراحی‌شده)؛ «اشتراکی کردن» آیتم و دکور پیش‌فرض کمپ هنوز نیست.
- چیدن گیاه: ذخیره‌سازی دائمی ری‌اسپاون/اینونتوری (فعلاً در حافظه‌ی صفحه) و همگام‌سازی چیدن بین بازیکنان (فعلاً هر کلاینت مستقل می‌چیند).
- گسترش دستورهای پخت از ۹ به ۵۰+ و Recipe Book با دستورهای کشف‌نشده (طبق MASTER_PROMPT).
- خوردن: انیمیشن + ذرات + صدا انجام شد، ولی پف گونه/حالت چهره‌ی واقعی (blendshape) و «سیری» به‌عنوان سیستم مستقل هنوز نیست.
- پخت: «اخم/نگرانی هنگام سوختن» فعلاً از طریق کیفیت در UI و صدای burn منتقل می‌شود؛ حالت چهره‌ی مستقل ندارد.
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
- 3e: ذرات خوردن و بخار پخت هر دو `InstancedMesh` با هندسه/متریال ساخته‌شده در `useMemo` و آپدیت ماتریس در `useFrame` هستند (صفر تخصیص در فریم).
- 3e: `eatWorld` سراسری است ولی ژست خوردن از اکشن `eating` خوانده می‌شود؛ ذرات فقط با `crumbs` (کاراکتر محلی) فعال‌اند تا ریموت‌ها خرده‌ی تکراری نریزند.
- 4: هیچ GLB جدیدی برای NPC اضافه نشد — همه از `npc.*` موجود manifest می‌آیند؛ مدل‌های بدون ریگ با bob رویه‌ای، و آدونچرر/جادوگر (اسکین‌دار) هم به‌دلیل نبود کلیپ مناسب در assetReport با همان bob نمایش داده می‌شوند.
- 4: بلیپ NPC از `other/npc_blip_1..4.mp3` (کلید `npc.blip1..4`) می‌آید؛ تنوع گام صدا با `playbackRate` (نه فایل جدید).
- 4: بلوط طلایی و درخشش‌ها رویه‌ای‌اند (کره/نیم‌کره + مخروط + `Sparkles` + `pointLight`)؛ مدل GLB ندارد.
- 4: دکور پاداش (`adventurer-quest`, `gnome-quest`) از مدل‌های موجود `rocks.rocks`/`rocks.rocks2` استفاده می‌کند.

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
- 4: `questSteps.js` منبع واحد حقیقت کوئست‌ها ماند؛ `NPC_QUESTS` کنار `QUEST_STEPS` اضافه شد و `QUEST_STEPS` دست‌نخورده است. هیچ منطق کوئستی در کامپوننت‌ها تکرار نشد.
- 4: NPCها در همه‌ی کلاینت‌ها موقعیت یکسان دارند (ثابت + seed-free)؛ پیشرفت کوئست/دوستی به‌ازای هر بازیکن و محلی است (همگام‌سازی شبکه‌ای NPC انجام نشد).
- 4: حالت شبانه‌ی جادوگر دو لایه است: مش پنهان (`visible`) و `hidden` در رجیستری (`setNpcHidden`) تا حتی اگر مدل هنوز رندر شده باشد، E کار نکند.
- 4: `DialogueBox` به دو بخش تقسیم شد؛ محتوا با `key` روی هر گره دوباره mount می‌شود تا تایپ‌رایتر با `useState` مقدار اولیه بگیرد و setState داخل بدنه‌ی افکت نباشد (قانون `react-hooks/set-state-in-effect`).
- 4: پاداش recipe/decor واقعی شد — `recipesForStation`/`matchRecipe` و `DecorPanel` فهرست `unlockedItems.recipe`/`unlockedItems.decor` را می‌گیرند؛ آیتم قفل تا تحویل کوئست دیده نمی‌شود.
- 4: `QuestLog` مقادیر مواد/کرم‌شب‌تاب را با selector واکنشی می‌خواند (قبلاً `getState()` در رندر بود و با تغییر آپدیت نمی‌شد).
- 5: **دنیا چانک‌محور است، نه یک مش واحد.** `terrain.js` هنوز یک مش بزرگ است (برای ارتفاع پیوسته و برخورد)، اما درختان/فلور به چانک‌های ۳۲×۳۲ تقسیم و استریم می‌شوند. انحراف از طرح اولیه: به‌جای یک InstancedMesh به‌ازای هر چانک، همه‌ی چانک‌های فعال در **چند InstancedMesh تجمیعی** رندر می‌شوند (draw call بسیار کمتر) و با تغییر مجموعه‌ی چانک، ظرفیت‌ها ثابت می‌مانند و فقط `count`/ماتریس‌ها آپدیت می‌شوند. معنای استریمینگ یکی است.
- 5: **محتوای چانک قطعی و seed‌دار است** (`chunkGen.js`, `chunkSeed(cx,cz)`), پس همه‌ی کلاینت‌ها دنیای یکسان می‌بینند بدون هیچ پیام شبکه‌ای.
- 5: **LOD درختان با فاصله از بازیکن**: نزدیک = Pine/Pine2 کامل با سایه؛ دور = `opt-Pine` سبک بدون سایه/تینت برگ. فاصله از `preset.treeLodDistance` می‌آید.
- 5: **سایه‌ها بازیکن‌محور شدند** (`FollowMoonShadow`): یک `directionalLight` سرد که هدفش هر ۸ فریم روی بازیکن می‌رود؛ بنابراین کیفیت سایه‌ی نزدیک بالا می‌ماند حتی روی نقشه‌ی ۴۰۰ واحدی.
- 5: **پریست‌ها ۴ سطح‌اند** (`low/medium/high/ultra`) و هرکدام `shadowDistance`، `treeLodDistance`، `aiRadius`، `chunkRadius` و چگالی‌ها را تعیین می‌کنند؛ افت خودکار `ultra→high→medium→low`.
- 5: **juice/pickupFX کاملاً بیرون React**: `juice.js` (trauma/punch دوربین) و `pickupFX.js` (ring-buffer pool) با کامپوننت‌های نازک `PickupFX`/`PerfProbe` فقط می‌خوانند و می‌نویسند — هیچ setState در حلقه‌ی فریم.
- 5: **آب‌وهوا و چرخه‌ی روز/شب حذف شدند** — صحنه همیشه شب صاف است؛ `Weather.jsx` حذف شد و کلید `weather` از store/localStorage رفت (مهاجرت v1→v2 آن را دور می‌ریزد).
- 5: **نورها طبیعی و محدود شدند**: فقط مهتاب جهت‌دار + ambient + hemisphere + آتش/فانوس/چراغ گرم؛ همه‌ی pointLightهای پرت (ماه ۷۰، سفینه ۴۰، پالس ۹۰ فانوس دریایی) حذف شدند.

## 7) مشکلات شناخته‌شده / تست دستی
- 🚨 (2026-11-26) رگرسیون سوکت رفع شد: اگر دوباره «آنلاین/اتاق‌ها/تیک پیام» خالی شد، اول مطمئن شوید افکت اتصال در `App.jsx` (وابسته به `authUser?.id`) هست و `connectSocket` هیچ‌جای دیگری هم صدا زده نمی‌شود (دو بار connect = رفتار عجیب).
- 5: **پنل کارایی** با `Ctrl+Shift+P` باز می‌شود (`ui/PerfDebug.jsx`) — FPS/frameMs/draw call/مثلث/چانک/درخت/فلور. اگر اعداد صفر ماند، `PerfProbe` در `GameCanvas.jsx` باید داخل `<Canvas>` باشد.
- 5: **دنیا کاملاً شب است** — هیچ سوییچ روز/شب یا آب‌وهوا در UI نیست (عمداً). اگر «صبح» دیدید یعنی نسخه‌ی قدیمی در کش است؛ کلید تنظیمات باید `cozy-forest-settings-v2` باشد.
- 5: **هیچ درختی نباید Birch باشد** — فقط Pine / Pine2 / opt-Pine. اگر درخت سفید/رنگ‌پرید دیدید، مدل اشتباه بارگذاری شده است.
- 5: سایه‌ی مهتاب فقط اطراف بازیکن است (`FollowMoonShadow`، شعاع ~±۲۰..۴۵)؛ سایه‌ی اجسام خیلی دور عمداً وجود ندارد. اگر جسمی در دور «بی‌سایه» به‌نظر رسید، این طراحی است نه باگ.
- 5: چانک‌ها هر ۰.۵s چک می‌شوند؛ هنگام دویدن سریع، ممکن است یک لحظه لبه‌ی دنیا خالی باشد تا warmup کامل شود (طبیعی).
- 5: ذرات برداشت (`PickupFX`) pool ثابت ۶ اسلات دارند؛ اگر چند برداشت هم‌زمان شد و یکی «گم» شد، طبیعی است (بازچرخانی).
- 5: `juice.js` بیرون React است؛ برای تست لرزش، در کنسول `import` مستقیم ندارد — از طریق برداشت گیاه/آیتم امتحان کنید.
- 🚨 فریز تعامل: **هر کامپوننت جدیدی که `useGLTF` دارد باید مرز `Suspense` اختصاصی داشته باشد**؛ اگر داخل مرز صحنه (`GameCanvas`) گذاشته شود و مدلش دیر برسد، کل صحنه remount می‌شود و `Preload` دوباره شیدرها را کامپایل می‌کند (فریز چند ثانیه‌ای).
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
- 🚨 FPS چندنفره: علت اصلی raycast هر فریم `Html occlude` بود. **اگر Html جدیدی اضافه کردید، `occlude` ندهید** — از محو شدن بر اساس فاصله استفاده کنید (الگوی `NameTag`).
- 🚨 فریز تعامل: **هر کامپوننت جدیدی که `useGLTF` دارد باید مرز `Suspense` اختصاصی داشته باشد**؛ اگر داخل مرز صحنه (`GameCanvas`) گذاشته شود و مدلش دیر برسد، کل صحنه remount می‌شود و `Preload` دوباره شیدرها را کامپایل می‌کند (فریز چند ثانیه‌ای).
- 🚨 اگر هنوز فریز دیدید: مطمئن شوید مرز `Suspense` جدیدی دور `<CozyScene />` اضافه نشده که `Preload all` را در بر بگیرد و با هر تعامل دوباره اجرا شود.
- خوردن: ذرات خرده فقط برای کاراکتر محلی رندر می‌شوند (`crumbs` prop) چون `eatWorld` سراسری است؛ برای ریموت‌ها ژست از اکشن `eating` می‌آید.
- اگر ژست خوردن روی ریموت دیده نشد: مطمئن شوید `publishPlayerAction(..., 'action', { action:'eating', duration })` ارسال می‌شود (setEatPublisher در PlayerController) و `CLIP_SUFFIX['eating']` ست است.
- پخت: بخار فقط روی ایستگاهی که `cooking.stationId === id` است ظاهر می‌شود؛ اگر بخار روی همه‌ی ایستگاه‌ها بود، رویداد `start`/`result` در `subscribeCooking` را بررسی کنید.
- اقیانوس: منابع در `OCEAN_START_X + 6` با `maxDistance 58` هستند. اگر صدا در خشکی هم شنیده شد `maxDistance`/`rolloff` را در `AmbientAudio.jsx` کم/زیاد کنید.
- اقیانوس: اگر `ocean.mp3` لود نشد، مسیر `frontend/public/sounds/ocean.mp3` را بررسی کنید (manifest: `ambience.ocean`).
- 4: NPCها دستی‌چین‌اند (`npcData.js` → `NPC_LIST`). اگر پدربزرگ داخل آب/جنگلبان داخل تنه افتاد، `x`/`z` همان NPC را جابه‌جا کنید.
- 4: اگر NPC با E باز نشد، مطمئن شوید آیتم کوئست نزدیک‌تری وجود ندارد (اولویت E: آیتم → NPC) و در حالت دکور/پخت/ماهیگیری نیستید.
- 4: جادوگر فقط شب (چرخه‌ی روز/شب ۴۲۰ ثانیه‌ای) دیده می‌شود؛ برای تست سریع `DAY_LENGTH` در `CozyScene.jsx` را کم کنید.
- 4: بلوط‌های طلایی با «برق‌های کوچک» (`Sparkles`) و نور نقطه‌ای راهنمایی می‌شوند؛ اگر پیدا نشدند مختصات `HIDDEN_ACORNS` را بررسی کنید.
- 4: کوئست آشپز با تحویل مواد از `ingredients` کم می‌کند (`consume` در `NPC_QUESTS.cow`).
- 4: کوئست‌های find (جنگلبان/گنوم) از وضعیت سیستم موجود (`quests.chestOpened`) و `goldenAcorns` خوانده می‌شوند — نه شمارنده‌ی جدید.
- 4: پیشرفت NPC/دوستی/بلوط‌ها حالا در `localStorage` ذخیره می‌شود (Phase 4.5)؛ با رفرش دیگر صفر نمی‌شود.
- 4.5: چالش‌های روزانه از تاریخ **محلی** دستگاه انتخاب می‌شوند؛ اگر تاریخ دستگاه عوض شود، چالش‌ها هم عوض می‌شوند.
- 4.5: `trackDaily` شمارنده را افزایش می‌دهد و XP پاداش یک‌بار ثبت می‌شود؛ XP فعلاً فقط نمایشی است (سیستم سطح کلی هنوز نیست).
- 4.5: فلش QuestTracker بیرون Canvas است، پس با rAF ۱۰Hz و نوشتن مستقیم روی DOM کار می‌کند (`useFrame` فقط داخل Canvas معتبر است).
- 4.5: barks فقط وقتی یک bark دیگر فعال نیست اجرا می‌شوند (بدون صف/همپوشانی)؛ تایمرها در `barkTimers` ماژول‌سطح `NPC.jsx` هستند و به React وابسته نیستند.

## 8) اجرا و تأیید
```
cd frontend
npx eslint src/game
npm run build
npm run dev
```
کلیدها: نگه‌داشتن Q = چرخ ایموت · 1..5 میان‌بر · E تعامل/نشستن/بغل بازیکن نزدیک · **E نزدیک NPC = گفتگو (بعد از آیتم کوئست، قبل از پخت)** · **E نزدیک ایستگاه پخت = نگه‌داشتن برای پختن** · **E نزدیک نقطه‌ی ماهیگیری = مینی‌گیم ماهیگیری** · G گیتار · M مارشمالو · L دفترچه (۵ تب) · C کمد · **F = چیدن گیاه (اولویت) / گرفتن حشره با تور / چراغ ون** · **Ctrl+Shift+P = پنل کارایی** · **Ctrl+Shift+F = دیباگ جهت کاراکتر**.
کمد از دکمه‌ی کمد (آیکون SVG) در HUD **یا کلید C** و مرور کمپ‌ها از دکمه‌ی چادر در هدر چت باز می‌شود. غذاهای پخته‌شده، ماهی‌های صیدشده، حشرات گرفته‌شده و گیاهان چیده‌شده در دفترچه (آیکون طومار) دیده می‌شوند. **کلیک روی غذای پخته‌شده در دفترچه = خوردن با انیمیشن و صدا.**
تنظیمات گرافیکی چهار سطح دارد (کم/متوسط/زیاد/فوق) و هر تغییر فوراً روی چگالی درخت، شعاع چانک، سایه، بلوم و تعداد ذرات اثر می‌گذارد.

## 9) env / endpoint / store / localStorage جدید
- store: `chatLog` + `pushChatLog`؛ `uiFlags`؛ `chatBubbleMap`؛ `wardrobe` + `setWardrobe`؛ `campMood` (module-level)؛ `ingredients` + `addIngredient` + `consumeIngredients`؛ `foods` + `addFood` + `eatFood` (اکنون `beginEating` + اکشن `eating` را هم راه می‌اندازد)؛ `cookingStation` + `openCooking` + `closeCooking`؛ `fishCaught` + `addFish`؛ `fishingState` + `setFishingState`؛ `bugsCaught` + `addBug`؛ `nearBug` + `setNearBug`؛ `forageItems` + `addForageItem`؛ `nearForage` + `setNearForage`؛ **`decorations` + `setDecorations` + `addDecoration` + `updateDecoration` + `removeDecoration` + `mergeDecorations`؛ `decorMode` + `setDecorMode`؛ `selectedDecor` + `setSelectedDecor` (3f)**؛ **`npcInteractions` + `activeDialogue` + `dialogueNode` + `friendshipLevels` + `goldenAcorns` + `nightFireflies` + `unlockedItems` و اکشن‌های `setActiveDialogue`/`setDialogueNode`/`acceptNpcQuest`/`completeNpcQuest`/`addFriendshipXp`/`markGiftGiven`/`markStoryHeard`/`collectGoldenAcorn`/`addNightFirefly`/`unlockWardrobeItem` (4)**؛ **`dailyDate` + `dailyChallenges` + `dailyProgress` + `dailyCompleted` + `dailyXp` + `initDailyChallenges`/`trackDaily`/`evaluateDailyChallenges`/`saveDailyChallenges`؛ `npcBark` + `showNpcBark`/`clearNpcBark`؛ `hydrateProgress` (4.5)**.
- ماژول‌های داده‌ی زنده (بیرون React): `forageWorld` (3d)؛ `eatWorld` + `beginEating` + `EAT_DURATION` + `setEatPublisher` (3e)؛ `cooking` (3a)؛ `fishing` (3b)؛ `bugWorld` (3c)؛ **`decorWorld` (3f: mode/rotation/scale/ghost)**؛ **`decorSync` (3f: context/publisher/actions)**؛ **رجیستری NPC در `interactionRegistry.js` (`registerNpc`/`updateNpcPosition`/`setNpcHidden`/`findNearbyNpc`) + داده‌ی NPC/دیالوگ/بلوط‌ها در `npcData.js` (4)**؛ **`dailyChallenges.js` (استخر/انتخاب قطعی/load/save روزانه) + `persistence.js` (load/save/autosave ۳۰s پیشرفت) + `barkTimers` ماژول‌سطح در `NPC.jsx` (4.5)**؛ **`chunkGen.js` (تولید قطعی چانک) + `ChunkManager.js` (`computeChunkSet`/`chunkState`/`chunkStats`) + `world/StreamedWorld.jsx` (پوسته) + `world/chunkModel.js` (`useMergedModel`/`placeTrees`) (5)**؛ **`juice.js` (`kickShake`/`kickPunch`/`applyJuice`) + `pickupFX.js` (`emitPickup`/`advancePickup`) + `debugStats.js` (`perfStats`/`tickPerf`) (5)**.
- endpoint جدید: `GET /api/calls/game/campsites`؛ `POST /api/calls/game/claim-character` اکنون `{ preferred?, roomId? }` می‌پذیرد.
- localStorage: `preferred-character` و `wardrobe-<userId>` و **`camp-decor-<roomId>` (3f)** و **`npc-progress-<userId>` / `acorns-<userId>` / `daily-challenge-YYYY-MM-DD` (و آینه‌ی `daily-YYYY-MM-DD`) (4.5)** و **`cozy-forest-settings-v2` (5، با مهاجرت خودکار از `-v1`)**.

## 10) Changelog (جدیدترین اول)
- 2026-11-27 — **🔄 CHARACTER SYSTEM OVERHAUL (۷ کاراکتر جدید)** — (۱) `scripts/inspect-characters.mjs` ساخته/اجرا شد و `src/game/characterReport.json` برای هر ۷ GLB تولید شد (bbox واقعی از رأس‌ها، minY/groundOffset، skinned، استخوان‌های نام‌دار، کلیپ‌ها، جهت جلو با ۵ سیگنال رأی‌گیری، لنگرهای بصری کمد). (۲) `models/characterConfig.js` بازنویسی شد: `CHARACTER_CONFIG` اختصاصی هر کاراکتر (height/minY/groundOffset/forwardAxis/forwardRotation/bones/anchors/fallbackAnchors/animations)، `CHARACTER_FILES`، `MANIFEST_KEY`، `DEFAULT_CHARACTER='cute_axolotl'`، و helperهای `normalizeCharacterId`/`CHARACTERS` (alias)/`getCharacterConfig`/`characterUrl`/`getFacingOffset`/`getPropAnchor`/`getHeadAnchor`/`getWardrobeAnchors` (merge با fallback). (۳) `components/Character.jsx` اصلاح شد: importهای شکسته (`CHARACTERS`/`getHeadAnchor`)، خواندن config از `getCharacterConfig`، `groundOffset` واقعی برای نشستن پا، `forwardRotation` از config، نگاشت کلیپ از `animations.idle/walk/run` + `mode` (`clips`/`hybrid`/`procedural`) به‌جای `config.clips` ناموجود، لنگر کلاه/عینک/کوله از `getWardrobeAnchors` (bone + offset + scale هر مدل) و آفست عینک نسبت به لنگر سر. (۴) `components/Glasses.jsx` پارامتر `z` گرفت؛ `components/Hat.jsx` (`Accessory`) لنگر کوله/شال را از config کاراکتر می‌گیرد. (۵) `ui/CharacterSelector.jsx` و `models/wardrobeConfig.js` به شناسه‌های جدید (۷ کاراکتر + برچسب فارسی + آیکون) مهاجرت کردند. (۶) `assetManifest.js` هر ۷ کاراکتر را در `characters.*` دارد؛ `preload.js` از `CHARACTER_IDS` می‌خواند. (۷) بک‌اند `calls.js`: `GAME_CHARACTERS` = ۷ شناسه‌ی cute، `characterUrl(id)` → `<id>.glb`، `GAME_CAPACITY` خودکار ۷ (سقف اتاق از ۹ به ۷). eslint ✅ (فقط warning قدیمی `useGameSync.js:383`) · build ✅ · `node --check calls.js` ✅
- 2026-11-27 — **🐞 تکمیل پاس ۵.۱ (بستن دو مورد باقی‌مانده)** — (۱) **سقف واقعی ۵۰ ذره**: سهم‌های `PARTICLE_BUDGET` بازتوزیع شد تا جمع دقیقاً ۵۰ شود (campfire 6، waterfall 6، leaves 4، pickup 6، quest ۱×۹=۹، acorn ۱×۶=۶، steam 3، pollen 6، burst 4). گرده‌های `CanopyFX` که قبلاً تا ۷۰ عدد می‌رفتند حالا از `PARTICLE_BUDGET.pollen` (۶، سقف سخت) می‌آیند و `StarBurst` آیتم کوئست از ۶۰ ذره به `PARTICLE_BUDGET.burst` (۴) کاهش یافت. (۲) **فاصله‌ی unload چانک واقعاً اعمال شد**: `CHUNK_UNLOAD_DISTANCE` (۱۶۰) قبلاً فقط تعریف شده بود و مصرف‌کننده نداشت؛ حالا `buildForRadius` در `ChunkManager.js` هر چانک دورتر از این فاصله را قبل از تولید درخت/فلور رد می‌کند (۱۵۰+ واحد). eslint ✅ (فقط warning قدیمی `useGameSync.js:383`) · build ✅
- 2026-11-27 — **🐞 پاس رفع باگ کارایی/بصری ۵.۱ (CRITICAL FIXES)** — (۱) **تک‌مدل درخت**: همه‌ی ارجاعات `Pine.glb`/`Pine2.glb`/`opt-Pine`/`BirchTrees`/`Fern` حذف شدند؛ فقط `trees/PineTrees.glb` (۹۷KB) می‌ماند. فایل‌های ممنوعه از دیسک هم پاک شدند (`trees/Fern.glb`، `opt/trees/*`، `opt/Pine.glb`). چون `PineTrees.glb` در واقع یک «بیشه‌ی ۱۲ تنه‌ای» است، `models/pineParts.js` حالا یک درخت تک را از دل آن استخراج می‌کند (خوشه‌بندی تنه‌ها + نسبت‌دهی مثلث + انتخاب تنه‌ی مرکزی) تا instancing/scale درست بماند: نتیجه ۳۹۹ مثلث، نسبت عرض/ارتفاع ۰٫۴۹ (طبیعی). (۲) **LOD سه‌پله‌ای**: `ChunkManager.js` با `TREE_LOD_NEAR=40` / `TREE_LOD_MID=80` / `TREE_LOD_FAR=120` و سه باکت `near/far/far2`؛ درختان دورتر از ۱۲۰ حذف می‌شوند، نه چانک‌های نزدیک — علت «ناپدید شدن درخت‌ها» همین بود. فلور جدا تا `FLORA_RADIUS=90`. (۳) **ضد ناپدید شدن**: حداقل `chunkRadius` = ۳ (کف در `StreamedWorld`) و شعاع پریست‌ها ۴/۵/۶/۶ → پوشش ≥۱۴۰ واحد؛ `CHUNK_UNLOAD_DISTANCE=160` صریح شد. (۴) **سایه کامل خاموش**: `gl.shadowMap.enabled = false` در `GameCanvas`، `shadows={false}` روی Canvas، `castShadow={false}` روی نور ماه/آتش/دکور، حذف `FollowMoonShadow` و کل shadow-camera. (۵) **بلوم/پست‌پروسسینگ حذف شد**: import و بلوک `EffectComposer/Bloom/Vignette` از `CozyScene` پاک شد؛ `bloom`/`vignette` در همه‌ی پریست‌ها `false`. (۶) **ستون‌های نور (light shafts) کاملاً حذف شدند**: `LightShafts` + `SHAFT_SPOTS` + `SHAFT_COUNT` + `AdditiveBlending` از `CanopyFX` پاک شد (علت «مخروط نور معلق در هوا»ی اسکرین‌شات ۲). (۷) **سقف جهانی ذرات = ۵۰**: ماژول جدید `fxBudget.js` با `PARTICLE_BUDGET` (campfire 10، waterfall 8، leaves 6، pickup 8، quest 6، acorn 6، steam 6) و همه‌ی سیستم‌ها از آن می‌خوانند (آتش ۳۸→۱۰، پاشش آبشار ۹۰→۸، PickupFX ۶۰→۸، Sparkles بلوط/مأموریت کم شد). (۸) **کرم شب‌تاب/پروانه GLOBAL**: `GLOBAL_FIREFLIES=10` (۶ تزئینی + ۴ قابل‌گرفتن) و `GLOBAL_BUTTERFLIES=12` (۸ تزئینی + ۴ قابل‌گرفتن) در `fxBudget.js`؛ `Fireflies` از `Sparkles` به `InstancedMesh` سبک بازنویسی شد؛ `bugData.js` و `Butterflies.jsx` به سهم خودشان محدود شدند. (۹) **چمن**: `undergrowth.grass` = `grassyellowing.glb` (تأیید ۱۵۵ مثلث/۷۸KB) و در `ChunkFlora` با ارتفاع هدف ۰٫۵۵ instanced می‌شود. (۱۰) **دیباگ**: پنل `Ctrl+Shift+P` حالا `lod 0/1/2` و `tree model` (حجم فایل) را هم نشان می‌دهد. eslint ✅ build ✅ verify:assets ✅
- 2026-11-27 — **Phase 5 / PART 6: دیباگ نهایی + مستندسازی — PHASE 5 COMPLETE 🎉** — (۱) پاک‌سازی نهایی: تأیید عدم وجود هیچ ارجاع باقی‌مانده به Birch/Fog/Weather/Forest/GrassField/DAY_LENGTH در کل `src/game`؛ تنها مورد، کامنت راهنما در `Chunk.jsx` است. (۲) بررسی ارجاعات جدید: `treeLodDistance`/`chunkRadius`/`aiRadius`/`shadowDistance` فقط در `Ground.jsx`، `Wildlife.jsx`، `useSettingsStore.js`، `SettingsPanel.jsx` و `StreamedWorld.jsx` استفاده می‌شوند (بدون مصرف‌کننده‌ی گم‌شده). (۳) `RAIN_SOUND`/`synth rain` به‌عنوان دارایی بی‌مصرف باقی ماند (بی‌خطر؛ در manifest صوتی برای آینده). (۴) eslint صفر خطا (فقط یک warning قدیمی و شناخته‌شده در `useGameSync.js:383`)؛ `npm run build` موفق. (۵) مستندات فارسی به‌روز شد: بخش تصمیم‌ها/انحراف‌ها (چانک‌محوری، LOD، سایه‌ی بازیکن‌محور، پریست ۴سطحی، juice بیرون React، حذف شب/آب‌وهوا)، بخش مشکلات/تست (پنل کارایی، بی‌Birch، سایه‌ی محلی، warmup چانک)، بخش کلیدها (Ctrl+Shift+P) و بخش ماژول‌ها/localStorage (ماژول‌های جدید ۵ + کلید v2). **PHASE 5 (FINAL) کامل شد.**
- 2026-11-27 — **Phase 5 / PART 5: پولیش و juice** — (۱) ماژول `juice.js` (خارج React، mutable): `kickShake` (trauma با افت مربعی) و `kickPunch` (dolly کوچک به‌سمت جلو روی دوربین) — `applyJuice` بعد از `camera.lookAt` در هر دو مسیر عادی و نشسته‌ی `PlayerController` صدا زده می‌شود. پانچ به‌جای دست‌زدن به FOV انتخاب شد تا با `applyFovKick` (حس دویدن) تداخل نکند. (۲) ذرات برداشت: `pickupFX.js` (ring-buffer pool از ۶ اسلات، بیرون React) + `components/PickupFX.jsx` (یک InstancedMesh با ۶۰ ذره‌ی ثابت، matrise/color بدون re-render)؛ کامپوننت در `CozyScene` ثبت شد. (۳) اتصال juice و burst به رویدادهای کلیدی: چیدن گیاه و گرفتن حشره (`PlayerController`)، تکه‌نقشه/فانوس/ماهیگیری/صندوقچه/صدف (`useQuestSystem`)، بلوط طلایی (`HiddenCollectibles`) — هرکدام با شدت و رنگ ذرات متناسب. (۴) هیچ setState یا alloc داخل حلقه‌ی فریم اضافه نشد؛ همه‌چیز از ماژول‌های سطح‌بالا. eslint ✅ build ✅
- 2026-11-27 — **Phase 5 / PART 4: گسترش تنظیمات گرافیکی** — (۱) سطح کیفیت چهارم `ultra` اضافه شد (`dpr 2`، `shadowMapSize 4096`، `chunkRadius 5`، چگالی/پرواز/کرم‌شب‌تاب بیشتر) و کلید تنظیمات به `cozy-forest-settings-v2` مهاجرت کرد با مهاجرت خودکار از کلید قدیمی v1 و حذف آن. (۲) `suggestQuality` حالا برای دستگاه‌های ۱۲+ هسته/۱۶GB، `ultra` را پیشنهاد می‌دهد. (۳) نردبان افت خودکار کیفیت بازنویسی شد (`ultra→high→medium→low`) تا سطح جدید هم پوشش داده شود. (۴) پنل تنظیمات: دکمه‌ی «فوق» به کیفیت اضافه شد، بخش آب‌وهوا کامل حذف شد و نمایش وضعیت پریست گسترش یافت (شعاع چانک، پروازها). (۵) `Weather.jsx` و کلید `weather`/`setWeather` و `RAIN_SOUND` از جریان بازی حذف شدند (باران به‌عنوان تنها آب‌وهوای موجود، با حذف مه در PART 1 دیگر موضوعیتی نداشت — صحنه همیشه شب صاف است). eslint ✅ build ✅
- 2026-11-27 — **Phase 5 / PART 3: بهینه‌سازی کارایی** — (۱) پریست‌ها: افزودن `shadowDistance` و `treeLodDistance` و `aiRadius` به هر سه سطح کیفیت تا شعاع سایه/LOD/AI با قدرت دستگاه مقیاس بگیرد. (۲) سایه: دوربین سایه‌ی ماه حالا **بازیکن را دنبال می‌کند** (`FollowMoonShadow`) و فقط محدوده‌ی نزدیک (±۲۰..۳۶ واحد) را می‌پوشاند به‌جای ±۱۰۰ روی نقشه‌ی ۴۰۰ واحدی — سایه تیزتر و ارزان‌تر؛ `gl.shadowMap.type = PCFSoftShadowMap` روی کل رندرر. (۳) چانک‌ها: ظرفیت InstancedMesh در پله‌های ۲۵۶ گرد می‌شود (`capacityFor`) و فقط `count`/ماتریس‌ها درجا آپدیت می‌شوند؛ دیگر با هر جابه‌جایی چانک، بافرهای GPU از نو ساخته نمی‌شوند (memory churn صفر). `dispose={null}` روی همه‌ی instanced meshها تا هندسه/متریال کش‌شده‌ی مشترک هرگز dispose نشود. (۴) LOD دینامیک از preset: `computeChunkSet` حالا `lodDistance` می‌گیرد و امضای چانک شامل آن است. (۵) حیات وحش: `aiRadius` از preset — حیوانات دورتر از شعاع کاملاً پنهان و بی‌AI می‌شوند (`group.visible = false`) تا هم رندر و هم منطق صرفه‌جویی شود. (۶) پنل دیباگ سبک (Ctrl+Shift+P) — `debugStats.js` (ماژول mutable بیرون React) + `PerfProbe` در Canvas + `ui/PerfDebug.jsx`: FPS/frameMs/draw call/مثلث/programs/تعداد چانک/درخت/فلور/کیفیت. شمارنده‌ها هر ۰.۵ ثانیه خوانده می‌شوند، بدون setState در حلقه‌ی فریم. throttlingهای موجود تأیید شد: wildlife ۱۰Hz (`AI_STEP`)، NPC ۵Hz، ارسال موقعیت ریموت ~۱۵Hz (`SYNC_INTERVAL=66`). eslint ✅ build ✅
- 2026-11-27 — **Phase 5 / PART 2: چانک استریمینگ + دنیای ۴× + LOD + رودخانه** — (۱) استریمینگ چانک: دنیا به چانک‌های ۳۲×۳۲ تقسیم شد؛ `ChunkManager.computeChunkSet` هر ۰.۵ ثانیه موقعیت بازیکن را می‌خواند و فقط با تغییر سلول چانک بازسازی می‌کند (محتوای قطعی با seed ثابت، مشترک بین همه‌ی کلاینت‌ها). (۲) رندر تجمیعی: همه‌ی چانک‌های فعال در یک مجموعه‌ی InstancedMesh (به‌جای یک مش per-chunk) با LOD فاصله‌ای درختان (نزدیک Pine/Pine2 کامل، دور opt-Pine سبک بدون سایه)؛ فلور (چمن/گل/سنگ/قارچ) بر اساس متریال ادغام و نمونه‌سازی شد. `Forest.jsx` و `GrassField.jsx` حذف شدند. (۳) دنیا ۴ برابر: `MAP_SIZE` ۲۰۰→۴۰۰، `BOUNDS` ±۱۸۸، `TREE_MAX` ۸۰۰→۲۶۰۰ با گرید فضایی O(1) و تراکم biome-aware (جنگل شمال/غرب، چمن‌زار شرق، بیشه‌ی جنوب)؛ گردنه‌ی قابل عبور در دیواره‌ی شمالی. (۴) LOD/چگالی از preset: `chunkRadius` ۲/۳/۴ و چگالی درخت/چمن از کیفیت؛ progressive warmup در ۲ ثانیه‌ی اول. (۵) رودخانه: شیدر جریان جهت‌دار (`uFlow` per-pool) + فوم کشیده + نی‌های کناره (`Cattail.glb`). (۶) حذف کامل BirchTrees از manifest و کد. (۷) کرم‌شب‌تاب ~۵۰٪ کمتر. eslint ✅ build ✅
- 2026-11-27 — **Phase 5 / PART 1: اتمسفر شب‌تنها + حذف مه و نورهای مصنوعی** — (۱) چرخه‌ی روز/شب کامل حذف شد: `envState` همیشه شب است (`isNight()` همیشه true، `daylight` صفر)، `DAY_LENGTH` و تمام محاسبات فاز حذف شدند و `DayNightSky` با `NightSky` گرادیان ثابت بنفش/آبی جایگزین شد. (۲) مه کاملاً حذف شد: عنصر `<fog>`، `scene.fog`، `fogNear/fogFar`، `weatherFogFor` و بانک‌های مهِ `Weather.jsx` پاک شدند (جایگزین آینده: LOD + چانک). (۳) نورهای سفینه‌ای حذف/نرمال شدند: pointLight ماه (۷۰/۳۰۰)، pointLight دوم Ground (۴۰/۹۰)، پالس ۹۰ واحدی فانوس دریایی و نور سبزآبی صدف برداشته شدند؛ مهتاب حالا یک `directionalLight` سرد و طبیعی با سایه‌ی PCFSoft از preset است و فقط آتش/فانوس/چراغ‌های گرم ماندند. (۴) `AmbientSetup` از حالت دینامیک به ثابت تغییر کرد و ستون‌های نور روز در `CanopyFX` به مهتاب محو تبدیل شدند. eslint ✅ build ✅
- 2026-11-27 — **Phase 4.5: باقی‌مانده‌ی فاز ۴** — (۱) چالش‌های روزانه: استخر ۱۴ چالشی و انتخاب قطعی ۲ چالش بر اساس تاریخ، تب «چالش روزانه» در دفترچه، شمارنده‌ی `trackDaily` روی پخت/صید/چیدن/قارچ/نوازش خرگوش/حشره/بلوط/کرم‌شب‌تاب/گفتگوی NPC، پاداش XP یک‌باره و ریست خودکار نیمه‌شب با `daily-challenge-YYYY-MM-DD`. (۲) فلش‌های مسیر چندهدفه‌ی QuestTracker برای کوئست‌های فعال/تحویل با `location` (زاویه + فاصله‌ی متری، throttle ۱۰Hz روی DOM، مخفی در ≤۳ واحد). (۳) barks محیطی NPC: ۴ جمله برای هر ۶ NPC با تایمر ماژول‌سطح ۳۰..۹۰s، حباب تایپ‌رایتر بالای سر و بلیپ با pitch تصادفی. (۴) پایداری localStorage: `npc-progress-{userId}` + `acorns-{userId}` با بازیابی در شروع، ذخیره‌ی فوری روی اکشن (throttle ۱.۵s)، autosave ۳۰s و ذخیره در خروج. eslint ✅ build ✅
- 2026-11-26 — **Phase 4: NPCها و مأموریت‌ها** — ۶ NPC داده‌محور (پدربزرگ ماهیگیر، آشپز کمپ، جنگلبان، دخترک حشره‌شناس، جادوگر مهتاب شبانه، گنوم جنگل) از مدل‌های موجود manifest با AI ۵Hz (پرسه + نگاه به بازیکن)، نیم‌پلیت و نشانگر «!»/«?»؛ درخت دیالوگ فارسی داده‌محور با تایپ‌رایتر، بلیپ مخصوص هر NPC (pitch با `playbackRate`) و انتخاب‌های شاخه‌ای؛ ۶ کوئست در `questSteps.js` (منبع واحد) با انواع catch/deliver/find/collect؛ دوستی ۱..۵ با هدیه در سطح ۳ و داستان شخصی در سطح ۵؛ پاداش واقعی (کلاه در کمد، دستور پخت جدید در ایستگاه پن، دکور جدید در کاتالوگ)؛ ۶ بلوط طلایی پنهان؛ دفترچه‌ی ۴ تبی (داستان/NPC/دوستی/گنج)؛ جادوگر فقط شب (مش + رجیستری). eslint ✅ build ✅
- 2026-11-26 — Phase 3f: دکوراسیون کمپ — حالت چیدمان با B (قفل موس آزاد، پنل کاتالوگ، حلقه‌ی محدوده ۲۶ واحدی)، ۲۳ آیتم در ۵ دسته از مدل‌های موجود manifest، شبح پیش‌نمایش نیمه‌شفاف سبز/قرمز (داده بیرون React در `decorWorld`)، پرتاب پرتو روی زمین ناهموار با ray-march + بایسکشن (بدون raycast مش)، اعتبارسنجی شیب/آب/تنه‌ی درخت/ون/آتش/تداخل و سقف ۱۵ آیتم هر بازیکن، چرخش Q/E و مقیاس +/−، Shift+کلیک برداشتن، راست‌کلیک حذف، مالکیت (فقط صاحب آیتم)، همگام‌سازی Ably با ۴ رویداد روی `player-action` (قبل از گارد remoteMap) و `decor-sync` برای تازه‌واردها، ذخیره‌سازی `localStorage` با کلید `camp-decor-<roomId>`، صداهای place_item/tent_zip، گروه preload `decor` و آیکون‌های SVG جدید. گاردهای Q/E و ESC و PauseMenu اضافه شد. eslint ✅ build ✅
- 2026-11-26 — 🚨 **کارایی/انیمیشن**: (۱) افت FPS با ۲+ نفر رفع شد — علت: `occlude` در `Html` نام‌شناور و حباب چت باعث raycast بازگشتی روی کل صحنه در هر فریم می‌شد؛ به‌علاوه `wardrobe` با هر بسته‌ی موقعیت ارسال می‌شد و `JSON.stringify` در حلقه‌ی فریم بازیکن ریموت را re-render می‌کرد. راه‌حل: حذف occlude، LOD ۷۰ واحدی برای ریموت‌ها، مقایسه‌ی مرجع شیء برای کمد، ارسال کمد فقط هنگام تغییر. (۲) فریز ۳-۴ ثانیه‌ای E/F رفع شد — علت: یک مرز `Suspense` مشترک برای صحنه + کنترلر + ریموت + `Preload`؛ مونت هر GLB (غذای روی ایستگاه، کاراکتر ریموت) کل صحنه را remount و شیدرها را دوباره کامپایل می‌کرد. راه‌حل: مرزهای Suspense مستقل برای هر گروه دارایی. (۳) انیمیشن خوردن: لقمه/جویدن سه‌موجی + سر خوشحال + ذرات خرده‌نان `InstancedMesh` + eat_crunch/gulp/yum هم‌گام (`eatData.js`). (۴) پولیش پخت: هم‌زدن دایره‌ای، جهش برگرداندن، بخار `InstancedMesh` روی ایستگاه. (۵) صدای اقیانوس مکانی در امتداد ساحل با rolloff. eslint ✅ build ✅
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

