import { QUEST_SPOTS } from './sceneLayout';

// منبع واحد حقیقت برای مراحل مأموریت؛ هم دفترچه و هم HUD از همین استفاده می‌کنند
// تا متن‌ها هرگز از هم جدا نشوند.
export const QUEST_STEPS = [
  {
    key: 'parchments',
    icon: 'map',
    title: 'تکه‌های نقشه',
    desc: 'سه تکه نقشه را در جنگل پیدا کن.',
    max: 3,
  },
  {
    key: 'lanterns',
    icon: 'lantern',
    title: 'روشن کردن فانوس‌ها',
    desc: 'مسیر ساحل را با فانوس‌ها روشن کن.',
    max: 5,
  },
  {
    key: 'key',
    icon: 'rod',
    title: 'ماهیگیری کلید',
    desc: 'از انتهای اسکله کلید زنگ‌زده را صید کن.',
    max: 1,
  },
  {
    key: 'chest',
    icon: 'key',
    title: 'صندوقچه‌ی گنج',
    desc: 'صندوقچه‌ی کنار فانوس دریایی را باز کن.',
    max: 1,
  },
];

export function questValue(quests, key) {
  if (key === 'key') return quests.hasKey ? 1 : 0;
  if (key === 'chest') return quests.chestOpened ? 1 : 0;
  return quests[key] ?? 0;
}

// آیا مرحله قفل است؟ (ترتیب اجباری مأموریت)
export function isQuestStepLocked(quests, key) {
  if (key === 'lanterns') return quests.parchments < 3;
  if (key === 'key') return quests.lanterns < 5;
  if (key === 'chest') return !quests.hasKey;
  return false;
}

/**
 * مرحله‌ی فعال (اولین مرحله‌ی ناتمام).
 * اگر همه تمام شده باشند، مرحله‌ی آخر با done=true برمی‌گردد.
 */
export function getActiveQuestStep(quests) {
  for (let i = 0; i < QUEST_STEPS.length; i += 1) {
    const step = QUEST_STEPS[i];
    const value = questValue(quests, step.key);
    if (value < step.max) {
      return {
        step,
        index: i,
        value,
        max: step.max,
        done: false,
        locked: isQuestStepLocked(quests, step.key),
      };
    }
  }
  const last = QUEST_STEPS[QUEST_STEPS.length - 1];
  return {
    step: last,
    index: QUEST_STEPS.length - 1,
    value: last.max,
    max: last.max,
    done: true,
    locked: false,
  };
}

/**
 * مختصات هدف مرحله‌ی فعال (اولین آیتم جمع‌نشده‌ی همان مرحله).
 * فقط از داده‌ی واقعی استور و چیدمان صحنه ساخته می‌شود.
 */
export function getQuestTarget(quests, collected) {
  const active = getActiveQuestStep(quests);
  if (active.done) return null;

  switch (active.step.key) {
    case 'parchments': {
      const index = QUEST_SPOTS.parchments.findIndex(
        (_, i) => !(collected.parchments || []).includes(i)
      );
      const spot = QUEST_SPOTS.parchments[index];
      return spot ? { label: 'تکه نقشه', x: spot.x, z: spot.z } : null;
    }
    case 'lanterns': {
      const index = QUEST_SPOTS.lanterns.findIndex(
        (_, i) => !(collected.lanterns || []).includes(i)
      );
      const spot = QUEST_SPOTS.lanterns[index];
      return spot ? { label: 'فانوس بعدی', x: spot.x, z: spot.z } : null;
    }
    case 'key':
      return {
        label: 'اسکله‌ی ماهیگیری',
        x: QUEST_SPOTS.fishingRod.x,
        z: QUEST_SPOTS.fishingRod.z,
      };
    case 'chest':
      return { label: 'صندوقچه‌ی گنج', x: QUEST_SPOTS.chest.x, z: QUEST_SPOTS.chest.z };
    default:
      return null;
  }
}

/** متن کوتاه مرحله‌ی فعال برای HUD — همیشه هم‌راستا با دفترچه */
export function describeQuestStep(active) {
  if (!active) return '';
  const { step, value, max, done } = active;
  if (done) return 'گنج پیدا شد! داستان کامل شد';
  if (max === 1) return step.desc;
  return `${step.title}: ${value}/${max}`;
}

