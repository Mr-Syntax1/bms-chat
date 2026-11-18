import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { sileo } from 'sileo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const loginSchema = yup.object({
  username: yup
    .string()
    .trim()
    .required('نام کاربری الزامی است')
    .min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد')
    .max(30, 'نام کاربری نباید بیشتر از ۳۰ کاراکتر باشد')
    .matches(/^[a-zA-Z0-9_\u0600-\u06FF]+$/, 'فقط حروف، اعداد و زیرخط مجاز است'),
  password: yup
    .string()
    .required('رمز عبور الزامی است')
    .min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد')
    .max(50, 'رمز عبور طولانی است'),
});

const currentYear = new Date().getFullYear();

/* ───────────────────────── آیکن‌ها ───────────────────────── */

const Icon = ({ d, className = 'w-5 h-5', strokeWidth = 1.8 }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  eyeOff:
    'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L3 3m18 18L3 3',
  alert: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  check: 'M5 13l4 4L19 7',
  userPlus: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  arrow: 'M10 19l-7-7m0 0l7-7m-7 7h18',
  mic: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
};

/* ───────────────────────── پنل معرفی (فقط دسکتاپ) ───────────────────────── */

const FEATURES = [
  { icon: ICONS.bolt, title: 'پیام‌رسانی لحظه‌ای', text: 'ارسال و دریافت آنی پیام بدون هیچ تأخیری' },
  { icon: ICONS.mic, title: 'پیام صوتی و فایل', text: 'صدا، تصویر و فایل را در یک لحظه به اشتراک بگذار' },
  { icon: ICONS.shield, title: 'امن و خصوصی', text: 'گفتگوهای تو فقط بین خودت و مخاطبت می‌ماند' },
];

