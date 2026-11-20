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