// ---------------------------------------------------------------------------
// مأموریت‌های NPC (Phase 4) — منبع واحد حقیقت برای دفترچه، نشانگر و دیالوگ.
// value(state) شمارنده‌ی زنده از استور است؛ max آستانه‌ی تکمیل.
// reward: { kind: 'hat'|'recipe'|'decor', id, label } + friendshipXp
// ---------------------------------------------------------------------------
export const NPC_QUESTS = {
  grandpa: {
    id: 'grandpa',
    npcId: 'grandpa',
    type: 'catch',
    title: 'سه ماهی برای پدربزرگ',
    desc: 'سه ماهی سالم صید کن (آشغال حساب نمی‌شود).',
    icon: 'rod',
    max: 3,
    value: (s) => (s.fishCaught || []).filter((f) => !f.junk).length,
    reward: { kind: 'hat', id: 'straw', label: 'کلاه ماهیگیری' },
    friendshipXp: 45,
  },
  cow: {
    id: 'cow',
    npcId: 'cow',
    type: 'deliver',
    title: 'سبد آشپز',
    desc: 'سه توت و یک قارچ به آشپز برسان.',
    icon: 'berry',
    max: 4,
    value: (s) =>
      Math.min(s.ingredients?.berries || 0, 3) + Math.min(s.ingredients?.mushroom || 0, 1),
    consume: { berries: 3, mushroom: 1 },
    reward: { kind: 'recipe', id: 'cow-quest', label: 'دستور پخت کیک توت و قارچ' },
    friendshipXp: 40,
  },
  adventurer: {
    id: 'adventurer',
    npcId: 'adventurer',
    type: 'find',
    title: 'افسانه‌ی صندوقچه',
    desc: 'زنجیره‌ی نقشه → فانوس → کلید → صندوقچه را کامل کن.',
    icon: 'map',
    max: 1,
    value: (s) => (s.quests?.chestOpened ? 1 : 0),
    reward: { kind: 'decor', id: 'adventurer-quest', label: 'سنگ بلوط طلایی' },
    friendshipXp: 50,
  },
  littlegirl: {
    id: 'littlegirl',
    npcId: 'littlegirl',
    type: 'catch',
    title: 'سه نوع حشره',
    desc: 'سه نوع مختلف حشره بگیر (پروانه/سوسک/کرم شب‌تاب).',
    icon: 'butterfly',
    max: 3,
    value: (s) => new Set((s.bugsCaught || []).map((b) => b.id)).size,
    reward: { kind: 'hat', id: 'catEars', label: 'کلاه گوش‌گربه‌ی حشره‌شناس' },
    friendshipXp: 40,
  },
  witch: {
    id: 'witch',
    npcId: 'witch',
    type: 'collect',
    title: 'ده کرم شب‌تاب',
    desc: 'در شب ده کرم شب‌تاب جمع کن.',
    icon: 'firefly',
    max: 10,
    value: (s) => s.nightFireflies || 0,
    reward: { kind: 'hat', id: 'wizard', label: 'کلاه مهتاب' },
    friendshipXp: 55,
  },
  gnome: {
    id: 'gnome',
    npcId: 'gnome',
    type: 'find',
    title: 'بلوط‌های طلایی',
    desc: 'سه بلوط طلایی پنهان را پیدا کن.',
    icon: 'acorn',
    max: 3,
    value: (s) => (s.goldenAcorns || []).length,
    reward: { kind: 'decor', id: 'gnome-quest', label: 'سنگ گنوم جنگل' },
    friendshipXp: 60,
  },
};

export const NPC_QUEST_LIST = Object.values(NPC_QUESTS);

export function npcQuestValue(npcId, state) {
  const quest = NPC_QUESTS[npcId];
  if (!quest) return 0;
  try {
    return Number(quest.value(state)) || 0;
  } catch {
    return 0;
  }
}

// offer = قابل پذیرش | active = در جریان | turnin = آماده‌ی تحویل | done = تمام
export function npcQuestStatus(npcId, state) {
  const quest = NPC_QUESTS[npcId];
  if (!quest) return 'offer';
  const inter = state.npcInteractions?.[npcId] || {};
  if (inter.completed) return 'done';
  const value = npcQuestValue(npcId, state);
  if (value >= quest.max) return 'turnin';
  if (inter.accepted) return 'active';
  return 'offer';
}

// نشانگر بالای سر: «!» برای کوئست، «?» برای گفتگو
export function npcMarker(npcId, state) {
  const status = npcQuestStatus(npcId, state);
  if (status === 'offer' || status === 'turnin') return '!';
  if (status === 'active') return '?';
  return null;
}

// هدف مسیر برای QuestTracker: نزدیک‌ترین NPC با کوئست آماده/فعال
export function getNpcQuestTarget(state) {
  let best = null;
  for (const quest of NPC_QUEST_LIST) {
    const status = npcQuestStatus(quest.npcId, state);
    if (status !== 'turnin' && status !== 'offer') continue;
    if (!best || (status === 'turnin' && best.status !== 'turnin')) {
      best = { npcId: quest.npcId, status, title: quest.title };
    }
  }
  return best;
}
