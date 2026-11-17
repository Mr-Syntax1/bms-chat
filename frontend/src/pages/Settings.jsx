import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sileo } from 'sileo';
import Avatar from '../components/Avatar';
import { loadUiPrefs, saveUiPrefs } from '../lib/uiPrefs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const BIO_MAX = 200;
const USERNAME_RE = /^\S{3,24}$/;

/* ───────────────────────── Helpers ───────────────────────── */
async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
        data = await res.json();
    } catch {
        /* بدنه‌ی خالی */
    }
    if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'خطا در ارتباط با سرور');
    }
    return data;
}

const hashHue = (str = '') => {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
};

const passwordScore = (pw) => {
    let s = 0;
    if (pw.length >= 8) s += 1;
    if (pw.length >= 12) s += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
    if (/\d/.test(pw)) s += 1;
    if (/[^A-Za-z0-9]/.test(pw)) s += 1;
    return Math.min(s, 4);
};
const STRENGTH = [
    { label: 'خیلی ضعیف', color: 'bg-red-500' },
    { label: 'ضعیف', color: 'bg-orange-500' },
    { label: 'متوسط', color: 'bg-yellow-500' },
    { label: 'خوب', color: 'bg-lime-500' },
    { label: 'عالی', color: 'bg-emerald-500' },
];

/* ───────────────────────── Icons ───────────────────────── */
const PATHS = {
    close: 'M6 18L18 6M6 6l12 12',
    arrowRight: 'M10 5l-7 7m0 0l7 7m-7-7h18',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    home: 'M3 12l9-9 9 9M4 10v10a1 1 0 001 1h4m10-11v10a1 1 0 01-1 1h-4',
    bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    logOut: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    check: 'M5 13l4 4L19 7',
    eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    eyeOff: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    volume: 'M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z',
    text: 'M4 7V4h16v3M9 20h6M12 4v16',
    sparkles: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    devices: 'M9 17h6m-3-3v3M5 5h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
    hash: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14',
    copy: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3',
    mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
};

function Icon({ name, className = 'w-5 h-5' }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={PATHS[name]} />
        </svg>
    );
}

function Spinner({ className = 'w-4 h-4' }) {
    return (
        <span className={`${className} inline-block rounded-full border-2 border-current border-t-transparent animate-spin`} />
    );
}

/* ───────────────────────── Building blocks ───────────────────────── */
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

function Section({ icon, title, description, children }) {
    return (
        <section className="rounded-2xl bg-surface-900/60 ring-1 ring-white/[0.06] p-4 sm:p-5 min-w-0">
            <header className="flex items-center gap-3 mb-4">
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary-500/10 text-primary-300 shrink-0">
                    <Icon name={icon} className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-surface-50 truncate">{title}</h2>
                    {description && <p className="text-[11px] text-surface-500 mt-0.5">{description}</p>}
                </div>
            </header>
            <div className="space-y-2.5 min-w-0">{children}</div>
        </section>
    );
}

function Toggle({ checked, onChange, label, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5
                  transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${checked ? 'bg-primary-500' : 'bg-surface-700'}`}
        >
            <span
                className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200
                    ${checked ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`}
            />
        </button>
    );
}

function SettingItem({ icon, label, description, children, stack = false }) {
    return (
        <div
            className={`group rounded-xl bg-surface-950/40 ring-1 ring-white/[0.04] hover:bg-surface-900/60 transition-colors p-3
                  ${stack ? 'space-y-3' : 'flex items-center justify-between gap-4'}`}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/5 text-primary-300 shrink-0 group-hover:bg-primary-500/10 transition-colors">
                    <Icon name={icon} className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-surface-50">{label}</p>
                    {description && <p className="text-[11px] leading-5 text-surface-500 mt-0.5">{description}</p>}
                </div>
            </div>
            {children && <div className={stack ? '' : 'shrink-0'}>{children}</div>}
        </div>
    );
}

