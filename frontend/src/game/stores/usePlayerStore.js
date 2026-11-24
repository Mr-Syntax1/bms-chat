import { create } from 'zustand';
import { SPAWN, SEAT_SPOTS, CAMP_RADIUS, BOUNDS } from '../sceneLayout';
import { DEFAULT_CHARACTER } from '../models/characterConfig';
import { DEFAULT_WARDROBE, normalizeWardrobe } from '../models/wardrobeConfig';
import { findNearbyRestSpot } from '../interactionRegistry';

// ---------------------------------------------------------------------------
// state های mutable: در هر فریم آپدیت می‌شوند و باعث re-render نمی‌شوند
// ---------------------------------------------------------------------------
const local = {
  x: SPAWN.x,
  y: 0,
  z: SPAWN.z,
  rot: 0,
  seat: null,
  rest: null,
  moving: false,
  emote: null,
  action: null,
};

// نگاشت بازیکنان ریموت: id → { target, current, rot, seat, emote, action, character, ... }
export const remoteMap = new Map();

// حباب چت بالای سر: کلید (نام کاربر) → { text, until } — بیرون از React
export const chatBubbleMap = new Map();
export const CHAT_BUBBLE_MS = 5000;

export function showChatBubble(key, text, ms = CHAT_BUBBLE_MS) {
  if (!key || !text) return;
  chatBubbleMap.set(key, { text: String(text).slice(0, 160), until: Date.now() + ms });
}

// پرچم‌های UI که دوربین/ورودی باید ببینند (بدون re-render)
export const uiFlags = { emoteWheelOpen: false };

// حس زنده‌بودن کمپ: ضریب گروه (۱ = عادی، ۱.۵ = شلوغ) — بیرون React برای فریم‌لوپ
export const campMood = { crowdFactor: 0, fireBoost: 1 };
export function setCampCrowd(peerCount) {
  const crowded = peerCount >= 3;
  campMood.crowdFactor = crowded ? 1 : 0;
  campMood.fireBoost = crowded ? 1.3 : 1;
}

// لیسنرهای Spatial Audio (LiveKit): مختصات همه‌ی بازیکنان
const spatialListeners = new Set();

export function subscribeSpatial(callback) {
  spatialListeners.add(callback);
  return () => spatialListeners.delete(callback);
}

export function getSpatialSnapshot() {
  const players = [
    {
      id: 'local',
      x: local.x,
      y: local.y,
      z: local.z,
      seated: local.seat !== null,
      emote: local.emote,
      action: local.action,
    },
  ];
  for (const [id, entry] of remoteMap) {
    players.push({
      id,
      x: entry.current.x,
      y: 0,
      z: entry.current.z,
      seated: entry.seat !== null,
      emote: entry.emote,
      action: entry.action,
    });
  }
  return players;
}

export function emitSpatialFrame() {
  if (spatialListeners.size === 0) return;
  const snapshot = getSpatialSnapshot();
  for (const listener of spatialListeners) listener(snapshot);
}

export const newActionId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// پیشرفت کل مأموریت (برای «پرش شادی» کاراکتر) — جمع مراحل انجام‌شده
export function totalQuestProgress(quests) {
  if (!quests) return 0;
  return (
    (quests.parchments || 0) +
    (quests.lanterns || 0) +
    (quests.shells || 0) +
    (quests.signsRead || 0) +
    (quests.hasKey ? 1 : 0) +
    (quests.chestOpened ? 1 : 0)
  );
}

// ---------------------------------------------------------------------------
// وضعیت اولیه‌ی مأموریت‌ها
// ---------------------------------------------------------------------------
const initialQuests = {
  parchments: 0, // ۰..۳
  lanterns: 0, // ۰..۵
  hasKey: false,
  chestOpened: false,
  shells: 0, // ۰..۱۰
  signsRead: 0,
};

let toastSeq = 0;

