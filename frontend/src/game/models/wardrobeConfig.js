// ---------------------------------------------------------------------------
// کاتالوگ لباس/کلاه/عینک + ذخیره‌سازی محلی + رنگ‌کردن تنه
// همه رویه‌ای (primitive) هستند؛ افزودن GLB بعداً = یک ورودی جدید + فایل.
// ---------------------------------------------------------------------------
import * as THREE from 'three';

export const PREFERRED_CHARACTER_KEY = 'preferred-character';
export const wardrobeKeyFor = (userId) => `wardrobe-${userId}`;

// نام نمایشی کاراکترها برای انتخابگر پیش‌بازی و کمد (کلید = نام فایل مدل)
export const CHARACTER_LABELS = {
  'Cactoro.glb': 'کاکتوس',
  'Citizen.glb': 'شهروند',
  'CoolBannanaGuy.glb': 'موز باحال',
  'CubeGuyCharacter.glb': 'آدم مکعبی',
  'CuteCharacter.glb': 'کوچولوی بامزه',
  'CuteRedDino.glb': 'داینوی قرمز',
  'DORAEMON.glb': 'دورامون',
  'miku.glb': 'میکو',
  'MushroomCharacter.glb': 'قارچ‌کوچولو',
};

export const DEFAULT_WARDROBE = {
  hat: 'none',
  face: 'none',
  shirt: { color: null, pattern: 'solid' },
  accessory: 'none',
};

export const HAT_ITEMS = [
  { id: 'none', label: 'بدون کلاه', icon: 'ban', slot: 'hat' },
  { id: 'party', label: 'کلاه جشن', icon: 'party', slot: 'hat' },
  { id: 'wizard', label: 'کلاه جادوگر', icon: 'crown', slot: 'hat', unlock: { key: 'parchments', count: 3 }, hint: 'هر ۳ تکه نقشه یا کوئست جادوگر' },
  { id: 'chef', label: 'کلاه آشپز', icon: 'hat', slot: 'hat' },
  { id: 'beanie', label: 'کلاه بافت', icon: 'hat', slot: 'hat' },
  { id: 'straw', label: 'کلاه حصیری', icon: 'hat', slot: 'hat', unlock: { key: 'npcGrandpa' }, hint: 'کوئست پدربزرگ ماهیگیر' },
  { id: 'baseball', label: 'کلاه نقاب‌دار', icon: 'hat', slot: 'hat' },
  { id: 'flowerCrown', label: 'تاج گل', icon: 'crown', slot: 'hat', unlock: { key: 'chestOpened' }, hint: 'باز کردن صندوقچه' },
  { id: 'catEars', label: 'گوش گربه', icon: 'cat', slot: 'hat', unlock: { key: 'shells', count: 5 }, hint: '۵ صدف یا ستاره یا کوئست دخترک' },
];

export const FACE_ITEMS = [
  { id: 'none', label: 'بدون عینک', icon: 'ban', slot: 'face' },
  { id: 'round', label: 'عینک گرد', icon: 'glassesRound', slot: 'face' },
  { id: 'sun', label: 'عینک آفتابی', icon: 'sunglasses', slot: 'face', unlock: { key: 'lanterns', count: 5 }, hint: '۵ فانوس روشن' },
];

export const SHIRT_COLORS = ['#8ab4f8', '#f28b82', '#fdd663', '#81c995', '#c58af9', '#78d9ec'];
export const SHIRT_PATTERNS = [
  { id: 'solid', label: 'ساده' },
  { id: 'stripes', label: 'راه‌راه' },
  { id: 'dots', label: 'خال‌خال' },
];

export const ACCESSORY_ITEMS = [
  { id: 'none', label: 'بدون اکسسوری', icon: 'ban', slot: 'accessory' },
  { id: 'backpack', label: 'کوله‌پشتی', icon: 'backpack', slot: 'accessory' },
  { id: 'scarf', label: 'شال گردن', icon: 'scarf', slot: 'accessory', unlock: { key: 'hasKey' }, hint: 'پیدا کردن کلید' },
];

