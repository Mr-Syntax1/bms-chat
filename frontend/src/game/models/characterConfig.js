import { modelUrl } from '../assetManifest';

// ---------------------------------------------------------------------------
// characterConfig.js — پیکربندی اختصاصی هر کاراکتر (منبع: characterReport.json)
//
// ⚠️ هیچ مقداری این‌جا «حدسی» نیست: همه از اسکریپت
//    `node scripts/inspect-characters.mjs` می‌آیند که bbox واقعی، جهت جلو،
//    استخوان‌ها، کلیپ‌ها و لنگرهای کمد را برای هر GLB جداگانه اندازه می‌گیرد.
//
// قرارداد فضا (همان چیزی که Character.jsx پیاده می‌کند):
//   • مدل با scale = TARGET_HEIGHT / height بزرگ می‌شود.
//   • group داخلی با rotation.y = forwardRotation می‌چرخد تا «صورت» به +Z برود.
//   • با groundOffset (=-minY*scale) پاها روی y=0 می‌نشینند.
//   • لنگرهای کمد (hat/glasses/backpack) در همین فضای بصری‌اند:
//     y نسبت به کف، x/z نسبت به مرکزِ چرخیده و مقیاس‌شده.
//
// اگر یک مدل را عوض کردید، فقط اسکریپت را دوباره اجرا و مقادیر را جای‌گذاری کنید.
// ---------------------------------------------------------------------------

export const TARGET_HEIGHT = 1.75;

// کلید منطقی کاراکتر → نام فایل GLB
export const CHARACTER_FILES = {
  cute_axolotl: 'cute_axolotl.glb',
  cute_alien_character: 'cute_alien_character.glb',
  cute_demon: 'cute_demon.glb',
  cute_gugugaga: 'cute_gugugaga.glb',
  cute_purple_pony: 'cute_purple_pony.glb',
  cute_robot: 'cute_robot.glb',
  cute_skull_character: 'cute_skull_character.glb',
};

// کلید منطقی کاراکتر → کلید manifest
const MANIFEST_KEY = {
  cute_axolotl: 'characters.axolotl',
  cute_alien_character: 'characters.alien',
  cute_demon: 'characters.demon',
  cute_gugugaga: 'characters.gugugaga',
  cute_purple_pony: 'characters.pony',
  cute_robot: 'characters.robot',
  cute_skull_character: 'characters.skull',
};

export const DEFAULT_CHARACTER = 'cute_axolotl';

