// ---------------------------------------------------------------------------
// assetManifest.js — منبع واحد حقیقت برای همه‌ی دارایی‌ها (مدل + صدا)
//
// قواعد:
//  • هیچ کد جدیدی مسیر خام (/game-models/... یا /sounds/...) ننویسد؛ فقط کلید منطقی.
//    مثال: MODELS.npc.grandpa.url  یا  SOUNDS.fish.cast
//  • هر ورودی: { url, kind, heavy, placeholder }
//      - url: مسیر نهایی (null یعنی فایل موجود نیست → placeholder)
//      - kind: 'model' | 'sound'
//      - heavy: فایل بزرگ (>~500KB) → باید lazy یا بهینه استفاده شود
//      - placeholder: true یعنی فایل واقعی نداریم و باید primitive/synth جایگزین شود
//      - synth: (فقط صدا) کلید کارخانه‌ی رویه‌ای در synth.js
//      - fallback: (فقط مدل) توضیح شکل primitive جایگزین
//  • مسیرها case-sensitive هستند (production احتمالاً Linux).
//  • برای «افزودن فایل واقعی بعداً»: فایل را بگذارید و url/placeholder را عوض کنید.
// ---------------------------------------------------------------------------

const MODEL_BASE = '/game-models';
const SOUND_BASE = '/sounds';

const HEAVY_BYTES = 500 * 1024;

/** ورودی مدل
 *  opts.opt = true → از نسخه‌ی بهینه‌شده در opt/<path> استفاده کن
 */
function m(path, opts = {}) {
  const rel = opts.opt && path ? `opt/${path}` : path;
  return {
    url: rel ? `${MODEL_BASE}/${rel}` : null,
    kind: 'model',
    heavy: Boolean(opts.heavy),
    placeholder: Boolean(opts.placeholder) || !path,
    ...(opts.opt && path ? { optimized: true } : {}),
    ...(opts.fallback ? { fallback: opts.fallback } : {}),
    ...(opts.note ? { note: opts.note } : {}),
  };
}

/** ورودی صدا */
function s(path, opts = {}) {
  return {
    url: path ? `${SOUND_BASE}/${path}` : null,
    kind: 'sound',
    heavy: false,
    placeholder: Boolean(opts.placeholder) || !path,
    ...(opts.synth ? { synth: opts.synth } : {}),
    ...(opts.loop ? { loop: true } : {}),
    ...(opts.note ? { note: opts.note } : {}),
  };
}

/** مدل غایب: placeholder با شکل primitive */
const missing = (fallback, note) => m(null, { fallback, note });

