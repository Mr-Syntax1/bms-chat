import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { sileo } from 'sileo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const registerSchema = yup.object({
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
  confirmPassword: yup
    .string()
    .required('تکرار رمز عبور الزامی است')
    .oneOf([yup.ref('password')], 'رمز عبور و تکرار آن یکسان نیستند'),
});

const currentYear = new Date().getFullYear();
const formatTime = (d) => d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

function passwordScore(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return Math.max(1, s);
}

const STRENGTH = [
  null,
  { label: 'ضعیف', bar: 'bg-error-500', text: 'text-error-500' },
  { label: 'متوسط', bar: 'bg-amber-400', text: 'text-amber-400' },
  { label: 'خوب', bar: 'bg-primary-400', text: 'text-primary-300' },
  { label: 'قوی', bar: 'bg-emerald-400', text: 'text-emerald-400' },
];

const PATHS = {
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  send: 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  eyeOff: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L3 3m18 18L3 3',
  alert: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  check: 'M5 13l4 4L19 7',
  checks: 'M18 6L7 17l-5-5M22 10l-7.5 7.5L13 16',
  login: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  pencil: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
};

const Icon = ({ name, className = 'w-5 h-5', strokeWidth = 1.8 }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={PATHS[name]} />
  </svg>
);

// تغییر ۱: استفاده از تصویر pwa-192x192.png به جای آیکون
function BotAvatar({ className = 'w-8 h-8' }) {
  return (
    <img
      src="/pwa-192x192.png"
      alt="Bot Avatar"
      draggable={false}
      className={`shrink-0 rounded-full object-cover shadow-md shadow-primary-500/30 ${className}`}
    />
  );
}

function TypingBubble({ showAvatar }) {
  return (
    <div dir="ltr" className="flex items-end gap-2 login-msg origin-bottom-left" aria-hidden="true">
      {showAvatar ? <BotAvatar className="w-7 h-7 md:w-8 md:h-8" /> : <span className="w-7 md:w-8 shrink-0" />}
      <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm bg-surface-800 border border-surface-700 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-surface-400 login-dot" style={{ animationDelay: `${i * 0.16}s` }} />
        ))}
      </div>
    </div>
  );
}

