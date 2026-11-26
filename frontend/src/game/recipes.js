// ---------------------------------------------------------------------------
// recipes.js — سیستم پخت داده‌محور + وضعیت زنده‌ی مینی‌گیم
//
//  • RECIPES/RECIPE ها داده‌اند؛ افزودن دستور جدید = یک آیتم در آرایه.
//  • cooking یک شیء module-level است (بیرون React) تا per-frame re-render نشود.
//  • گوش‌دادن فقط روی رویدادهای گسسته (start/result/reset/flip/stir) است.
// ---------------------------------------------------------------------------

// ثابت‌های مینی‌گیم: کل زمان بار = cookTime × COOK_TAIL (دنباله‌ی سوختن)
export const COOK_TAIL = 1.6;
const RAW_END_U = 0.6;
const PERFECT_START_U = 0.88;
const PERFECT_END_U = 1.12;
const BURNT_START_U = 1.45;
export const STIRS_FOR_PERFECT = 3;

export const QUALITY = {
  raw: { label: 'خام', color: '#4ade80', note: 'هنوز نپخته؛ ارزش غذایی ندارد.' },
  ok: { label: 'معمولی', color: '#a3e635', note: 'خوراکی است، اما بهترین طعم نیست.' },
  perfect: { label: 'عالی', color: '#ffc66d', note: 'کاملاً جا افتاده و خوش‌طعم!' },
  burnt: { label: 'سوخته', color: '#ef4444', note: 'زغال شده؛ خوردنش ضرر دارد.' },
};

// نوار پیشرفت: خام(سبز) → معمولی → عالی(طلایی) → سوخته(سرخ)
export const BAR_ZONES = [
  { from: 0, to: RAW_END_U / COOK_TAIL, color: '#4ade80' },
  { from: RAW_END_U / COOK_TAIL, to: PERFECT_START_U / COOK_TAIL, color: '#a3e635' },
  { from: PERFECT_START_U / COOK_TAIL, to: PERFECT_END_U / COOK_TAIL, color: '#ffc66d' },
  { from: PERFECT_END_U / COOK_TAIL, to: BURNT_START_U / COOK_TAIL, color: '#fb923c' },
  { from: BURNT_START_U / COOK_TAIL, to: 1, color: '#ef4444' },
];

export function zoneColorAt(progress) {
  for (let i = BAR_ZONES.length - 1; i >= 0; i -= 1) {
    if (progress >= BAR_ZONES[i].from) return BAR_ZONES[i].color;
  }
  return BAR_ZONES[0].color;
}

// ---------------------------------------------------------------------------
// ایستگاه‌ها — pos نقطه‌ی تعامل، origin محل رندر (گریل روی آتش موجود است)
// ---------------------------------------------------------------------------
export const STATIONS = {
  grill: {
    id: 'grill',
    label: 'گریل کنار آتش',
    // در شکاف بین دو کنده (کنده‌ها روی شعاع ۴.۱)، نزدیک لبه‌ی گودال
    pos: { x: 3.2, z: 0 },
    radius: 1.4,
    rotation: -1.45,
    action: 'cooking-stir',
  },
  pot: {
    id: 'pot',
    label: 'دیگ آویزان',
    pos: { x: -5.4, z: -5.2 },
    radius: 2.0,
    rotation: 0.4,
    action: 'cooking-stir',
  },
  cauldron: {
    id: 'cauldron',
    label: 'دیگ بزرگ',
    pos: { x: -1.2, z: -7.2 },
    radius: 2.0,
    rotation: -0.3,
    action: 'cooking-stir',
  },
  pan: {
    id: 'pan',
    label: 'ماهیتابه',
    pos: { x: -8.0, z: 2.8 },
    radius: 2.0,
    rotation: 0.9,
    action: 'cooking-flip',
  },
};

// ---------------------------------------------------------------------------
// مواد اولیه (کلید = شناسه در اینونتوری)
// ---------------------------------------------------------------------------
export const INGREDIENTS = {
  raw_meat: { name: 'گوشت خام', icon: 'meat' },
  egg: { name: 'تخم‌مرغ', icon: 'egg' },
  potato: { name: 'سیب‌زمینی', icon: 'potato' },
  carrot: { name: 'هویج', icon: 'carrot' },
  corn: { name: 'ذرت', icon: 'corn' },
  flour: { name: 'آرد', icon: 'wheat' },
  milk: { name: 'شیر', icon: 'milk' },
  mushroom: { name: 'قارچ', icon: 'mushroom' },
  // گیاهان چیده‌شده (Phase 3d)
  laetiporus: { name: 'قارچ مرغ جنگل', icon: 'mushroom' },
  berries: { name: 'توت جنگلی', icon: 'berry' },
  herb: { name: 'گیاه معطر', icon: 'herb' },
  pinecone: { name: 'میوه کاج', icon: 'pinecone' },
  flower: { name: 'گل وحشی', icon: 'flower' },
};

