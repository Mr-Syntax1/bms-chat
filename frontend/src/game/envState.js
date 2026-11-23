// ---------------------------------------------------------------------------
// envState — وضعیت محیطی مشترک در سطح ماژول
//
// هر فریم در Atmosphere آپدیت می‌شود و سایر کامپوننت‌ها (مه، بلوم، چراغ‌ها)
// می‌توانند بدون re-render آن را بخوانند.
// ---------------------------------------------------------------------------
export const envState = {
  time: 0, // ۰..۱ در طول شبانه‌روز
  phase: 'night', // night | dawn | day | dusk
  daylight: 0, // ۰ = شب کامل، ۱ = روز کامل
  warmth: 0, // ۰..۱ — چقدر نور گرم است (طلوع/غروب)
  ambientIntensity: 0.3,
  fogColor: [0.063, 0.11, 0.19],
  fogNear: 30,
  fogFar: 150,
};

// نقطه‌های کلیدی چرخه (ساعت ۰..۱)
const KEYFRAMES = [
  { t: 0.0, phase: 'night', daylight: 0, warmth: 0.05 },
  { t: 0.2, phase: 'night', daylight: 0, warmth: 0.05 },
  { t: 0.28, phase: 'dawn', daylight: 0.35, warmth: 0.85 },
  { t: 0.36, phase: 'day', daylight: 1, warmth: 0.25 },
  { t: 0.62, phase: 'day', daylight: 1, warmth: 0.25 },
  { t: 0.7, phase: 'dusk', daylight: 0.4, warmth: 0.9 },
  { t: 0.8, phase: 'night', daylight: 0, warmth: 0.1 },
  { t: 1.0, phase: 'night', daylight: 0, warmth: 0.05 },
];

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

export function updateEnvState(time) {
  const t = ((time % 1) + 1) % 1;
  envState.time = t;

  let a = KEYFRAMES[0];
  let b = KEYFRAMES[KEYFRAMES.length - 1];
  for (let i = 0; i < KEYFRAMES.length - 1; i += 1) {
    if (t >= KEYFRAMES[i].t && t <= KEYFRAMES[i + 1].t) {
      a = KEYFRAMES[i];
      b = KEYFRAMES[i + 1];
      break;
    }
  }

  const span = b.t - a.t || 1;
  const k = smooth(Math.min(1, Math.max(0, (t - a.t) / span)));

  envState.daylight = lerp(a.daylight, b.daylight, k);
  envState.warmth = lerp(a.warmth, b.warmth, k);
  envState.phase = k < 0.5 ? a.phase : b.phase;
  envState.ambientIntensity = lerp(0.22, 0.62, envState.daylight);
  envState.fogNear = lerp(26, 46, envState.daylight);
  envState.fogFar = lerp(140, 210, envState.daylight);

  return envState;
}

// رنگ آسمان برای یک فاز — به‌صورت [r,g,b] نرمال‌شده
const SKY = {
  night: { top: [0.09, 0.08, 0.15], bottom: [0.13, 0.2, 0.3] },
  dawn: { top: [0.24, 0.22, 0.36], bottom: [0.72, 0.48, 0.36] },
  day: { top: [0.28, 0.48, 0.72], bottom: [0.62, 0.76, 0.88] },
  dusk: { top: [0.18, 0.16, 0.3], bottom: [0.66, 0.38, 0.3] },
};

export function skyColorsFor(phase) {
  return SKY[phase] || SKY.night;
}

export function isNight() {
  return envState.daylight < 0.3;
}

// اصلاح مه هنگام باران — CozyScene از آن استفاده می‌کند
export function weatherFogFor(weather) {
  if (weather === 'rain') {
    return { nearMul: 0.62, farMul: 0.66, tint: [0.09, 0.13, 0.19] };
  }
  return null;
}
