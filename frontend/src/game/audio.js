import * as THREE from 'three';
import { PROCEDURAL_FACTORIES } from './synth';

// ---------------------------------------------------------------------------
// مدیر صدا: یک AudioListener مشترک + کش بافر + پخش یک‌باره‌ی Positional
// فایل‌های صوتی اختیاری‌اند؛ اگر موجود نباشند نسخه‌ی رویه‌ای (synth) ساخته می‌شود
// ---------------------------------------------------------------------------
const bufferCache = new Map();
const loader = new THREE.AudioLoader();

// کلید صدا از مسیر فایل: /sounds/fire.mp3 → fire
function proceduralKey(url) {
  const match = /\/sounds\/([a-zA-Z0-9_-]+)\.(mp3|ogg|wav)$/i.exec(url || '');
  return match ? match[1] : null;
}

let listener = null;
let container = null;
let unlockPromise = null;
let unlockHandler = null;

// منتظران آماده شدن AudioListener (افکت‌ها ممکن است قبل از AudioRoot اجرا شوند)
let listenerWaiters = [];

function resolveListenerWaiters() {
  const waiters = listenerWaiters;
  listenerWaiters = [];
  waiters.forEach((resolve) => resolve());
}

export function waitForListener() {
  if (listener) return Promise.resolve();
  return new Promise((resolve) => {
    listenerWaiters.push(resolve);
  });
}

