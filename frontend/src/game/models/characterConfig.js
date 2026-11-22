// پیکربندی ۹ کاراکتر: ارتفاع واقعی مدل + پایین‌ترین نقطه + نگاشت کلیپ
// بعضی مدل‌ها ریگ ندارند؛ آن‌ها انیمیشن رویه‌ای (bob/tilt) می‌گیرند.
//
// facing: آفست چرخش Y که به yaw حرکت اضافه می‌شود تا «صورت» مدل به جهت حرکت باشد.
// مقادیر با تحلیل هندسی (جهت پا→نوک پا و مرکز چشم‌ها) استخراج شده‌اند:
//   - مدل‌های ریگ‌دار استاندارد (Citizen / CubeGuy): پا→نوک پا = +Z → آفست 0
//   - Cactoro: چشم‌ها در +Z، اما محور جلو-عقبِ مش روی +Z است → آفست 0
//   - CuteRedDino / Mushroom / CoolBannana: تقارن کامل Z (بدون سیگنال هندسی) → 0
//   - DORAEMON: چشم‌ها و پوزه در -Z (بررسی bbox سر) → Math.PI
//   - miku: چهره در -Z (تحلیل protrusion سر) → Math.PI
//   - CuteCharacter: دهان در +Z → 0
// اگر مدلی در عمل اشتباه بود، با Ctrl+Shift+F در بازی و کلیدهای [ و ] قابل تنظیم زنده است.
//
// prop: لنگر پروپ‌های دست (گیتار/مارشمالو) در فضای نرمال‌شده‌ی ۱.۷۵ واحدی.
// همه‌ی مدل‌ها به ارتفاع مشترک scale می‌شوند، اما نسبت سر به بدنشان متفاوت است؛
// مدل‌های chibi (سر بزرگ، دست پایین) لنگر پایین‌تر و پروپ کوچک‌تر می‌خواهند.
// x از نیم‌عرض واقعی بازوها (اسکریپت inspect-armspan.mjs) مشتق شده تا پروپ داخل بدن نرود.
export const CHARACTER_PROPS = {
  x: 0.34,
  y: 0.95,
  z: 0.28,
  scale: 1,
};

export const CHARACTERS = {
  'Cactoro.glb': {
    height: 3.96,
    minY: 0,
    clips: true,
    prefix: 'CharacterArmature|',
    facing: 0,
    // بازوهای کاکتوس پهن‌اند؛ پروپ کمی بیرون‌تر
    prop: { x: 0.63, y: 0.9, z: 0.28, scale: 1 },
  },
  'Citizen.glb': {
    height: 1.93,
    minY: -0.01,
    clips: true,
    prefix: 'Armature|',
    facing: 0,
    // این مدل کلیپ دویدن جدا ندارد؛ Sprint استفاده می‌شود
    clipOverrides: { run: 'Sprint', dance: 'Jump', laugh: 'Jump', celebrate: 'Jump', sleep: 'Idle', guitar: 'Idle', marshmallow: 'Idle', sit: 'Idle' },
    prop: { x: 0.43, y: 0.95, z: 0.28, scale: 1 },
  },
  'CoolBannanaGuy.glb': {
    height: 5.47,
    minY: 0,
    clips: false,
    facing: 0,
    // لاغر و بلند؛ دست نزدیک محور است
    prop: { x: 0.2, y: 1, z: 0.26, scale: 1 },
  },
  'CubeGuyCharacter.glb': {
    height: 2.84,
    minY: 0,
    clips: true,
    prefix: 'CharacterArmature|CharacterArmature|CharacterArmature|',
    facing: 0,
    // این مدل کلیپ Death ندارد
    clipOverrides: { sleep: 'Duck' },
    prop: { x: 0.7, y: 0.95, z: 0.3, scale: 1 },
  },
  // chibi: سر بزرگ و دست پایین‌تر → لنگر پایین‌تر و پروپ کوچک‌تر
  'CuteCharacter.glb': {
    height: 1.13,
    minY: -0.58,
    clips: false,
    facing: 0,
    prop: { x: 0.43, y: 0.62, z: 0.22, scale: 0.72 },
  },
  // این مدل در عمل پشت‌به‌جلو حرکت می‌کرد؛ آفست π اصلاحش می‌کند
  'CuteRedDino.glb': {
    height: 1.54,
    minY: 0,
    clips: false,
    facing: Math.PI,
    prop: { x: 0.5, y: 0.74, z: 0.26, scale: 0.85 },
  },
  'DORAEMON.glb': {
    height: 0.92,
    minY: -0.53,
    clips: false,
    facing: 0,
    prop: { x: 0.38, y: 0.6, z: 0.2, scale: 0.7 },
  },
  'miku.glb': {
    height: 1389.28,
    minY: -12.75,
    clips: false,
    facing: 0,
    prop: { x: 0.2, y: 0.95, z: 0.28, scale: 1 },
  },
  'MushroomCharacter.glb': {
    height: 5.68,
    minY: 0,
    clips: false,
    facing: 0,
    // دست‌ها چسبیده به بدن؛ لنگر نزدیک محور
    prop: { x: 0.2, y: 0.72, z: 0.24, scale: 0.9 },
  },
};

export const CHARACTER_FILES = Object.keys(CHARACTERS);

export const DEFAULT_CHARACTER = 'Cactoro.glb';

export const characterUrl = (file) =>
  `/game-models/characters/${CHARACTERS[file] ? file : DEFAULT_CHARACTER}`;

// آفست جهت صورت برای هر مدل (yaw نهایی = yaw حرکت + این مقدار)
export const CHARACTER_FACING_OFFSET = Object.fromEntries(
  Object.entries(CHARACTERS).map(([file, cfg]) => [file, cfg.facing ?? 0])
);

export function getFacingOffset(model, overrides) {
  const key = CHARACTERS[model] ? model : DEFAULT_CHARACTER;
  if (overrides && Number.isFinite(overrides[key])) return overrides[key];
  return CHARACTER_FACING_OFFSET[key] ?? 0;
}

// لنگر پروپ‌های دست برای مدل جاری (مقدار پیش‌فرض = مدل استاندارد ۱.۷۵ واحدی)
export function getPropAnchor(model) {
  const key = CHARACTERS[model] ? model : DEFAULT_CHARACTER;
  return { ...CHARACTER_PROPS, ...(CHARACTERS[key].prop || {}) };
}

export const TARGET_HEIGHT = 1.75;

// نگاشت اکشن منطقی → پسوند نام کلیپ
export const CLIP_SUFFIX = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  wave: 'Wave',
  dance: 'Duck',
  laugh: 'Yes',
  celebrate: 'Jump',
  sleep: 'Death',
  guitar: 'Weapon',
  marshmallow: 'Punch',
  sit: 'Duck',
};