// ===========================================================================
// MODELS
// ===========================================================================
export const MODELS = {
  // ---- کاراکترهای بازیکن (characterConfig.js از همین‌ها می‌خواند) ----
  characters: {
    cactoro: m('opt/Cactoro.glb', { note: 'نسخه‌ی بهینه‌شده در ریشه‌ی opt' }),
    citizen: m('characters/Citizen.glb', { opt: true }),
    banana: m('characters/CoolBannanaGuy.glb', { heavy: true, opt: true }),
    cubeGuy: m('characters/CubeGuyCharacter.glb', { opt: true }),
    cute: m('characters/CuteCharacter.glb', { opt: true }),
    redDino: m('characters/CuteRedDino.glb', { opt: true }),
    doraemon: m('characters/DORAEMON.glb', { opt: true }),
    miku: m('characters/miku.glb', { opt: true }),
    mushroom: m('characters/MushroomCharacter.glb', { heavy: true, opt: true }),
  },

  // ---- NPCها (Phase 4؛ فعلاً preload نمی‌شوند) ----
  npc: {
    grandpa: m('npc/Grandpa.glb'),
    adventurer: m('npc/Adventurer.glb', { heavy: true, note: 'نسخه‌ی opt اسکین را ناقص می‌کند؛ اصل استفاده می‌شود' }),
    littlegirl: m('npc/Littlegirl.glb'),
    witch: m('npc/Witch.glb'),
    cow: m('npc/CowCharacter.glb', { heavy: true, opt: true }),
    gnome: m('npc/WIzardGnome.glb', { note: 'نام فایل عمداً WIzardGnome است' }),
  },

  // ---- درخت‌ها ----
  trees: {
    pineOpt: m('trees/Pine.glb', { opt: true, note: 'instanced — opt/trees/Pine.glb (108KB)' }),
    pine: m('trees/Pine.glb', { opt: true }),
    pine2: m('trees/Pine2.glb', { opt: true, note: 'instanced — opt/trees/Pine2.glb (110KB)' }),
    fern: m('trees/Fern.glb', { opt: true }),
    oak: missing('procedural: تنه‌ی استوانه + ۳ تا ۵ کره‌ی شاخ‌وبرگ', 'مدل oak/broadleaf موجود نیست'),
    deadTree: missing('procedural: تنه‌ی مخروطی تیره + شاخه‌های سیلندری', 'مدل درخت مرده موجود نیست'),
    giantTree: m('trees/Pine.glb', { opt: true, note: 'giant = Pine با scaleY بزرگ' }),
  },

  // ---- زیربوته و کف جنگل ----
  undergrowth: {
    grass: m('grassyellowing.glb', { note: 'بوته‌ی GLB — جایگزین تیغه‌های رویه‌ای (۱۴۷ مش، ۳ متریال)' }),
    bush: m('Decorations/BushbyQuaternius.glb'),
    flowers: m('Decorations/Flowers.glb'),
    mushrooms: m('Decorations/Mushrooms.glb'),
    edibleMushroom: m('MushroomLaetiporus.glb', { opt: true }),
    logFungus: m('opt/LogFungus.glb', { note: 'نسخه‌ی سبک همان Decorations/LogFungus (۴.۱KB)' }),
    cattail: m('opt/Cattail.glb'),
    lilypad: m('Lilypad.glb', { opt: true }),
    berryBush: missing('procedural: Bush تیره + کره‌های قرمز instanced', 'مدل berry bush موجود نیست'),
    berries: missing('procedural: کره‌های قرمز ریز', 'مدل berries موجود نیست'),
    honey: missing('procedural: شیشه‌ی استوانه‌ای + درپوش', 'مدل honey موجود نیست'),
    herbs: missing('procedural: چند تیغه‌ی سبز باریک', 'مدل herbs موجود نیست'),
    pinecone: missing('procedural: مخروط قهوه‌ای', 'مدل pinecone موجود نیست'),
  },

  // ---- سنگ و کنده ----
  rocks: {
    rocks: m('Decorations/Rocks.glb'),
    rocksOpt: m('opt/Rocks.glb'),
    rocks2: m('Decorations/Rocks2.glb'),
    rockMedium: m('Decorations/RockMedium.glb', { opt: true }),
    stump: m('Decorations/Treestump.glb', { opt: true }),
    choppedLog: m('Decorations/ChoppedLog.glb'),
    choppedLogOpt: m('opt/ChoppedLog.glb'),
    logAxe: m('Decorations/LogAxe.glb'),
    logAxeOpt: m('opt/LogAxe.glb'),
    cliff: m('Decorations/RockMedium.glb', { opt: true, note: 'صخره‌ی آبشار — RockMedium بزرگ‌شده و instanced' }),
  },

  // ---- پل و مسیر ----
  paths: {
    woodBridge: m('Woodbridge.glb', { note: 'برای رودخانه؛ scale/pivot از assetReport' }),
    bridge: m('Bridge.glb', { note: 'جایگزین Woodbridge' }),
    stonePath: m('beach/RockPathRoundSmall.glb', { opt: true, note: 'تک‌سنگ گرد ~1.1×1.35 واحد (نه نوار)' }),
    steppingStone: m('beach/RockPathRoundSmall.glb', { opt: true }),
  },

  // ---- حیوانات ----
  animals: {
    rabbit: m('animals/Easterrabbit.glb'),
    deer: m('animals/Muledeer.glb', { opt: true }),
    duck: m('animals/Mallardduck.glb', { opt: true }),
    frog: m('animals/Frog.glb'),
    owl: m('animals/Owl.glb', { opt: true }),
    porcupine: m('animals/Porcupine.glb', { opt: true, note: 'جانشین hedgehog' }),
    goldfish: m('animals/Goldfish.glb'),
    fox: missing('procedural: روباه ساده (جعبه + مخروط)', 'مدل fox موجود نیست'),
    squirrel: missing('procedural: سنجاب ساده', 'مدل squirrel موجود نیست'),
  },

  // ---- ماهیگیری ----
  fishing: {
    rod: m('missions/FishingRod.glb'),
    bucket: m('opt/Bucket.glb'),
    bobber: missing('procedural: کره‌ی قرمز/سفید + نخ', 'مدل bobber موجود نیست'),
    bugNet: missing('procedural: حلقه + توری شفاف + دسته', 'مدل bug net موجود نیست'),
    oldShoe: missing('procedural: جعبه‌ی خمیده‌ی قهوه‌ای', 'مدل old shoe موجود نیست'),
  },

  // ---- ایستگاه پخت ----
  cooking: {
    pot: m('Pot.glb'),
    cauldron: m('Cauldron.glb'),
    fryingPan: m('Fryingpan.glb'),
    tripod: missing('procedural: سه سیلندر چوبی + زنجیر', 'مدل tripod موجود نیست'),
    sausage: missing('procedural: کپسول قهوه‌ای', 'مدل sausage موجود نیست'),
    soupBowl: missing('procedural: کاسه‌ی نیم‌کره + مایع', 'مدل soup bowl موجود نیست'),
  },

  // ---- غذاها (نگاشت روی دستور پخت) ----
  food: {
    steak: m('Steak.glb'),
    eggFried: m('EggFried.glb'),
    corn: m('Corn.glb', { opt: true }),
    potato: m('Potato.glb'),
    pancakes: m('PancakesStack.glb'),
    pie: m('Pie.glb'),
    stew: m('Stew.glb'),
    sushi: m('SushiNigiri.glb'),
    skewer: m('SkewerVegetables.glb'),
    plate: missing('procedural: استوانه‌ی پهن سفید', 'مدل plate موجود نیست'),
  },

  // ---- آسایش کمپ ----
  comfort: {
    bedroll: m('Bedroll.glb'),
    hammock: m('Hammock.glb'),
    icebox: m('Icebox.glb'),
    thermos: m('Thermos.glb'),
    mug: m('Mug.glb'),
    stringLights: m('Holidaylights.glb'),
    rug: m('Modernrug.glb'),
    flag: m('Flag.glb'),
  },

  // ---- تفریح ساحل ----
  beach: {
    ball: m('beachball.glb'),
    umbrella: m('Umbrella.glb'),
    umbrellaAndChairs: m('Umbrellaandchairs.glb', { opt: true }),
    lighthouse: m('beach/LighthousebyPoly.glb'),
    port: m('beach/port/Port.glb', { opt: true }),
    boat: m('beach/boat/BoatbyPoly.glb', { opt: true }),
    rowboat: m('beach/boat/RowboatbyPoly.glb', { opt: true }),
    clam: m('beach/ClambyPoly.glb', { opt: true }),
    seashell: m('beach/SeashellbyPoly.glb', { opt: true }),
    starfish: m('beach/StarfishbyPoly.glb', { opt: true }),
    palm: m('beach/trees/PalmTree.glb'),
    palm2: m('beach/trees/PalmTree2.glb', { opt: true }),
    coconutPalm: m('beach/trees/CoconutPalmTree.glb', { opt: true }),
    campingChair: missing('procedural: صندلی تاشو (لوله + پارچه)', 'مدل camping chair موجود نیست'),
  },

  // ---- سازه‌های کمپ ----
  structures: {
    tent: m('Decorations/Tent.glb'),
    tentOpt: m('opt/Tent.glb'),
    tent2: m('Decorations/Tent2.glb'),
    tent3: m('Decorations/Tent3.glb'),
    lantern: m('Decorations/Lantern.glb', { note: 'missions/Lantern.glb نسخه‌ی تکراری است و استفاده نمی‌شود' }),
    postLantern: m('missions/PostLantern.glb'),
    sign: m('missions/WoodenSign.glb'),
    noticeBoard: missing('procedural: تخته‌ی چوبی + پایه‌ها', 'مدل notice board موجود نیست'),
    picnicTable: m('ExtraCozyProps/PicnicTable.glb'),
    picnicTable2: m('ExtraCozyProps/PicnicTable2.glb'),
    backpack: m('ExtraCozyProps/Backpack.glb'),
    guitar: m('ExtraCozyProps/Guitar.glb'),
    marshmallows: m('ExtraCozyProps/Marshmallows.glb'),
    bonfire: m('fire/Bonfire.glb'),
    bonfireOpt: m('opt/Bonfire.glb'),
    rv: m('cars/RV.glb'),
    rvOpt: m('opt/RV.glb'),
  },

  // ---- مأموریت ----
  quest: {
    key: m('missions/Key.glb'),
    parchment: m('missions/ParchamentOpen.glb'),
    chest: m('missions/TreasureChest.glb', { opt: true }),
  },

  // ---- لباس/آیتم‌های پوشیدنی (همه procedural در Phase 2) ----
  wearables: {
    partyHat: missing('procedural: مخروط رنگی + پوم‌پوم', 'مدل hat موجود نیست'),
    wizardHat: missing('procedural: مخروط + لبه‌ی پهن', 'مدل hat موجود نیست'),
    chefHat: missing('procedural: استوانه + بالش گرد', 'مدل hat موجود نیست'),
    beanie: missing('procedural: نیم‌کره + لبه', 'مدل hat موجود نیست'),
    strawHat: missing('procedural: مخروط کم‌ارتفاع + لبه', 'مدل hat موجود نیست'),
    baseballCap: missing('procedural: نیم‌کره + نقاب', 'مدل hat موجود نیست'),
    flowerCrown: missing('procedural: حلقه + کره‌های رنگی', 'مدل hat موجود نیست'),
    catEars: missing('procedural: دو مخروط مثلثی', 'مدل hat موجود نیست'),
    roundGlasses: missing('procedural: دو حلقه‌ی نازک + پل', 'مدل glasses موجود نیست'),
    sunglasses: missing('procedural: دو مستطیل تیره', 'مدل glasses موجود نیست'),
    scarf: missing('procedural: حلقه‌ی پارچه‌ای', 'مدل scarf موجود نیست'),
  },
};