function Bubble({ m, showAvatar, editable, onEdit }) {
  const mine = m.from === 'me';

  if (mine) {
    const body = (
      <div className="relative px-4 py-2.5 md:px-5 md:py-3 rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-900/30">
        {m.kind === 'password' ? (
          <p dir="ltr" className="text-base md:text-lg tracking-[0.3em] leading-6 select-none">{m.text}</p>
        ) : (
          <p dir="auto" className="text-sm md:text-[15px] leading-6 break-all">{m.text}</p>
        )}
        <div className="flex items-center justify-end gap-1.5 mt-0.5 select-none" dir="ltr">
          {editable && <Icon name="pencil" className="w-3 h-3 md:w-3.5 md:h-3.5 text-white/60" />}
          <time className="text-[10px] md:text-xs text-primary-100/80">{formatTime(m.at)}</time>
          <svg
            className={`w-4 h-4 md:w-5 md:h-5 transition-colors duration-300 ${m.seen ? 'text-white' : 'text-primary-100/60'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={m.seen ? PATHS.checks : PATHS.check} />
          </svg>
        </div>
      </div>
    );

    return (
      <div dir="ltr" className="flex justify-end login-msg origin-bottom-right">
        {editable ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={m.field === 'username' ? 'ویرایش نام کاربری' : 'ویرایش رمز عبور'}
            className="text-start rounded-2xl rounded-tr-sm max-w-[85%] md:max-w-[75%] hover:brightness-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 cursor-pointer"
          >
            {body}
          </button>
        ) : (
          <div className="max-w-[85%] md:max-w-[75%]">{body}</div>
        )}
      </div>
    );
  }

  const tone =
    m.tone === 'error'
      ? 'bg-error-500/10 border-error-500/40 text-surface-50'
      : m.tone === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/40 text-surface-50'
        : 'bg-surface-800 border-surface-700 text-surface-50';

  return (
    <div dir="ltr" className="flex items-end gap-2 login-msg origin-bottom-left">
      {showAvatar ? <BotAvatar className="w-7 h-7 md:w-8 md:h-8" /> : <span className="w-7 md:w-8 shrink-0" />}
      <div className={`max-w-[85%] md:max-w-[75%] px-4 py-2.5 md:px-5 md:py-3 rounded-2xl rounded-tl-sm border shadow-md ${tone}`}>
        <p dir="rtl" className="text-sm md:text-[15px] leading-7 flex items-start gap-2">
          {m.tone === 'error' && <Icon name="alert" className="w-4 h-4 mt-1.5 shrink-0 text-error-500" />}
          {m.tone === 'success' && <Icon name="check" className="w-4 h-4 mt-1.5 shrink-0 text-emerald-400" strokeWidth={3} />}
          <span>{m.text}</span>
        </p>
      </div>
    </div>
  );
}

const chipClass =
  'inline-flex items-center gap-1.5 px-3.5 py-2 md:px-4 md:py-2.5 rounded-full text-xs md:text-sm font-medium text-surface-100 border border-surface-700 bg-white/[0.04] hover:bg-white/[0.09] hover:border-primary-500/60 transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer';

export default function Register({ onAuth }) {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [locked, setLocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('username');
  const [values, setValues] = useState({ username: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [shake, setShake] = useState(false);
  const [connected, setConnected] = useState(false);

  const timers = useRef([]);
  const idRef = useRef(0);
  const inputRefs = useRef({ username: null, password: null, confirm: null });
  const endRef = useRef(null);

  const nextId = () => ++idRef.current;
  const setValue = (key, v) => setValues((s) => ({ ...s, [key]: v }));

  const botSay = useCallback(
    (text, extra = {}) =>
      new Promise((resolve) => {
        const delay = Math.min(450 + text.length * 14, 1200);
        setTyping(true);
        const t = setTimeout(() => {
          setTyping(false);
          setMessages((list) => [
            ...list.map((x) => (x.from === 'me' && !x.seen ? { ...x, seen: true } : x)),
            { id: nextId(), from: 'bot', text, at: new Date(), ...extra },
          ]);
          resolve();
        }, delay);
        timers.current.push(t);
      }),
    []
  );

  const addMine = (text, kind, field) =>
    setMessages((list) => [...list, { id: nextId(), from: 'me', text, kind, field, at: new Date(), seen: false }]);

  useEffect(() => {
    let alive = true;
    setMessages([]);
    (async () => {
      await botSay('سلام!');
      await botSay('بیا برات یه حساب بسازیم. اول یه نام کاربری انتخاب کن.');
      if (alive) setLocked(false);
    })();
    return () => {
      alive = false;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setTyping(false);
    };
  }, [botSay]);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [messages, typing]);

  useEffect(() => {
    if (locked) return;
    inputRefs.current[step]?.focus();
  }, [step, locked]);

  const triggerShake = () => {
    setShake(false);
    requestAnimationFrame(() => setShake(true));
    setTimeout(() => setShake(false), 500);
  };

  const showValidationError = (text) => {
    triggerShake();
    setMessages((list) => [
      ...list.filter((x) => !x.validation),
      { id: nextId(), from: 'bot', text, tone: 'error', validation: true, at: new Date() },
    ]);
  };

  const clearValidationError = () => setMessages((list) => list.filter((x) => !x.validation));

  const validate = async (field, extra = {}) => {
    try {
      await registerSchema.validateAt(field, extra);
      return true;
    } catch (err) {
      showValidationError(err.message);
      return false;
    }
  };

  const submitUsername = async () => {
    const name = values.username.trim();
    if (!(await validate('username', { username: name }))) return;
    clearValidationError();
    setLocked(true);
    addMine(name, 'username', 'username');
    setStep('password');
    await botSay(`${name}؛ نام قشنگیه! حالا یه رمز عبور انتخاب کن (حداقل ۶ کاراکتر).`);
    setLocked(false);
  };

  const submitPassword = async () => {
    if (!(await validate('password', { password: values.password }))) return;
    clearValidationError();
    setLocked(true);
    addMine('•'.repeat(Math.min(values.password.length, 12)), 'password', 'password');
    setStep('confirm');
    await botSay('رمز رو یک بار دیگه بنویس تا مطمئن بشیم درسته.');
    setLocked(false);
  };

  const submitConfirm = async () => {
    const ok = await validate('confirmPassword', {
      password: values.password,
      confirmPassword: values.confirm,
    });
    if (!ok) return;
    clearValidationError();
    setLocked(true);
    setLoading(true);
    addMine('•'.repeat(Math.min(values.confirm.length, 12)), 'password', 'confirm');

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: values.username.trim(),
          password: values.password,
          confirmPassword: values.confirm,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'خطا در ثبت‌نام');

      setLoading(false);
      setConnected(true);
      await botSay(`حسابت ساخته شد، ${result.user.username}! دارم می‌برمت به چت…`, { tone: 'success' });

      sileo.success({
        title: 'خوش آمدی!',
        description: `سلام ${result.user.username}، ثبت‌نام با موفقیت انجام شد.`,
      });
      onAuth(result.user, result.token);
      setTimeout(() => navigate('/chat'), 500);
    } catch (err) {
      setLoading(false);
      setValue('confirm', '');
      triggerShake();
      const text =
        err instanceof TypeError
          ? 'ارتباط با سرور برقرار نشد. اینترنتت رو بررسی کن و دوباره امتحان کن.'
          : err.message;
      await botSay(text, { tone: 'error' });
      setLocked(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (locked) return;
    if (step === 'username') return submitUsername();
    if (step === 'password') return submitPassword();
    return submitConfirm();
  };

  const goBackTo = async (target) => {
    if (locked || target === step) return;
    setLocked(true);
    clearValidationError();
    if (target === 'username') setValues((s) => ({ ...s, password: '', confirm: '' }));
    if (target === 'password') setValues((s) => ({ ...s, password: '', confirm: '' }));
    setStep(target);
    await botSay(target === 'username' ? 'باشه! نام کاربری جدیدت رو بنویس.' : 'باشه! رمز عبور جدیدت رو بنویس.');
    setLocked(false);
  };

  const handleCaps = (e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  const activeValue = values[step];
  const canSend = !locked && activeValue.trim().length > 0;
  const isPasswordStep = step === 'password' || step === 'confirm';

  const lastIdx = { username: -1, password: -1 };
  messages.forEach((m, i) => {
    if (m.from === 'me' && (m.field === 'username' || m.field === 'password')) lastIdx[m.field] = i;
  });

  const score = step === 'password' ? passwordScore(values.password) : 0;
  const strength = STRENGTH[score];

  // تغییر ۳: اضافه شدن placeholder:text-right به کلاس اینپوت
  const inputClass =
    'flex-1 min-w-0 bg-transparent outline-none text-sm md:text-base text-surface-50 placeholder:text-surface-500 placeholder:text-right py-3 md:py-3.5 disabled:opacity-60';

  const fields = [
    { key: 'username', placeholder: 'نام کاربری…', label: 'نام کاربری', type: 'text', auto: 'username' },
    { key: 'password', placeholder: 'رمز عبور…', label: 'رمز عبور', type: showPassword ? 'text' : 'password', auto: 'new-password' },
    { key: 'confirm', placeholder: 'تکرار رمز عبور…', label: 'تکرار رمز عبور', type: showPassword ? 'text' : 'password', auto: 'new-password' },
  ];

  const stepIndex = { username: 0, password: 1, confirm: 2 }[step];

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
      <style>{`
        @keyframes login-msg-in {
          from { opacity: 0; transform: translateY(10px) scale(.95); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes login-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: .4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes login-shake {
          0%, 100% { transform: translateX(0); }
          15%, 55% { transform: translateX(-7px); }
          35%, 75% { transform: translateX(7px); }
        }
        @keyframes login-bar {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(300%); }
        }
        @keyframes login-panel-in {
          from { opacity: 0; transform: translateY(18px) scale(.98); }
          to   { opacity: 1; transform: none; }
        }
        .login-msg   { animation: login-msg-in .24s cubic-bezier(.2,.8,.2,1) both; }
        .login-dot   { animation: login-dot 1s ease-in-out infinite; }
        .login-shake { animation: login-shake .5s cubic-bezier(.36,.07,.19,.97); }
        .login-bar   { animation: login-bar 1.1s ease-in-out infinite; }
        .login-panel { animation: login-panel-in .5s cubic-bezier(.2,.8,.2,1) both; }
        .login-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.15) transparent; }
        .login-scroll::-webkit-scrollbar { width: 6px; }
        .login-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
        @media (prefers-reduced-motion: reduce) {
          .login-msg, .login-dot, .login-shake, .login-bar, .login-panel { animation: none !important; }
        }
      `}</style>

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[820px] sm:h-[820px] md:w-[1000px] md:h-[1000px] lg:w-[1200px] lg:h-[1200px] max-w-none pointer-events-none transition-all duration-700"
        style={{
          background:
            'radial-gradient(closest-side, rgba(99,102,241,0.20), rgba(168,85,247,0.08) 55%, transparent)',
        }}
        aria-hidden="true"
      />

      <div className="relative w-full sm:max-w-md md:max-w-xl lg:max-w-2xl transition-all duration-300">
        <main
          className="login-panel relative flex flex-col h-[85vh] sm:h-[600px] md:h-[650px] lg:h-[700px] sm:rounded-[28px] md:rounded-[36px] overflow-hidden bg-surface-900/85 backdrop-blur-2xl sm:border border-white/10 shadow-2xl shadow-black/40"
          aria-label="ثبت‌نام در چت مدرن"
        >
          <div className="absolute top-0 inset-x-0 h-[2px] overflow-hidden z-10" aria-hidden="true">
            {loading ? (
              <div className="login-bar h-full w-2/5 bg-gradient-to-r from-transparent via-primary-400 to-transparent" />
            ) : (
              <div
                className="h-full bg-gradient-to-l from-primary-400 to-accent-500 transition-all duration-500 ease-out"
                style={{ width: `${connected ? 100 : (stepIndex / 3) * 100 + (locked ? 0 : 33)}%`, marginInlineStart: 0, float: 'right' }}
              />
            )}
          </div>

          <header className="flex items-center gap-4 px-6 py-5 md:px-8 md:py-6 border-b border-white/5">
            <BotAvatar className="w-10 h-10 md:w-12 md:h-12" />
            <div className="min-w-0 flex-1">
              <h1 className="text-base md:text-lg font-bold text-surface-50 leading-tight">ساخت حساب جدید</h1>
              <p className="text-xs md:text-sm text-surface-400 flex items-center gap-1.5 mt-1" aria-live="polite">
                <span
                  className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${typing ? 'bg-primary-400 animate-pulse' : 'bg-emerald-500'}`}
                />
                {typing ? 'در حال نوشتن…' : connected ? 'حسابت آماده است' : `مرحله ${['اول', 'دوم', 'سوم'][stepIndex]} از ۳`}
              </p>
            </div>
          </header>

          <div
            role="log"
            aria-live="polite"
            aria-label="گفتگوی ثبت‌نام"
            className="login-scroll flex-1 overflow-y-auto px-5 py-6 md:px-8 md:py-8 space-y-3 md:space-y-4"
          >
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const showAvatar = m.from === 'bot' && (!prev || prev.from !== 'bot');
              const editable =
                !locked &&
                ((m.field === 'username' && i === lastIdx.username && step === 'password') ||
                  (m.field === 'password' && i === lastIdx.password && step === 'confirm'));
              return (
                <Bubble
                  key={m.id}
                  m={m}
                  showAvatar={showAvatar}
                  editable={editable}
                  onEdit={() => goBackTo(m.field)}
                />
              );
            })}
            {typing && (
              <TypingBubble showAvatar={!messages.length || messages[messages.length - 1].from !== 'bot'} />
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSubmit} noValidate className="px-5 pt-4 pb-5 md:px-8 md:pt-6 md:pb-6">
            {!locked && (
              <div className="flex flex-wrap gap-2 px-1 pb-3 md:pb-4">
                {step === 'username' && (
                  <Link to="/login" className={chipClass}>
                    <Icon name="login" className="w-4 h-4 md:w-5 md:h-5 text-primary-300" />
                    قبلاً ثبت‌نام کردی؟ ورود
                  </Link>
                )}
                {step !== 'username' && (
                  <button type="button" onClick={() => goBackTo('username')} className={`${chipClass} cursor-pointer`}>
                    <Icon name="pencil" className="w-4 h-4 md:w-5 md:h-5 text-primary-300" />
                    تغییر نام کاربری
                  </button>
                )}
                {step === 'confirm' && (
                  <button type="button" onClick={() => goBackTo('password')} className={`${chipClass} cursor-pointer`}>
                    <Icon name="pencil" className="w-4 h-4 md:w-5 md:h-5 text-primary-300" />
                    تغییر رمز عبور
                  </button>
                )}
              </div>
            )}

            {step === 'password' && strength && (
              <div className="flex items-center gap-3 px-3 pb-2.5 md:pb-3" aria-live="polite">
                <div className="flex-1 flex gap-1" dir="rtl" aria-hidden="true">
                  {[1, 2, 3, 4].map((n) => (
                    <span
                      key={n}
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${n <= score ? strength.bar : 'bg-surface-700'}`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${strength.text}`}>رمز {strength.label}</span>
              </div>
            )}

            {capsLock && isPasswordStep && (
              <p className="px-1 pb-2 text-xs md:text-sm text-amber-400 flex items-center gap-1.5">
                <Icon name="alert" className="w-4 h-4" />
                Caps Lock روشن است
              </p>
            )}

            <div
              className={`flex items-center gap-1 rounded-full bg-surface-800/90 border border-surface-700 ps-5 pe-1.5 py-1.5 md:py-2 transition-all duration-200 focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/15 ${shake ? 'login-shake' : ''}`}
            >
              {fields.map((f) => {
                const active = step === f.key;
                return (
                  <input
                    key={f.key}
                    ref={(el) => (inputRefs.current[f.key] = el)}
                    name={f.key === 'confirm' ? 'confirmPassword' : f.key}
                    type={f.type}
                    dir="rtl"
                    value={values[f.key]}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    onKeyDown={f.key !== 'username' ? handleCaps : undefined}
                    onKeyUp={f.key !== 'username' ? handleCaps : undefined}
                    onBlur={f.key !== 'username' ? () => setCapsLock(false) : undefined}
                    autoComplete={f.auto}
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={f.placeholder}
                    aria-label={f.label}
                    disabled={locked && active}
                    tabIndex={active ? 0 : -1}
                    aria-hidden={!active}
                    className={active ? inputClass : 'sr-only'}
                  />
                );
              })}

              {isPasswordStep && (
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                  aria-pressed={showPassword}
                  className="shrink-0 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full text-surface-400 hover:text-surface-50 hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer"
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              )}

              <button
                type="submit"
                disabled={!canSend}
                aria-label={step === 'confirm' ? 'ایجاد حساب' : 'ادامه'}
                className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-600/30 transition-all duration-200 hover:scale-105 active:scale-90 disabled:opacity-35 disabled:shadow-none disabled:hover:scale-100 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : step === 'confirm' ? (
                  <Icon name="check" className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.8} />
                ) : (
                  <Icon name="send" className="w-5 h-5 md:w-6 md:h-6 -scale-x-100" strokeWidth={2} />
                )}
              </button>
            </div>
          </form>
        </main>

        <p className="hidden sm:block mt-6 md:mt-8 text-center text-xs md:text-sm text-surface-500">
          © {currentYear} اختصاصی برای — BMS Chat
        </p>
      </div>
    </div>
  );
}