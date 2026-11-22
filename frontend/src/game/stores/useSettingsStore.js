import { create } from 'zustand';

// ---------------------------------------------------------------------------
// تنظیمات گرافیکی/صوتی/کنترل — ذخیره در localStorage
// پیش‌فرض‌ها محافظه‌کارانه‌اند تا روی موبایل هم روان اجرا شود
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'cozy-forest-settings-v1';

export const QUALITY_PRESETS = {
  low: {
    label: 'کم',
    dpr: 1,
    shadows: false,
    shadowMapSize: 1024,
    bloom: false,
    vignette: true,
    particles: 0.35,
    treeDensity: 420,
    grassDensity: 0.3,
    butterflies: 0,
    fireflies: 40,
    envAnimation: false,
  },
  medium: {
    label: 'متوسط',
    dpr: 1.25,
    shadows: true,
    shadowMapSize: 1024,
    bloom: true,
    vignette: true,
    particles: 0.7,
    treeDensity: 620,
    grassDensity: 0.6,
    butterflies: 10,
    fireflies: 70,
    envAnimation: true,
  },
  high: {
    label: 'زیاد',
    dpr: 1.5,
    shadows: true,
    shadowMapSize: 2048,
    bloom: true,
    vignette: true,
    particles: 1,
    treeDensity: 800,
    grassDensity: 1,
    butterflies: 18,
    fireflies: 100,
    envAnimation: true,
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
  if (cores >= 8 && mem >= 8) return 'high';
  if (cores >= 4) return 'medium';
  return 'low';
}

function loadPersisted() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