// ---------------------------------------------------------------------------
// پیکربندی هر کاراکتر — مقادیر دقیقاً از characterReport.json
// ---------------------------------------------------------------------------
export const CHARACTER_CONFIG = {
  // ---------------------------------------------------------------- axolotl
  // ارتفاع واقعی ۳.۵۸ (نه ۴.۸۵ دروغی AABB)، بدون ریگ، جلو روی +X (فقط یک
  // مش «face_elements» در +X) → forwardRotation = -π/2
  cute_axolotl: {
    file: 'cute_axolotl.glb',
    height: 3.583,
    minY: -2.404,
    groundOffset: 1.174,
    forwardAxis: 'x',
    forwardRotation: -1.5708,
    forwardConfidence: 'medium',
    skinned: false,
    bones: { head: null, spine: null, neck: null, hips: null, leftArm: null, rightArm: null },
    animations: { idle: null, walk: null, run: null, mode: 'procedural' },
    clipPrefix: '',
    clipOverrides: {},
    anchors: {
      hat: { bone: null, x: 0.002, y: 1.73, z: 0.011, scale: 1.5 },
      glasses: { bone: null, x: -0.015, y: 1.274, z: 0.444, scale: 1.35 },
      backpack: { bone: null, x: 0, y: 0.921, z: -0.425, scale: 1.4 },
      prop: { x: 0.62, y: 0.92, z: 0, scale: 1.2 },
    },
    fallbackAnchors: {
      hat: { x: 0.002, y: 1.73, z: 0.011, scale: 1.5 },
      glasses: { x: -0.015, y: 1.274, z: 0.444, scale: 1.35 },
      backpack: { x: 0, y: 0.921, z: -0.425, scale: 1.4 },
      prop: { x: 0.62, y: 0.92, z: 0, scale: 1.2 },
    },
    shirt: { minT: 0.3, maxT: 0.82 },
  },

  // ---------------------------------------------------------------- alien
  // مجسمه‌ی بدون ریگ؛ جلو روی +Z (حفره‌ی چشم در +Z). minY منفی → پاها با
  // groundOffset بالا می‌آیند.
  cute_alien_character: {
    file: 'cute_alien_character.glb',
    height: 1.526,
    minY: -0.93,
    groundOffset: 1.066,
    forwardAxis: 'z',
    forwardRotation: 0,
    forwardConfidence: 'high',
    skinned: false,
    bones: { head: null, spine: null, neck: null, hips: null, leftArm: null, rightArm: null },
    animations: { idle: null, walk: null, run: null, mode: 'procedural' },
    clipPrefix: '',
    clipOverrides: {},
    anchors: {
      hat: { bone: null, x: 0.013, y: 1.73, z: -0.067, scale: 1.261 },
      glasses: { bone: null, x: 0, y: 1.285, z: 0.278, scale: 1.156 },
      backpack: { bone: null, x: 0, y: 0.964, z: -0.34, scale: 1.4 },
      prop: { x: 0.387, y: 0.964, z: 0.265, scale: 1.2 },
    },
    fallbackAnchors: {
      hat: { x: 0.013, y: 1.73, z: -0.067, scale: 1.261 },
      glasses: { x: 0, y: 1.285, z: 0.278, scale: 1.156 },
      backpack: { x: 0, y: 0.964, z: -0.34, scale: 1.4 },
      prop: { x: 0.387, y: 0.964, z: 0.265, scale: 1.2 },
    },
    shirt: { minT: 0.3, maxT: 0.82 },
  },

  // ---------------------------------------------------------------- demon
  // مجسمه‌ی بدون ریگ، جلو روی +Z (چگالی مثلث سر در +Z بیشتر است)
  cute_demon: {
    file: 'cute_demon.glb',
    height: 1.001,
    minY: -0.5,
    groundOffset: 0.875,
    forwardAxis: 'z',
    forwardRotation: 0,
    forwardConfidence: 'high',
    skinned: false,
    bones: { head: null, spine: null, neck: null, hips: null, leftArm: null, rightArm: null },
    animations: { idle: null, walk: null, run: null, mode: 'procedural' },
    clipPrefix: '',
    clipOverrides: {},
    anchors: {
      hat: { bone: null, x: 0.095, y: 1.73, z: 0.027, scale: 1.5 },
      glasses: { bone: null, x: 0.033, y: 1.273, z: 0.312, scale: 1.35 },
      backpack: { bone: null, x: 0, y: 0.896, z: -0.224, scale: 1.4 },
      prop: { x: 0.6, y: 0.9, z: 0, scale: 1.2 },
    },
    fallbackAnchors: {
      hat: { x: 0.095, y: 1.73, z: 0.027, scale: 1.5 },
      glasses: { x: 0.033, y: 1.273, z: 0.312, scale: 1.35 },
      backpack: { x: 0, y: 0.896, z: -0.224, scale: 1.4 },
      prop: { x: 0.6, y: 0.9, z: 0, scale: 1.2 },
    },
    shirt: { minT: 0.3, maxT: 0.82 },
  },

  // ------------------------------------------------------------- gugugaga
  // ریگ‌دار (Head/Spine/Pelvis/Hand) اما بدون هیچ کلیپ → انیمیشن رویه‌ای.
  // جلو روی +X (دست‌های L/R و چگالی هر دو تأیید می‌کنند).
  cute_gugugaga: {
    file: 'cute_gugugaga.glb',
    height: 0.667,
    minY: 0,
    groundOffset: 0,
    forwardAxis: 'x',
    forwardRotation: -1.5708,
    forwardConfidence: 'high',
    skinned: true,
    bones: {
      head: 'Head_7',
      spine: 'Spine01_19',
      neck: 'NeckTwist01_9',
      hips: 'Pelvis_6',
      leftArm: 'L_Upperarm_12',
      rightArm: 'R_Upperarm_16',
    },
    animations: { idle: null, walk: null, run: null, mode: 'procedural' },
    clipPrefix: '',
    clipOverrides: {},
    anchors: {
      hat: { bone: 'Head_7', x: 0.002, y: 1.73, z: -0.041, scale: 1.5 },
      glasses: { bone: 'Head_7', x: 0.026, y: 1.271, z: 0.428, scale: 1.35 },
      backpack: { bone: 'Spine01_19', x: 0, y: 0.877, z: -0.349, scale: 1.241 },
      prop: { x: 0.5, y: 0.88, z: 0, scale: 1 },
    },
    fallbackAnchors: {
      hat: { x: 0.002, y: 1.73, z: -0.041, scale: 1.5 },
      glasses: { x: 0.026, y: 1.271, z: 0.428, scale: 1.35 },
      backpack: { x: 0, y: 0.877, z: -0.349, scale: 1.241 },
      prop: { x: 0.5, y: 0.88, z: 0, scale: 1 },
    },
    shirt: { minT: 0.3, maxT: 0.82 },
  },

  // ---------------------------------------------------------------- pony
  // بدون ریگ؛ جلو روی +Z (پوزه/یال در +Z). باریک و بلند.
  cute_purple_pony: {
    file: 'cute_purple_pony.glb',
    height: 1.583,
    minY: 0,
    groundOffset: 0,
    forwardAxis: 'z',
    forwardRotation: 0,
    forwardConfidence: 'high',
    skinned: false,
    bones: { head: null, spine: null, neck: null, hips: null, leftArm: null, rightArm: null },
    animations: { idle: null, walk: null, run: null, mode: 'procedural' },
    clipPrefix: '',
    clipOverrides: {},
    anchors: {
      hat: { bone: null, x: 0.064, y: 1.73, z: 0.227, scale: 1.305 },
      glasses: { bone: null, x: 0, y: 1.269, z: 0.581, scale: 1.196 },
      backpack: { bone: null, x: 0, y: 0.952, z: -0.252, scale: 0.866 },
      prop: { x: 0.28, y: 0.95, z: 0, scale: 0.78 },
    },
    fallbackAnchors: {
      hat: { x: 0.064, y: 1.73, z: 0.227, scale: 1.305 },
      glasses: { x: 0, y: 1.269, z: 0.581, scale: 1.196 },
      backpack: { x: 0, y: 0.952, z: -0.252, scale: 0.866 },
      prop: { x: 0.28, y: 0.95, z: 0, scale: 0.78 },
    },
    shirt: { minT: 0.3, maxT: 0.82 },
  },

  // ---------------------------------------------------------------- robot
  // جلو روی +X (چهار مش صورت: GLOW/SCREEN/EYES همه در +X).
  // تک‌کلیپ «Animation» فقط morphTarget چشم است (پلک) → حالت clips برای idle،
  // ولی راه‌رفتن رویه‌ای لازم است، پس mode='hybrid' (idle کلیپ، حرکت رویه‌ای).
  cute_robot: {
    file: 'cute_robot.glb',
    height: 2.089,
    minY: -0.002,
    groundOffset: 0.002,
    forwardAxis: 'x',
    forwardRotation: -1.5708,
    forwardConfidence: 'medium',
    skinned: false,
    bones: { head: null, spine: null, neck: null, hips: null, leftArm: null, rightArm: null },
    animations: { idle: 'Animation', walk: null, run: null, mode: 'hybrid' },
    clipPrefix: '',
    clipOverrides: {},
    anchors: {
      hat: { bone: null, x: 0, y: 1.73, z: 0, scale: 1.5 },
      glasses: { bone: null, x: -0.265, y: 1.266, z: 0.554, scale: 1.35 },
      backpack: { bone: null, x: 0, y: 0.94, z: -0.423, scale: 1.4 },
      prop: { x: 0.55, y: 0.94, z: 0, scale: 1.15 },
    },
    fallbackAnchors: {
      hat: { x: 0, y: 1.73, z: 0, scale: 1.5 },
      glasses: { x: -0.265, y: 1.266, z: 0.554, scale: 1.35 },
      backpack: { x: 0, y: 0.94, z: -0.423, scale: 1.4 },
      prop: { x: 0.55, y: 0.94, z: 0, scale: 1.15 },
    },
    shirt: { minT: 0.3, maxT: 0.82 },
  },

  // ---------------------------------------------------------------- skull
  // جلو روی +Z (چگالی مثلث صورت در +Z). بدون ریگ.
  cute_skull_character: {
    file: 'cute_skull_character.glb',
    height: 1.153,
    minY: -0.577,
    groundOffset: 0.875,
    forwardAxis: 'z',
    forwardRotation: 0,
    forwardConfidence: 'high',
    skinned: false,
    bones: { head: null, spine: null, neck: null, hips: null, leftArm: null, rightArm: null },
    animations: { idle: null, walk: null, run: null, mode: 'procedural' },
    clipPrefix: '',
    clipOverrides: {},
    anchors: {
      hat: { bone: null, x: 0.001, y: 1.73, z: -0.073, scale: 1.5 },
      glasses: { bone: null, x: 0.001, y: 1.269, z: 0.382, scale: 1.35 },
      backpack: { bone: null, x: 0, y: 0.887, z: -0.179, scale: 1.209 },
      prop: { x: 0.48, y: 0.89, z: 0, scale: 0.95 },
    },
    fallbackAnchors: {
      hat: { x: 0.001, y: 1.73, z: -0.073, scale: 1.5 },
      glasses: { x: 0.001, y: 1.269, z: 0.382, scale: 1.35 },
      backpack: { x: 0, y: 0.887, z: -0.179, scale: 1.209 },
      prop: { x: 0.48, y: 0.89, z: 0, scale: 0.95 },
    },
    shirt: { minT: 0.3, maxT: 0.82 },
  },
};

