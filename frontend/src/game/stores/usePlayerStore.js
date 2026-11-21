import { create } from 'zustand';
import { SPAWN, SEAT_SPOTS, TREES, CAMP_RADIUS, WALK_RADIUS } from '../sceneLayout';

// ---------------------------------------------------------------------------
// state های mutable: در هر فریم آپدیت می‌شوند و باعث re-render نمی‌شوند
// ---------------------------------------------------------------------------
const local = {
  x: SPAWN.x,
  z: SPAWN.z,
  rot: 0,
  seat: null, // ایندکس صندلی یا null
  moving: false,
  emote: null, // 'wave' | 'dance' | 'laugh' | 'celebrate' | 'sleep'
  action: null, // 'guitar' | 'marshmallow'
};

// نگاشت بازیکنان ریموت: id → { target, current, rot, seat, emote, action, ... }
export const remoteMap = new Map();

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

// شناسه‌ی یکتای اکشن برای همگام‌سازی صدا/انیمیشن
export const newActionId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const usePlayerStore = create((set, get) => ({
  local,
  seated: false,
  seatIndex: null,
  nearFire: false,
  hovered: null,
  headlights: false,
  campRadius: CAMP_RADIUS,
  walkRadius: WALK_RADIUS,
  remoteIds: [],
  peerCount: 0,
  syncStatus: 'idle',

  // اکشن‌ها و ایموت‌های محلی (برای HUD و انیمیشن)
  action: null, // 'guitar' | 'marshmallow' | null
  actionStartedAt: 0,
  marshmallow: null, // null | 'roasting' | 'ready' | 'burnt'
  emote: null,
  emoteUntil: 0,

  // ورودی مجازی موبایل (بدون re-render)
  virtualInput: { forward: false, backward: false, left: false, right: false, run: false },

  setVirtualInput: (patch) => {
    Object.assign(get().virtualInput, patch);
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

  setSeat: (index) => {
    local.seat = index;
    set({ seated: index !== null, seatIndex: index });
  },

  // نشستن خودکار روی نزدیک‌ترین صندلی خالی (فقط نزدیک آتش)
  sitAuto: () => {
    const state = get();
    if (state.seated) {
      state.setSeat(null);
      return;
    }
    if (!state.nearFire) return;
    const index = state.findFreeSeat(local.x, local.z);
    if (index !== null) state.setSeat(index);
  },

  setNearFire: (near) => {
    if (get().nearFire !== near) set({ nearFire: near });
  },

  setHovered: (key) => {
    if (get().hovered !== key) set({ hovered: key });
  },

  setHeadlights: (on) => set({ headlights: on }),

  setSyncStatus: (status) => set({ syncStatus: status }),

  setPeerCount: (count) => set({ peerCount: count }),

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
  // بازیکنان ریموت
  // -------------------------------------------------------------------------
  upsertRemote: (id, payload) => {
    const existing = remoteMap.get(id);
    if (existing) {
      const usernameChanged = Boolean(payload.username) && payload.username !== existing.username;
      // مقادیر تعریف‌نشده نباید مختصات را خراب کنند (NaN)
      if (Number.isFinite(payload.x)) existing.target.x = payload.x;
      if (Number.isFinite(payload.z)) existing.target.z = payload.z;
      if (Number.isFinite(payload.rot)) existing.targetRot = payload.rot;
      existing.seat = payload.seat ?? existing.seat;
      existing.username = payload.username || existing.username;
      existing.avatarIndex = payload.avatarIndex ?? existing.avatarIndex;
      // پکت‌های موقعیت این فیلدها را ندارند؛ نباید اکشن/ایموت فعال را پاک کنند
      if ('emote' in payload) existing.emote = payload.emote ?? null;
      if ('action' in payload) existing.action = payload.action ?? null;
      existing.lastSeen = performance.now();
      // فقط وقتی نام کاربر تغییر کرد، برچسب بالای سر را دوباره رندر کن
      if (usernameChanged) set({ remoteIds: Array.from(remoteMap.keys()) });
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
      avatarIndex: payload.avatarIndex ?? null,
      emote: payload.emote ?? null,
      emoteUntil: 0,
      action: payload.action ?? null,
      actionUntil: 0,
      lastSeen: performance.now(),
    });

    set({ remoteIds: Array.from(remoteMap.keys()) });
  },

  // فقط اکشن/ایموت را عوض کن (بدون دست‌زدن به موقعیت)
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

  // صندلی خالی: صندلی‌ای که بازیکن ریموت رویش نشسته نباشد
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

  // نزدیک‌ترین درخت برای کالیژن (فاصله‌ی خام تا مرکز تنه)
  nearestTree: (x, z, maxDist) => {
    let hit = null;
    let bestDist = maxDist;
    for (const tree of TREES) {
      const dist = Math.hypot(tree.x - x, tree.z - z);
      if (dist < bestDist) {
        bestDist = dist;
        hit = tree;
      }
    }
    return hit;
  },
}));
