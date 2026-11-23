import './models/setupDraco';
import { useGLTF } from '@react-three/drei';
import { CHARACTER_FILES, characterUrl } from './models/characterConfig';
import { groupUrls, PRELOAD_GROUPS } from './assetManifest';

// ---------------------------------------------------------------------------
// پیش‌بارگذاری مدل‌ها — از گروه‌های assetManifest.
// core در ورود لود می‌شود؛ beach/quest به‌صورت lazy بعد از ورود warm می‌شوند.
// هیچ کد جدیدی مسیر خام ننویسد؛ کلید گروه یا کلید manifest.
// ---------------------------------------------------------------------------
const coreUrls = groupUrls('core');
const beachUrls = groupUrls('beach');
const questUrls = groupUrls('quest');

let started = false;

/**
 * بارگذاری مدل‌های ضروری (core + beach + quest).
 * بار اول اجرا می‌شود؛ فراخوانی دوباره (StrictMode) بی‌اثر است.
 */
export function preloadAllModels() {
  if (started) return;
  started = true;

  // کاراکترها (۹ مدل) — برای دیدن خود و بازیکنان دیگر لازم‌اند
  CHARACTER_FILES.forEach((file) => useGLTF.preload(characterUrl(file)));

  [...coreUrls, ...beachUrls, ...questUrls].forEach((url) => {
    useGLTF.preload(url);
  });
}

/**
 * warm کردن گروه‌های سنگین/کم‌کاربرد بعد از ورود (idle).
 * فعلاً برای NPC/حیوانات/پخت/غذا/آسایش؛ در فازهای بعدی استفاده می‌شود.
 */
export function preloadGroup(name) {
  if (!PRELOAD_GROUPS[name]) return;
  groupUrls(name).forEach((url) => useGLTF.preload(url));
}

/** فقط کاراکتر انتخاب‌شده — وقتی لازم است سریع آماده شود */
export function preloadCharacter(model) {
  useGLTF.preload(characterUrl(model));
}
