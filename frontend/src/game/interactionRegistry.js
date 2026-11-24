// رجیستری اشیای قابل تعامل؛ نگه‌داشتن این لیست بیرون از React از re-render جلوگیری می‌کند
const objects = new Map();

export function registerInteractable(key, object3D) {
  if (!object3D) return () => {};
  object3D.userData.interactableKey = key;
  objects.set(key, object3D);
  return () => {
    if (objects.get(key) === object3D) {
      delete object3D.userData.interactableKey;
      objects.delete(key);
    }
  };
}

export function getInteractables() {
  return Array.from(objects.values());
}

// پیدا کردن کلید شیء از روی آبجکت برخورد کرده (با پیمایش والدها)
export function resolveInteractableKey(object) {
  let node = object;
  while (node) {
    if (node.userData?.interactableKey) return node.userData.interactableKey;
    node = node.parent;
  }
  return null;
}

export function clearInteractables() {
  objects.clear();
}

// ---------------------------------------------------------------------------
// نقاط استراحت (هاموک، کیسه‌خواب، کنده، میز پیک‌نیک) — از سیستم نشستن موجود
// استفاده می‌کنند: seatIndex همان ایندکس در SEAT_SPOTS است.
// ---------------------------------------------------------------------------
const restSpots = new Map();

export function registerRestSpot(spot) {
  restSpots.set(spot.key, spot);
  return () => {
    if (restSpots.get(spot.key) === spot) restSpots.delete(spot.key);
  };
}

export function getRestSpots() {
  return Array.from(restSpots.values());
}

// نزدیک‌ترین نقطه‌ی استراحت آزاد (seatهای اشغال‌شده رد می‌شوند)
export function findNearbyRestSpot(x, z, taken) {
  let best = null;
  let bestDist = Infinity;
  for (const spot of restSpots.values()) {
    if (taken && taken.has(spot.seatIndex)) continue;
    const dist = Math.hypot(spot.x - x, spot.z - z);
    if (dist <= (spot.radius ?? 1.5) && dist < bestDist) {
      bestDist = dist;
      best = spot;
    }
  }
  return best;
}

export function clearRestSpots() {
  restSpots.clear();
}