// ---------------------------------------------------------------------------
// کمک‌تابع‌ها
// ---------------------------------------------------------------------------

/** فهرست کلیدهای کاراکتر (برای گرید انتخابگر) */
export const CHARACTER_IDS = Object.keys(CHARACTER_CONFIG);

/** alias سازگاری برای کدهایی که قبلاً `CHARACTERS` را import می‌کردند */
export const CHARACTERS = CHARACTER_CONFIG;

/** نرمال‌سازی شناسه: «cute_axolotl.glb» یا «cute_axolotl» → «cute_axolotl» */
export function normalizeCharacterId(id) {
  if (!id) return DEFAULT_CHARACTER;
  const raw = String(id);
  if (CHARACTER_CONFIG[raw]) return raw;
  const bare = raw.replace(/\.glb$/i, '');
  return CHARACTER_CONFIG[bare] ? bare : DEFAULT_CHARACTER;
}

/** پیکربندی کاراکتر با fallback به پیش‌فرض */
export function getCharacterConfig(id) {
  return CHARACTER_CONFIG[normalizeCharacterId(id)];
}

/** کلید → نام فایل (سازگار با کدهای قدیمی که نام فایل می‌خواستند) */
export function characterFile(id) {
  return getCharacterConfig(id).file;
}

/** URL مدل از manifest (منبع واحد حقیقت) */
export function characterUrl(id) {
  const key = normalizeCharacterId(id);
  return modelUrl(MANIFEST_KEY[key]) || modelUrl(MANIFEST_KEY[DEFAULT_CHARACTER]);
}

