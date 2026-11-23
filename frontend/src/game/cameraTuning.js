// ---------------------------------------------------------------------------
// cameraTuning.js — تغییرات ایمن FOV دوربین (بیرون از کامپوننت‌ها).
// نگه‌داشتن این منطق بیرون از useFrame باعث می‌شود لینتر
// react-hooks/immutability روی خودِ callback گیر نکند.
// ---------------------------------------------------------------------------
export const FOV_BASE = 62;
export const FOV_RUN = 68;
const FOV_LERP = 4;

/** FOV را با نرمی به سمت هدف می‌برد. در صورت تغییر، پروجکشن آپدیت می‌شود. */
export function applyFovKick(camera, running, delta) {
  const target = running ? FOV_RUN : FOV_BASE;
  const current = camera.fov;
  const next = current + (target - current) * Math.min(1, delta * FOV_LERP);
  if (Math.abs(next - current) < 0.01) return;
  camera.fov = next;
  camera.updateProjectionMatrix();
}