const tiers = (perfectHunger, okHunger) => ({
  burnt: { label: QUALITY.burnt.label, note: QUALITY.burnt.note, hunger: 0 },
  ok: { label: QUALITY.ok.label, note: QUALITY.ok.note, hunger: okHunger },
  perfect: { label: QUALITY.perfect.label, note: QUALITY.perfect.note, hunger: perfectHunger },
});

// ---------------------------------------------------------------------------
// دستورهای پخت (۵ مورد برای اثبات سیستم؛ افزودن بیشتر فقط داده است)
// ---------------------------------------------------------------------------
export const RECIPES = [
  {
    id: 'steak',
    name: 'استیک',
    icon: 'meat',
    station: 'grill',
    ingredients: ['raw_meat'],
    cookTime: 4,
    requiresFlip: false,
    requiresStir: false,
    modelKey: 'food.steak',
    qualityTiers: tiers(35, 20),
  },
  {
    id: 'fried-egg',
    name: 'تخم‌مرغ سرخ‌شده',
    icon: 'egg',
    station: 'pan',
    ingredients: ['egg'],
    cookTime: 3,
    requiresFlip: true,
    requiresStir: false,
    modelKey: 'food.eggFried',
    qualityTiers: tiers(12, 8),
  },
  {
    id: 'grilled-corn',
    name: 'ذرت کبابی',
    icon: 'corn',
    station: 'grill',
    ingredients: ['corn'],
    cookTime: 3.5,
    requiresFlip: false,
    requiresStir: false,
    modelKey: 'food.corn',
    qualityTiers: tiers(15, 9),
  },
  {
    id: 'stew',
    name: 'خورش کمپ',
    icon: 'pot',
    station: 'cauldron',
    ingredients: ['potato', 'carrot', 'raw_meat'],
    cookTime: 6,
    requiresFlip: false,
    requiresStir: true,
    modelKey: 'food.stew',
    qualityTiers: tiers(45, 28),
  },
  {
    id: 'pancakes',
    name: 'پنکیک',
    icon: 'pancakes',
    station: 'pan',
    ingredients: ['flour', 'egg', 'milk'],
    cookTime: 4,
    requiresFlip: true,
    requiresStir: false,
    modelKey: 'food.pancakes',
    qualityTiers: tiers(30, 18),
  },
  {
    id: 'mushroom-stew',
    name: 'خورش قارچ',
    icon: 'pot',
    station: 'cauldron',
    ingredients: ['mushroom', 'herb', 'laetiporus'],
    cookTime: 6.5,
    requiresFlip: false,
    requiresStir: true,
    modelKey: 'food.stew',
    qualityTiers: tiers(50, 30),
  },
  {
    id: 'berry-pie',
    name: 'پای توت',
    icon: 'pie',
    station: 'pan',
    ingredients: ['berries', 'pinecone', 'flour'],
    cookTime: 5,
    requiresFlip: true,
    requiresStir: false,
    modelKey: 'food.pie',
    qualityTiers: tiers(38, 22),
  },
  {
    id: 'grilled-mushroom',
    name: 'قارچ کبابی',
    icon: 'mushroom',
    station: 'grill',
    ingredients: ['mushroom', 'laetiporus'],
    cookTime: 3.5,
    requiresFlip: false,
    requiresStir: false,
    modelKey: 'food.skewer',
    qualityTiers: tiers(22, 13),
  },
  {
    id: 'flower-tea',
    name: 'دمنوش گل',
    icon: 'mug',
    station: 'pot',
    ingredients: ['flower', 'herb'],
    cookTime: 4,
    requiresFlip: false,
    requiresStir: true,
    modelKey: 'food.plate',
    qualityTiers: tiers(18, 11),
  },
];

const keyOf = (ids) => [...ids].sort().join('+');