// ===========================================================================
// SOUNDS
// ===========================================================================
export const SOUNDS = {
  ambience: {
    fire: s('campfire.mp3', { loop: true }),
    crickets: s('crickets.mp3', { loop: true }),
    ocean: s('ocean.mp3', { loop: true }),
    owl: s('Ambient/owl-hooting.mp3', { loop: true }),
    stream: s('Ambient/stream-loop.mp3', { loop: true }),
    waterfall: s('Ambient/waterfall-in-the-rainforest.mp3', { loop: true }),
    musicEvening: s(null, { synth: 'music_evening', loop: true, note: 'فایل موسیقی موجود نیست' }),
    frogs: s(null, { synth: 'frog', loop: true, note: 'صدای قورباغه موجود نیست' }),
    nightBirds: s(null, { synth: 'nightbirds', loop: true, note: 'صدای پرنده‌ی شب موجود نیست' }),
    leavesRustle: s(null, { synth: 'leaves_rustle', loop: true, note: 'خش‌خش برگ موجود نیست' }),
    rain: s(null, { synth: 'rain', loop: true, note: 'فایل باران موجود نیست' }),
  },

  // ---- بازیکن ----
  player: {
    jump: s(null, { synth: 'jump', note: 'فایل پرش موجود نیست' }),
    landSoft: s(null, { synth: 'land_soft', note: 'فایل فرود موجود نیست' }),
    splashSmall: s(null, { synth: 'splash_small', note: 'فایل پاشش موجود نیست' }),
    waterEnter: s(null, { synth: 'water_enter', note: 'فایل ورود به آب موجود نیست' }),
    swimLoop: s(null, { synth: 'swim_loop', loop: true, note: 'فایل شنا موجود نیست' }),
  },

  // ---- ماهیگیری ----
  fishing: {
    cast: s('casting-fishing-rod-for-game-fishing.mp3'),
    reel: s('fishing-reel-winding.mp3'),
    catch: s('item-get-cheerful.mp3'),
    bite: s(null, { synth: 'fish_bite', note: 'فایل گاز گرفتن قلاب موجود نیست' }),
  },

  // ---- آب ----
  water: {
    plink: s('water-drop-stone.mp3', { note: 'rock_skip با random playbackRate' }),
  },

  // ---- پخت ----
  cooking: {
    fryLoop: s('coocking/bacon-frying-sizzle-pop.mp3', { loop: true, note: 'نام پوشه coocking عمداً غلط است' }),
    frySizzle: s('other/fry_sizzle.mp3', { loop: true }),
    potBubble: s('other/pot_bubble.mp3', { loop: true }),
    flip: s('other/flip.mp3'),
    done: s('other/cook_done.mp3'),
    burn: s('other/burn.mp3'),
    fireIgnite: s('other/fire_ignite.mp3'),
    marshmallowToast: s('other/marshmallow_toast.mp3'),
  },

  // ---- خوردن ----
  eat: {
    yum: s('yum.mp3'),
    crunch: s('other/eat_crunch.mp3'),
    gulp: s('other/eat_gulp.mp3'),
  },

  // ---- موسیقی/ابزار ----
  music: {
    guitar1: s('guitar1.m4a'),
    guitar2: s('guitar2.mp3'),
    guitar3: s('guitar3.m4a'),
  },

  // ---- تعامل/UI ----
  ui: {
    click: s('other/ui_click.mp3'),
    hover: s('other/ui_hover.mp3'),
    pickup: s('other/pickup.mp3'),
    emotePop: s('other/emote_pop.mp3'),
    placeItem: s('other/place_item.mp3'),
    equipCloth: s('other/equip_cloth.mp3'),
    tentZip: s('other/tent_zip.mp3'),
  },

  // ---- فعالیت‌ها ----
  activity: {
    berryPick: s('other/berry_pick.mp3'),
    bugNet: s('other/bug_net.mp3'),
    bugCatch: s('other/bug_catch.mp3'),
    ballBounce: s('other/ball_bounce.mp3'),
    ballKick: s('other/ball_kick.mp3'),
  },

  // ---- کوئست ----
  quest: {
    accept: s('other/quest_accept.mp3'),
    complete: s('other/quest_complete.mp3'),
  },

  // ---- NPC ----
  npc: {
    blip1: s('other/npc_blip_1.mp3'),
    blip2: s('other/npc_blip_2.mp3'),
    blip3: s('other/npc_blip_3.mp3'),
    blip4: s('other/npc_blip_4.mp3'),
  },
};

