// ---------------------------------------------------------------------------
// juice.js — بازخورد بصری «حس‌و‌حال» (Phase 5 / PART 5)
//
//  • بیرون از React: یک شیء mutable ماژول‌سطح؛ هیچ setState ای در حلقه‌ی فریم.
//  • لرزش دوربین (trauma) با کاهش نمایی — سبک و قابل جمع‌شدن روی چند رویداد.
//  • پانچ دوربین (dolly کوچک به‌سمت جلو) برای برداشت/شکار؛ چون روی FOV دست
//    نمی‌گذارد، با applyFovKick (FOV دویدن) تداخلی ندارد.
// ---------------------------------------------------------------------------
export const juiceState = {
  trauma: 0, // 0..1 شدت لرزش
  punch: 0, // واحد جابه‌جایی موقت به‌سمت جلو
};

const MAX_SHAKE = 0.3; // حداکثر جابه‌جایی لرزش (واحد)
const DECAY = 1.7; // نرخ افت trauma در ثانیه
const PUNCH_DECAY = 9;

/** لرزش کوتاه اضافه می‌کند (amount بین ۰.۱ تا ۱). */
export function kickShake(amount = 0.4) {
  juiceState.trauma = Math.min(1, juiceState.trauma + amount);
}

/** پانچ دوربین به‌سمت جلو (حس ضربه/برداشت). */
export function kickPunch(amount = 0.18) {
  juiceState.punch = Math.max(juiceState.punch, amount);
}

/**
 * در useFrame بعد از camera.lookAt صدا زده می‌شود. بدون alloc سنگین.
 * @param {import('three').Camera} camera
 * @param {number} delta
 * @param {number} t زمان مونوتونیک (برای نویز لرزش)
 */
export function applyJuice(camera, delta, t) {
  const s = juiceState;
  if (s.trauma <= 0 && s.punch <= 0.001) return;

  if (s.punch > 0.001) {
    // حرکت کوچک به‌سمت جلو در جهت نگاه
    camera.translateZ(s.punch);
    s.punch *= Math.max(0, 1 - PUNCH_DECAY * delta);
    if (s.punch < 0.01) s.punch = 0;
  }

  if (s.trauma > 0) {
    const amp = MAX_SHAKE * s.trauma * s.trauma; // مربع → افت نرم
    camera.position.x += Math.sin(t * 61.7) * amp;
    camera.position.y += Math.cos(t * 47.3) * amp * 0.8;
    camera.position.z += Math.sin(t * 53.9) * amp * 0.5;
    s.trauma = Math.max(0, s.trauma - DECAY * delta);
  }
}
