import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import InstallButton from './InstallButton';

/* ───────────── helpers ───────────── */
const faNum = (n) => Number(n || 0).toLocaleString('fa-IR');

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'شب‌بخیر';
  if (h < 12) return 'صبح‌بخیر';
  if (h < 17) return 'ظهر‌بخیر';
  if (h < 20) return 'عصر‌بخیر';
  return 'شب‌بخیر';
};

const getMemberCount = (r) => r?.memberCount ?? r?.membersCount ?? r?.members?.length ?? r?.users?.length ?? null;

function Icon({ d, className = 'w-5 h-5', sw = 1.8 }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const PATH = {
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  shield: 'M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3zM9 12l2 2 4-4',
  device: 'M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2zM11 18h2',
  arrow: 'M19 12H5m0 0l6-6m-6 6l6 6',
  hash: 'M5 9h14M5 15h14M10 4L8 20M16 4l-2 16',
};

const FEATURES = [
  { icon: PATH.bolt, label: 'گفتگوی لحظه‌ای' },
  { icon: PATH.shield, label: 'حریم خصوصی' },
  { icon: PATH.device, label: 'همه‌ی دستگاه‌ها' },
];

/* ───────────── تصویر اصلی (SVG) ───────────── */
function HeroIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 320 200" fill="none" className={className} aria-hidden="true">
      <circle cx="30" cy="26" r="5" className="stroke-primary-400/60" strokeWidth="2" />
      <path d="M292 22v14M285 29h14" className="stroke-accent-400/70" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 150v10M9 155h10" className="stroke-surface-600" strokeWidth="2" strokeLinecap="round" />
      <circle cx="304" cy="176" r="3" className="fill-surface-600" />
      <circle cx="244" cy="20" r="2.5" className="fill-primary-400/50" />

      <g className="ws-float">
        <rect x="20" y="32" width="178" height="88" rx="22" className="fill-surface-800" />
        <path d="M54 116l-6 26 30-24z" className="fill-surface-800" />
        <circle cx="46" cy="60" r="13" className="fill-accent-400" />
        <circle cx="46" cy="56" r="4.5" className="fill-surface-950/70" />
        <path d="M37 69a9 7 0 0118 0z" className="fill-surface-950/70" />
        <rect x="68" y="52" width="76" height="7" rx="3.5" className="fill-white/30" />
        <rect x="68" y="66" width="112" height="7" rx="3.5" className="fill-white/12" />
        <rect x="36" y="90" width="140" height="7" rx="3.5" className="fill-white/10" />
        <rect x="36" y="103" width="92" height="7" rx="3.5" className="fill-white/10" />
      </g>

      <g className="ws-float" style={{ animationDelay: '-3s' }}>
        <rect x="112" y="102" width="192" height="84" rx="22" className="fill-primary-500" />
        <path d="M270 182l8 16-30-15z" className="fill-primary-500" />
        <rect x="134" y="120" width="112" height="7" rx="3.5" className="fill-white/75" />
        <rect x="134" y="134" width="76" height="7" rx="3.5" className="fill-white/40" />
        <circle className="ws-dot fill-white" cx="142" cy="162" r="4" />
        <circle className="ws-dot fill-white" cx="156" cy="162" r="4" style={{ animationDelay: '.18s' }} />
        <circle className="ws-dot fill-white" cx="170" cy="162" r="4" style={{ animationDelay: '.36s' }} />
        <circle cx="278" cy="128" r="13" className="fill-primary-200" />
        <circle cx="278" cy="124" r="4.5" className="fill-primary-700" />
        <path d="M269 137a9 7 0 0118 0z" className="fill-primary-700" />
        <circle cx="298" cy="108" r="12" className="fill-emerald-400 stroke-surface-950" strokeWidth="3" />
        <path d="M292.5 108.5l4 4 7-8" className="stroke-surface-950" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function AvatarStack() {
  const colors = ['fill-accent-400', 'fill-primary-300', 'fill-emerald-400', 'fill-amber-400'];
  return (
    <svg width="76" height="30" viewBox="0 0 76 30" fill="none" aria-hidden="true">
      {colors.map((c, i) => (
        <g key={c}>
          <circle cx={15 + i * 15} cy="15" r="13" className={`${c} stroke-surface-900`} strokeWidth="2.5" />
          <circle cx={15 + i * 15} cy="12" r="3.6" className="fill-surface-950/60" />
          <path d={`M${15 + i * 15 - 7} 22a7 5.5 0 0114 0z`} className="fill-surface-950/60" />
        </g>
      ))}
    </svg>
  );
}

function CardArcs() {
  return (
    <svg className="absolute -top-px -left-px w-40 h-40 pointer-events-none text-white/[0.06]" viewBox="0 0 160 160" fill="none" aria-hidden="true">
      {[30, 55, 80, 105].map((r) => (
        <circle key={r} cx="0" cy="0" r={r} stroke="currentColor" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

/* ───────────── component ───────────── */
export default function WelcomeScreen({ user, rooms = [], onSelectRoom, onCreateRoom }) {
  const navigate = useNavigate();
  const btnRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const greeting = useMemo(getGreeting, []);

  const bmsRoom = useMemo(
    () => rooms.find((r) => !r.isPrivate && r.name.toLowerCase().includes('bms')),
    [rooms]
  );
  const roomName = bmsRoom?.name ?? 'bms';
  const members = getMemberCount(bmsRoom);

  useEffect(() => {
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) btnRef.current?.focus();
  }, []);

  const enter = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (!bmsRoom) await onCreateRoom(roomName);
      onSelectRoom(roomName);
    } catch {
      setError('ورود به اتاق ناموفق بود. لطفاً دوباره تلاش کن.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="relative flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain bg-surface-950">
      <style>{`
        @keyframes ws-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes ws-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes ws-dot { 0%,60%,100% { opacity: .35; } 30% { opacity: 1; } }
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        .ws-in { animation: ws-in .6s cubic-bezier(.2,.7,.2,1) both; }
        .ws-float { animation: ws-float 6s ease-in-out infinite; transform-box: fill-box; }
        .ws-dot { animation: ws-dot 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .ws-in, .ws-float, .ws-dot, .animate-spin { animation: none; } }
      `}</style>

      {/* پس‌زمینه‌ی تزئینی */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative flex-1 flex flex-col w-full max-w-6xl mx-auto px-4 sm:px-8 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        
        {/* هدر */}
        <header className="flex items-center justify-between h-16 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <img src="/pwa-192x192.png" alt="" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-bold text-lg text-surface-100 tracking-tight">چت BMS</span>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="rounded-full transition-transform active:scale-95 hover:ring-2 hover:ring-primary-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="مشاهده پروفایل"
            title="پروفایل"
          >
            <Avatar username={user?.username} avatarIndex={user?.avatarIndex} size="sm" status="online" />
          </button>
        </header>

        {/* محتوای اصلی */}
        <main className="flex-1 grid lg:grid-cols-2 items-center gap-8 lg:gap-16 py-6">
          
          {/* بخش تصویر (سمت چپ در دسکتاپ) */}
          <div className="ws-in order-first lg:order-last flex justify-center lg:justify-end">
            <HeroIllustration className="w-full max-w-md lg:max-w-lg h-auto drop-shadow-2xl" />
          </div>

          {/* بخش متن و کارت (سمت راست در دسکتاپ) */}
          <div className="flex flex-col items-center lg:items-stretch text-center lg:text-right gap-6">
            <div className="ws-in space-y-3" style={{ animationDelay: '80ms' }}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-xs font-semibold border border-primary-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                {greeting}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-surface-50 break-words">
                سلام، <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">{user?.username}</span>
              </h1>
              <p className="text-surface-400 leading-7 max-w-md mx-auto lg:mx-0 text-sm sm:text-base">
                اتاق اصلی منتظر توئه. با یک کلیک وارد گفتگو شو و یا برای تجربه‌ی بهتر، اپلیکیشن رو نصب کن.
              </p>
            </div>

            {/* کارت اصلی اقدام */}
            <div className="ws-in w-full max-w-md lg:max-w-none" style={{ animationDelay: '140ms' }}>
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-2xl shadow-black/20">
                <CardArcs />

                <div className="relative flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 text-primary-300 flex items-center justify-center border border-white/5">
                    <Icon d={PATH.hash} className="w-7 h-7" />
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-xl text-surface-50 truncate">{roomName}</h2>
                      <span className="shrink-0 px-2 h-6 inline-flex items-center rounded-lg bg-primary-500/15 text-primary-300 text-[11px] font-bold border border-primary-500/20">
                        پیشنهادی
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-xs text-surface-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/15" />
                      {members !== null ? `${faNum(members)} عضو فعال` : 'اتاق عمومی'} · آماده‌ی گفتگو
                    </p>
                  </div>
                  <div className="hidden sm:block shrink-0">
                    <AvatarStack />
                  </div>
                </div>

                {/* دکمه‌های اقدام (اصلی و ثانویه) */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    ref={btnRef}
                    onClick={enter}
                    disabled={busy}
                    className="flex-1 h-12 sm:h-[52px] rounded-2xl bg-primary-500 hover:bg-primary-400 active:bg-primary-600 active:scale-[0.98] text-white font-bold flex items-center justify-center gap-2.5 transition-all disabled:opacity-70 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900"
                  >
                    {busy ? (
                      <span className="block w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <>
                        ورود به اتاق
                        <Icon d={PATH.arrow} className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-1" sw={2.2} />
                      </>
                    )}
                  </button>
                  
                  {/* 👈 اینجا دکمه نصب به شکل طبیعی و ثانویه قرار گرفته است */}
                  <InstallButton variant="secondary" />
                </div>

                {error && (
                  <p role="alert" className="mt-4 text-sm text-rose-400 flex items-center justify-center sm:justify-start gap-2 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                  </p>
                )}
              </div>
            </div>

            {/* ویژگی‌ها */}
            <ul className="ws-in grid grid-cols-3 gap-3 w-full max-w-md lg:max-w-none" style={{ animationDelay: '200ms' }}>
              {FEATURES.map((f) => (
                <li key={f.label} className="flex flex-col items-center lg:items-start gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors">
                  <span className="w-9 h-9 shrink-0 rounded-xl bg-surface-800 text-primary-400 flex items-center justify-center border border-white/5">
                    <Icon d={f.icon} className="w-4.5 h-4.5" />
                  </span>
                  <span className="text-xs font-medium text-surface-300 leading-5">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}