export const usePlayerStore = create((set, get) => ({
  local,
  seated: false,
  seatIndex: null,
  rest: null,
  nearFire: false,
  hovered: null,
  headlights: false,
  campRadius: CAMP_RADIUS,
  bounds: BOUNDS,
  remoteIds: [],
  peerCount: 0,
  syncStatus: 'idle',

  // کاراکتر اختصاص‌یافته از بک‌اند
  character: DEFAULT_CHARACTER,
  characterUrl: null,
  characterLoading: false,
  characterError: null,

  // کمد لباس محلی (کلاه/عینک/پیراهن/اکسسوری) — از localStorage بازیابی می‌شود
  wardrobe: { ...DEFAULT_WARDROBE },

  // اکشن‌ها و ایموت‌های محلی
  action: null,
  actionStartedAt: 0,
  marshmallow: null,
  emote: null,
  emoteUntil: 0,

  // میکروفن
  micEnabled: true,
  // وضعیت واقعی LiveKit (جدا از وضعیت سینک Ably)
  voiceReady: false,
  // توکن LiveKit گرفته شده؟ (مستقل از اتصال به اتاق — برای پیشرفت لودینگ)
  voiceTokenReady: false,
  voiceError: null,
  // شناسه کاربر جاری + فهرست کسانی که واقعاً در حال صحبت‌اند (LiveKit)
  selfId: null,
  speakingIds: [],

  // مأموریت‌ها و اینونتوری
  quests: { ...initialQuests },
  collected: { parchments: [], lanterns: [], shells: [] },
  toasts: [],
  nearInteractable: null, // { key, label }
  // لاگ کوچک چت گوشه‌ی صفحه (آخرین ۳ پیام)
  chatLog: [],
  // فاصله‌ی بازیکن تا هدف مرحله‌ی فعال (متر، گردشده) — برای راهنمای مسیر
  questDistance: null,
  // دیباگ جهت کاراکتر (Ctrl+Shift+F) — null یعنی خاموش
  facingDebug: null,
  // ورودی مجازی موبایل
  virtualInput: { forward: false, backward: false, left: false, right: false, run: false },

  setVirtualInput: (patch) => {
    Object.assign(get().virtualInput, patch);
  },

  setCharacter: (character, url) => set({ character, characterUrl: url, characterLoading: false }),
  setCharacterLoading: (loading) => set({ characterLoading: loading }),
  setCharacterError: (error) => set({ characterError: error, characterLoading: false }),

  // کمد: کل شیء wardrobe در store؛ ذخیره‌سازی localStorage در لایه‌ی UI انجام می‌شود
  setWardrobe: (wardrobe) => set({ wardrobe: normalizeWardrobe(wardrobe) }),

  setMicEnabled: (on) => set({ micEnabled: on }),
  setVoiceReady: (ready) => set({ voiceReady: Boolean(ready) }),
  setVoiceTokenReady: (ready) => set({ voiceTokenReady: Boolean(ready) }),
  setVoiceError: (error) => set({ voiceError: error, voiceReady: false, voiceTokenReady: false }),
  setSelfId: (id) => set({ selfId: id != null ? String(id) : null }),
  setSpeaking: (ids) => {
    const next = Array.isArray(ids) ? ids.map(String) : [];
    const current = get().speakingIds;
    // مقایسه‌ی مجموعه‌ای تا set بی‌مورد (و re-render) رخ ندهد
    if (current.length === next.length && current.every((id, i) => id === next[i])) return;
    set({ speakingIds: next });
  },

  setLocalTransform: (x, z, rot, moving) => {
    local.x = x;
    local.z = z;
    local.rot = rot;
    local.moving = moving;
  },

  teleport: (x, z) => {
    local.x = x;
    local.z = z;
  },

  setSeat: (index, rest = 'sit') => {
    local.seat = index;
    local.rest = index !== null ? rest : null;
    set({ seated: index !== null, seatIndex: index, rest: index !== null ? rest : null });
  },

  sitAuto: () => {
    const state = get();
    if (state.seated) {
      state.setSeat(null);
      return;
    }
    // اول نزدیک‌ترین نقطه‌ی استراحت ثبت‌شده (هاموک/کیسه‌خواب/کنده/میز)
    const taken = new Set();
    for (const entry of remoteMap.values()) {
      if (entry.seat !== null && entry.seat !== undefined) taken.add(entry.seat);
    }
    const restSpot = findNearbyRestSpot(local.x, local.z, taken);
    if (restSpot) {
      state.setSeat(restSpot.seatIndex, restSpot.rest || 'sit');
      return;
    }
    if (!state.nearFire) return;
    const index = state.findFreeSeat(local.x, local.z);
    if (index !== null) state.setSeat(index, SEAT_SPOTS[index]?.rest || 'sit');
  },

  setNearFire: (near) => {
    if (get().nearFire !== near) set({ nearFire: near });
  },

  setHovered: (key) => {
    if (get().hovered !== key) set({ hovered: key });
  },

  setNearInteractable: (value) => {
    const current = get().nearInteractable;
    // مقایسه‌ی key و locked تا تغییر وضعیت قفل هم در HUD منعکس شود
    if (current?.key === value?.key && Boolean(current?.locked) === Boolean(value?.locked)) return;
    set({ nearInteractable: value });
  },

  // فقط وقتی مقدار گردشده عوض شود set می‌شود تا re-render بی‌مورد نباشد
  setQuestDistance: (distance) => {
    if (get().questDistance === distance) return;
    set({ questDistance: distance });
  },

  setHeadlights: (on) => set({ headlights: on }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setPeerCount: (count) => {
    setCampCrowd(count);
    set({ peerCount: count });
  },
  setFacingDebug: (value) => set({ facingDebug: value }),

  // -------------------------------------------------------------------------
  // Toast
  // -------------------------------------------------------------------------
  pushToast: (text, kind = 'info') => {
    toastSeq += 1;
    const id = toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4200);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // آخرین ۳ پیام برای لاگ گوشه (بدون تکرار)
  pushChatLog: (entry) => {
    if (!entry?.text) return;
    set((s) => {
      if (s.chatLog.some((m) => m.id === entry.id)) return s;
      return { chatLog: [...s.chatLog, entry].slice(-3) };
    });
  },

  // -------------------------------------------------------------------------
  // اکشن‌های تعاملی
  // -------------------------------------------------------------------------
  startAction: (type) => {
    local.action = type;
    set({ action: type, actionStartedAt: Date.now() });
  },

  endAction: () => {
    local.action = null;
    set({ action: null, actionStartedAt: 0, marshmallow: null });
  },

  setMarshmallow: (stage) => set({ marshmallow: stage }),

  startEmote: (emote, duration = 3200) => {
    local.emote = emote;
    set({ emote, emoteUntil: Date.now() + duration });
  },

  endEmote: () => {
    local.emote = null;
    set({ emote: null, emoteUntil: 0 });
  },

  // -------------------------------------------------------------------------
  // مأموریت‌ها
  // -------------------------------------------------------------------------
  addParchment: (index) => {
    const { quests, collected } = get();
    if (collected.parchments.includes(index)) return false;
    const parchments = [...collected.parchments, index];
    const count = parchments.length;
    set({
      collected: { ...collected, parchments },
      quests: { ...quests, parchments: count },
    });
    if (count >= 3) {
      get().pushToast('نقشه کامل شد! حالا فانوس‌ها را پیدا کن!', 'success');
    } else {
      get().pushToast(`تکه نقشه ${count}/3 پیدا شد`, 'success');
    }
    return true;
  },

  lightLantern: (index) => {
    const { quests, collected } = get();
    if (collected.lanterns.includes(index)) return false;
    // ترتیب اجباری: اول باید هر ۳ تکه نقشه پیدا شود
    if (quests.parchments < 3) {
      get().pushToast('اول باید ۳ تکه نقشه را پیدا کنی!', 'warn');
      return false;
    }
    const lanterns = [...collected.lanterns, index];
    const count = lanterns.length;
    set({
      collected: { ...collected, lanterns },
      quests: { ...quests, lanterns: count },
    });
    if (count >= 5) {
      get().pushToast('مسیر به سمت ساحل باز شد!', 'success');
    } else {
      get().pushToast(`فانوس روشن شد: ${count}/5`, 'success');
    }
    return true;
  },

  giveKey: () => {
    const { quests } = get();
    if (quests.hasKey) return false;
    // ترتیب اجباری: بعد از روشن شدن ۵ فانوس
    if (quests.lanterns < 5) {
      get().pushToast('اول باید ۵ فانوس را روشن کنی!', 'warn');
      return false;
    }
    set({ quests: { ...quests, hasKey: true } });
    get().pushToast('کلید زنگ‌زده از آب بیرون آمد!', 'success');
    return true;
  },

  openChest: () => {
    const { quests } = get();
    if (quests.chestOpened) return false;
    if (!quests.hasKey) {
      get().pushToast('صندوقچه قفل است. کلید را پیدا کن!', 'warn');
      return false;
    }
    set({ quests: { ...quests, chestOpened: true } });
    get().pushToast('گنج دزدان دریایی پیدا شد! کاپیتان پامپکین خوشحال است 🎃', 'success');
    return true;
  },
  collectShell: (index) => {
    const { quests, collected } = get();
    if (collected.shells.includes(index)) return false;
    const shells = [...collected.shells, index];
    const count = shells.length;
    set({ collected: { ...collected, shells }, quests: { ...quests, shells: count } });
    get().pushToast(`صدف/ستاره: ${count}/10`, 'info');
    return true;
  },

  readSign: (index) => {
    const { quests } = get();
    if (get().collected.signs?.includes(index)) return false;
    const signs = [...(get().collected.signs || []), index];
    set({
      collected: { ...get().collected, signs },
      quests: { ...quests, signsRead: signs.length },
    });
    return true;
  },

  // -------------------------------------------------------------------------
  // بازیکنان ریموت
  // -------------------------------------------------------------------------
  upsertRemote: (id, payload) => {
    const existing = remoteMap.get(id);
    if (existing) {
      const usernameChanged = Boolean(payload.username) && payload.username !== existing.username;
      const characterChanged = Boolean(payload.character) && payload.character !== existing.character;
      if (Number.isFinite(payload.x)) existing.target.x = payload.x;
      if (Number.isFinite(payload.z)) existing.target.z = payload.z;
      if (Number.isFinite(payload.rot)) existing.targetRot = payload.rot;
      // اگر seat در payload باشد حتماً اعمال می‌شود (null = بلند شدن از صندلی)
      if ('seat' in payload) existing.seat = payload.seat ?? null;
      existing.username = payload.username || existing.username;
      if (payload.character) existing.character = payload.character;
      if ('emote' in payload) existing.emote = payload.emote ?? null;
      if ('action' in payload) existing.action = payload.action ?? null;
      if ('marshmallowStage' in payload) existing.marshmallowStage = payload.marshmallowStage ?? null;
      if (payload.wardrobe) existing.wardrobe = payload.wardrobe;
      existing.lastSeen = performance.now();
      if (usernameChanged || characterChanged) set({ remoteIds: Array.from(remoteMap.keys()) });
      return;
    }

    const startX = Number.isFinite(payload.x) ? payload.x : 0;
    const startZ = Number.isFinite(payload.z) ? payload.z : 0;
    const startRot = Number.isFinite(payload.rot) ? payload.rot : 0;

    remoteMap.set(id, {
      id,
      target: { x: startX, z: startZ },
      current: { x: startX, z: startZ },
      targetRot: startRot,
      rot: startRot,
      seat: payload.seat ?? null,
      username: payload.username || 'مهمان',
      character: payload.character || DEFAULT_CHARACTER,
      emote: payload.emote ?? null,
      emoteUntil: 0,
      action: payload.action ?? null,
      actionUntil: 0,
      marshmallowStage: payload.marshmallowStage ?? null,
      wardrobe: payload.wardrobe ?? null,
      lastSeen: performance.now(),
    });

    set({ remoteIds: Array.from(remoteMap.keys()) });
  },

  patchRemote: (id, patch) => {
    const entry = remoteMap.get(id);
    if (!entry) return;
    Object.assign(entry, patch);
    entry.lastSeen = performance.now();
  },

  removeRemote: (id) => {
    if (!remoteMap.has(id)) return;
    remoteMap.delete(id);
    set({ remoteIds: Array.from(remoteMap.keys()) });
  },

  clearRemotes: () => {
    if (remoteMap.size === 0) return;
    remoteMap.clear();
    set({ remoteIds: [] });
  },

  findFreeSeat: (fromX, fromZ) => {
    const taken = new Set();
    for (const entry of remoteMap.values()) {
      if (entry.seat !== null) taken.add(entry.seat);
    }
    let best = null;
    let bestDist = Infinity;
    SEAT_SPOTS.forEach((spot, index) => {
      if (taken.has(index)) return;
      const dist = Math.hypot(spot.x - fromX, spot.z - fromZ);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    return best;
  },
}));
