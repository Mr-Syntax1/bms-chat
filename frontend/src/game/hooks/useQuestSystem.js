import { useEffect, useMemo } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { registerQuestItem } from '../questRegistry';
import { playPositionalOneShot } from '../audio';
import { QUEST_SPOTS } from '../sceneLayout';
import { getActiveQuestStep, describeQuestStep } from '../questSteps';
import { WATER_SOUND } from '../sounds';

// صدای جادویی مأموریت (زنگ دو-نتی رویه‌ای از audio.js)
const MAGIC_SOUND = '/sounds/yum.mp3';

/**
 * سیستم مأموریت داستانی «راز فانوس دریایی و گنج دزدان دریایی کیوت».
 * همه‌ی آیتم‌ها در questRegistry ثبت می‌شوند تا PlayerController
 * نزدیک‌ترین آیتم را پیدا و با E تعامل کند.
 * ترتیب اجباری: نقشه (۳) → فانوس (۵) → ماهیگیری (کلید) → صندوقچه.
 */
export function useQuestSystem() {
  const addParchment = usePlayerStore((s) => s.addParchment);
  const lightLantern = usePlayerStore((s) => s.lightLantern);
  const giveKey = usePlayerStore((s) => s.giveKey);
  const openChest = usePlayerStore((s) => s.openChest);
  const collectShell = usePlayerStore((s) => s.collectShell);
  const readSign = usePlayerStore((s) => s.readSign);
  const pushToast = usePlayerStore((s) => s.pushToast);

  // تعریف تعامل هر آیتم (بدون وابستگی به رندر)
  const actions = useMemo(
    () => ({
      parchment: (index, x, z) => () => {
        if (!addParchment(index)) return;
        playPositionalOneShot(MAGIC_SOUND, [x, 1, z], { volume: 0.35 });
      },
      lantern: (index, x, z) => () => {
        if (!lightLantern(index)) return;
        playPositionalOneShot(MAGIC_SOUND, [x, 1, z], { volume: 0.4 });
      },
      fishing: (x, z) => () => {
        const { quests } = usePlayerStore.getState();
        if (quests.hasKey) {
          pushToast('قبلاً ماهیگیری کردی!', 'info');
          return;
        }
        // قفل ترتیب: تا ۵ فانوس روشن نشود، ماهیگیری ممکن نیست
        if (quests.lanterns < 5) {
          pushToast('اول باید ۵ فانوس را روشن کنی!', 'warn');
          return;
        }
        // صدای پاشیدن آب؛ اگر فایل نبود، audio.js نسخه‌ی رویه‌ای می‌سازد
        playPositionalOneShot(WATER_SOUND, [x + 2, 0.4, z], { volume: 0.7 });
        giveKey();
      },
      chest: (x, z) => () => {
        if (openChest()) playPositionalOneShot(MAGIC_SOUND, [x, 1, z], { volume: 0.5 });
      },
      shell: (index, x, z) => () => {
        if (!collectShell(index)) return;
        playPositionalOneShot(MAGIC_SOUND, [x, 0.3, z], { volume: 0.25 });
      },
      sign: (index, text) => () => {
        readSign(index);
        pushToast(text, 'info');
      },
    }),
    [addParchment, lightLantern, giveKey, openChest, collectShell, readSign, pushToast]
  );

  // ثبت آیتم‌ها در رجیستری
  useEffect(() => {
    const unsubs = [];

    QUEST_SPOTS.parchments.forEach((spot, i) => {
      unsubs.push(
        registerQuestItem({
          key: `parchment-${i}`,
          label: 'خواندن تکه نقشه',
          x: spot.x,
          z: spot.z,
          radius: 2.6,
          done: () => usePlayerStore.getState().collected.parchments.includes(i),
          action: actions.parchment(i, spot.x, spot.z),
        })
      );
    });

    QUEST_SPOTS.lanterns.forEach((spot, i) => {
      unsubs.push(
        registerQuestItem({
          key: `lantern-${i}`,
          label: 'روشن کردن فانوس',
          x: spot.x,
          z: spot.z,
          radius: 2.8,
          done: () => usePlayerStore.getState().collected.lanterns.includes(i),
          isLocked: () => usePlayerStore.getState().quests.parchments < 3,
          action: actions.lantern(i, spot.x, spot.z),
        })
      );
    });

    unsubs.push(
      registerQuestItem({
        key: 'fishing-rod',
        label: 'ماهیگیری',
        x: QUEST_SPOTS.fishingRod.x,
        z: QUEST_SPOTS.fishingRod.z,
        radius: 3,
        done: () => usePlayerStore.getState().quests.hasKey,
        isLocked: () => usePlayerStore.getState().quests.lanterns < 5,
        action: actions.fishing(QUEST_SPOTS.fishingRod.x, QUEST_SPOTS.fishingRod.z),
      })
    );

    unsubs.push(
      registerQuestItem({
        key: 'treasure',
        label: 'باز کردن صندوقچه',
        x: QUEST_SPOTS.chest.x,
        z: QUEST_SPOTS.chest.z,
        radius: 3,
        done: () => usePlayerStore.getState().quests.chestOpened,
        isLocked: () => !usePlayerStore.getState().quests.hasKey,
        action: actions.chest(QUEST_SPOTS.chest.x, QUEST_SPOTS.chest.z),
      })
    );

    QUEST_SPOTS.collectibles.forEach((spot, i) => {
      unsubs.push(
        registerQuestItem({
          key: `shell-${i}`,
          label: 'برداشتن صدف/ستاره',
          x: spot.x,
          z: spot.z,
          radius: 2.4,
          done: () => usePlayerStore.getState().collected.shells.includes(i),
          action: actions.shell(i, spot.x, spot.z),
        })
      );
    });

    QUEST_SPOTS.signs.forEach((spot, i) => {
      unsubs.push(
        registerQuestItem({
          key: `sign-${i}`,
          label: 'خواندن تابلوی خاطره',
          x: spot.x,
          z: spot.z,
          radius: 2.6,
          done: () => (usePlayerStore.getState().collected.signs || []).includes(i),
          action: actions.sign(i, spot.text),
        })
      );
    });

    return () => unsubs.forEach((fn) => fn());
  }, [actions]);

  // متن مأموریت فعلی برای Quest Tracker — از منبع مشترک با دفترچه
  const currentQuest = usePlayerStore((s) => describeQuestStep(getActiveQuestStep(s.quests)));

  return { currentQuest };
}
