// ---------------------------------------------------------------------------
// persistence.js — ذخیره‌سازی محلی پیشرفت NPC/دوستی/بلوط‌ها (Phase 4.5)
//
//  • کلیدها: npc-progress-{userId} و acorns-{userId}
//  • ذخیره هنگام تغییر (saveProgressFromState) + autosave ماژول‌سطح هر ۳۰ ثانیه.
//  • هیچ داده‌ای به بک‌اند فرستاده نمی‌شود؛ localStorage کافی است.
// ---------------------------------------------------------------------------
import { usePlayerStore } from './stores/usePlayerStore';

export const npcProgressKeyFor = (userId) => `npc-progress-${userId}`;
export const acornsKeyFor = (userId) => `acorns-${userId}`;

const AUTOSAVE_MS = 30000;
const ACTION_SAVE_THROTTLE = 1500;
let autosaveTimer = null;
let currentUserId = null;
let unsubscribeStore = null;
let lastActionSave = 0;

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadProgress(userId) {
  if (!userId) return null;
  const npcRaw = safeParse(localStorage.getItem(npcProgressKeyFor(userId)));
  const acornsRaw = safeParse(localStorage.getItem(acornsKeyFor(userId)));
  const npc = npcRaw && typeof npcRaw === 'object' ? npcRaw : {};
  return {
    friendship: npc.friendship && typeof npc.friendship === 'object' ? npc.friendship : {},
    completedQuests: Array.isArray(npc.completedQuests) ? npc.completedQuests.map(String) : [],
    npcXp: npc.npcXp && typeof npc.npcXp === 'object' ? npc.npcXp : {},
    unlockedItems: npc.unlockedItems && typeof npc.unlockedItems === 'object' ? npc.unlockedItems : null,
    nightFireflies: Number(npc.nightFireflies) || 0,
    acorns: Array.isArray(acornsRaw) ? acornsRaw.filter((n) => Number.isInteger(n)) : [],
  };
}

export function saveProgressFromState(userId) {
  if (!userId) return;
  const state = usePlayerStore.getState();
  const friendship = {};
  const npcXp = {};
  for (const [npcId, inter] of Object.entries(state.npcInteractions || {})) {
    friendship[npcId] = state.friendshipLevels?.[npcId] || 1;
    npcXp[npcId] = inter?.xp || 0;
  }
  const completedQuests = Object.entries(state.npcInteractions || {})
    .filter(([, inter]) => inter?.completed)
    .map(([npcId]) => npcId);
  try {
    localStorage.setItem(
      npcProgressKeyFor(userId),
      JSON.stringify({
        friendship,
        completedQuests,
        npcXp,
        unlockedItems: state.unlockedItems || null,
        nightFireflies: state.nightFireflies || 0,
      })
    );
    localStorage.setItem(acornsKeyFor(userId), JSON.stringify(state.goldenAcorns || []));
  } catch {
    /* ignore */
  }
}

// شروع autosave ماژول‌سطح (بدون وابستگی به چرخه‌ی رندر)
export function startProgressAutosave(userId) {
  currentUserId = userId || null;
  if (autosaveTimer) return;
  autosaveTimer = setInterval(() => {
    if (currentUserId) saveProgressFromState(currentUserId);
  }, AUTOSAVE_MS);
  // ذخیره‌ی فوری هنگام اکشن‌های مهم (throttle ۱.۵ ثانیه‌ای تا نوشتن پشت‌سرهم نباشد)
  unsubscribeStore = usePlayerStore.subscribe((state, prev) => {
    if (!currentUserId) return;
    const changed =
      state.npcInteractions !== prev.npcInteractions ||
      state.goldenAcorns !== prev.goldenAcorns ||
      state.nightFireflies !== prev.nightFireflies;
    if (!changed) return;
    const now = Date.now();
    if (now - lastActionSave < ACTION_SAVE_THROTTLE) return;
    lastActionSave = now;
    saveProgressFromState(currentUserId);
  });
}

export function stopProgressAutosave() {
  if (autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = null;
  if (unsubscribeStore) unsubscribeStore();
  unsubscribeStore = null;
  currentUserId = null;
}