function ShowcasePanel() {
  return (
    <div className="hidden lg:flex relative flex-col justify-between p-10 xl:p-12 overflow-hidden bg-gradient-to-br from-primary-600/25 via-surface-900/40 to-accent-500/20 border-l border-white/10">
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary-500/30 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-accent-500/25 blur-3xl" aria-hidden="true" />

      {/* برند */}
      <div className="relative flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
          <Icon d={ICONS.chat} className="w-6 h-6 text-white" strokeWidth={2} />
        </div>
        <span className="text-lg font-bold text-surface-50">چت مدرن</span>
      </div>

      {/* پیام‌های دکوراتیو */}
      <div className="relative my-8 space-y-3" aria-hidden="true">
        <div className="login-float flex justify-start">
          <div className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-surface-800/80 border border-white/10 text-sm text-surface-100 backdrop-blur">
            سلام! امروز جلسه ساعت چنده؟ 👋
          </div>
        </div>
        <div className="login-float-delay flex justify-end">
          <div className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-gradient-to-br from-primary-500 to-primary-700 text-sm text-white shadow-lg shadow-primary-900/40">
            ساعت ۵ عصر، همون‌جای همیشگی ✨
          </div>
        </div>
        <div className="login-float flex justify-start">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl rounded-tr-sm bg-surface-800/80 border border-white/10 backdrop-blur">
            <span className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
              <svg className="w-4 h-4 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.14v13.72a1 1 0 001.52.85l11-6.86a1 1 0 000-1.7l-11-6.86A1 1 0 008 5.14z" />
              </svg>
            </span>
            <span className="flex items-center gap-[2px] h-6" dir="ltr">
              {[8, 14, 10, 20, 12, 18, 7, 16, 11, 19, 9, 13].map((h, i) => (
                <span key={i} className={`w-[3px] rounded-full ${i < 5 ? 'bg-primary-400' : 'bg-surface-600'}`} style={{ height: h }} />
              ))}
            </span>
            <span className="text-[11px] text-surface-400 tabular-nums">۰:۱۲</span>
          </div>
        </div>
      </div>

      {/* ویژگی‌ها */}
      <ul className="relative space-y-4">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex items-start gap-3">
            <span className="shrink-0 w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-primary-300">
              <Icon d={f.icon} />
            </span>
            <div>
              <p className="text-sm font-semibold text-surface-50">{f.title}</p>
              <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{f.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────────────── فیلد ورودی ───────────────────────── */

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-xs sm:text-sm text-error-500 flex items-center gap-1.5 animate-fade-in">
      <Icon d={ICONS.alert} className="w-4 h-4 shrink-0" />
      {message}
    </p>
  );
}

const inputBase =
  'w-full rounded-xl bg-surface-900/60 border text-sm sm:text-base text-surface-50 placeholder:text-surface-500 py-3.5 outline-none transition-all duration-200 ' +
  'hover:border-surface-600 focus:bg-surface-900/90 focus:ring-4 disabled:opacity-60 disabled:cursor-not-allowed';

const inputOk = 'border-surface-700 focus:border-primary-500 focus:ring-primary-500/20';
const inputErr = 'border-error-500/70 focus:border-error-500 focus:ring-error-500/20';

/* ───────────────────────── صفحه ورود ───────────────────────── */

export default function Login({ onAuth }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { username: '', password: '' },
  });

  const triggerShake = () => {
    setShake(false);
    requestAnimationFrame(() => setShake(true));
    setTimeout(() => setShake(false), 500);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'خطا در ورود');

      setSuccess(true);

      sileo.success({
        title: 'خوش آمدی!',
        description: `سلام ${result.user.username}، به چت خوش اومدی.`,
      });

      onAuth(result.user, result.token);
      setTimeout(() => navigate('/chat'), 450);
    } catch (err) {
      triggerShake();
      sileo.error({
        title: 'خطا',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = () => triggerShake();

  const handleCaps = (e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  const busy = loading || success;
  const passwordField = register('password');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* انیمیشن‌های اختصاصی این صفحه */}
      <style>{`
        @keyframes login-shake {
          0%, 100% { transform: translateX(0); }
          15%, 55% { transform: translateX(-8px); }
          35%, 75% { transform: translateX(8px); }
        }
        @keyframes login-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes login-pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .login-shake { animation: login-shake 0.5s cubic-bezier(.36,.07,.19,.97); }
        .login-float { animation: login-float 6s ease-in-out infinite; }
        .login-float-delay { animation: login-float 6s ease-in-out 1.5s infinite; }
        .login-pop { animation: login-pop 0.35s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .login-shake, .login-float, .login-float-delay, .login-pop { animation: none; }
        }
      `}</style>

      {/* پس‌زمینه */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary-400/10 to-accent-400/10 rounded-full blur-3xl animate-float" />
      </div>
      <div className="absolute inset-0 bg-grid-pattern opacity-40" aria-hidden="true" />

      <div className="relative w-full max-w-md lg:max-w-4xl">
        <div
          className={`glass-morphism-strong rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-scale-in grid lg:grid-cols-2 ${
            shake ? 'login-shake' : ''
          }`}
        >
          {/* ───── پنل فرم ───── */}
          <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
            {/* هدر */}
            <div className="text-center lg:text-right mb-8">
              <div className="lg:hidden inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/25 mb-5 animate-float">
                <Icon d={ICONS.chat} className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-surface-50 mb-2">خوش آمدی 👋</h1>
              <p className="text-surface-400 text-sm leading-relaxed">برای ادامه، وارد حساب کاربری خود شوید</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5" noValidate>
              {/* نام کاربری */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-surface-300 mb-2">
                  نام کاربری
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-surface-500 group-focus-within:text-primary-400 transition-colors">
                    <Icon d={ICONS.user} />
                  </span>
                  <input
                    {...register('username')}
                    id="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="مثال: ali123"
                    disabled={busy}
                    aria-invalid={errors.username ? 'true' : 'false'}
                    aria-describedby={errors.username ? 'username-error' : undefined}
                    className={`${inputBase} pr-11 pl-4 ${errors.username ? inputErr : inputOk}`}
                  />
                </div>
                <FieldError id="username-error" message={errors.username?.message} />
              </div>

              {/* رمز عبور */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-surface-300 mb-2">
                  رمز عبور
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-surface-500 group-focus-within:text-primary-400 transition-colors">
                    <Icon d={ICONS.lock} />
                  </span>
                  <input
                    {...passwordField}
                    onBlur={(e) => {
                      passwordField.onBlur(e);
                      setCapsLock(false);
                    }}
                    onKeyDown={handleCaps}
                    onKeyUp={handleCaps}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    disabled={busy}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'password-error' : capsLock ? 'caps-warning' : undefined}
                    className={`${inputBase} pr-11 pl-12 ${errors.password ? inputErr : inputOk}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={busy}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-50 hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    aria-label={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                    aria-pressed={showPassword}
                  >
                    <Icon d={showPassword ? ICONS.eyeOff : ICONS.eye} />
                  </button>
                </div>

                {capsLock && !errors.password && (
                  <p id="caps-warning" className="mt-2 text-xs text-amber-400 flex items-center gap-1.5 animate-fade-in">
                    <Icon d={ICONS.alert} className="w-4 h-4 shrink-0" />
                    Caps Lock روشن است
                  </p>
                )}
                <FieldError id="password-error" message={errors.password?.message} />
              </div>

              {/* دکمه ورود */}
              <button
                type="submit"
                disabled={busy}
                className={`
                  group relative w-full py-3.5 rounded-xl text-base font-semibold text-white cursor-pointer overflow-hidden
                  flex items-center justify-center gap-2
                  bg-linear-[135deg,#494cf1,#8b5cf6,#500eeb,#7415f0]
                  bg-size-[300%_300%] bg-position-[0%_50%] hover:bg-position-[100%_50%]
                  shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40
                  transition-all duration-300 ease-in-out active:scale-[0.98]
                  focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/40
                  disabled:cursor-not-allowed ${loading ? 'opacity-80' : ''} ${success ? '!bg-emerald-500 !from-emerald-500' : ''}
                `}
              >
                {success ? (
                  <span className="login-pop flex items-center gap-2">
                    <Icon d={ICONS.check} className="w-5 h-5" strokeWidth={3} />
                    ورود موفق
                  </span>
                ) : loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    در حال ورود...
                  </span>
                ) : (
                  <>
                    ورود به چت
                    <Icon d={ICONS.arrow} className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* جداکننده */}
            <div className="flex items-center gap-4 my-6" role="separator">
              <div className="flex-1 h-px bg-gradient-to-l from-surface-700 to-transparent" />
              <span className="text-xs text-surface-500">حساب نداری؟</span>
              <div className="flex-1 h-px bg-gradient-to-r from-surface-700 to-transparent" />
            </div>

            {/* ثبت‌نام */}
            <Link
              to="/register"
              className="w-full py-3 rounded-xl text-sm sm:text-base font-medium text-surface-100 border border-surface-700 bg-white/[0.03] hover:bg-white/[0.08] hover:border-surface-600 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/30"
            >
              <Icon d={ICONS.userPlus} />
              ساخت حساب جدید
            </Link>
          </div>

          {/* ───── پنل معرفی ───── */}
          <ShowcasePanel />
        </div>

        {/* فوتر */}
        <p className="mt-6 text-center text-xs sm:text-sm text-surface-500">
          © {currentYear} چت مدرن اختصاصی برای — BMS
        </p>
      </div>
    </div>
  );
}