export function isUnlocked(item, quests, unlockedItems) {
  if (!item) return false;
  // آیتم‌های بازشده با کوئست NPC (Phase 4) بدون شرط quests آزادند
  if (!item.unlock) return true;
  const q = quests || {};
  const unlocked = unlockedItems || {};
  const slot = item.slot || null;
  if (slot && Array.isArray(unlocked[slot]) && unlocked[slot].includes(item.id)) return true;
  if (item.unlock.key === 'chestOpened') return Boolean(q.chestOpened);
  if (item.unlock.key === 'hasKey') return Boolean(q.hasKey);
  return (Number(q[item.unlock.key]) || 0) >= (item.unlock.count || 1);
}

export function normalizeWardrobe(input) {
  const w = input && typeof input === 'object' ? input : {};
  const shirt = w.shirt && typeof w.shirt === 'object' ? w.shirt : {};
  return {
    hat: HAT_ITEMS.some((i) => i.id === w.hat) ? w.hat : 'none',
    face: FACE_ITEMS.some((i) => i.id === w.face) ? w.face : 'none',
    accessory: ACCESSORY_ITEMS.some((i) => i.id === w.accessory) ? w.accessory : 'none',
    shirt: {
      color: /^#[0-9a-f]{6}$/i.test(shirt.color || '') ? shirt.color : DEFAULT_WARDROBE.shirt.color,
      pattern: SHIRT_PATTERNS.some((p) => p.id === shirt.pattern) ? shirt.pattern : 'solid',
    },
  };
}

export function loadWardrobe(userId) {
  try {
    const raw = localStorage.getItem(wardrobeKeyFor(userId));
    return normalizeWardrobe(raw ? JSON.parse(raw) : DEFAULT_WARDROBE);
  } catch {
    return { ...DEFAULT_WARDROBE };
  }
}

export function saveWardrobe(userId, wardrobe) {
  try {
    localStorage.setItem(wardrobeKeyFor(userId), JSON.stringify(normalizeWardrobe(wardrobe)));
  } catch {
    /* ignore */
  }
}

export function loadPreferredCharacter() {
  try {
    return localStorage.getItem(PREFERRED_CHARACTER_KEY);
  } catch {
    return null;
  }
}

export function savePreferredCharacter(file) {
  try {
    localStorage.setItem(PREFERRED_CHARACTER_KEY, file);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// بافت پارچه (بدون تصویر، فقط canvas)
// ---------------------------------------------------------------------------
const textureCache = new Map();

function shirtTexture(pattern) {
  if (textureCache.has(pattern)) return textureCache.get(pattern);
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  if (pattern === 'stripes') {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 0; y < size; y += 12) ctx.fillRect(0, y, size, 6);
  } else if (pattern === 'dots') {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 6; y < size; y += 16) {
      for (let x = 6; x < size; x += 16) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  textureCache.set(pattern, tex);
  return tex;
}

/**
 * رنگ/بافت پیراهن روی مش‌های تنه (بین ۳۰٪ و ۸۲٪ ارتفاع مدل).
 * متریال اصلی در userData نگه داشته می‌شود تا برداشتن پیراهن دقیقاً برگردد.
 */
export function applyShirtTint(clone, config, shirt) {
  if (!clone || !config) return;
  const colorHex = shirt?.color || null;
  const pattern = shirt?.pattern || 'solid';
  const height = config.height || 1;
  const minY = config.minY || 0;
  const box = new THREE.Box3();

  clone.traverse((child) => {
    if (!child.isMesh) return;
    if (!child.userData.__wardrobeMat) child.userData.__wardrobeMat = child.material;
    const orig = child.userData.__wardrobeMat;

    if (!colorHex) {
      if (child.material !== orig) child.material = orig;
      return;
    }

    box.setFromObject(child);
    const centerY = (box.min.y + box.max.y) / 2;
    const t = (centerY - minY) / height;
    if (t < 0.3 || t > 0.82) {
      if (child.material !== orig) child.material = orig;
      return;
    }

    const mats = Array.isArray(orig) ? orig : [orig];
    const tint = new THREE.Color(colorHex);
    const next = mats.map((m) => {
      if (!m || !m.color) return m;
      const c = m.clone();
      c.color = m.color.clone().lerp(tint, 0.68);
      if (pattern !== 'solid') {
        c.map = shirtTexture(pattern);
        c.color.set('#ffffff');
        c.color.lerp(tint, 0.5);
      }
      c.needsUpdate = true;
      return c;
    });
    child.material = Array.isArray(orig) ? next : next[0];
  });
}
