// ---------------------------------------------------------------------------
// عناصر مشترک UI بازی — پنل شیشه‌ای، دکمه، اسلایدر
// همه با CSS/Tailwind؛ هیچ کتابخانه‌ی انیمیشنی اضافه نشده است.
// ---------------------------------------------------------------------------

/** پنل شیشه‌ای پایه */
export function GlassPanel({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={`rounded-2xl border border-white/10 bg-[#171426]/72 backdrop-blur-xl shadow-[0_10px_30px_-12px_rgba(0,0,0,0.85)] ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** دکمه‌ی اصلی با گرادیان آتش */
export function PrimaryButton({ children, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-[#231a10] bg-gradient-to-b from-[#ffc66d] to-[#ff9a4d] shadow-[0_8px_24px_-10px_rgba(255,154,77,0.9)] transition-transform duration-150 hover:brightness-105 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** دکمه‌ی ثانویه‌ی شیشه‌ای */
export function GhostButton({ children, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[#f5ebdd] transition-colors duration-150 hover:bg-white/[0.09] active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** آیکون‌دکمه‌ی مربعی */
export function IconButton({ children, label, className = '', ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-[#171426]/80 text-[#f5ebdd] backdrop-blur-md transition-colors duration-150 hover:bg-white/10 active:scale-95 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** اسلایدر با برچسب و مقدار */
export function Slider({ label, value, onChange, min = 0, max = 1, step = 0.05, format }) {
  const display = format ? format(value) : `${Math.round(value * 100)}%`;
  return (
    <label className="block select-none">
      <span className="mb-1.5 flex items-center justify-between text-[11px] text-[#f5ebdd]/70">
        <span>{label}</span>
        <span className="font-mono text-[#ffc66d]">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-[#ff9a4d]
                   [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ffc66d]
                   [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,198,109,0.7)]"
      />
    </label>
  );
}

/** کلید سه‌حالته (Low/Medium/High) */
export function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-xl border border-white/10 bg-black/25 p-1 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition-colors duration-150 ${
            value === opt.value
              ? 'bg-[#ff9a4d]/22 text-[#ffc66d]'
              : 'text-[#f5ebdd]/55 hover:text-[#f5ebdd]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** سوییچ بولی */
export function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-[11px] text-[#f5ebdd]/80 hover:text-[#f5ebdd]"
    >
      <span>{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#5d9b78]' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-[#f5ebdd] transition-transform duration-200 ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

/** نوار پیشرفت گرادیان آتش */
export function ProgressBar({ value, max = 1, className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#ff9a4d] to-[#ffc66d] transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