/** آفست چرخش صورت برای هر کاراکتر */
export const CHARACTER_FACING_OFFSET = Object.fromEntries(
  Object.entries(CHARACTER_CONFIG).map(([id, cfg]) => [id, cfg.forwardRotation ?? 0])
);

/** آفست چرخش با پشتیبانی از override زنده (Ctrl+Shift+F) */
export function getFacingOffset(id, overrides) {
  const key = normalizeCharacterId(id);
  if (overrides && Number.isFinite(overrides[key])) return overrides[key];
  return CHARACTER_CONFIG[key].forwardRotation ?? 0;
}

/** لنگر پروپ دست (گیتار/چوب/تور) */
export function getPropAnchor(id) {
  const cfg = getCharacterConfig(id);
  return cfg.anchors?.prop || { x: 0.34, y: 0.95, z: 0.28, scale: 1 };
}

/** لنگر سر برای کلاه/عینک: بون Head (اگر باشد) + آفست و مقیاس بصری */
export function getHeadAnchor(id) {
  const cfg = getCharacterConfig(id);
  const hat = cfg.anchors?.hat || {};
  const glasses = cfg.anchors?.glasses || {};
  const fallback = cfg.fallbackAnchors?.hat || {};
  return {
    bone: hat.bone || null,
    y: hat.y ?? fallback.y ?? TARGET_HEIGHT - 0.02,
    z: glasses.z ?? hat.z ?? fallback.z ?? 0,
    scale: hat.scale ?? fallback.scale ?? 1,
    eyeY: glasses.y ?? fallback.y ?? TARGET_HEIGHT * 0.73,
  };
}

/** لنگرهای کمد با fallback برای مدل‌های بدون استخوان */
export function getWardrobeAnchors(id) {
  const cfg = getCharacterConfig(id);
  const fallback = cfg.fallbackAnchors || {};
  const anchors = cfg.anchors || {};
  const merge = (key) => {
    const a = anchors[key] || {};
    const f = fallback[key] || {};
    return {
      bone: a.bone || null,
      x: a.x ?? f.x ?? 0,
      y: a.y ?? f.y ?? 0,
      z: a.z ?? f.z ?? 0,
      scale: a.scale ?? f.scale ?? 1,
    };
  };
  return { hat: merge('hat'), glasses: merge('glasses'), backpack: merge('backpack') };
}

/** نگاشت اکشن منطقی → پسوند نام کلیپ (برای مدل‌های ریگ‌دار استاندارد) */
export const CLIP_SUFFIX = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  wave: 'Wave',
  dance: 'Duck',
  laugh: 'Yes',
  celebrate: 'Jump',
  cheer: 'Jump',
  highfive: 'Wave',
  hug: 'Yes',
  sit: 'Duck',
  sleep: 'Death',
  guitar: 'Weapon',
  marshmallow: 'Punch',
  'cooking-stir': 'Weapon',
  'cooking-flip': 'Punch',
  'fishing-hold': 'Weapon',
  'bug-catch': 'Punch',
  'forage-pick': 'Duck',
  eating: 'Yes',
};
