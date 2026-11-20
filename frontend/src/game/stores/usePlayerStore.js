import { create } from 'zustand';
import { SPAWN, SEAT_SPOTS, TREES, CAMP_RADIUS } from '../sceneLayout';

// ---------------------------------------------------------------------------
// state های mutable: در هر فریم آپدیت می‌شوند و باعث re-render نمی‌شوند
// ---------------------------------------------------------------------------
const local = {
  x: SPAWN.x,
  z: SPAWN.z,
  rot: 0,
  seat: null, // ایندکس صندلی یا null
  moving: false,
};

// نگاشت بازیکنان ریموت: id → { target, current, rot, seat, username, avatarIndex }
export const remoteMap = new Map();

// لیسنرهای Spatial Audio (فاز LiveKit): مختصات همه‌ی بازیکنان
const spatialListeners = new Set();

export function subscribeSpatial(callback) {
  spatialListeners.add(callback);
  return () => spatialListeners.delete(callback);
}

export function getSpatialSnapshot() {
  const players = [{ id: 'local', x: local.x, z: local.z, seated: local.seat !== null }];
  for (const [id, entry] of remoteMap) {
    players.push({ id, x: entry.current.x, z: entry.current.z, seated: entry.seat !== null });
  }
  return players;
}

export function emitSpatialFrame() {
  if (spatialListeners.size === 0) return;
  const snapshot = getSpatialSnapshot();
  for (const listener of spatialListeners) listener(snapshot);
}

// ---------------------------------------------------------------------------
// Store واکنشی (فقط برای چیزهایی که UI/رندر به آن نیاز دارد)
// ---------------------------------------------------------------------------
export const usePlayerStore = create((set, get) => ({
  local,
  seated: false,
  seatIndex: null,
  nearFire: false,
  hovered: null, // 'campfire' | 'van' | null
  headlights: false,
  campRadius: CAMP_RADIUS,
  remoteIds: [],
  peerCount: 0,
  syncStatus: 'idle',

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
    // باید نزدیک آتش باشیم تا نشستن مجاز باشد
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

  // افزودن/آپدیت بازیکن ریموت؛ فقط برای id جدید set صدا زده می‌شود
  upsertRemote: (id, payload) => {
    const existing = remoteMap.get(id);
    if (existing) {
      existing.target.x = payload.x;
      existing.target.z = payload.z;
      existing.targetRot = payload.rot;
      existing.seat = payload.seat;
      existing.username = payload.username || existing.username;
      existing.avatarIndex = payload.avatarIndex ?? existing.avatarIndex;
      existing.lastSeen = performance.now();
      return;
    }

    remoteMap.set(id, {
      id,
      target: { x: payload.x, z: payload.z },
      current: { x: payload.x, z: payload.z },
      targetRot: payload.rot,
      rot: payload.rot,
      seat: payload.seat ?? null,
      username: payload.username || 'مهمان',
      avatarIndex: payload.avatarIndex ?? null,
      lastSeen: performance.now(),
    });

    set({ remoteIds: Array.from(remoteMap.keys()) });
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

  // نزدیک‌ترین درخت برای کالیژن
  nearestTree: (x, z, maxDist) => {
    let hit = null;
    let bestDist = maxDist;
    for (const tree of TREES) {
      const dist = Math.hypot(tree.x - x, tree.z - z) - tree.scale * 0.45;
      if (dist < bestDist) {
        bestDist = dist;
        hit = tree;
      }
    }
    return hit;
  },
}));
