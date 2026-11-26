// ---------------------------------------------------------------------------
// decorSync.js — لایه‌ی شبکه/ذخیره‌سازی دکوراسیون (Phase 3f)
//
//  • تنها منبع authority: آیتم را فقط صاحبش می‌تواند جابه‌جا/حذف کند.
//  • localStorage به‌ازای هر roomId + همگام‌سازی از طریق کانال Ably اتاق
//    (player-action با type = place-decor / move-decor / remove-decor / decor-sync).
//  • publisher از بیرون تزریق می‌شود تا این ماژول به useGameSync وابسته نشود
//    (جلوگیری از import حلقه‌ای).
// ---------------------------------------------------------------------------
import { usePlayerStore } from './stores/usePlayerStore';
import {
  DECOR_BY_ID,
  DECOR_LIMIT,
  sanitizeDecorList,
  loadDecor,
  saveDecor,
} from './decorData';

let ctx = { roomId: null, ownerId: null };
let publisher = null;

export function setDecorContext(roomId, userId) {
  ctx = {
    roomId: roomId || null,
    ownerId: userId != null ? String(userId) : null,
  };
}

export function setDecorPublisher(fn) {
  publisher = fn;
}

export function getDecorRoomId() {
  return ctx.roomId;
}

export function getDecorOwnerId() {
  return ctx.ownerId;
}

function persist() {
  if (!ctx.roomId) return;
  saveDecor(ctx.roomId, usePlayerStore.getState().decorations);
}

function publish(type, extra) {
  if (!publisher || !ctx.roomId) return;
  publisher(type, extra);
}

// بارگذاری از localStorage هنگام ورود به کمپ
export function initDecor(roomId) {
  if (!roomId) return;
  usePlayerStore.getState().setDecorations(loadDecor(roomId));
}

// ---------------------------------------------------------------------------
// Actions محلی (با broadcast اختیاری)
// ---------------------------------------------------------------------------
export function placeDecor(entry, { broadcast = true } = {}) {
  if (!entry || !DECOR_BY_ID[entry.id]) return null;
  const clean = sanitizeDecorList([entry])[0];
  if (!clean) return null;
  const store = usePlayerStore.getState();
  if (store.decorations.some((d) => d.uid === clean.uid)) return null;

  const ownerId = ctx.ownerId ?? 'local';
  let own = 0;
  for (const d of store.decorations) {
    if (String(d.ownerId) === String(ownerId)) own += 1;
  }
  if (own >= DECOR_LIMIT) return null;

  clean.ownerId = ownerId;
  store.addDecoration(clean);
  persist();
  if (broadcast) publish('place-decor', { decor: clean });
  return clean;
}

export function moveDecor(uid, patch, { broadcast = true } = {}) {
  if (!uid) return;
  const store = usePlayerStore.getState();
  const entry = store.decorations.find((d) => d.uid === uid);
  if (!entry || String(entry.ownerId) !== String(ctx.ownerId)) return;

  const clean = sanitizeDecorList([{ ...entry, ...patch, uid }])[0];
  if (!clean) return;
  store.updateDecoration(uid, { x: clean.x, z: clean.z, rotation: clean.rotation, scale: clean.scale });
  persist();
  if (broadcast) {
    publish('move-decor', { uid, x: clean.x, z: clean.z, rotation: clean.rotation, scale: clean.scale });
  }
}

export function removeDecor(uid, { broadcast = true } = {}) {
  if (!uid) return;
  const store = usePlayerStore.getState();
  const entry = store.decorations.find((d) => d.uid === uid);
  if (!entry || String(entry.ownerId) !== String(ctx.ownerId)) return;
  store.removeDecoration(uid);
  persist();
  if (broadcast) publish('remove-decor', { uid });
}

// ارسال آیتم‌های خودمان برای تازه‌واردها (حتی لیست خالی تا حذف‌ها هم منتشر شود)
export function syncDecorToPeers() {
  const ownerId = ctx.ownerId;
  if (!ownerId) return;
  const mine = usePlayerStore.getState().decorations.filter((d) => String(d.ownerId) === String(ownerId));
  publish('decor-sync', { decorations: sanitizeDecorList(mine) });
}

// ---------------------------------------------------------------------------
// پیام‌های دریافتی از بازیکنان دیگر (فراخوانی از useGameSync)
// ---------------------------------------------------------------------------
export function applyDecorMessage(data) {
  if (!data || typeof data !== 'object') return;
  const fromId = data.userId != null ? String(data.userId) : null;
  const store = usePlayerStore.getState();

  if (data.type === 'decor-sync') {
    if (!fromId) return;
    const list = sanitizeDecorList(data.decorations).filter((d) => String(d.ownerId) === fromId);
    // آیتم‌های فرستنده با نسخه‌ی او جایگزین می‌شوند تا حذف‌ها هم منتقل شوند
    store.setDecorations(
      usePlayerStore
        .getState()
        .decorations.filter((d) => String(d.ownerId) !== fromId)
        .concat(list)
    );
    persist();
    return;
  }

  if (data.type === 'place-decor') {
    const entry = sanitizeDecorList([data.decor])[0];
    if (!entry) return;
    // فقط خود صاحب آیتم می‌تواند آن را بسازد
    if (fromId && String(entry.ownerId) !== fromId) return;
    store.addDecoration(entry);
    persist();
    return;
  }

  if (data.type === 'move-decor') {
    const uid = typeof data.uid === 'string' ? data.uid : null;
    if (!uid) return;
    const entry = store.decorations.find((d) => d.uid === uid);
    if (!entry) return;
    if (fromId && String(entry.ownerId) !== fromId) return;
    const clean = sanitizeDecorList([{ ...entry, x: data.x, z: data.z, rotation: data.rotation, scale: data.scale, uid }])[0];
    if (!clean) return;
    store.updateDecoration(uid, { x: clean.x, z: clean.z, rotation: clean.rotation, scale: clean.scale });
    persist();
    return;
  }

  if (data.type === 'remove-decor') {
    const uid = typeof data.uid === 'string' ? data.uid : null;
    if (!uid) return;
    const entry = store.decorations.find((d) => d.uid === uid);
    if (!entry) return;
    if (fromId && String(entry.ownerId) !== fromId) return;
    store.removeDecoration(uid);
    persist();
  }
}

export function isDecorEvent(type) {
  return (
    type === 'place-decor' ||
    type === 'move-decor' ||
    type === 'remove-decor' ||
    type === 'decor-sync'
  );
}
