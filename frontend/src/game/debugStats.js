// ---------------------------------------------------------------------------
// debugStats.js — شمارنده‌های کارایی (خارج از React، بدون setState در حلقه‌ی فریم)
//
// یک شیء قابل‌تغییر ماژول‌سطح که هر فریم با مقادیر سبک پر می‌شود و پنل دیباگ
// با یک interval آن را می‌خواند. هیچ‌کدام از این مقادیر باعث رندر React نمی‌شود.
// ---------------------------------------------------------------------------
export const perfStats = {
  fps: 0,
  frameMs: 0,
  drawCalls: 0,
  triangles: 0,
  programs: 0,
};

let frames = 0;
let elapsed = 0;
let smoothMs = 16.7;

// از داخل useFrame صدا زده می‌شود (هر فریم) — سبک و بدون alloc.
export function tickPerf(gl, delta) {
  const d = Math.min(delta, 0.5);
  frames += 1;
  elapsed += d;
  smoothMs += (d * 1000 - smoothMs) * 0.1;
  perfStats.frameMs = smoothMs;
  if (elapsed >= 0.5) {
    perfStats.fps = Math.round(frames / elapsed);
    frames = 0;
    elapsed = 0;
    const info = gl?.info?.render;
    if (info) {
      perfStats.drawCalls = info.calls;
      perfStats.triangles = info.triangles;
    }
    perfStats.programs = gl?.info?.programs?.length ?? 0;
  }
}
