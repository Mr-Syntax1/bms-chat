// ---------------------------------------------------------------------------
// dailyChallenges.js — چالش‌های روزانه‌ی کمپ (Phase 4.5)
//
//  • ۲ چالش از استخر ثابت بر اساس تاریخ انتخاب می‌شود (قطعی، بدون تصادف رندر).
//  • پیشرفت در store نگه داشته می‌شود و در localStorage ذخیره می‌شود.
//  • کلیدها: daily-challenge-YYYY-MM-DD (و آینه‌ی daily-YYYY-MM-DD).
// ---------------------------------------------------------------------------

export const DAILY_KEY_PREFIX = 'daily-challenge-';
export const DAILY_MIRROR_PREFIX = 'daily-';

// استخر ۱۴ چالش؛ type همان کلید شمارنده در dailyProgress است
export const DAILY_POOL = [
  { id: 'cook3', type: 'cook', target: 3, description: 'امروز ۳ غذا بپز', reward: { xp: 60 } },
  { id: 'cook1', type: 'cook', target: 1, description: 'یک غذا بپز', reward: { xp: 30 } },
  { id: 'fish5', type: 'fish', target: 5, description: '۵ ماهی صید کن', reward: { xp: 60 } },
  { id: 'fish2', type: 'fish', target: 2, description: '۲ ماهی صید کن', reward: { xp: 40 } },
  { id: 'petRabbit', type: 'pet', target: 1, description: 'یک خرگوش را نوازش کن', reward: { xp: 50 } },
  { id: 'mushroom2', type: 'mushroom', target: 2, description: '۲ قارچ پیدا کن', reward: { xp: 50 } },
  { id: 'talkGrandpa', type: 'talk', extra: 'grandpa', target: 1, description: 'با پدربزرگ ماهیگیر گفتگو کن', reward: { xp: 40 } },
  { id: 'talkCow', type: 'talk', extra: 'cow', target: 1, description: 'با آشپز کمپ گفتگو کن', reward: { xp: 40 } },
  { id: 'talkAdventurer', type: 'talk', extra: 'adventurer', target: 1, description: 'با جنگلبان گفتگو کن', reward: { xp: 40 } },
  { id: 'forage4', type: 'forage', target: 4, description: '۴ گیاه بچین', reward: { xp: 60 } },
  { id: 'forage2', type: 'forage', target: 2, description: '۲ گیاه بچین', reward: { xp: 40 } },
  { id: 'bug3', type: 'bug', target: 3, description: '۳ حشره بگیر', reward: { xp: 60 } },
  { id: 'acorn1', type: 'acorn', target: 1, description: 'یک بلوط طلایی پیدا کن', reward: { xp: 80 } },
  { id: 'firefly5', type: 'firefly', target: 5, description: 'شب ۵ کرم شب‌تاب جمع کن', reward: { xp: 70 } },
];

export const DAILY_BY_ID = Object.fromEntries(DAILY_POOL.map((c) => [c.id, c]));

// تاریخ محلی به شکل YYYY-MM-DD
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function emptyDailyProgress() {
  return { cook: 0, fish: 0, forage: 0, mushroom: 0, pet: 0, bug: 0, acorn: 0, firefly: 0, talk: [] };
}

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ۲ چالش یکتا و قطعی برای هر تاریخ
export function pickDailyChallengeIds(key) {
  const seed = hashString(key);
  const first = seed % DAILY_POOL.length;
  let offset = 1 + ((seed >>> 8) % (DAILY_POOL.length - 1));
  const second = (first + offset) % DAILY_POOL.length;
  return [DAILY_POOL[first].id, DAILY_POOL[second].id];
}

export function createDailyState(key) {
  return {
    date: key,
    challenges: pickDailyChallengeIds(key),
    completed: [],
    progress: emptyDailyProgress(),
  };
}

function sanitizeDaily(raw, key) {
  if (!raw || typeof raw !== 'object' || raw.date !== key) return null;
  const ids = Array.isArray(raw.challenges) ? raw.challenges.filter((id) => DAILY_BY_ID[id]) : [];
  if (ids.length === 0) return null;
  const base = emptyDailyProgress();
  const progress = { ...base, ...(raw.progress || {}) };
  progress.talk = Array.isArray(progress.talk) ? progress.talk.map(String) : [];
  const completed = Array.isArray(raw.completed) ? raw.completed.filter((id) => ids.includes(id)) : [];
  return { date: key, challenges: Array.from(new Set(ids)).slice(0, 2), completed, progress };
}

export function loadDailyState(key = dayKey()) {
  try {
    const raw = localStorage.getItem(DAILY_KEY_PREFIX + key) || localStorage.getItem(DAILY_MIRROR_PREFIX + key);
    const parsed = raw ? JSON.parse(raw) : null;
    return sanitizeDaily(parsed, key) || createDailyState(key);
  } catch {
    return createDailyState(key);
  }
}

export function saveDailyState(state) {
  if (!state?.date) return;
  try {
    const payload = JSON.stringify(state);
    localStorage.setItem(DAILY_KEY_PREFIX + state.date, payload);
    localStorage.setItem(DAILY_MIRROR_PREFIX + state.date, payload);
  } catch {
    /* ignore */
  }
}

// پیشرفت یک چالش از روی شمارنده‌های روز
export function challengeProgress(challenge, progress) {
  if (!challenge) return 0;
  if (challenge.type === 'talk') {
    return Array.isArray(progress?.talk) && progress.talk.includes(challenge.extra) ? 1 : 0;
  }
  return Number(progress?.[challenge.type]) || 0;
}

export function dailyChallengeObjects(ids) {
  return (ids || []).map((id) => DAILY_BY_ID[id]).filter(Boolean);
}
