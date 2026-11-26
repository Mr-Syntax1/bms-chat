// ---------------------------------------------------------------------------
// eatData.js — وضعیت خوردن غذا (Phase 3e)
//
//  • بیرون از React: یک آبجکت mutable + صداهای هم‌گام با لقمه‌ها.
//  • انیمیشن از اکشن 'eating' خوانده می‌شود؛ این ماژول فقط زمان‌بندی، صدا و
//    شماره‌ی موج ذرات را نگه می‌دارد (هیچ re-render ای رخ نمی‌دهد).
//  • انتشار اکشن برای ریموت‌ها در PlayerController ثبت می‌شود (roomId آنجاست).
// ---------------------------------------------------------------------------
import { EAT_CRUNCH_SOUND, EAT_GULP_SOUND, YUM_SOUND } from './sounds';
import { playPositionalOneShot } from './audio';

export const EAT_DURATION = 2600;

export const eatWorld = {
  // شماره‌ی موج ذرات خرده‌نان (Character با تغییر آن انفجار می‌سازد)
  crumbBurst: 0,
};

// انتشار اکشن خوردن برای بازیکنان ریموت — PlayerController که roomId/user
// دارد یک‌بار این را ثبت می‌کند (بدون وابستگی این ماژول به شبکه).
let actionPublisher = null;

export function setEatPublisher(fn) {
  actionPublisher = fn;
}

let eatingUntil = 0;

/**
 * شروع خوردن: صداهای لقمه با تأخیر کوتاه تا با حرکت فک هم‌گام باشند
 * (لقمه، لقمه، قورت، «یام»).
 * @param {{x:number,z:number}} at موقعیت بازیکن برای صدای مکانی
 * @returns {boolean} اگر همین حالا در حال خوردن بود false
 */
export function beginEating(at) {
  const now = performance.now();
  if (now < eatingUntil) return false;
  eatingUntil = now + EAT_DURATION;
  eatWorld.crumbBurst += 1;

  const pos = [at?.x ?? 0, 1.2, at?.z ?? 0];
  playPositionalOneShot(EAT_CRUNCH_SOUND, pos, { volume: 0.75, synth: 'eat_crunch' });
  setTimeout(() => {
    playPositionalOneShot(EAT_CRUNCH_SOUND, pos, { volume: 0.6, synth: 'eat_crunch' });
  }, 700);
  setTimeout(() => {
    playPositionalOneShot(EAT_GULP_SOUND, pos, { volume: 0.7, synth: 'eat_gulp' });
  }, 1500);
  setTimeout(() => {
    playPositionalOneShot(YUM_SOUND, pos, { volume: 0.55 });
  }, 2100);

  if (actionPublisher) actionPublisher();
  return true;
}
