import { usePlayerStore } from '../stores/usePlayerStore';

const STYLES = {
  success: {
    border: 'border-[#65F5A0]/35',
    bg: 'bg-[#5d9b78]/14',
    text: 'text-[#65F5A0]',
    icon: '✓',
  },
  warn: {
    border: 'border-[#f59e0b]/35',
    bg: 'bg-[#f59e0b]/12',
    text: 'text-[#fbbf24]',
    icon: '!',
  },
  info: {
    border: 'border-[#ffc66d]/28',
    bg: 'bg-[#ffc66d]/10',
    text: 'text-[#ffc66d]',
    icon: 'i',
  },
  error: {
    border: 'border-[#ef4444]/35',
    bg: 'bg-[#ef4444]/12',
    text: 'text-[#ffb4b4]',
    icon: '×',
  },
};

/**
 * نوتیفیکیشن‌های پایین-مرکز.
 * با کلیک حذف می‌شوند و خودکار پس از ~۴.۲ ثانیه محو می‌شوند (در استور).
 */
export default function Toasts() {
  const toasts = usePlayerStore((s) => s.toasts);
  const dismiss = usePlayerStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => {
        const style = STYLES[toast.kind] || STYLES.info;
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className={`toast-rise pointer-events-auto flex max-w-[88vw] items-center gap-2 rounded-2xl border ${style.border} ${style.bg} px-3.5 py-2 text-[11.5px] font-semibold ${style.text} shadow-[0_12px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${style.border} text-[9px] font-black`}
              aria-hidden="true"
            >
              {style.icon}
            </span>
            <span className="text-left leading-snug">{toast.text}</span>
          </button>
        );
      })}
    </div>
  );
}
