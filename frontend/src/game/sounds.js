import { soundUrl } from './assetManifest';

// ---------------------------------------------------------------------------
// نام‌های منطقی صدا — همه از assetManifest خوانده می‌شوند.
// اگر فایلی موجود نباشد url آن null است و audio.js نسخه‌ی synth می‌سازد.
// ---------------------------------------------------------------------------
export const FIRE_SOUND = soundUrl('ambience.fire');
export const CRICKETS_SOUND = soundUrl('ambience.crickets');
export const OCEAN_SOUND = soundUrl('ambience.ocean');
export const OWL_SOUND = soundUrl('ambience.owl');
export const STREAM_SOUND = soundUrl('ambience.stream');
export const WATERFALL_SOUND = soundUrl('ambience.waterfall');
export const RAIN_SOUND = soundUrl('ambience.rain');

// آب (پاشش/سنگ) — فایل داریم؛ اگر نبود synth
export const WATER_SOUND = soundUrl('water.plink');
export const SPLASH_SOUND = soundUrl('player.splashSmall');

export const YUM_SOUND = soundUrl('eat.yum');

export const GUITAR_SOUNDS = [
  soundUrl('music.guitar1'),
  soundUrl('music.guitar2'),
  soundUrl('music.guitar3'),
].filter(Boolean);
export const GUITAR_SOUND = GUITAR_SOUNDS[0];

// ماهیگیری
export const FISH_CAST_SOUND = soundUrl('fishing.cast');
export const FISH_REEL_SOUND = soundUrl('fishing.reel');
export const FISH_CATCH_SOUND = soundUrl('fishing.catch');
export const FISH_BITE_SOUND = soundUrl('fishing.bite');

// پخت
export const FRY_LOOP_SOUND = soundUrl('cooking.fryLoop');
export const POT_BUBBLE_SOUND = soundUrl('cooking.potBubble');
export const FLIP_SOUND = soundUrl('cooking.flip');
export const COOK_DONE_SOUND = soundUrl('cooking.done');
export const BURN_SOUND = soundUrl('cooking.burn');

// رابط کاربری و فعالیت
export const UI_CLICK_SOUND = soundUrl('ui.click');
export const UI_HOVER_SOUND = soundUrl('ui.hover');
export const PICKUP_SOUND = soundUrl('ui.pickup');
export const EMOTE_POP_SOUND = soundUrl('ui.emotePop');
export const PLACE_ITEM_SOUND = soundUrl('ui.placeItem');
export const EQUIP_CLOTH_SOUND = soundUrl('ui.equipCloth');
export const TENT_ZIP_SOUND = soundUrl('ui.tentZip');

export const QUEST_ACCEPT_SOUND = soundUrl('quest.accept');
export const QUEST_COMPLETE_SOUND = soundUrl('quest.complete');

// گرفتن حشره (Phase 3c)
export const BUG_NET_SOUND = soundUrl('activity.bugNet');
export const BUG_CATCH_SOUND = soundUrl('activity.bugCatch');

export const NPC_BLIPS = [1, 2, 3, 4]
  .map((i) => soundUrl(`npc.blip${i}`))
  .filter(Boolean);
