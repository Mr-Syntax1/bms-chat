// رجیستری آیتم‌های تعاملی مأموریت (بیرون از React برای جلوگیری از re-render)
const items = new Map();

export function registerQuestItem(entry) {
  items.set(entry.key, entry);
  return () => {
    if (items.get(entry.key) === entry) items.delete(entry.key);
  };
}

// نزدیک‌ترین آیتم تعاملی که هنوز قابل استفاده است
// آیتم قفل هم برگردانده می‌شود تا HUD «قفل» نشان دهد
export function findNearbyQuestItem(x, z) {
  let best = null;
  let bestDist = Infinity;
  for (const item of items.values()) {
    if (item.done?.()) continue;
    const dist = Math.hypot(item.x - x, item.z - z);
    const radius = item.radius ?? 3;
    if (dist <= radius && dist < bestDist) {
      bestDist = dist;
      best = item;
    }
  }
  return best;
}

export function clearQuestItems() {
  items.clear();
}