function Field({ label, hint, error, children, counter }) {
    return (
        <label className="block min-w-0">
            <span className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-surface-300">{label}</span>
                {counter && <span className="text-[11px] tabular-nums text-surface-500">{counter}</span>}
            </span>
            {children}
            {error ? (
                <span className="block mt-1.5 text-[11px] text-red-400">{error}</span>
            ) : (
                hint && <span className="block mt-1.5 text-[11px] text-surface-500">{hint}</span>
            )}
        </label>
    );
}

const inputCls =
    'w-full rounded-xl bg-surface-950/60 ring-1 ring-white/10 px-3.5 py-2.5 text-[16px] sm:text-sm text-surface-50 ' +
    'placeholder:text-surface-600 outline-none transition focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50';

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                dir="ltr"
                className={`${inputCls} ps-11 text-left`}
            />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'}
                className="absolute inset-y-0 start-0 grid w-11 place-items-center text-surface-500 hover:text-surface-200 cursor-pointer"
            >
                <Icon name={show ? 'eyeOff' : 'eye'} className="w-[18px] h-[18px]" />
            </button>
        </div>
    );
}

function Segmented({ value, onChange, options, label }) {
    return (
        <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-surface-950/70 p-1 ring-1 ring-white/10">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-medium cursor-pointer transition-all
            ${value === o.value ? 'bg-primary-500 text-white shadow' : 'text-surface-400 hover:text-surface-100'}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function Button({ variant = 'primary', loading, className = '', children, ...props }) {
    const variants = {
        primary:
            'bg-linear-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 ring-1 ring-primary-400/40 hover:shadow-primary-500/40',
        ghost: 'bg-white/5 text-surface-200 ring-1 ring-white/10 hover:bg-white/10',
        danger: 'bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600',
        dangerGhost: 'bg-red-500/10 text-red-300 ring-1 ring-red-500/25 hover:bg-red-500/20',
    };
    return (
        <button
            {...props}
            disabled={props.disabled || loading}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer
                  transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400
                  ${variants[variant]} ${className}`}
        >
            {loading && <Spinner />}
            {children}
        </button>
    );
}

/* ───────────────────────── Confirm modal ───────────────────────── */
function Modal({ open, onClose, title, description, icon = 'warning', tone = 'danger', children }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open) return null;
    const toneCls = tone === 'danger' ? 'bg-red-500/10 text-red-400 ring-red-500/20' : 'bg-primary-500/10 text-primary-300 ring-primary-500/20';

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-surface-900 ring-1 ring-white/10 shadow-2xl
                      p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-slide-up">
                <div className="sm:hidden mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />
                <div className="flex items-start gap-3 mb-4">
                    <span className={`grid place-items-center w-11 h-11 rounded-2xl ring-1 shrink-0 ${toneCls}`}>
                        <Icon name={icon} className="w-6 h-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-surface-50">{title}</h3>
                        {description && <p className="text-sm text-surface-400 mt-1 leading-6">{description}</p>}
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}

/* ───────────────────────── Main ───────────────────────── */
export default function Settings({ currentUser, onLogout, onUserUpdate }) {
    const navigate = useNavigate();
    const user = currentUser;

    /* ── پروفایل ── */
    const [username, setUsername] = useState(user?.username || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState('');

    const profileDirty = username.trim() !== (user?.username || '') || bio.trim() !== (user?.bio || '');
    const usernameInvalid = username.trim() !== '' && !USERNAME_RE.test(username.trim());

    // همگام‌سازی با تغییرات بیرونی user
    useEffect(() => {
        setUsername(user?.username || '');
        setBio(user?.bio || '');
    }, [user?.username, user?.bio]);

    const saveProfile = async () => {
        if (!profileDirty || usernameInvalid || savingProfile) return;
        setSavingProfile(true);
        setProfileError('');
        try {
            const data = await api('/auth/profile', {
                method: 'PATCH',
                body: { username: username.trim(), bio: bio.trim() },
            });
            // اگر نام کاربری عوض شده باشد سرور توکن تازه هم برمی‌گرداند
            onUserUpdate?.(data.user || { ...user, username: username.trim(), bio: bio.trim() }, data.token);
            sileo.success({ title: 'ذخیره شد', description: 'پروفایل شما به‌روزرسانی شد.', duration: 2000 });
        } catch (err) {
            setProfileError(err.message);
            sileo.error({ title: 'خطا', description: err.message });
        } finally {
            setSavingProfile(false);
        }
    };

    const resetProfile = () => {
        setUsername(user?.username || '');
        setBio(user?.bio || '');
        setProfileError('');
    };

    /* ── تنظیمات سرور (حریم خصوصی) ── */
    const [privacy, setPrivacy] = useState({
        onlineStatus: user?.settings?.onlineStatus ?? true,
        readReceipts: user?.settings?.readReceipts ?? true,
    });
    const [pendingKey, setPendingKey] = useState(null);

    const changePrivacy = async (key, value) => {
        const prev = privacy[key];
        setPrivacy((p) => ({ ...p, [key]: value })); // optimistic
        setPendingKey(key);
        try {
            await api('/auth/settings', { method: 'PATCH', body: { [key]: value } });
            onUserUpdate?.({ ...user, settings: { ...(user?.settings || {}), ...privacy, [key]: value } });
            sileo.success({ title: 'ذخیره شد', description: 'تنظیمات به‌روزرسانی شد.', duration: 1800 });
        } catch (err) {
            setPrivacy((p) => ({ ...p, [key]: prev })); // rollback
            sileo.error({ title: 'ذخیره نشد', description: err.message });
        } finally {
            setPendingKey(null);
        }
    };

    /* ── ترجیحات محلی ── */
    const [prefs, setPrefs] = useState(loadUiPrefs);
    const [notifPerm, setNotifPerm] = useState(
        typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
    );

    const updatePref = (key, value) => {
        setPrefs((p) => {
            const next = { ...p, [key]: value };
            saveUiPrefs(next);
            return next;
        });
    };

    const toggleNotifications = async (value) => {
        if (!value) return updatePref('notifications', false);
        if (notifPerm === 'unsupported') {
            return sileo.error({ title: 'پشتیبانی نمی‌شود', description: 'این مرورگر از اعلان‌ها پشتیبانی نمی‌کند.' });
        }
        let perm = Notification.permission;
        if (perm === 'default') perm = await Notification.requestPermission();
        setNotifPerm(perm);
        if (perm === 'granted') {
            updatePref('notifications', true);
            new Notification('اعلان‌ها فعال شد', { body: 'از این پس پیام‌های جدید را اینجا می‌بینید.' });
        } else {
            updatePref('notifications', false);
            sileo.error({
                title: 'دسترسی داده نشد',
                description: 'اجازه‌ی اعلان را از تنظیمات مرورگر فعال کنید.',
            });
        }
    };

    /* ── رمز عبور ── */
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
    const [savingPw, setSavingPw] = useState(false);
    const score = passwordScore(pw.next);
    const pwMismatch = pw.confirm !== '' && pw.next !== pw.confirm;
    const pwValid = pw.current && pw.next.length >= 8 && pw.next === pw.confirm;

    const changePassword = async () => {
        if (!pwValid || savingPw) return;
        setSavingPw(true);
        try {
            const data = await api('/auth/change-password', {
                method: 'POST',
                body: { currentPassword: pw.current, newPassword: pw.next },
            });
            // توکن تازه برای دستگاه فعلی (سایر دستگاه‌ها خارج می‌شوند)
            if (data.token) onUserUpdate?.(user, data.token);
            setPw({ current: '', next: '', confirm: '' });
            sileo.success({ title: 'رمز تغییر کرد', description: 'رمز عبور شما با موفقیت عوض شد.' });
        } catch (err) {
            sileo.error({ title: 'خطا', description: err.message });
        } finally {
            setSavingPw(false);
        }
    };

    /* ── نشست‌ها / خروج ── */
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutAllOpen, setLogoutAllOpen] = useState(false);
    const [loggingOutAll, setLoggingOutAll] = useState(false);

    const logout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            await onLogout();
            sileo.success({ title: 'خروج موفق', description: 'به امید دیدار!' });
            navigate('/login', { replace: true });
        } finally {
            setLoggingOut(false);
        }
    };

    const logoutAll = async () => {
        setLoggingOutAll(true);
        try {
            await api('/auth/logout-all', { method: 'POST' });
            setLogoutAllOpen(false);
            await onLogout();
            navigate('/login', { replace: true });
        } catch (err) {
            sileo.error({ title: 'خطا', description: err.message });
        } finally {
            setLoggingOutAll(false);
        }
    };

    /* ── حذف حساب ── */
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteName, setDeleteName] = useState('');
    const [deletePw, setDeletePw] = useState('');
    const [deleting, setDeleting] = useState(false);
    const closeDelete = useCallback(() => {
        setDeleteOpen(false);
        setDeleteName('');
        setDeletePw('');
    }, []);

    const deleteAccount = async () => {
        setDeleting(true);
        try {
            await api('/auth/account', { method: 'DELETE', body: { password: deletePw } });
            closeDelete();
            await onLogout();
            sileo.success({ title: 'حساب حذف شد', description: 'اطلاعات شما پاک شد.' });
            navigate('/login', { replace: true });
        } catch (err) {
            sileo.error({ title: 'خطا', description: err.message });
        } finally {
            setDeleting(false);
        }
    };

    /* ── کپی شناسه ── */
    const [idCopied, setIdCopied] = useState(false);
    const copyId = async () => {
        try {
            await navigator.clipboard.writeText(user.id);
            setIdCopied(true);
            sileo.success({ title: 'کپی شد', description: 'شناسه کاربری کپی شد.', duration: 1500 });
            setTimeout(() => setIdCopied(false), 1200);
        } catch {
            sileo.error({ title: 'خطا', description: 'امکان کپی وجود ندارد' });
        }
    };

    /* ── بنر ── */
    const banner = useMemo(() => {
        const h = hashHue(user?.username);
        const h2 = (h + 55) % 360;
        return {
            background: `radial-gradient(120% 140% at 15% 0%, hsl(${h} 80% 60% / .85), transparent 60%),
                   radial-gradient(100% 120% at 100% 100%, hsl(${h2} 85% 55% / .75), transparent 55%),
                   linear-gradient(135deg, hsl(${h} 50% 22%), hsl(${h2} 50% 16%))`,
        };
    }, [user?.username]);

    const bioRef = useRef(null);
    useEffect(() => {
        const el = bioRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }, [bio]);

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-dvh text-center p-8 gap-5">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20 grid place-items-center text-red-400">
                    <Icon name="warning" className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-surface-50">خطا در بارگذاری حساب کاربری</h3>
                <Button onClick={() => navigate('/chat')}>بازگشت به چت</Button>
            </div>
        );
    }

    /* ───────────────────────── رندر ───────────────────────── */
    return (
        <div className="h-dvh w-full flex flex-col bg-surface-950/70 backdrop-blur-sm overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {/* ── Banner ── */}
                <div className="relative h-36 sm:h-44" style={{ background: banner.background }}>
                    <div
                        className="absolute inset-0 opacity-[.12] mix-blend-overlay pointer-events-none"
                        style={{
                            backgroundImage:
                                'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence baseFrequency=%27.9%27 numOctaves=%272%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
                        }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-surface-950/55 to-transparent pointer-events-none" />

                    <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 flex items-center justify-between z-20">
                        <h1 className="text-sm font-bold text-white/90 backdrop-blur-md px-3 py-1.5 rounded-full bg-black/25 ring-1 ring-white/10">
                            تنظیمات
                        </h1>

                        <div className="flex items-center gap-2">
                            <IconButton
                                icon="home"
                                label="صفحه اصلی"
                                onClick={() => navigate('/')}
                            />
                            <IconButton
                                icon="arrowRight"
                                label="بازگشت"
                                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/chat'))}
                            />
                        </div>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-3xl">
                    {/* ── Identity ── */}
                    <div className="relative z-10 px-4 sm:px-6">
                        <div className="flex items-end gap-3 sm:gap-4 -mt-12 sm:-mt-14">
                            <div className="relative shrink-0">
                                <div className="rounded-full p-[5px] bg-surface-950">
                                    <Avatar username={user.username} size="xl" status="online" />
                                </div>
                            </div>
                            <div className="pb-1 flex-1 min-w-0">
                                <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-surface-50 truncate">{user.username}</p>
                                <p dir="ltr" className="text-xs font-mono text-surface-500 mt-0.5 text-left truncate">
                                    {user.email || 'بدون ایمیل'}
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/profile')}
                                className="shrink-0 mb-1 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer
                           bg-surface-900/90 text-surface-100 ring-1 ring-white/15 backdrop-blur-md
                           hover:bg-surface-800 hover:ring-white/25 active:scale-95 transition-all whitespace-nowrap"
                            >
                                <Icon name="user" className="w-4 h-4" />
                                <span className="hidden sm:inline">مشاهده پروفایل</span>
                            </button>
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="px-4 sm:px-6 mt-6 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-3 sm:space-y-4 animate-slide-up">
                        {/* پروفایل */}
                        <Section icon="user" title="ویرایش پروفایل" description="نام کاربری و بیوگرافی که دیگران می‌بینند">
                            <Field
                                label="نام کاربری"
                                hint="۳ تا ۲۴ کاراکتر، بدون فاصله"
                                error={usernameInvalid ? 'نام کاربری معتبر نیست' : ''}
                            >
                                <input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    maxLength={24}
                                    autoComplete="username"
                                    className={inputCls}
                                    placeholder="نام کاربری"
                                />
                            </Field>

                            <Field label="درباره من" counter={`${bio.length}/${BIO_MAX}`} hint="چند خط کوتاه درباره خودت بنویس">
                                <textarea
                                    ref={bioRef}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                                    rows={3}
                                    dir="auto"
                                    className={`${inputCls} resize-none leading-7`}
                                    placeholder="مثلاً: برنامه‌نویس، عاشق قهوه و کتاب..."
                                />
                            </Field>

                            {profileError && <p className="text-xs text-red-400">{profileError}</p>}

                            <div
                                className={`flex flex-col-reverse sm:flex-row gap-2 sm:justify-end transition-all duration-300 overflow-hidden
                  ${profileDirty ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
                            >
                                <Button variant="ghost" onClick={resetProfile} type="button">
                                    انصراف
                                </Button>
                                <Button
                                    onClick={saveProfile}
                                    loading={savingProfile}
                                    disabled={usernameInvalid || !username.trim()}
                                    type="button"
                                >
                                    ذخیره تغییرات
                                </Button>
                            </div>
                        </Section>

                        {/* حریم خصوصی */}
                        <Section icon="eye" title="حریم خصوصی" description="کنترل کنید دیگران چه چیزی از شما می‌بینند">
                            <SettingItem icon="eye" label="وضعیت آنلاین" description="نمایش آنلاین بودن شما به سایر کاربران">
                                <Toggle
                                    checked={privacy.onlineStatus}
                                    disabled={pendingKey === 'onlineStatus'}
                                    onChange={(v) => changePrivacy('onlineStatus', v)}
                                    label="وضعیت آنلاین"
                                />
                            </SettingItem>
                            <SettingItem icon="check" label="تیک خوانده‌شدن" description="نمایش تیک دوم وقتی پیام‌ها را می‌خوانید">
                                <Toggle
                                    checked={privacy.readReceipts}
                                    disabled={pendingKey === 'readReceipts'}
                                    onChange={(v) => changePrivacy('readReceipts', v)}
                                    label="تیک خوانده‌شدن"
                                />
                            </SettingItem>
                        </Section>

                        {/* اعلان‌ها */}
                        <Section icon="bell" title="اعلان‌ها" description="روی همین دستگاه ذخیره می‌شود">
                            <SettingItem
                                icon="bell"
                                label="اعلان مرورگر"
                                description={
                                    notifPerm === 'denied'
                                        ? 'دسترسی در مرورگر مسدود شده؛ از تنظیمات سایت آن را آزاد کنید.'
                                        : 'دریافت نوتیفیکیشن هنگام رسیدن پیام جدید'
                                }
                            >
                                <Toggle
                                    checked={prefs.notifications && notifPerm === 'granted'}
                                    disabled={notifPerm === 'denied' || notifPerm === 'unsupported'}
                                    onChange={toggleNotifications}
                                    label="اعلان مرورگر"
                                />
                            </SettingItem>
                            <SettingItem icon="volume" label="صدای پیام" description="پخش صدا هنگام دریافت پیام">
                                <Toggle checked={prefs.sound} onChange={(v) => updatePref('sound', v)} label="صدای پیام" />
                            </SettingItem>
                            <SettingItem icon="text" label="نمایش متن پیام" description="نمایش محتوای پیام در اعلان">
                                <Toggle checked={prefs.preview} onChange={(v) => updatePref('preview', v)} label="نمایش متن پیام" />
                            </SettingItem>
                        </Section>

                        {/* ظاهر */}
                        <Section icon="sparkles" title="ظاهر" description="روی همین دستگاه ذخیره می‌شود">
                            <SettingItem icon="sparkles" label="پس‌زمینه متحرک" description="برای عملکرد بهتر در گوشی‌های ضعیف خاموش کنید">
                                <Toggle
                                    checked={prefs.animatedBackground}
                                    onChange={(v) => updatePref('animatedBackground', v)}
                                    label="پس‌زمینه متحرک"
                                />
                            </SettingItem>
                            <SettingItem icon="text" label="اندازه نوشته‌ها" stack>
                                <Segmented
                                    label="اندازه نوشته‌ها"
                                    value={prefs.fontScale}
                                    onChange={(v) => updatePref('fontScale', v)}
                                    options={[
                                        { value: 'sm', label: 'کوچک' },
                                        { value: 'md', label: 'متوسط' },
                                        { value: 'lg', label: 'بزرگ' },
                                    ]}
                                />
                            </SettingItem>
                        </Section>

                        {/* امنیت */}
                        <Section icon="lock" title="امنیت" description="رمز عبور و نشست‌های فعال">
                            <div className="rounded-xl bg-surface-950/40 ring-1 ring-white/[0.04] p-3 sm:p-4 space-y-3">
                                <p className="text-sm font-medium text-surface-50">تغییر رمز عبور</p>
                                <Field label="رمز فعلی">
                                    <PasswordInput value={pw.current} onChange={(v) => setPw((p) => ({ ...p, current: v }))} autoComplete="current-password" />
                                </Field>
                                <Field label="رمز جدید" hint="حداقل ۸ کاراکتر؛ ترکیب حروف، عدد و نماد امن‌تر است">
                                    <PasswordInput value={pw.next} onChange={(v) => setPw((p) => ({ ...p, next: v }))} autoComplete="new-password" />
                                </Field>
                                {pw.next && (
                                    <div className="space-y-1.5">
                                        <div className="flex gap-1.5">
                                            {[0, 1, 2, 3].map((i) => (
                                                <span
                                                    key={i}
                                                    className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? STRENGTH[score].color : 'bg-white/10'}`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-surface-400">قدرت رمز: {STRENGTH[score].label}</p>
                                    </div>
                                )}
                                <Field label="تکرار رمز جدید" error={pwMismatch ? 'رمزها یکسان نیستند' : ''}>
                                    <PasswordInput value={pw.confirm} onChange={(v) => setPw((p) => ({ ...p, confirm: v }))} autoComplete="new-password" />
                                </Field>
                                <Button onClick={changePassword} loading={savingPw} disabled={!pwValid} className="w-full sm:w-auto">
                                    تغییر رمز عبور
                                </Button>
                            </div>

                            <SettingItem icon="devices" label="خروج از همه دستگاه‌ها" description="نشست‌های فعال روی تمام دستگاه‌ها بسته می‌شود">
                                <Button variant="dangerGhost" onClick={() => setLogoutAllOpen(true)} className="!px-3.5 !py-2 text-xs">
                                    خروج همه
                                </Button>
                            </SettingItem>
                        </Section>

                        {/* حساب */}
                        <Section icon="shield" title="حساب کاربری">
                            {user.id && (
                                <button
                                    type="button"
                                    onClick={copyId}
                                    className="group w-full flex items-center justify-between gap-3 rounded-xl bg-surface-950/40 ring-1 ring-white/[0.04]
                             p-3 cursor-pointer text-start hover:bg-surface-900/60 hover:ring-primary-500/30 transition-all"
                                >
                                    <span className="flex items-center gap-3 min-w-0">
                                        <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/5 text-surface-400 shrink-0">
                                            <Icon name="hash" className="w-[18px] h-[18px]" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[11px] text-surface-500">شناسه کاربری</span>
                                            <span dir="ltr" className="block text-sm font-mono text-surface-200 truncate text-left">
                                                …{user.id.slice(-6)}
                                            </span>
                                        </span>
                                    </span>
                                    <span className={`flex items-center gap-1.5 text-xs shrink-0 ${idCopied ? 'text-success-400' : 'text-surface-500 group-hover:text-primary-400'}`}>
                                        <Icon name={idCopied ? 'check' : 'copy'} className="w-4 h-4" />
                                        <span className="hidden sm:inline">{idCopied ? 'کپی شد' : 'کپی'}</span>
                                    </span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={logout}
                                disabled={loggingOut}
                                className="w-full flex items-center justify-between gap-4 p-3 rounded-xl bg-surface-950/40 ring-1 ring-white/[0.06]
                           hover:bg-surface-900/60 hover:ring-white/15 transition-all group text-start cursor-pointer disabled:opacity-60"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/5 text-surface-300 shrink-0">
                                        {loggingOut ? <Spinner /> : <Icon name="logOut" className="w-[18px] h-[18px]" />}
                                    </span>
                                    <span>
                                        <span className="block text-sm font-medium text-surface-50">خروج از حساب</span>
                                        <span className="block text-[11px] text-surface-500 mt-0.5">فقط از همین دستگاه</span>
                                    </span>
                                </span>
                                <Icon name="arrowRight" className="w-4 h-4 text-surface-500 group-hover:text-surface-200 rtl:rotate-0 ltr:rotate-180" />
                            </button>
                        </Section>

                        {/* منطقه خطر */}
                        <section className="rounded-2xl bg-red-500/[0.04] ring-1 ring-red-500/20 p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <span className="grid place-items-center w-9 h-9 rounded-xl bg-red-500/10 text-red-400 shrink-0">
                                        <Icon name="trash" className="w-[18px] h-[18px]" />
                                    </span>
                                    <div>
                                        <h2 className="text-sm font-bold text-red-300">حذف دائمی حساب</h2>
                                        <p className="text-[11px] leading-5 text-red-300/60 mt-0.5">
                                            تمام پیام‌ها و اطلاعات شما پاک می‌شود و قابل بازگشت نیست.
                                        </p>
                                    </div>
                                </div>
                                <Button variant="dangerGhost" onClick={() => setDeleteOpen(true)} className="w-full sm:w-auto">
                                    حذف حساب
                                </Button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* ── مودال خروج از همه ── */}
            <Modal
                open={logoutAllOpen}
                onClose={() => setLogoutAllOpen(false)}
                icon="devices"
                tone="primary"
                title="خروج از همه دستگاه‌ها؟"
                description="تمام نشست‌های فعال، از جمله همین دستگاه، بسته می‌شود و باید دوباره وارد شوید."
            >
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <Button variant="ghost" onClick={() => setLogoutAllOpen(false)}>انصراف</Button>
                    <Button onClick={logoutAll} loading={loggingOutAll}>بله، خارج شو</Button>
                </div>
            </Modal>

            {/* ── مودال حذف حساب ── */}
            <Modal
                open={deleteOpen}
                onClose={closeDelete}
                title="حذف دائمی حساب"
                description={`برای تأیید، نام کاربری خود (${user.username}) و رمز عبورتان را وارد کنید.`}
            >
                <div className="space-y-3">
                    <input
                        value={deleteName}
                        onChange={(e) => setDeleteName(e.target.value)}
                        placeholder={user.username}
                        className={inputCls}
                        autoComplete="off"
                    />
                    <PasswordInput value={deletePw} onChange={setDeletePw} placeholder="رمز عبور" autoComplete="current-password" />
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
                        <Button variant="ghost" onClick={closeDelete}>انصراف</Button>
                        <Button
                            variant="danger"
                            onClick={deleteAccount}
                            loading={deleting}
                            disabled={deleteName !== user.username || !deletePw}
                        >
                            حذف همیشگی
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}