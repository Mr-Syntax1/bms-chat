import * as THREE from 'three';
import { PROCEDURAL_FACTORIES } from './synth';
import { SOUND_ENTRIES } from './assetManifest';

// ---------------------------------------------------------------------------
// مدیر صدا: یک AudioListener مشترک + کش بافر + پخش یک‌باره‌ی Positional
// فایل‌های صوتی اختیاری‌اند؛ اگر موجود نباشند نسخه‌ی رویه‌ای (synth) ساخته می‌شود
// ---------------------------------------------------------------------------
const bufferCache = new Map();
const loader = new THREE.AudioLoader();

// ---------------------------------------------------------------------------
// کنترل حجم صدا از پنل تنظیمات (بدون re-render)
// ---------------------------------------------------------------------------
export const volumeGains = { master: 0.9, ambient: 0.75, fire: 0.85, effects: 0.9, voice: 1 };

// گروه هر صدای در حال پخش تا تغییر تنظیمات فوری اثر کند
const channelRegistry = new Map(); // channel → Set<sound>

function registerSound(channel, sound) {
  if (!channel) return;
  let set = channelRegistry.get(channel);
  if (!set) {
    set = new Set();
    channelRegistry.set(channel, set);
  }
  set.add(sound);
}

function unregisterSound(channel, sound) {
  const set = channelRegistry.get(channel);
  if (set) set.delete(sound);
}

export function setVolumeGains(next) {
  Object.assign(volumeGains, next || {});
  // اعمال فوری روی صداهای در حال پخش (همان فرمول applyGain تا پرش صدا رخ ندهد)
  for (const [channel, sounds] of channelRegistry) {
    const gain = (volumeGains[channel] ?? 1) * (volumeGains.master ?? 1);
    for (const sound of sounds) {
      if (!sound?.userData) continue;
      try {
        sound.setVolume((sound.userData.baseVolume ?? 1) * gain);
      } catch {
        /* ignore */
      }
    }
  }
}

function applyGain(sound, channel, baseVolume) {
  const gain = (volumeGains[channel] ?? 1) * (volumeGains.master ?? 1);
  sound.userData.baseVolume = baseVolume;
  sound.setVolume(baseVolume * gain);
  registerSound(channel, sound);
}

// نگاشت url → کلید کارخانه‌ی رویه‌ای (از manifest؛ fallback به نام فایل)
const SYNTH_BY_URL = (() => {
  const map = new Map();
  for (const entry of Object.values(SOUND_ENTRIES)) {
    if (entry.url && entry.synth) map.set(entry.url, entry.synth);
  }
  return map;
})();

// کلید صدا از مسیر فایل: /sounds/fire.mp3 → fire
function proceduralKey(url) {
  const fromManifest = SYNTH_BY_URL.get(url);
  if (fromManifest) return fromManifest;
  const match = /\/sounds\/([a-zA-Z0-9_-]+)\.(mp3|m4a|ogg|wav)$/i.exec(url || '');
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

export function loadBuffer(url, synthKey = null) {
  const cacheKey = url || `synth:${synthKey}`;
  if (bufferCache.has(cacheKey)) return Promise.resolve(bufferCache.get(cacheKey));

  // نسخه‌ی رویه‌ای: کلید از آرگومان یا از manifest/نام فایل
  const fallback = () => {
    const key = synthKey || proceduralKey(url);
    const factory = key ? PROCEDURAL_FACTORIES[key] : null;
    if (!factory || !listener?.context) return null;
    try {
      const buffer = factory(listener.context);
      bufferCache.set(cacheKey, buffer);
      return buffer;
    } catch {
      return null;
    }
  };

  // فایل نداریم → مستقیم synth
  if (!url) {
    return Promise.resolve(fallback());
  }

  return new Promise((resolve) => {
    loader.load(
      url,
      (buffer) => {
        bufferCache.set(cacheKey, buffer);
        resolve(buffer);
      },
      undefined,
      () => {
        // فایل نیست → صدای رویه‌ای (یا null) کش می‌شود تا دوباره تلاش نشود
        const buffer = fallback();
        bufferCache.set(cacheKey, buffer);
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
 * @param {string} url مسیر فایل صدا (null = synth)
 * @param {number[]} position [x,y,z]
 * @param {{volume?:number,channel?:string,refDistance?:number,maxDistance?:number,rolloff?:number,synth?:string}} options
 * @returns {Promise<THREE.PositionalAudio|null>}
 */
export async function playPositionalOneShot(url, position, options = {}) {
  await waitForListener();
  if (!listener || !container) return null;
  const buffer = await loadBuffer(url, options.synth);
  if (!buffer) return null;

  await waitForUnlock();
  if (!listener || !container) return null;

  const opts = { ...DEFAULTS, ...options };
  const sound = buildPositional(buffer, position, opts);
  sound.setLoop(false);
  sound.userData = { channel: opts.channel || 'effects', baseVolume: opts.volume };
  applyGain(sound, sound.userData.channel, opts.volume);
  container.add(sound);

  try {
    sound.play();
  } catch {
    container.remove(sound);
    return null;
  }

  sound.onEnded = () => {
    try {
      unregisterSound(sound.userData.channel, sound);
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
    .then(() => loadBuffer(url, opts.synth))
    .then(async (buffer) => {
      if (disposed || !buffer) return;
      if (!listener || !container) return;
      await waitForUnlock();
      if (disposed || !listener || !container) return;

      sound = buildPositional(buffer, position, opts);
      sound.setLoop(true);
      sound.userData = { channel: opts.channel || 'ambient', baseVolume: opts.volume };
      applyGain(sound, sound.userData.channel, opts.volume);
      container.add(sound);
      try {
        sound.play();
      } catch {
        /* ignore */
      }
    });

  return {
    setVolume: (v) => {
      if (!sound) return;
      sound.userData.baseVolume = v;
      applyGain(sound, sound.userData.channel, v);
    },
    dispose: () => {
      disposed = true;
      if (sound) {
        try {
          unregisterSound(sound.userData?.channel, sound);
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

// صدای غیرمکانی (بدون موقعیت) که مستقیماً روی Listener پخش می‌شود
export function createGlobalLoop(url, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  let sound = null;
  let disposed = false;

  waitForListener()
    .then(() => loadBuffer(url, opts.synth))
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
