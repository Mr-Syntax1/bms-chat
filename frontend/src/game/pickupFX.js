// ---------------------------------------------------------------------------
// pickupFX.js — انفجار ذره‌ای سبک هنگام برداشت (Phase 5 / PART 5)
//
//  • بیرون React: صف ring-buffer ماژول‌سطح؛ هیچ alloc ای در حلقه‌ی فریم.
//  • فقط یک کامپوننت (PickupFX) این صف را می‌خواند و روی چند mesh محدود می‌نویسد.
// ---------------------------------------------------------------------------
const POOL = 6;
const LIFE = 0.75;

export const pickupEvents = {
  // هر اسلات: { active, x, y, z, color, t }
  slots: Array.from({ length: POOL }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    t: 0,
    color: '#ffd98a',
  })),
  seq: 0,
};

let cursor = 0;

/**
 * یک انفجار برداشت در موقعیت مشخص ثبت می‌کند.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {string} [color]
 */
export function emitPickup(x, y, z, color = '#ffd98a') {
  const slot = pickupEvents.slots[cursor];
  cursor = (cursor + 1) % POOL;
  slot.active = true;
  slot.x = x;
  slot.y = y;
  slot.z = z;
  slot.t = 0;
  slot.color = color;
  pickupEvents.seq += 1;
}

/** عمر هر اسلات را جلو می‌برد (در useFrame). */
export function advancePickup(delta) {
  const slots = pickupEvents.slots;
  for (let i = 0; i < slots.length; i += 1) {
    const s = slots[i];
    if (!s.active) continue;
    s.t += delta;
    if (s.t >= LIFE) s.active = false;
  }
}
