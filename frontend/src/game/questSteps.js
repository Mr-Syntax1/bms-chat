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
