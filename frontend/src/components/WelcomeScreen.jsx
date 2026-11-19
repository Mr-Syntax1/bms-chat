import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import InstallButton from './InstallButton';

/* ───────────── helpers ───────────── */

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return { text: 'شب‌بخیر', emoji: '🌙' };
  if (h < 12) return { text: 'صبح‌بخیر', emoji: '☀️' };
  if (h < 17) return { text: 'ظهر‌بخیر', emoji: '🌤️' };
  if (h < 20) return { text: 'عصر‌بخیر', emoji: '🌇' };
  return { text: 'شب‌بخیر', emoji: '✨' };
};

const faNum = (n) => Number(n || 0).toLocaleString('fa-IR');

const getMemberCount = (room) =>
  room.memberCount ?? room.membersCount ?? room.members?.length ?? room.users?.length ?? null;

/* ───────────── small pieces ───────────── */

function Icon({ d, className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  );
}

const ICONS = {
  chat: 'M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  plus: 'M12 4v16m8-8H4',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  arrow: 'M15 19l-7-7 7-7',
  users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  spark: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
};

function Spinner() {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border-2 border-white/20 border-t-primary-400 animate-spin"
      role="status"
      aria-label="در حال بارگذاری"
    />
  );
}

/* ───────────── main component ───────────── */