// دستور منطبق با ایستگاه + مواد انتخاب‌شده (ترتیب مواد مهم نیست)
export function matchRecipe(stationId, ids) {
  if (!stationId || !Array.isArray(ids) || ids.length === 0) return null;
  const target = keyOf(ids);
  return RECIPES.find((r) => r.station === stationId && keyOf(r.ingredients) === target) || null;
}

export function recipesForStation(stationId) {
  return RECIPES.filter((r) => r.station === stationId);
}

// ---------------------------------------------------------------------------
// وضعیت زنده‌ی پخت — بیرون React
// ---------------------------------------------------------------------------
export const cooking = {
  active: false,
  phase: 'idle', // idle | cooking | result
  stationId: null,
  recipe: null,
  elapsed: 0,
  duration: 0,
  progress: 0,
  quality: null,
  flipped: 0,
  stirred: 0,
  result: null,
};

const listeners = new Set();

export function subscribeCooking(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emit(type) {
  for (const cb of listeners) cb(type);
}

function qualityFor(recipe, elapsed, flipped, stirred) {
  const u = recipe.cookTime > 0 ? elapsed / recipe.cookTime : 0;
  let quality = 'ok';
  if (u < RAW_END_U) quality = 'raw';
  else if (u > BURNT_START_U) quality = 'burnt';
  else if (u >= PERFECT_START_U && u <= PERFECT_END_U) quality = 'perfect';

  if (recipe.requiresFlip && flipped < 1 && quality !== 'burnt') quality = 'raw';
  if (recipe.requiresStir && stirred < STIRS_FOR_PERFECT && quality === 'perfect') quality = 'ok';
  return quality;
}

export function startCook(stationId, recipe) {
  if (!recipe) return false;
  cooking.active = true;
  cooking.phase = 'cooking';
  cooking.stationId = stationId;
  cooking.recipe = recipe;
  cooking.elapsed = 0;
  cooking.progress = 0;
  cooking.quality = null;
  cooking.flipped = 0;
  cooking.stirred = 0;
  cooking.duration = recipe.cookTime * COOK_TAIL;
  emit('start');
  return true;
}

// هر فریم از UI صدا زده می‌شود؛ اگر بار پر شد، خودکار «سوخته» برمی‌گردد
export function tickCook(dt) {
  if (!cooking.active || cooking.phase !== 'cooking') return null;
  cooking.elapsed += dt;
  cooking.progress = Math.min(1, cooking.elapsed / cooking.duration);
  if (cooking.progress >= 1) return finishCook();
  return null;
}

export function finishCook() {
  if (!cooking.active || cooking.phase !== 'cooking' || !cooking.recipe) return null;
  const recipe = cooking.recipe;
  const quality = qualityFor(recipe, cooking.elapsed, cooking.flipped, cooking.stirred);
  const tier = recipe.qualityTiers[quality] || QUALITY[quality];
  cooking.phase = 'result';
  cooking.quality = quality;
  cooking.progress = Math.min(1, cooking.elapsed / cooking.duration);

  const result = {
    stationId: cooking.stationId,
    recipe,
    quality,
    tier,
    dish: {
      uid: `${recipe.id}-${Date.now().toString(36)}`,
      id: recipe.id,
      name: recipe.name,
      icon: recipe.icon,
      modelKey: recipe.modelKey,
      quality,
      qualityLabel: tier?.label || QUALITY[quality].label,
      hunger: tier?.hunger ?? 0,
      cookedAt: Date.now(),
    },
  };
  cooking.result = result.dish;
  emit('result');
  return result;
}

export function flipCook() {
  if (cooking.phase !== 'cooking' || !cooking.recipe?.requiresFlip) return false;
  if (cooking.flipped >= 1) return false;
  cooking.flipped += 1;
  emit('flip');
  return true;
}

export function stirCook() {
  if (cooking.phase !== 'cooking' || !cooking.recipe?.requiresStir) return false;
  if (cooking.stirred >= STIRS_FOR_PERFECT) return false;
  cooking.stirred += 1;
  emit('stir');
  return true;
}

export function resetCook() {
  cooking.active = false;
  cooking.phase = 'idle';
  cooking.stationId = null;
  cooking.recipe = null;
  cooking.elapsed = 0;
  cooking.duration = 0;
  cooking.progress = 0;
  cooking.quality = null;
  cooking.flipped = 0;
  cooking.stirred = 0;
  cooking.result = null;
  emit('reset');
}
