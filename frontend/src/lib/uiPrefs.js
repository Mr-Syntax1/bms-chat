// src/lib/uiPrefs.js
// ترجیحات محلی کاربر (فقط روی همین مرورگر ذخیره می‌شوند)

const KEY = 'chat.uiPrefs.v1';
const EVENT = 'uiprefs-change';

export const DEFAULT_UI_PREFS = {
  notifications: false, // نوتیفیکیشن مرورگر
  sound: true,          // صدای پیام جدید
  preview: true,        // نمایش متن پیام داخل نوتیفیکیشن
  animatedBackground: true,
  fontScale: 'md',      // sm | md | lg
};

const FONT_SIZES = { sm: '15px', md: '16px', lg: '18px' };

export function loadUiPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    return { ...DEFAULT_UI_PREFS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULT_UI_PREFS };
  }
}

export function applyUiPrefs(prefs = loadUiPrefs()) {
  document.documentElement.style.fontSize = FONT_SIZES[prefs.fontScale] || FONT_SIZES.md;
}

export function saveUiPrefs(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* حالت خصوصی مرورگر */
  }
  applyUiPrefs(next);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
}

export function subscribeUiPrefs(cb) {
  const handler = (e) => cb(e.detail || loadUiPrefs());
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}