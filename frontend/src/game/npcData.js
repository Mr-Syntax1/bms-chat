// ---------------------------------------------------------------------------
// npcData.js — تعریف داده‌محور NPCها (Phase 4)
//
//  • موقعیت‌ها ثابت و seed-free هستند تا همه‌ی کلاینت‌ها NPC یکسان ببینند.
//  • درخت دیالوگ «داده» است: هر گره { text, choices }؛ text می‌تواند تابع ctx باشد
//    تا بر اساس پیشرفت کوئست/دوستی/شبانه‌روز تغییر کند.
//  • داده‌ی کوئست در questSteps.js می‌ماند (منبع واحد حقیقت)؛ اینجا فقط id و
//    درخت دیالوگ و پاداش دوستی است.
//  • مدل‌ها از assetManifest (npc.*) خوانده می‌شوند؛ هیچ مسیر خامی اینجا نیست.
// ---------------------------------------------------------------------------
import { npcQuestStatus } from './questSteps';

// رستر شش NPC — مدل‌ها از قبل در manifest هستند.
export const NPC_LIST = [
  {
    id: 'grandpa',
    name: 'پدربزرگ ماهیگیر',
    role: 'fisher',
    modelKey: 'npc.grandpa',
    x: 58,
    z: -3.5,
    rotation: -1.2,
    facing: 0,
    height: 1.9,
    wander: 4,
    talkRadius: 2.8,
    blip: 1,
    pitch: 0.86,
    accent: '#8ad6c1',
    barks: [
      'امروز روز خوبی برای ماهیگیری است!',
      'ماهی‌ها امروز به قلاب نزدیک‌ترند.',
      'آب آرام است؛ صبر کن و بگیر.',
      'بوی نمک و صبر با هم می‌آید.',
    ],
  },
  {
    id: 'cow',
    name: 'آشپز کمپ',
    role: 'cook',
    modelKey: 'npc.cow',
    x: -9.8,
    z: 5.2,
    rotation: 1.9,
    facing: 0,
    height: 2.0,
    wander: 3,
    talkRadius: 2.9,
    blip: 2,
    pitch: 0.78,
    accent: '#ffc66d',
    barks: [
      'بوی پختن می‌آید!',
      'یک خورش خوب همه را دور هم می‌آورد.',
      'آتش را کم کن تا نسوزد!',
      'دلم یک کیک توت می‌خواهد…',
    ],
  },
  {
    id: 'adventurer',
    name: 'جنگلبان',
    role: 'ranger',
    modelKey: 'npc.adventurer',
    x: -28,
    z: -26,
    rotation: 2.5,
    facing: 0,
    height: 1.85,
    wander: 4,
    talkRadius: 2.8,
    blip: 3,
    pitch: 0.95,
    accent: '#9ad0ff',
    barks: [
      'آبشار را کشف کرده‌ای؟',
      'جایی گنجی پنهان است…',
      'نقشه را دنبال کن، راه پیدا می‌شود.',
      'هر فانوس یک قدم به افسانه نزدیک‌تر است.',
    ],
  },
  {
    id: 'littlegirl',
    name: 'دخترک حشره‌شناس',
    role: 'bugkid',
    modelKey: 'npc.littlegirl',
    x: 9.5,
    z: 15.5,
    rotation: 0.4,
    facing: 0,
    height: 1.3,
    wander: 5,
    talkRadius: 2.6,
    blip: 4,
    pitch: 1.22,
    accent: '#ff9ecd',
    barks: [
      'پروانه‌ها با پاهایشان مزه می‌چشند!',
      'یک حشره‌ی جدید دیدی؟',
      'شب‌ها کرم شب‌تاب بیشتر می‌شود.',
      'تور زدن سخت است، اما قشنگ است!',
    ],
  },
  {
    id: 'witch',
    name: 'جادوگر مهتاب',
    role: 'mystic',
    modelKey: 'npc.witch',
    x: -3.5,
    z: 5.5,
    rotation: 2.9,
    facing: 0,
    height: 1.8,
    wander: 2,
    talkRadius: 2.8,
    blip: 2,
    pitch: 0.68,
    accent: '#c9a6ff',
    nightOnly: true,
    barks: [
      'مهتاب امشب روشن است…',
      'ده ستاره‌ی کوچک، ده آرزو.',
      'شب برای قصه‌گفتن است.',
      'در تاریکی، نور کوچک هم کافی است.',
    ],
  },
  {
    id: 'gnome',
    name: 'گنوم جنگل',
    role: 'gnome',
    modelKey: 'npc.gnome',
    x: -58,
    z: -50,
    rotation: 0.8,
    facing: 0,
    height: 1.35,
    wander: 2,
    talkRadius: 2.6,
    blip: 3,
    pitch: 1.12,
    accent: '#ffe07a',
    barks: [
      'هیس… برگ‌ها دارند حرف می‌زنند.',
      'جنگل خودش زنده است.',
      'بلوط‌های طلایی نزدیک آبشارند…',
      'آرام باش تا جنگل تو را ببیند.',
    ],
  },
];

