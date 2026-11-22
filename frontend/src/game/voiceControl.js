// کنترل میکروفن بیرون از درخت React (برای HUD که خارج از LiveKitRoom است)
let controller = null;

export function setVoiceController(fn) {
  controller = fn;
}

export function clearVoiceController(fn) {
  if (controller === fn) controller = null;
}

export async function setMicFromUI(enabled) {
  if (!controller) return false;
  return controller(enabled);
}
