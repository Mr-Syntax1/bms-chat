// پیکربندی ۹ کاراکتر: ارتفاع واقعی مدل + پایین‌ترین نقطه + نگاشت کلیپ
// بعضی مدل‌ها ریگ ندارند؛ آن‌ها انیمیشن رویه‌ای (bob/tilt) می‌گیرند.
export const CHARACTERS = {
  'Cactoro.glb': { height: 3.96, minY: 0, clips: true, prefix: 'CharacterArmature|' },
  'Citizen.glb': {
    height: 1.93,
    minY: -0.01,
    clips: true,
    prefix: 'Armature|',
    // این مدل کلیپ دویدن جدا ندارد؛ Sprint استفاده می‌شود
    clipOverrides: { run: 'Sprint', dance: 'Jump', laugh: 'Jump', celebrate: 'Jump', sleep: 'Idle', guitar: 'Idle', marshmallow: 'Idle', sit: 'Idle' },
  },
  'CoolBannanaGuy.glb': { height: 5.47, minY: 0, clips: false },
  'CubeGuyCharacter.glb': {
    height: 2.84,
    minY: 0,
    clips: true,
    prefix: 'CharacterArmature|CharacterArmature|CharacterArmature|',
    // این مدل کلیپ Death ندارد
    clipOverrides: { sleep: 'Duck' },
  },
  'CuteCharacter.glb': { height: 1.13, minY: -0.58, clips: false },
  'CuteRedDino.glb': { height: 1.54, minY: 0, clips: false },
  'DORAEMON.glb': { height: 0.92, minY: -0.53, clips: false },
  'miku.glb': { height: 1389.28, minY: -12.75, clips: false },
  'MushroomCharacter.glb': { height: 5.68, minY: 0, clips: false },
};

export const CHARACTER_FILES = Object.keys(CHARACTERS);

export const DEFAULT_CHARACTER = 'Cactoro.glb';

export const characterUrl = (file) =>
  `/game-models/characters/${CHARACTERS[file] ? file : DEFAULT_CHARACTER}`;

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
