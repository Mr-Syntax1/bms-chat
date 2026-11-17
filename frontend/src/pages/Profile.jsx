import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { sileo } from "sileo";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ----------------------------
// Helpers
//  ---------------------------
const formatPersianDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return '—';
  }
};

const persianNumber = (n) => Number(n || 0).toLocaleString('fa-IR');

const relativeFromNow = (dateString) => {
  const date = new Date(dateString);
  if (!dateString || Number.isNaN(date.getTime())) return '';
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' });
  for (const [unit, secs] of units) {
    if (Math.abs(diffSec) >= secs) return rtf.format(Math.round(diffSec / secs), unit);
  }
  return 'همین الان';
};

const hashHue = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
};

// ----------------------------
// Toast
//  ---------------------------

// ----------------------------
// Icons
//  ---------------------------
const PATHS = {
  close: 'M6 18L18 6M6 6l12 12',
  arrowRight: 'M10 5l-7 7m0 0l7 7m-7-7h18',
  message:
    'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  calendar:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  copy: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3',
  check: 'M5 13l4 4L19 7',
  share:
    'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  warning:
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  hash: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14',
};

function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={PATHS[name]} />
    </svg>
  );
}

// ----------------------------
// Small building blocks
//  ---------------------------
function IconButton({ icon, label, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid place-items-center w-10 h-10 sm:w-9 sm:h-9 rounded-full cursor-pointer transition-all
                  bg-black/30 text-white/85 backdrop-blur-md ring-1 ring-white/10
                  hover:bg-black/50 hover:text-white hover:scale-105 active:scale-95
                  focus-visible:outline-2 focus-visible:outline-primary-400 ${className}`}
    >
      <Icon name={icon} className="w-[18px] h-[18px]" />
    </button>
  );
}

function Section({ title, action, children }) {
  return (
    <section className="rounded-2xl bg-surface-900/60 ring-1 ring-white/[0.06] p-4 sm:p-5 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
        <h3 className="text-[11px] font-bold tracking-wide text-surface-400 truncate">
          {title}
        </h3>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-900/60 ring-1 ring-white/[0.06] px-4 py-3 min-w-0">
      <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/5 text-primary-300 shrink-0">
        <Icon name={icon} className="w-[18px] h-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-surface-50 leading-tight truncate">{value}</p>
        <p className="text-[11px] text-surface-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse min-h-full">
      <div className="h-36 sm:h-44 bg-surface-800" />
      <div className="px-4 sm:px-6 -mt-12 sm:-mt-14 space-y-4">
        <div className="w-24 h-24 rounded-full bg-surface-700 ring-[6px] ring-surface-950" />
        <div className="h-6 w-40 rounded-lg bg-surface-800" />
        <div className="h-4 w-28 rounded-lg bg-surface-800/70" />
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="h-16 flex-1 rounded-2xl bg-surface-800/70" />
          <div className="h-16 flex-1 rounded-2xl bg-surface-800/70" />
        </div>
        <div className="h-28 rounded-2xl bg-surface-800/70" />
      </div>
    </div>
  );
}


// ----------------------------
// Main
//  ---------------------------
export default function Profile({ onClose, currentUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [idCopied, setIdCopied] = useState(false);

  const navigate = useNavigate();
  const { username } = useParams();

  const isMyProfile = !username || username === currentUser?.username;
  const targetUsername = username || currentUser?.username;

  // fetchProfile دیگر setState ندارد — فقط داده برمی‌گرداند
  const fetchProfile = useCallback(async () => {
    const url = isMyProfile ? `${API_URL}/auth/profile` : `${API_URL}/auth/profile/${targetUsername}`;
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'کاربر پیدا نشد');
    }
    return data.user;
  }, [isMyProfile, targetUsername]);

  useEffect(() => {
    let ignore = false;

    // setStateها داخل async flow (بعد از اولین await) اجرا می‌شوند → همگام نیستند
    (async () => {
      try {
        const user = await fetchProfile();
        if (!ignore) {
          setProfile(user);
          setError('');
        }
      } catch (err) {
        if (!ignore) setError(err.message || 'خطای اتصال به سرور');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [fetchProfile]);

  /* Esc closes */
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async (text, okMessage, onDone) => {
    try {
      await navigator.clipboard.writeText(text);
      sileo.success({
        title: 'کپی شد',
        description: okMessage,
      });
      onDone?.();
    } catch {
      sileo.error({
        title: 'خطا',
        description: 'امکان کپی وجود ندارد',
      });
    }
  };

  const copyId = () => {
    copy(profile.id, 'شناسه کاربری با موفقیت کپی شد', () => {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 1000);
    });
  };

  const share = () => {
    const url = `${window.location.origin}/profile/${profile.username}`;
    if (navigator.share) {
      navigator.share({ title: `پروفایل ${profile.username}`, url }).catch(() => { });
    } else {
      copy(url, 'لینک پروفایل با موفقیت کپی شد');
    }
  };

  const banner = useMemo(() => {
    const h = hashHue(profile?.username);
    const h2 = (h + 55) % 360;
    return {
      background: `radial-gradient(120% 140% at 15% 0%, hsl(${h} 80% 60% / .85), transparent 60%),
                   radial-gradient(100% 120% at 100% 100%, hsl(${h2} 85% 55% / .75), transparent 55%),
                   linear-gradient(135deg, hsl(${h} 50% 22%), hsl(${h2} 50% 16%))`,
      accent: `hsl(${h} 85% 70%)`,
    };
  }, [profile?.username]);

  if (loading) return <ProfileSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-5">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20 grid place-items-center text-red-400">
          <Icon name="warning" className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-bold text-surface-50">خطا در دریافت پروفایل</h3>
          <p className="text-sm text-surface-400 mt-1">{error}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={fetchProfile}
            className="btn-primary px-6 py-2 rounded-xl cursor-pointer"
          >
            تلاش مجدد
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="btn-ghost px-6 py-2 rounded-xl border border-white/10 cursor-pointer"
            >
              بستن
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const isOnline = profile.isOnline ?? isMyProfile;
  const joinedFull = formatPersianDate(profile.createdAt);
  const joinedAgo = relativeFromNow(profile.createdAt);
  const idShort = profile.id ? `…${profile.id.slice(-6)}` : '—';

  return (
    <div className="h-screen w-full flex flex-col bg-surface-950/70 backdrop-blur-sm overflow-hidden">
      {/* ── ناحیه اسکرول‌پذیر ───────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* ── Banner ───────────────────────────────────────── */}
        <div
          className="relative h-36 sm:h-44"
          style={{ background: banner.background }}
        >
          {/* noise overlay */}
          <div
            className="absolute inset-0 opacity-[.12] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence baseFrequency=%27.9%27 numOctaves=%272%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
            }}
          />

          {/* bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-surface-950/55 to-transparent pointer-events-none" />

          {/* floating actions */}
          <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 flex items-center justify-between z-20">
            <div className="flex gap-2">
              {onClose && <IconButton icon="close" label="بستن" onClick={onClose} />}
            </div>
            <div className="flex gap-2">
              <IconButton icon="share" label="اشتراک‌گذاری پروفایل" onClick={share} />
              <IconButton
                icon="arrowRight"
                label="بازگشت به صفحه اصلی"
                onClick={() => {
                  if (onClose) onClose();
                  navigate('/');
                }}
              />
            </div>
          </div>

        </div>

        {/* ── Identity ─────────────────────────────────────── */}
        <div className="relative z-10 px-4 sm:px-6">
          <div className="flex items-end gap-3 sm:gap-4 -mt-12 sm:-mt-14">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="rounded-full p-[5px] bg-surface-950">
                <Avatar
                  username={profile.username}
                  size="xl"
                  status={isOnline ? 'online' : 'offline'}
                />
              </div>
              <span
                title={isOnline ? 'آنلاین' : 'آفلاین'}
                className={`absolute bottom-2 right-2 w-5 h-5 rounded-full ring-[5px] ring-surface-950 ${isOnline ? 'bg-success-500' : 'bg-surface-500'
                  }`}
              />
            </div>

            {/* Primary CTA */}
            <div className="relative z-20 pb-1 mr-auto">
              {isMyProfile ? (
                <button
                  onClick={() => navigate('/settings')}
                  className="group inline-flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium cursor-pointer
                             bg-surface-900/90 text-surface-100 ring-1 ring-white/15 backdrop-blur-md
                             hover:bg-surface-800 hover:ring-white/25 active:scale-95 transition-all whitespace-nowrap"
                >
                  <Icon name="edit" className="w-4 h-4" />
                  تنظیمات پروفایل
                </button>
              ) : (
                <button
                  onClick={() =>
                    navigate('/chat', { state: { username: profile.username } })
                  }
                  className="btn-primary group relative inline-flex items-center gap-2 rounded-xl
                             px-4 sm:px-5 py-2 sm:py-2.5
                             text-xs sm:text-sm font-semibold text-white
                             bg-linear-to-br from-primary-500 to-primary-600
                             ring-1 ring-primary-400/40
                             shadow-lg shadow-primary-500/25
                             hover:shadow-xl hover:shadow-primary-500/40
                             hover:-translate-y-0.5
                             active:translate-y-0 active:scale-[0.97]
                             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400
                             transition-all duration-200
                             whitespace-nowrap overflow-hidden cursor-pointer"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100
                               transition-opacity duration-300
                               bg-linear-to-t from-white/0 via-white/10 to-white/0"
                  />
                  <Icon
                    name="message"
                    className="relative w-4 h-4 transition-transform duration-200 group-hover:scale-110"
                  />
                  <span className="relative">ارسال پیام</span>
                </button>
              )}
            </div>
          </div>

          {/* Name + handle */}
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-surface-50 break-all">
                {profile.username}
              </h1>
              {isMyProfile && (
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0"
                  style={{ color: banner.accent, background: 'rgb(255 255 255 / .06)' }}
                >
                  شما
                </span>
              )}
            </div>
            <p
              dir="ltr"
              className="text-sm font-mono text-surface-500 mt-0.5 text-left"
              title={profile.id}
            >
              {idShort.replace('…', '')}
            </p>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 mt-5 pb-8 space-y-3 sm:space-y-4 animate-slide-up">
          {/* stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Stat
              icon="message"
              label="پیام ارسال‌شده"
              value={persianNumber(profile.messageCount)}
            />
            <Stat
              icon="calendar"
              label={joinedAgo ? `عضو شده ${joinedAgo}` : 'عضو از'}
              value={joinedFull}
            />
          </div>

          {/* about */}
          <Section
            title="درباره من"
            action={
              isMyProfile && (
                <button
                  onClick={() => navigate('/settings')}
                  className="text-[11px] text-primary-400 hover:text-primary-300 cursor-pointer transition-colors"
                >
                  ویرایش
                </button>
              )
            }
          >
            {profile.bio ? (
              <p className="text-sm text-surface-200 leading-7 whitespace-pre-line break-words">
                {profile.bio}
              </p>
            ) : (
              <p className="text-sm text-surface-500 leading-7">
                {isMyProfile
                  ? 'هنوز چیزی درباره خودت ننوشتی. یک بیو کوتاه اضافه کن تا بقیه بهتر بشناسنت.'
                  : 'این کاربر هنوز توضیحی ننوشته است.'}
              </p>
            )}
          </Section>

          {/* ID chip */}
          {profile.id && (
            <button
              type="button"
              onClick={copyId}
              className="group w-full flex items-center justify-between gap-3 rounded-2xl bg-surface-900/60
                         ring-1 ring-white/[0.06] px-4 py-3 cursor-pointer text-start
                         hover:ring-primary-500/30 hover:bg-surface-900/80 transition-all"
              aria-label="کپی شناسه کاربری"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/5 text-surface-400 shrink-0">
                  <Icon name="hash" className="w-[18px] h-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-surface-500">شناسه کاربری</span>
                  <span
                    dir="ltr"
                    className="block text-sm font-mono text-surface-200 truncate text-left"
                  >
                    {idShort}
                  </span>
                </span>
              </span>
              <span
                className={`flex items-center gap-1.5 text-xs shrink-0 transition-colors ${idCopied
                  ? 'text-success-400'
                  : 'text-surface-500 group-hover:text-primary-400'
                  }`}
              >
                <Icon name={idCopied ? 'check' : 'copy'} className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {idCopied ? 'کپی شد' : 'کپی'}
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div >
  );
}