// ===========================================================================
// HELPERS
// ===========================================================================

/** پیمایش تودرتو و ساخت نگاشت «کلید نقطه‌ای → ورودی» */
function flatten(node, prefix, out) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && 'kind' in value) {
      out[path] = value;
    } else if (value && typeof value === 'object') {
      flatten(value, path, out);
    }
  }
  return out;
}

export const MODEL_ENTRIES = flatten(MODELS, '', {});
export const SOUND_ENTRIES = flatten(SOUNDS, '', {});

/** ورودی مدل با کلید نقطه‌ای: model('npc.grandpa') */
export function model(key) {
  const entry = MODEL_ENTRIES[key];
  if (!entry) throw new Error(`[assetManifest] unknown model key: ${key}`);
  return entry;
}

/** url مدل با کلید نقطه‌ای */
export function modelUrl(key) {
  return model(key).url;
}

/** ورودی صدا با کلید نقطه‌ای: sound('fishing.cast') */
export function sound(key) {
  const entry = SOUND_ENTRIES[key];
  if (!entry) throw new Error(`[assetManifest] unknown sound key: ${key}`);
  return entry;
}

/** url صدا (ممکن است null باشد → synth) */
export function soundUrl(key) {
  return sound(key).url;
}

/** همه‌ی urlهای مدل (برای verify) */
export function allModelUrls() {
  return Object.values(MODEL_ENTRIES)
    .filter((e) => e.url)
    .map((e) => e.url);
}