export default function WelcomeScreen({ user, rooms = [], onSelectRoom, onCreateRoom }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [loadingId, setLoadingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const greeting = useMemo(getGreeting, []);

  /* ── اتاق‌های پیشنهادی (همان منطق قبلی) ── */
  const publicRooms = rooms.filter((r) => !r.isPrivate);
  const bmsRooms = publicRooms.filter((r) => r.name.toLowerCase().includes('bms'));
  const otherPublicRooms = publicRooms.filter((r) => !r.name.toLowerCase().includes('bms'));

  let suggestedRooms = [...bmsRooms, ...otherPublicRooms].slice(0, 3);
  if (bmsRooms.length === 0) {
    suggestedRooms = [{ id: 'virtual-bms', name: 'bms', isVirtual: true }, ...suggestedRooms].slice(0, 3);
  }

  /* ── تعامل‌ها ── */
  const handleRoomClick = async (room) => {
    if (loadingId) return;
    try {
      if (room.isVirtual) {
        setLoadingId(room.id);
        await onCreateRoom(room.name); // در هر دو حالت (موفق/موجود بودن) وارد اتاق می‌شویم
      }
      onSelectRoom(room.name);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const name = newRoom.trim();
    if (name.length < 2) return setCreateError('نام اتاق باید حداقل ۲ حرف باشد.');
    if (name.length > 32) return setCreateError('نام اتاق نباید بیشتر از ۳۲ حرف باشد.');
    setCreateError('');
    setCreating(true);
    try {
      const res = await onCreateRoom(name);
      if (res?.success || res?.error) onSelectRoom(name);
    } catch {
      setCreateError('ساخت اتاق ناموفق بود. دوباره تلاش کن.');
    } finally {
      setCreating(false);
    }
  };

  /* ── افکت نور دنبال‌کننده‌ی ماوس ── */
  const handleRootMove = (e) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  const handleCardMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--y', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={rootRef}
      dir="rtl"
      onMouseMove={handleRootMove}
      className="ws-root flex-1 relative overflow-y-auto overflow-x-hidden"
    >
      <style>{`
        .ws-root { --mx: 50%; --my: 30%; }

        @keyframes ws-rise { from { opacity: 0; transform: translateY(18px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes ws-orbit { to { transform: rotate(360deg); } }
        @keyframes ws-orbit-rev { to { transform: rotate(-360deg); } }
        @keyframes ws-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes ws-shimmer { to { background-position: 200% center; } }
        @keyframes ws-aurora {
          0%   { transform: translate3d(0,0,0) scale(1); }
          50%  { transform: translate3d(4%,-6%,0) scale(1.15); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }
        @keyframes ws-pulse-ring { 0% { transform: scale(.9); opacity: .7; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes ws-wave { 0%,60%,100% { transform: rotate(0); } 10%,30% { transform: rotate(16deg); } 20%,40% { transform: rotate(-10deg); } 50% { transform: rotate(8deg); } }

        .ws-rise { opacity: 0; animation: ws-rise .7s cubic-bezier(.2,.8,.2,1) forwards; }
        .ws-d1 { animation-delay: .05s; } .ws-d2 { animation-delay: .15s; } .ws-d3 { animation-delay: .25s; }
        .ws-d4 { animation-delay: .35s; } .ws-d5 { animation-delay: .45s; } .ws-d6 { animation-delay: .55s; }

        .ws-grid {
          background-image:
            linear-linear(to right, rgba(255,255,255,.045) 1px, transparent 1px),
            linear-linear(to bottom, rgba(255,255,255,.045) 1px, transparent 1px);
          background-size: 44px 44px;
          -webkit-mask-image: radial-linear(ellipse 60% 55% at 50% 38%, #000 30%, transparent 78%);
                  mask-image: radial-linear(ellipse 60% 55% at 50% 38%, #000 30%, transparent 78%);
        }
        .ws-spot {
          background: radial-linear(420px circle at var(--mx) var(--my), rgba(99,102,241,.14), transparent 60%);
        }
        .ws-title-grad {
          background-size: 200% auto;
          animation: ws-shimmer 6s linear infinite;
        }
        .ws-card::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          background: radial-linear(260px circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,.09), transparent 65%);
          opacity: 0; transition: opacity .3s;
        }
        .ws-card:hover::before { opacity: 1; }
        .ws-card::after {
          content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; padding: 1px;
          background: radial-linear(200px circle at var(--x, 50%) var(--y, 50%), rgba(129,140,248,.7), transparent 65%);
          -webkit-mask: linear-linear(#000 0 0) content-box, linear-linear(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          opacity: 0; transition: opacity .3s;
        }
        .ws-card:hover::after, .ws-card:focus-visible::after { opacity: 1; }
        .ws-wave { display: inline-block; transform-origin: 70% 70%; animation: ws-wave 2.6s ease-in-out 1s 2; }

        @media (prefers-reduced-motion: reduce) {
          .ws-root *, .ws-root *::before, .ws-root *::after { animation: none !important; transition: none !important; }
          .ws-rise { opacity: 1; }
        }
      `}</style>

      {/* ───── پس‌زمینه ───── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="ws-grid absolute inset-0" />
        <div className="ws-spot absolute inset-0" />
        <div
          className="absolute -top-24 right-[8%] w-[28rem] h-[28rem] rounded-full bg-primary-500/20 blur-[110px]"
          style={{ animation: 'ws-aurora 14s ease-in-out infinite' }}
        />
        <div
          className="absolute top-1/3 -left-24 w-[26rem] h-[26rem] rounded-full bg-accent-500/15 blur-[110px]"
          style={{ animation: 'ws-aurora 18s ease-in-out infinite reverse' }}
        />
        <div
          className="absolute -bottom-32 right-1/3 w-[24rem] h-[24rem] rounded-full bg-primary-400/10 blur-[110px]"
          style={{ animation: 'ws-aurora 22s ease-in-out infinite' }}
        />
      </div>

      <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-xl">
          {/* نوار بالا: وضعیت + نصب */}
          <div className="ws-rise ws-d1 flex items-center justify-between mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs text-surface-300">
              <span className="relative flex w-2 h-2">
                <span
                  className="absolute inset-0 rounded-full bg-emerald-400"
                  style={{ animation: 'ws-pulse-ring 1.8s ease-out infinite' }}
                />
                <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              آنلاین و آماده گفتگو
            </div>
            <InstallButton />
          </div>

          {/* لوگو با حلقه‌های چرخان */}
          <div className="ws-rise ws-d2 flex justify-center mb-8">
            <div className="relative w-28 h-28 flex items-center justify-center" style={{ animation: 'ws-float 6s ease-in-out infinite' }}>
              <span
                className="absolute inset-0 rounded-full border border-dashed border-primary-400/40"
                style={{ animation: 'ws-orbit 18s linear infinite' }}
              >
                <span className="absolute -top-1 left-1/2 w-2 h-2 -translate-x-1/2 rounded-full bg-primary-400 shadow-[0_0_12px_2px] shadow-primary-400/80" />
              </span>
              <span
                className="absolute inset-3 rounded-full border border-accent-400/30"
                style={{ animation: 'ws-orbit-rev 12s linear infinite' }}
              >
                <span className="absolute -bottom-1 left-1/2 w-1.5 h-1.5 -translate-x-1/2 rounded-full bg-accent-400 shadow-[0_0_10px_2px] shadow-accent-400/80" />
              </span>
              <div className="relative p-3 rounded-2xl bg-surface-900/80 backdrop-blur-md ring-1 ring-white/15 shadow-[0_0_40px_-6px] shadow-primary-500/50">
                <img className="w-14 h-14 rounded-xl object-contain" src="/pwa-192x192.png" alt="لوگو" />
              </div>
            </div>
          </div>

          {/* خوش‌آمدگویی */}
          <div className="ws-rise ws-d3 text-center mb-8">
            <p className="text-sm text-surface-400 mb-2">
              {greeting.text} {greeting.emoji}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-surface-50 tracking-tight leading-tight">
              خوش آمدی،{' '}
              <span
                className="ws-title-grad text-transparent bg-clip-text bg-linear-to-r from-primary-300 via-accent-300 to-primary-300"
              >
                {user?.username}
              </span>{' '}
              <span className="ws-wave">👋</span>
            </h1>
            <p className="text-surface-400 mt-4 leading-8 max-w-md mx-auto">
              به چت مدرن BMS خوش اومدی. یک اتاق انتخاب کن، یا برای خودت یکی بساز و گفتگو رو شروع کن.
            </p>
          </div>

          {/* پروفایل + آمار */}
          <div className="ws-rise ws-d4 grid grid-cols-3 gap-3 mb-6">
            <button
              onClick={() => navigate('/profile')}
              className="col-span-1 group flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-primary-400/40 backdrop-blur-md transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              title="مشاهده پروفایل"
            >
              <div className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                <Avatar username={user?.username} avatarIndex={user?.avatarIndex} size="md" status="online" />
              </div>
              <span className="text-xs text-surface-400 group-hover:text-surface-100 transition-colors">پروفایل من</span>
            </button>

            <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <Icon d={ICONS.users} className="w-5 h-5 text-primary-400" />
              <span className="text-2xl font-bold text-surface-50">{faNum(publicRooms.length)}</span>
              <span className="text-xs text-surface-500">اتاق عمومی</span>
            </div>

            <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <Icon d={ICONS.chat} className="w-5 h-5 text-accent-400" />
              <span className="text-2xl font-bold text-surface-50">{faNum(rooms.length)}</span>
              <span className="text-xs text-surface-500">اتاق‌های تو</span>
            </div>
          </div>

          {/* اتاق‌های پیشنهادی */}
          <div className="ws-rise ws-d5 rounded-3xl bg-surface-900/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                <Icon d={ICONS.bolt} className="w-4 h-4 text-primary-400" />
                اتاق‌های پیشنهادی
              </h2>
              <span className="text-xs text-surface-500">{faNum(suggestedRooms.length)} مورد</span>
            </div>

            <div className="p-2 flex flex-col gap-1.5">
              {suggestedRooms.map((room, i) => {
                const isBms = room.name.toLowerCase().includes('bms');
                const members = getMemberCount(room);
                const isLoading = loadingId === room.id;

                return (
                  <button
                    key={room.id}
                    onClick={() => handleRoomClick(room)}
                    onMouseMove={handleCardMove}
                    disabled={!!loadingId}
                    style={{ animationDelay: `${0.5 + i * 0.1}s` }}
                    className="ws-card ws-rise group relative flex items-center gap-4 p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-right transition-all duration-300 cursor-pointer disabled:cursor-wait disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  >
                    <div className="relative w-12 h-12 shrink-0 rounded-xl bg-linear-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-primary-300 group-hover:from-primary-500 group-hover:to-accent-500 group-hover:text-white group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary-500/30 transition-all duration-300">
                      {isLoading ? <Spinner /> : <Icon d={ICONS.chat} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-surface-100 group-hover:text-white truncate transition-colors">
                          {room.name}
                        </span>
                        {isBms && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold bg-primary-500/10 text-primary-300 border border-primary-500/20 rounded-md">
                            BMS
                          </span>
                        )}
                      </div>
                      <span className="block text-xs text-surface-500 mt-1 truncate">
                        {room.isVirtual
                          ? 'هنوز ساخته نشده؛ یک کلیک و اتاق مال توئه'
                          : members !== null
                            ? `${faNum(members)} عضو · گفتگو رو شروع کن`
                            : 'عضو شو و گفتگو رو شروع کن'}
                      </span>
                    </div>

                    <Icon
                      d={ICONS.arrow}
                      className="w-5 h-5 shrink-0 text-surface-600 group-hover:text-primary-300 group-hover:-translate-x-1 transition-all duration-300"
                    />
                  </button>
                );
              })}
            </div>

            {/* ساخت اتاق جدید */}
            <div className="px-2 pb-2">
              {!showCreate ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/15 hover:border-primary-400/60 text-sm text-surface-400 hover:text-primary-300 hover:bg-primary-500/5 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                >
                  <Icon d={ICONS.plus} className="w-4 h-4" />
                  ساخت اتاق جدید
                </button>
              ) : (
                <form onSubmit={handleCreateSubmit} className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 ws-rise">
                  <label htmlFor="ws-new-room" className="flex items-center gap-1.5 text-xs text-surface-400 mb-2">
                    <Icon d={ICONS.spark} className="w-3.5 h-3.5 text-accent-400" />
                    اسم اتاق جدید رو بنویس
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="ws-new-room"
                      autoFocus
                      value={newRoom}
                      onChange={(e) => {
                        setNewRoom(e.target.value);
                        if (createError) setCreateError('');
                      }}
                      maxLength={40}
                      placeholder="مثلاً: دورهمی دوستان"
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-surface-950/60 border border-white/10 focus:border-primary-400/70 focus:ring-2 focus:ring-primary-500/30 outline-none text-sm text-surface-100 placeholder:text-surface-600 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={creating || !newRoom.trim()}
                      className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/45 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all cursor-pointer"
                    >
                      {creating ? <Spinner /> : 'بساز'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreate(false);
                        setNewRoom('');
                        setCreateError('');
                      }}
                      className="shrink-0 px-3 rounded-xl text-surface-400 hover:text-surface-100 hover:bg-white/5 text-sm transition-colors cursor-pointer"
                      aria-label="انصراف"
                    >
                      ✕
                    </button>
                  </div>
                  {createError && (
                    <p role="alert" className="mt-2 text-xs text-rose-400">
                      {createError}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>

          <p className="ws-rise ws-d6 mt-6 text-xs text-surface-500 flex items-center justify-center gap-1.5">
            <Icon d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-3.5 h-3.5" />
            با کلیک روی هر اتاق، به صورت خودکار واردش می‌شی.
          </p>
        </div>
      </div>
    </div>
  );
}