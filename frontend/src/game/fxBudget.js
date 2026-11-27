// ---------------------------------------------------------------------------
// fxBudget.js — سقف جهانی ذرات (Phase 5.1 performance pass)
//
//  • مجموع همه‌ی ذرات صحنه هرگز از ۵۰ بیشتر نمی‌شود (GLOBAL، نه per-chunk).
//  • هر سیستم سهم ثابت خودش را از همین‌جا می‌خواند؛ هیچ عدد جادویی پراکنده‌ای
//    در کامپوننت‌ها نمی‌ماند.
//  • جمع دقیق = ۵۰. اگر سیستمی اضافه شد، از سهم دیگری کم کنید.
//
//    campfire 6 + waterfall 6 + leaves 4 + pickup 6 + quest 9 + acorn 6
//    + steam 3 + pollen 6 + burst 4 = 50
//
//  • «quest» و «acorn» به‌ازای هر نمونه است: حداکثر ۹ آیتم کوئست (۳ تکه نقشه +
//    ۵ فانوس + صندوقچه) و ۶ بلوط طلایی. پس سهم کلشان ۹ و ۶ است.
// ---------------------------------------------------------------------------
export const PARTICLE_BUDGET = {
  total: 50,
  campfire: 6, // جرقه‌های آتش (Campfire.jsx)
  waterfall: 6, // پاشش آبشار (Waterfall.jsx)
  leaves: 4, // برگ‌های در حال ریزش (CanopyFX.jsx)
  pickup: 6, // انفجار برداشت (PickupFX.jsx)
  quest: 1, // درخشش هر آیتم مأموریت (QuestItems.jsx) × ۹ = ۹
  acorn: 1, // درخشش هر بلوط طلایی (HiddenCollectibles.jsx) × ۶ = ۶
  steam: 3, // بخار ایستگاه پخت (CookingStation.jsx)
  pollen: 6, // گرده‌های شناور (CanopyFX.jsx)
  burst: 4, // ذرات ستاره‌ای لحظه‌ی کشف (QuestItems.jsx)
};

// ---------------------------------------------------------------------------
// سقف جهانی حشرات — مجموع دو سیستم (تزئینی + قابل‌گرفتن) از این اعداد
// بیشتر نمی‌شود. دو سیستم جدا وجود دارد، پس بودجه بینشان تقسیم می‌شود.
//
//   کرم شب‌تاب: ۶ تزئینی (CozyScene) + ۴ قابل‌گرفتن (Bugs)  = ۱۰
//   پروانه:     ۸ تزئینی (Butterflies) + ۴ قابل‌گرفتن (Bugs) = ۱۲
// ---------------------------------------------------------------------------
export const GLOBAL_FIREFLIES = 10;
export const GLOBAL_BUTTERFLIES = 12;

export const FIREFLY_SPLIT = { ambient: 6, catchable: 4 };
export const BUTTERFLY_SPLIT = { ambient: 8, catchable: 4 };