export const NPC_BY_ID = Object.fromEntries(NPC_LIST.map((npc) => [npc.id, npc]));

// بلوط‌های طلایی پنهان — نزدیک آبشار و عمق جنگل (۵..۷ عدد)
export const HIDDEN_ACORNS = [
  { x: -32, z: -42, rotation: 0.3 },
  { x: -44, z: -38, rotation: 1.4 },
  { x: -30, z: -30, rotation: 2.2 },
  { x: -20, z: -36, rotation: 0.9 },
  { x: -55, z: -20, rotation: 2.7 },
  { x: -12, z: -28, rotation: 1.8 },
];

// ---------------------------------------------------------------------------
// درخت‌های دیالوگ
// گره: { text: string | (ctx) => string, choices: [{ label, next?, action? }] }
// action: accept | complete | gift | story | close
// ctx: { state, level, night, phase }
// ---------------------------------------------------------------------------
const T = (fn) => fn;

export const DIALOGUES = {
  grandpa: {
    offer: {
      text: T((ctx) =>
        ctx.night
          ? 'ماه روی آب می‌لرزد… ماهی‌ها شب‌ها از سایه بیرون می‌آیند. سه‌تا برایم صید می‌کنی؟'
          : 'سلام جوان! رودخانه امروز آرام است. سه ماهی که بیاوری، راز چوب ماهیگیری را نشانت می‌دهم.'
      ),
      choices: [
        { label: 'چطور ماهی بگیرم؟', next: 'tips' },
        { label: 'چه ماهی‌هایی اینجا هستند؟', next: 'fishLore' },
        { label: 'قبول می‌کنم', action: 'accept' },
      ],
    },
    tips: {
      text: 'صبر مهم‌تر از قدرت است. وقتی شناور لرزید، یک نفس صبر کن و بعد بکش. ماهی عجول، قلاب را رها می‌کند.',
      choices: [
        { label: 'باز هم بگو', next: 'fishLore' },
        { label: 'قبول می‌کنم', action: 'accept' },
        { label: 'فعلاً خداحافظ', action: 'close' },
      ],
    },
    fishLore: {
      text: 'قزل‌آلای نقره‌ای نزدیک سنگ‌هاست، کفال در آب آرام اسکله. اگر چوب لرزید و سنگین شد، شاید چکمه‌ی کهنه باشد!',
      choices: [
        { label: 'نکته‌ی صید بده', next: 'tips' },
        { label: 'قبول می‌کنم', action: 'accept' },
        { label: 'ممنون', action: 'close' },
      ],
    },
    progress: {
      text: T((ctx) => `تا حالا ${ctx.state.fishCaught.filter((f) => !f.junk).length} ماهی سالم صید کرده‌ای. سه‌تا می‌خواهم؛ آرام و با حوصله.`),
      choices: [
        { label: 'در راهم', action: 'close' },
        { label: 'یک نکته بگو', next: 'tips' },
      ],
    },
    turnin: {
      text: 'آفرین! بوی نمک و صبر از دستانت می‌آید. این طرح تازه برای چوب ماهیگیری، حق توست.',
      choices: [
        { label: 'تحویل مأموریت', action: 'complete' },
        { label: 'بعداً', action: 'close' },
      ],
    },
    done: {
      text: T((ctx) =>
        ctx.level >= 5
          ? 'ماهیگیر واقعی شدی. بیا، داستان آن روزی را بگویم که دریا مرا پس داد…'
          : 'هر وقت خواستی کنار اسکله منتظرت هستم. ماهی‌ها به تو اعتماد کرده‌اند.'
      ),
      choices: [
        { label: 'داستانت را بگو', next: 'story' },
        { label: 'خداحافظ', action: 'close' },
      ],
    },
    gift: {
      text: 'این نشان ماهیگیر قدیمی را بگیر. سال‌ها روی کلاه من بود؛ حالا مال توست.',
      choices: [{ label: 'ممنون', action: 'close' }],
    },
    story: {
      text: 'یک شب طوفان مرا به صخره‌ها کوبید. فانوسی کوچک روشن ماند و راه ساحل را نشان داد. از آن شب، هیچ فانوسی را خاموش نمی‌گذارم.',
      choices: [{ label: 'داستان قشنگی بود', action: 'close' }],
    },
  },

  cow: {
    offer: {
      text: 'سلام! بوی دیگ که می‌آید، دلم ضعف می‌رود. سه توت و یک قارچ بیاور تا دستور پخت تازه‌ای یادت بدهم.',
      choices: [
        { label: 'چه چیزی می‌پزی؟', next: 'philosophy' },
        { label: 'قبول می‌کنم', action: 'accept' },
      ],
    },
    philosophy: {
      text: 'آشپزی مثل کمپ است: آتش آرام، دستِ صبور و کمی چاشنی. عجله، غذا را می‌سوزاند و دوستی را سرد می‌کند.',
      choices: [
        { label: 'نکته‌ی دستور پخت', next: 'hint' },
        { label: 'قبول می‌کنم', action: 'accept' },
        { label: 'خداحافظ', action: 'close' },
      ],
    },
    hint: {
      text: 'توت را آخر اضافه کن تا ترش نشود. قارچ را اول با کره تفت بده. اگر تابه داغ شد، شعله را کم کن.',
      choices: [
        { label: 'ممنون', action: 'close' },
        { label: 'قبول می‌کنم', action: 'accept' },
      ],
    },
    progress: {
      text: T((ctx) => {
        const berries = ctx.state.ingredients.berries || 0;
        const mushroom = ctx.state.ingredients.mushroom || 0;
        return `توت: ${Math.min(berries, 3)}/3 · قارچ: ${Math.min(mushroom, 1)}/1. توی سبدت ${berries} توت و ${mushroom} قارچ داری.`;
      }),
      choices: [
        { label: 'می‌گردم', action: 'close' },
        { label: 'یک نکته بگو', next: 'hint' },
      ],
    },
    turnin: {
      text: 'همین‌ها را می‌خواستم! حالا دستور پخت «کیک توت و قارچ» را در دفترچه‌ات ثبت می‌کنم.',
      choices: [
        { label: 'تحویل بده', action: 'complete' },
        { label: 'بعداً', action: 'close' },
      ],
    },
    done: {
      text: T((ctx) =>
        ctx.level >= 5
          ? 'راز آشپزی من این است: غذا را برای کسی بپز که دوستش داری. حالا بنشین، داستان دیگ مسی را بگویم…'
          : 'هر وقت گرسنه شدی بیا. دیگ همیشه برای تو گرم است.'
      ),
      choices: [
        { label: 'داستانت را بگو', next: 'story' },
        { label: 'خداحافظ', action: 'close' },
      ],
    },
    gift: {
      text: 'این پیش‌بند کوچک را بگیر؛ دیگر آشپز واقعی شدی. مراقب لکه‌های سس باش!',
      choices: [{ label: 'ممنون', action: 'close' }],
    },
    story: {
      text: 'دیگ مسی را مادرم به من داد. گفت هر غذایی که با آهسته‌ترین آتش بپزی، طولانی‌ترین خاطره را می‌سازد.',
      choices: [{ label: 'چه حرف قشنگی', action: 'close' }],
    },
  },

  adventurer: {
    offer: {
      text: 'نقشه‌ای دارم که بوی ماجرا می‌دهد: سه تکه نقشه، پنج فانوس، یک کلید و یک صندوقچه. همراه من می‌آیی؟',
      choices: [
        { label: 'از کجا شروع کنم؟', next: 'trail' },
        { label: 'قبول می‌کنم', action: 'accept' },
      ],
    },
    trail: {
      text: 'از جنگل شروع کن؛ تکه‌های نقشه روی سنگ‌ها جا مانده‌اند. بعد مسیر ساحل را با فانوس روشن کن. کلید در انتهای اسکله منتظر است.',
      choices: [
        { label: 'خطرناک است؟', next: 'lore' },
        { label: 'قبول می‌کنم', action: 'accept' },
        { label: 'فعلاً نه', action: 'close' },
      ],
    },
    lore: {
      text: 'خطر واقعی گم شدن نیست؛ فراموش کردن راه برگشت است. فانوس‌ها برای همین‌اند. و آبشار؟ صدای آن همیشه راهنمای من بوده.',
      choices: [
        { label: 'قبول می‌کنم', action: 'accept' },
        { label: 'ممنون', action: 'close' },
      ],
    },
    progress: {
      text: T((ctx) => {
        const q = ctx.state.quests;
        return `نقشه ${Math.min(q.parchments, 3)}/3 · فانوس ${Math.min(q.lanterns, 5)}/5 · کلید ${q.hasKey ? 'دارد' : 'ندارد'} · صندوقچه ${q.chestOpened ? 'باز' : 'بسته'}.`;
      }),
      choices: [
        { label: 'ادامه می‌دهم', action: 'close' },
        { label: 'راهنمایی می‌خواهم', next: 'trail' },
      ],
    },
    turnin: {
      text: 'صندوقچه باز شد؟ پس افسانه راست بود! این نشان جنگلبانی مال توست؛ لایقش هستی.',
      choices: [
        { label: 'تحویل مأموریت', action: 'complete' },
        { label: 'بعداً', action: 'close' },
      ],
    },
    done: {
      text: T((ctx) =>
        ctx.level >= 5
          ? 'حالا خودت یک ماجراجویی. بنشین؛ داستان آخرین نقشه‌ای که گم شد را برایت می‌گویم…'
          : 'هر جای نقشه که گم شدی، صدای فانوس‌ها را دنبال کن.'
      ),
      choices: [
        { label: 'داستانت را بگو', next: 'story' },
        { label: 'خداحافظ', action: 'close' },
      ],
    },
    gift: {
      text: 'این قطب‌نمای قدیمی را بگیر. سوزنش همیشه به سمت ماجرا می‌چرخد.',
      choices: [{ label: 'ممنون', action: 'close' }],
    },
    story: {
      text: 'یک نقشه را سال‌ها دنبال کردم و آخرش فهمیدم مقصد، همان کمپ بود. گاهی گنج، جایی است که برمی‌گردی.',
      choices: [{ label: 'جمله‌ی خوبی بود', action: 'close' }],
    },
  },

  littlegirl: {
    offer: {
      text: 'تو هم حشره دوست داری؟! من سه نوع مختلف حشره می‌خواهم: پروانه، سوسک و کرم شب‌تاب. بعد تور تازه‌ات می‌کنم!',
      choices: [
        { label: 'یک واقعیت بگو', next: 'facts' },
        { label: 'قبول می‌کنم', action: 'accept' },
      ],
    },
    facts: {
      text: 'پروانه‌ها با پاهایشان مزه می‌چشند! و کرم شب‌تاب واقعاً سرد است وقتی روشن می‌شود. باور نمی‌کنی؟ بگیر ببین!',
      choices: [
        { label: 'چطور بگیرم؟', next: 'howto' },
        { label: 'قبول می‌کنم', action: 'accept' },
        { label: 'خداحافظ', action: 'close' },
      ],
    },
    howto: {
      text: 'نزدیک شو و F را بزن؛ تور را تاب بده. سوسک‌ها کندترند، پروانه‌ها شیطان. کرم شب‌تاب را شب‌ها در چمن پیدا می‌کنی.',
      choices: [
        { label: 'قبول می‌کنم', action: 'accept' },
        { label: 'ممنون', action: 'close' },
      ],
    },
    progress: {
      text: T((ctx) => {
        const types = new Set(ctx.state.bugsCaught.map((b) => b.id));
        return `تا حالا ${types.size} نوع مختلف گرفته‌ای. سه نوع می‌خواهم؛ پروانه، سوسک و کرم شب‌تاب.`;
      }),
      choices: [
        { label: 'می‌گردم', action: 'close' },
        { label: 'یک واقعیت بگو', next: 'facts' },
      ],
    },
    turnin: {
      text: 'واای! هر سه‌تا! تو بهترین شکارچی حشره‌ای. این تور تازه مال خودت!',
      choices: [
        { label: 'تحویل بده', action: 'complete' },
        { label: 'بعداً', action: 'close' },
      ],
    },
    done: {
      text: T((ctx) =>
        ctx.level >= 5
          ? 'می‌دانی، من اولین حشره‌ام را با بابابزرگ گرفتم. بیا، داستانش را بگویم…'
          : 'هر وقت حشره‌ی جدید دیدی، بیا برایم تعریف کن!'
      ),
      choices: [
        { label: 'داستانت را بگو', next: 'story' },
        { label: 'خداحافظ', action: 'close' },
      ],
    },
    gift: {
      text: 'این ذره‌بین کوچک را بگیر! با آن بال پروانه‌ها را از نزدیک ببین.',
      choices: [{ label: 'ممنون', action: 'close' }],
    },
    story: {
      text: 'بابابزرگ می‌گفت هر حشره یک قصه دارد. من هنوز قصه‌ی کرم شب‌تاب را پیدا نکرده‌ام؛ شاید تو پیدا کنی.',
      choices: [{ label: 'حتماً', action: 'close' }],
    },
  },

  witch: {
    offer: {
      text: 'شب است و مهتاب روی دیگ افتاده. ده کرم شب‌تاب بیاور تا کلاه جادویی را به تو نشان دهم.',
      choices: [
        { label: 'از ماه بگو', next: 'moon' },
        { label: 'قبول می‌کنم', action: 'accept' },
      ],
    },
    moon: {
      text: 'ماه آینه‌ی جنگل است. هر کرم شب‌تاب یک ستاره‌ی کوچک است که از آسمان جا مانده. من جمعشان می‌کنم.',
      choices: [
        { label: 'از آتش بگو', next: 'fire' },
        { label: 'قبول می‌کنم', action: 'accept' },
        { label: 'خداحافظ', action: 'close' },
      ],
    },
    fire: {
      text: 'آتش، خاطره‌ی روز است. شب که می‌آید، آتش فقط گرم نمی‌کند؛ دعوت می‌کند بنشینی و به کسی که نیست فکر کنی.',
      choices: [
        { label: 'قبول می‌کنم', action: 'accept' },
        { label: 'ممنون', action: 'close' },
      ],
    },
    progress: {
      text: T((ctx) => `در شب ${ctx.state.nightFireflies || 0} کرم شب‌تاب جمع کرده‌ای. ده‌تا می‌خواهم؛ فقط شب‌ها می‌درخشند.`),
      choices: [
        { label: 'می‌گردم', action: 'close' },
        { label: 'از ماه بگو', next: 'moon' },
      ],
    },
    turnin: {
      text: 'ده ستاره‌ی کوچک! حالا این کلاه را بگیر؛ در شب، لبه‌اش مهتاب را نگه می‌دارد.',
      choices: [
        { label: 'تحویل بده', action: 'complete' },
        { label: 'بعداً', action: 'close' },
      ],
    },
    done: {
      text: T((ctx) =>
        ctx.level >= 5
          ? 'پنج شب با من نشستی. حالا وقتش است داستان خواهرم را بگویم؛ همان که آتش را به کمپ آورد…'
          : 'شب‌های مهتابی منتظرت هستم. کرم‌های شب‌تاب هم.'
      ),
      choices: [
        { label: 'داستانت را بگو', next: 'story' },
        { label: 'خداحافظ', action: 'close' },
      ],
    },
    gift: {
      text: 'این شیشه‌ی کوچک نور را بگیر. هر وقت گم شدی، یک کرم شب‌تاب در آن روشن کن.',
      choices: [{ label: 'ممنون', action: 'close' }],
    },
    story: {
      text: 'خواهرم می‌گفت آتش را از آسمان دزدیده. من می‌گویم از دلِ جنگل برداشته. حقیقت هر چه باشد، گرم است.',
      choices: [{ label: 'داستان قشنگی بود', action: 'close' }],
    },
  },

  gnome: {
    offer: {
      text: 'هیس… صدای پایت برگ‌ها را بیدار کرد. سه بلوط طلایی در جنگل پنهان است. پیدا کنی، راز من مال توست.',
      choices: [
        { label: 'یک معما بگو', next: 'riddle' },
        { label: 'قبول می‌کنم', action: 'accept' },
      ],
    },
    riddle: {
      text: '«نه در آب، نه در آسمان؛ نزدیک آبشار، زیر سایه‌ی سنگ. سه برادر طلایی، خاموش و تنگ.»',
      choices: [
        { label: 'یک معمای دیگر', next: 'riddle2' },
        { label: 'قبول می‌کنم', action: 'accept' },
        { label: 'خداحافظ', action: 'close' },
      ],
    },
    riddle2: {
      text: '«هر که صبورتر، زودتر می‌بیند. برق کوچک، راه را نشان می‌دهد؛ اما فقط چشمِ آرام آن را می‌یابد.»',
      choices: [
        { label: 'قبول می‌کنم', action: 'accept' },
        { label: 'ممنون', action: 'close' },
      ],
    },
    progress: {
      text: T((ctx) => `${ctx.state.goldenAcorns.length} بلوط از سه‌تا. برق‌های کوچک را در عمق جنگل دنبال کن.`),
      choices: [
        { label: 'می‌گردم', action: 'close' },
        { label: 'یک معما بگو', next: 'riddle' },
      ],
    },
    turnin: {
      text: 'سه بلوط! پس چشم‌هایت از چشم‌های من تیزتر است. این سنگ بلوط را بگیر؛ دکور کمپت را جادویی می‌کند.',
      choices: [
        { label: 'تحویل بده', action: 'complete' },
        { label: 'بعداً', action: 'close' },
      ],
    },
    done: {
      text: T((ctx) =>
        ctx.level >= 5
          ? 'حالا راز بزرگ را می‌گویم: این جنگل خودش زنده است و ما فقط مهمانیم. بنشین…'
          : 'هر بلوط طلایی که پیدا کنی، جنگل یک قدم به تو نزدیک‌تر می‌شود.'
      ),
      choices: [
        { label: 'راز را بگو', next: 'story' },
        { label: 'خداحافظ', action: 'close' },
      ],
    },
    gift: {
      text: 'این دانه‌ی نقره‌ای را بگیر. در جیبت بکار؛ روزی درخت می‌شود، اگر باور کنی.',
      choices: [{ label: 'ممنون', action: 'close' }],
    },
    story: {
      text: 'من نگهبان این جنگلم، نه مالکش. هر درختی که می‌بینی، نام کسی را زمزمه می‌کند که روزی زیرش نشسته.',
      choices: [{ label: 'سپاسگزارم', action: 'close' }],
    },
  },
};