export function ensureAudio(scene, camera) {
  if (listener) return listener;

  listener = new THREE.AudioListener();
  camera.add(listener);

  // ظرف مخفی برای صدای Positional که موقعیتش را دستی ست می‌کنیم
  container = new THREE.Object3D();
  container.name = '__audio_container__';
  scene.add(container);

  unlockHandler = () => {
    if (listener?.context?.state === 'suspended') {
      listener.context.resume().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', unlockHandler);
  window.addEventListener('keydown', unlockHandler);

  resolveListenerWaiters();

  return listener;
}

export function getListener() {
  return listener;
}

export function disposeAudio() {
  if (unlockHandler) {
    window.removeEventListener('pointerdown', unlockHandler);
    window.removeEventListener('keydown', unlockHandler);
    unlockHandler = null;
  }
  if (container) {
    container.traverse((child) => {
      if (child.isPositionalAudio) {
        try {
          if (child.isPlaying) child.stop();
          child.disconnect();
        } catch {
          /* ignore */
        }
      }
    });
    if (container.parent) container.parent.remove(container);
  }
  if (listener) {
    try {
      listener.disconnect();
    } catch {
      /* ignore */
    }
    if (listener.parent) listener.parent.remove(listener);
  }
  container = null;
  listener = null;
  unlockPromise = null;
  // منتظران باقی‌مانده را آزاد کن تا Promiseها معلق نمانند
  resolveListenerWaiters();
  // بافرها به AudioContext قبلی تعلق دارند و باید پاک شوند
  bufferCache.clear();
}

// اجرای AudioContext فقط پس از اولین تعامل کاربر (سیاست مرورگرها)
function waitForUnlock() {
  if (!listener) return Promise.resolve();
  if (listener.context.state === 'running') return Promise.resolve();
  if (unlockPromise) return unlockPromise;

  unlockPromise = new Promise((resolve) => {
    const done = () => {
      window.removeEventListener('pointerdown', done);
      window.removeEventListener('keydown', done);
      listener?.context
        ?.resume()
        .catch(() => {})
        .finally(() => resolve());
    };
    window.addEventListener('pointerdown', done);
    window.addEventListener('keydown', done);
    // اگر تا ۵ ثانیه تعاملی نبود، ادامه بده تا بازی معطل نماند
    setTimeout(resolve, 5000);
  });

  return unlockPromise;
}

export function loadBuffer(url) {
  if (bufferCache.has(url)) return Promise.resolve(bufferCache.get(url));

  // اگر فایل صوتی موجود نبود، نسخه‌ی رویه‌ای می‌سازیم
  const fallback = () => {
    const key = proceduralKey(url);
    const factory = key ? PROCEDURAL_FACTORIES[key] : null;
    if (!factory || !listener?.context) return null;
    try {
      const buffer = factory(listener.context);
      bufferCache.set(url, buffer);
      return buffer;
    } catch {
      return null;
    }
  };

  return new Promise((resolve) => {
    loader.load(
      url,
      (buffer) => {
        bufferCache.set(url, buffer);
        resolve(buffer);
      },
      undefined,
      () => {
        // فایل نیست → صدای رویه‌ای (یا null) کش می‌شود تا دوباره تلاش نشود
        const buffer = fallback();
        bufferCache.set(url, buffer);
        resolve(buffer);
      }
    );
  });
}

const DEFAULTS = {
  volume: 1,
  refDistance: 3.5,
  maxDistance: 55,
  rolloff: 1.6,
};

function buildPositional(buffer, position, options) {
  const sound = new THREE.PositionalAudio(listener);
  sound.setBuffer(buffer);
  sound.setRefDistance(options.refDistance);
  sound.setMaxDistance(options.maxDistance);
  sound.setRolloffFactor(options.rolloff);
  sound.setVolume(options.volume);
  sound.position.set(position[0], position[1], position[2]);
  return sound;
}

/**
 * صدای Positional یک‌باره (مثل گیتار یا yum) در مختصات مشخص
 * @returns {Promise<THREE.PositionalAudio|null>}
 */
export async function playPositionalOneShot(url, position, options = {}) {
  await waitForListener();
  if (!listener || !container) return null;
  const buffer = await loadBuffer(url);
  if (!buffer) return null;

  await waitForUnlock();
  if (!listener || !container) return null;

  const opts = { ...DEFAULTS, ...options };
  const sound = buildPositional(buffer, position, opts);
  sound.setLoop(false);
  container.add(sound);

  try {
    sound.play();
  } catch {
    container.remove(sound);
    return null;
  }

  sound.onEnded = () => {
    try {
      container.remove(sound);
      sound.disconnect();
    } catch {
      /* ignore */
    }
  };

  return sound;
}

/**
 * حلقه‌ی Positional (آتش، جیرجیرک، ...)؛ پخش پس از آنلاک شدن صدا
 * @returns {{ setVolume: (v:number)=>void, dispose: ()=>void, isReady: ()=>boolean }}
 */
export function createPositionalLoop(url, position, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  let sound = null;
  let disposed = false;

  // ابتدا Listener آماده می‌شود تا بافر رویه‌ای به AudioContext درست بچسبد
  waitForListener()
    .then(() => loadBuffer(url))
    .then(async (buffer) => {
      if (disposed || !buffer) return;
      if (!listener || !container) return;
      await waitForUnlock();
      if (disposed || !listener || !container) return;

      sound = buildPositional(buffer, position, opts);
      sound.setLoop(true);
      container.add(sound);
      try {
        sound.play();
      } catch {
        /* ignore */
      }
    });

  return {
    setVolume: (v) => {
      if (sound) sound.setVolume(v);
    },
    dispose: () => {
      disposed = true;
      if (sound) {
        try {
          if (sound.isPlaying) sound.stop();
          sound.disconnect();
          container?.remove(sound);
        } catch {
          /* ignore */
        }
        sound = null;
      }
    },
    isReady: () => Boolean(sound),
  };
}

// صدای غیرمکانی (باد محیطی) که مستقیماً روی Listener پخش می‌شود
export function createGlobalLoop(url, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  let sound = null;
  let disposed = false;

  waitForListener()
    .then(() => loadBuffer(url))
    .then(async (buffer) => {
      if (disposed || !buffer) return;
      if (!listener) return;
      await waitForUnlock();
      if (disposed || !listener) return;

      sound = new THREE.Audio(listener);
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(opts.volume);
      try {
        sound.play();
      } catch {
        /* ignore */
      }
    });

  return {
    setVolume: (v) => {
      if (sound) sound.setVolume(v);
    },
    dispose: () => {
      disposed = true;
      if (sound) {
        try {
          if (sound.isPlaying) sound.stop();
          sound.disconnect();
        } catch {
          /* ignore */
        }
        sound = null;
      }
    },
    isReady: () => Boolean(sound),
  };
}
