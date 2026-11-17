import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { sileo } from 'sileo';
import { useChat } from '../hooks/useChat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ----------------------------
// Icons Paths
// ----------------------------
const PATHS = {
    close: 'M6 18L18 6M6 6l12 12',
    arrowRight: 'M10 5l-7 7m0 0l7 7m-7-7h18',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    logOut: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    check: 'M5 13l4 4L19 7',
    eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
};

function Icon({ name, className = 'w-5 h-5' }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={PATHS[name]} />
        </svg>
    );
}

// ----------------------------
// UI Building Blocks
// ----------------------------
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

function Section({ title, children }) {
    return (
        <section className="rounded-2xl bg-surface-900/60 ring-1 ring-white/[0.06] p-4 sm:p-5 min-w-0 space-y-1">
            <h3 className="text-[11px] font-bold tracking-wide text-surface-400 mb-3 uppercase">{title}</h3>
            <div className="space-y-2">{children}</div>
        </section>
    );
}

function Toggle({ checked, onChange, label }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${checked ? 'bg-primary-500' : 'bg-surface-700'
                }`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
            />
        </button>
    );
}

function SettingItem({ icon, label, description, children }) {
    return (
        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-surface-950/40 ring-1 ring-white/[0.04] hover:bg-surface-900/60 transition-colors group">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/5 text-primary-300 shrink-0 group-hover:bg-primary-500/10 group-hover:text-primary-400 transition-colors">
                    <Icon name={icon} className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-surface-50 truncate">{label}</p>
                    {description && <p className="text-[11px] text-surface-500 mt-0.5 truncate">{description}</p>}
                </div>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

function SettingsSkeleton() {
    return (
        <div className="animate-pulse min-h-full">
            <div className="h-36 sm:h-44 bg-surface-800" />
            <div className="px-4 sm:px-6 -mt-12 sm:-mt-14 space-y-4">
                <div className="w-24 h-24 rounded-full bg-surface-700 ring-[6px] ring-surface-950" />
                <div className="h-6 w-40 rounded-lg bg-surface-800" />
                <div className="space-y-3 pt-4">
                    <div className="h-16 rounded-2xl bg-surface-800/70" />
                    <div className="h-16 rounded-2xl bg-surface-800/70" />
                </div>
            </div>
        </div>
    );
}

// ----------------------------
// Main Component
// ----------------------------
export default function Settings({ currentUser }) { // 👈 دریافت currentUser از App.jsx
    const navigate = useNavigate();
    const chat = useChat();
    const [user, setUser] = useState(currentUser); // 👈 مقداردهی اولیه با currentUser (جلوگیری از صفحه سفید)
    const [loading, setLoading] = useState(!currentUser);

    const [settings, setSettings] = useState({
        notifications: true,
        readReceipts: true,
        onlineStatus: true,
    });

    useEffect(() => {
        if (user) return; // اگر کاربر از قبل وجود دارد، درخواست اضافی نفرست

        let ignore = false;
        (async () => {
            try {
                const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
                const data = await res.json();
                if (!ignore && data?.success) {
                    setUser(data.user);
                } else if (!ignore) {
                    // اگر درخواست شکست خورد، حداقل currentUser را نشان بده
                    setUser(currentUser);
                }
            } catch (err) {
                console.error('Failed to fetch user', err);
                if (!ignore) setUser(currentUser);
            } finally {
                if (!ignore) setLoading(false);
            }
        })();
        return () => { ignore = true; };
    }, [currentUser, user]);

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        sileo.success({
            title: 'ذخیره شد',
            description: 'تنظیمات با موفقیت به‌روزرسانی شد.',
            duration: 2000,
        });
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
            sileo.success({ title: 'خروج موفق', description: 'به امید دیدار!' });
            await chat.logout();
        } catch (err) {
            sileo.error({ title: 'خطا', description: 'مشکلی در خروج پیش آمد.' }, err);
        }
    };

    if (loading) return <SettingsSkeleton />;

    // 👈 تغییر حیاتی: به جای return null، یک پیام خطا نشان بده
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-5">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20 grid place-items-center text-red-400">
                    <Icon name="warning" className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-surface-50">خطا در بارگذاری پروفایل</h3>
                <button onClick={() => navigate('/chat')} className="btn-primary px-6 py-2 rounded-xl cursor-pointer mt-4">
                    بازگشت به چت
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col bg-surface-950/70 backdrop-blur-sm overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">

                {/* ── Banner ───────────────────────────────────────── */}
                <div className="relative h-36 sm:h-44 bg-linear-to-br from-surface-800 to-surface-950">
                    <div className="absolute inset-0 opacity-[.08] mix-blend-overlay pointer-events-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence baseFrequency=%27.9%27 numOctaves=%272%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-surface-950/80 to-transparent pointer-events-none" />

                    <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 flex items-center justify-between z-20">
                        <h2 className="text-sm font-bold text-white/90 backdrop-blur-md px-3 py-1.5 rounded-full bg-black/20 ring-1 ring-white/10">تنظیمات</h2>
                        <IconButton icon="arrowRight" label="بازگشت" onClick={() => navigate('/chat')} />
                    </div>
                </div>

                {/* ── Identity Summary ─────────────────────────────── */}
                <div className="relative z-10 px-4 sm:px-6">
                    <div className="flex items-end gap-3 sm:gap-4 -mt-12 sm:-mt-14">
                        <div className="relative shrink-0">
                            <div className="rounded-full p-[5px] bg-surface-950">
                                <Avatar username={user.username} size="xl" status="online" />
                            </div>
                        </div>
                        <div className="pb-1 flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-surface-50 truncate">{user.username}</h1>
                            <p dir="ltr" className="text-xs font-mono text-surface-500 mt-0.5 text-left truncate">{user.email || 'کاربر عادی'}</p>
                        </div>
                        <button
                            onClick={() => navigate('/profile/edit')}
                            className="shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer
                         bg-primary-500/10 text-primary-300 ring-1 ring-primary-500/30 backdrop-blur-md
                         hover:bg-primary-500/20 hover:ring-primary-500/50 active:scale-95 transition-all whitespace-nowrap"
                        >
                            <Icon name="user" className="w-4 h-4" />
                            <span className="hidden sm:inline">ویرایش</span>
                        </button>
                    </div>
                </div>

                {/* ── Settings Body ────────────────────────────────── */}
                <div className="px-4 sm:px-6 mt-6 pb-8 space-y-4 sm:space-y-5 animate-slide-up">
                    <Section title="حریم خصوصی و ظاهر">
                        <SettingItem icon="eye" label="وضعیت آنلاین" description="نمایش وضعیت آنلاین بودن شما به سایر کاربران">
                            <Toggle checked={settings.onlineStatus} onChange={(v) => handleSettingChange('onlineStatus', v)} label="تغییر وضعیت آنلاین" />
                        </SettingItem>
                        <SettingItem icon="check" label="تیک خوانده شدن" description="نمایش تیک دوم وقتی پیام شما خوانده می‌شود">
                            <Toggle checked={settings.readReceipts} onChange={(v) => handleSettingChange('readReceipts', v)} label="تغییر وضعیت تیک خوانده شدن" />
                        </SettingItem>
                    </Section>

                    <Section title="اعلان‌ها">
                        <SettingItem icon="bell" label="اعلان‌های دسکتاپ" description="دریافت نوتیفیکیشن هنگام دریافت پیام جدید">
                            <Toggle checked={settings.notifications} onChange={(v) => handleSettingChange('notifications', v)} label="تغییر وضعیت اعلان‌ها" />
                        </SettingItem>
                    </Section>

                    <Section title="حساب کاربری">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-between gap-4 p-3 rounded-xl bg-red-500/5 ring-1 ring-red-500/20 
                         hover:bg-red-500/10 hover:ring-red-500/40 transition-all group text-right cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <span className="grid place-items-center w-9 h-9 rounded-xl bg-red-500/10 text-red-400 shrink-0 group-hover:bg-red-500/20 transition-colors">
                                    <Icon name="logOut" className="w-[18px] h-[18px]" />
                                </span>
                                <div>
                                    <p className="text-sm font-medium text-red-300">خروج از حساب</p>
                                    <p className="text-[11px] text-red-400/70 mt-0.5">خروج از تمام دستگاه‌های فعال</p>
                                </div>
                            </div>
                            <Icon name="arrowRight" className="w-4 h-4 text-red-400/50 group-hover:text-red-400 transition-colors" />
                        </button>
                    </Section>


                </div>
            </div>
        </div>
    );
}