// گره‌ی شروع بر اساس وضعیت کوئست + شاخه‌های دوستی
export function getDialogueNode(npcId, ctx) {
  const tree = DIALOGUES[npcId];
  if (!tree) return null;
  const status = npcQuestStatus(npcId, ctx.state);
  let key = 'offer';
  if (status === 'done') key = 'done';
  else if (status === 'turnin') key = 'turnin';
  else if (status === 'active') key = 'progress';

  const base = tree[key] || tree.offer;
  if (!base) return null;

  const flags = ctx.state.npcInteractions?.[npcId] || {};
  const choices = [...(base.choices || [])];

  // شاخه‌های دوستی: سطح ۳ هدیه، سطح ۵ داستان شخصی
  if (ctx.level >= 3 && !flags.giftGiven && tree.gift) {
    choices.unshift({ label: 'هدیه‌ی دوستی', action: 'gift' });
  }
  if (ctx.level >= 5 && !flags.storyHeard && tree.story) {
    choices.unshift({ label: 'داستان شخصی‌ات را بگو', action: 'story' });
  }

  const text = typeof base.text === 'function' ? base.text(ctx) : base.text;
  return { key, text, choices };
}

// گره‌ی مقصد یک action (برای پاداش/داستان) — null یعنی بستن
export function getActionNode(npcId, action) {
  const tree = DIALOGUES[npcId];
  if (!tree) return null;
  if (action === 'gift') return tree.gift || null;
  if (action === 'story') return tree.story || null;
  return null;
}