/** همه‌ی urlهای صدا */
export function allSoundUrls() {
  return Object.values(SOUND_ENTRIES)
    .filter((e) => e.url)
    .map((e) => e.url);
}

/** مدل‌هایی که فایل ندارند (برای بخش ۵ هَندآف) */
export function placeholderModels() {
  return Object.entries(MODEL_ENTRIES)
    .filter(([, e]) => e.placeholder)
    .map(([key, e]) => ({ key, fallback: e.fallback || '', note: e.note || '' }));
}

/** صداهایی که فایل ندارند */
export function placeholderSounds() {
  return Object.entries(SOUND_ENTRIES)
    .filter(([, e]) => e.placeholder)
    .map(([key, e]) => ({ key, synth: e.synth || '', note: e.note || '' }));
}

// ===========================================================================
// PRELOAD GROUPS — چه چیزی اول لود شود، چه چیزی بعد (lazy)
// ===========================================================================
export const PRELOAD_GROUPS = {
  // لازم برای دیدن صحنه در اولین فریم: زمین، جنگل، آتش، کمپ، کاراکترها
  core: [
    'trees.pineOpt',
    'trees.pine',
    'trees.pine2',
    'structures.bonfireOpt',
    'structures.rvOpt',
    'structures.tentOpt',
    'rocks.rocksOpt',
    'undergrowth.logFungus',
    'rocks.logAxeOpt',
    'structures.picnicTable',
    'structures.backpack',
    'structures.guitar',
    'structures.marshmallows',
    'undergrowth.bush',
    'undergrowth.flowers',
    'undergrowth.mushrooms',
    'rocks.rocks2',
  ],
  // بعد از ورود / نزدیک شدن به منطقه
  beach: [
    'beach.port',
    'beach.boat',
    'beach.rowboat',
    'beach.lighthouse',
    'beach.palm',
    'beach.palm2',
    'beach.coconutPalm',
    'beach.clam',
    'beach.seashell',
    'beach.starfish',
    'paths.stonePath',
  ],
  quest: ['quest.parchment', 'structures.postLantern', 'fishing.rod', 'quest.key', 'quest.chest', 'structures.sign'],
  // Phase 4/3 — فعلاً preload نمی‌شوند
  npc: ['npc.grandpa', 'npc.adventurer', 'npc.littlegirl', 'npc.witch', 'npc.cow', 'npc.gnome'],
  animals: ['animals.rabbit', 'animals.deer', 'animals.duck', 'animals.frog', 'animals.owl', 'animals.porcupine', 'animals.goldfish'],
  cooking: ['cooking.pot', 'cooking.cauldron', 'cooking.fryingPan'],
  // Phase 3d — گیاهان قابل چیدن (فقط مدل‌های موجود)
  forage: ['undergrowth.mushrooms', 'undergrowth.edibleMushroom', 'undergrowth.flowers', 'undergrowth.bush'],
  food: ['food.steak', 'food.eggFried', 'food.corn', 'food.potato', 'food.pancakes', 'food.pie', 'food.stew', 'food.sushi', 'food.skewer'],
  comfort: ['comfort.bedroll', 'comfort.hammock', 'comfort.icebox', 'comfort.thermos', 'comfort.mug', 'comfort.stringLights', 'comfort.rug', 'comfort.flag'],
  wearables: ['structures.backpack'],
  // Phase 3f — کاتالوگ دکوراسیون کمپ (فقط مدل‌های موجود)
  decor: [
    'structures.tent',
    'structures.tent2',
    'structures.tent3',
    'structures.lantern',
    'structures.postLantern',
    'structures.picnicTable',
    'structures.picnicTable2',
    'structures.backpack',
    'structures.bonfire',
    'structures.sign',
    'comfort.stringLights',
    'comfort.bedroll',
    'comfort.hammock',
    'comfort.icebox',
    'comfort.thermos',
    'comfort.mug',
    'comfort.rug',
    'comfort.flag',
    'beach.umbrella',
    'undergrowth.flowers',
    'undergrowth.mushrooms',
    'rocks.rocks',
    'rocks.choppedLog',
  ],
};

/** همه‌ی urlهای یک گروه preload */
export function groupUrls(name) {
  const keys = PRELOAD_GROUPS[name] || [];
  return keys.map((k) => modelUrl(k)).filter(Boolean);
}

export { HEAVY_BYTES };
