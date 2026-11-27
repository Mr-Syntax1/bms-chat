// ---------------------------------------------------------------------------
// envState — وضعیت محیطی مشترک در سطح ماژول
//
// بازی همیشه شب است؛ چرخه‌ی روز/شب و مه حذف شده‌اند. این فایل API پایدار
// (isNight / skyColorsFor / updateEnvState) را نگه می‌دارد تا بقیه‌ی کد نشکند،
// ولی همیشه وضعیت «شب» برمی‌گرداند.
// ---------------------------------------------------------------------------
export const envState = {
  time: 0, // همیشه ۰ — شب ثابت
  phase: 'night',
  daylight: 0, // شب کامل
  warmth: 0.08, // مقدار ناچیز برای گرمای آتش
  ambientIntensity: 0.24,
};

// رنگ آسمان شب (بدون تغییر در طول بازی)
const NIGHT_SKY = {
  top: [0.031, 0.043, 0.129],
  bottom: [0.106, 0.078, 0.216],
};

export function updateEnvState() {
  // شب ثابت — هیچ محاسبه‌ای لازم نیست
  return envState;
}

export function skyColorsFor() {
  return NIGHT_SKY;
}

export function isNight() {
  return true;
}
