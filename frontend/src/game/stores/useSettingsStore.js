import { create } from 'zustand';

// ---------------------------------------------------------------------------
// تنظیمات گرافیکی/صوتی/کنترل — ذخیره در localStorage
// پیش‌فرض‌ها محافظه‌کارانه‌اند تا روی موبایل هم روان اجرا شود
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'cozy-forest-settings-v2';
const LEGACY_KEYS = ['cozy-forest-settings-v1'];

export const QUALITY_PRESETS = {
  low: {
    label: 'کم',
    dpr: 1,
    shadows: false,
    shadowMapSize: 1024,
    shadowDistance: 40,
    bloom: false,
    vignette: true,
    particles: 0.35,
    treeDensity: 300,
    treeLodDistance: 30,
    grassDensity: 0.3,
    butterflies: 0,
    fireflies: 24,
    envAnimation: false,
    chunkRadius: 2,
    aiRadius: 40,
  },
  medium: {
    label: 'متوسط',
    dpr: 1.25,
    shadows: true,
    shadowMapSize: 1024,
    shadowDistance: 56,
    bloom: true,
    vignette: true,
    particles: 0.7,
    treeDensity: 500,
    treeLodDistance: 42,
    grassDensity: 0.6,
    butterflies: 10,
    fireflies: 42,
    envAnimation: true,
    chunkRadius: 3,
    aiRadius: 60,
  },
  high: {
    label: 'زیاد',
    dpr: 1.5,
    shadows: true,
    shadowMapSize: 2048,
    shadowDistance: 72,
    bloom: true,
    vignette: true,
    particles: 1,
    treeDensity: 800,
    treeLodDistance: 50,
    grassDensity: 1,
    butterflies: 18,
    fireflies: 60,
    envAnimation: true,
    chunkRadius: 4,
    aiRadius: 80,
  },
  ultra: {
    label: 'فوق‌العاده',
    dpr: 2,
    shadows: true,
    shadowMapSize: 4096,
    shadowDistance: 90,
    bloom: true,
    vignette: true,
    particles: 1.25,
    treeDensity: 1000,
    treeLodDistance: 62,
    grassDensity: 1.35,
    butterflies: 26,
    fireflies: 80,
    envAnimation: true,
    chunkRadius: 5,
    aiRadius: 100,
  },
};

const DEFAULT_AUDIO = {
  master: 0.9,
  ambient: 0.75,
  fire: 0.85,
  effects: 0.9,
  voice: 1,
};

const DEFAULT_CONTROLS = {
  lookSensitivity: 1,
  invertY: false,
  autoQuality: false,
};

// پیشنهاد کیفیت بر اساس توان دستگاه
export function suggestQuality() {
  if (typeof navigator === 'undefined') return 'medium';
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (mobile) return cores >= 8 && mem >= 6 ? 'medium' : 'low';
  if (cores >= 12 && mem >= 16) return 'ultra';
  if (cores >= 8 && mem >= 8) return 'high';
  if (cores >= 4) return 'medium';
  return 'low';
}

function loadPersisted() {
  if (typeof localStorage === 'undefined') return null;
  try {
    // v2 اول؛ اگر نبود از کلیدهای قدیمی مهاجرت می‌کنیم و همان‌جا حذف می‌کنیم
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const legacy of LEGACY_KEYS) {
        const old = localStorage.getItem(legacy);
        if (old) {
          raw = old;
          try {
            const migrated = JSON.parse(old);
            if (migrated && typeof migrated === 'object') {
              // فیلدهای منسوخ (مانند weather) در نسخه‌ی ۲ نگه داشته نمی‌شوند
              delete migrated.weather;
              delete migrated.dayNight;
              localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            }
          } catch {
            /* ignore */
          }
          localStorage.removeItem(legacy);
          break;
        }
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

const persisted = loadPersisted();

const initialQuality = QUALITY_PRESETS[persisted?.quality] ? persisted.quality : suggestQuality();

export const useSettingsStore = create((set, get) => ({
  quality: initialQuality,
  audio: { ...DEFAULT_AUDIO, ...(persisted?.audio || {}) },
  controls: { ...DEFAULT_CONTROLS, ...(persisted?.controls || {}) },
  // آفست چرخش دستی هر کاراکتر (برای اصلاح جهت صورت در صورت نیاز)
  facingOverrides: { ...(persisted?.facingOverrides || {}) },
  settingsOpen: false,

  get preset() {
    return QUALITY_PRESETS[get().quality] || QUALITY_PRESETS.medium;
  },

  setQuality: (quality) => {
    if (!QUALITY_PRESETS[quality]) return;
    set({ quality });
    get().persist();
  },

  setAudio: (patch) => {
    set((s) => ({ audio: { ...s.audio, ...patch } }));
    get().persist();
  },

  setControls: (patch) => {
    set((s) => ({ controls: { ...s.controls, ...patch } }));
    get().persist();
  },

  setFacingOverride: (model, offset) => {
    set((s) => ({ facingOverrides: { ...s.facingOverrides, [model]: offset } }));
    get().persist();
  },

  clearFacingOverride: (model) => {
    set((s) => {
      const next = { ...s.facingOverrides };
      delete next[model];
      return { facingOverrides: next };
    });
    get().persist();
  },

  setSettingsOpen: (open) => set({ settingsOpen: Boolean(open) }),

  persist: () => {
    if (typeof localStorage === 'undefined') return;
    try {
      const { quality, audio, controls, facingOverrides } = get();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ quality, audio, controls, facingOverrides })
      );
    } catch {
      /* ignore */
    }
  },
}));

// انتخاب‌گر سبک برای preset فعلی
export const useQualityPreset = () => {
  const quality = useSettingsStore((s) => s.quality);
  return QUALITY_PRESETS[quality] || QUALITY_PRESETS.medium;
};
