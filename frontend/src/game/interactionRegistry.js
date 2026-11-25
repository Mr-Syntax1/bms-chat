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

// ---------------------------------------------------------------------------
// ایستگاه‌های پخت (گریل/دیگ آویزان/دیگ بزرگ/ماهیتابه) — نزدیکی E
// ---------------------------------------------------------------------------
const cookingStations = new Map();

export function registerCookingStation(spot) {
  cookingStations.set(spot.key, spot);
  return () => {
    if (cookingStations.get(spot.key) === spot) cookingStations.delete(spot.key);
  };
}

export function findNearbyCookingStation(x, z) {
  let best = null;
  let bestDist = Infinity;
  for (const spot of cookingStations.values()) {
    const dist = Math.hypot(spot.x - x, spot.z - z);
    if (dist <= (spot.radius ?? 2) && dist < bestDist) {
      bestDist = dist;
      best = spot;
    }
  }
  return best;
}

export function clearCookingStations() {
  cookingStations.clear();
}

// ---------------------------------------------------------------------------
// نقاط ماهیگیری (رودخانه/اسکله) — نزدیکی E → شروع مینی‌گیم ماهیگیری
// ---------------------------------------------------------------------------
const fishingSpots = new Map();

export function registerFishingSpot(spot) {
  fishingSpots.set(spot.key, spot);
  return () => {
    if (fishingSpots.get(spot.key) === spot) fishingSpots.delete(spot.key);
  };
}

export function findNearbyFishingSpot(x, z) {
  let best = null;
  let bestDist = Infinity;
  for (const spot of fishingSpots.values()) {
    const dist = Math.hypot(spot.x - x, spot.z - z);
    if (dist <= (spot.radius ?? 2.6) && dist < bestDist) {
      bestDist = dist;
      best = spot;
    }
  }
  return best;
}

export function clearFishingSpots() {
  fishingSpots.clear();
}
