import './models/setupDraco';
import { useGLTF } from '@react-three/drei';
import { CHARACTER_IDS, DEFAULT_CHARACTER, characterUrl } from './models/characterConfig';
import { loadPreferredCharacter } from './models/wardrobeConfig';
import { groupUrls, PRELOAD_GROUPS } from './assetManifest';

// ---------------------------------------------------------------------------
// پیشبارگذاری مدلها — از گروههای assetManifest.
// core در ورود لود میشود؛ بقیه گروهها با preloadGroup در زمان ورود به منطقه.
// فقط کاراکتر انتخابشده (localStorage) پیشبارگذاری میشود، نه همه ۷ مدل.
// ---------------------------------------------------------------------------
const coreUrls = groupUrls('core');

let started = false;

/** بارگذاری مدلهای ضروری (core + کاراکتر انتخابشده). */
export function preloadAllModels() {
  if (started) return;
  started = true;

  const saved = loadPreferredCharacter();
  const selected = CHARACTER_IDS.includes(saved) ? saved : DEFAULT_CHARACTER;
  useGLTF.preload(characterUrl(selected));

  coreUrls.forEach((url) => useGLTF.preload(url));
}

/** warm کردن گروه کمکاربرد هنگام ورود به منطقه. */
export function preloadGroup(name) {
  if (!PRELOAD_GROUPS[name]) return;
  groupUrls(name).forEach((url) => useGLTF.preload(url));
}

/** فقط کاراکتر انتخابشده — وقتی لازم است سریع آماده شود */
export function preloadCharacter(model) {
  useGLTF.preload(characterUrl(model));
}
