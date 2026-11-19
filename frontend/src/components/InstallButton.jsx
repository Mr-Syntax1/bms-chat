import { useCallback, useEffect, useRef, useState } from 'react';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setIos(isIOS());

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowHint(false);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  /* بستن راهنمای iOS با کلیک بیرون یا Esc */
  useEffect(() => {
    if (!showHint) return;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setShowHint(false);
    };
    const onKey = (e) => e.key === 'Escape' && setShowHint(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showHint]);

  const handleClick = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null); // هر prompt فقط یک بار قابل استفاده است
    } else if (ios) {
      setShowHint((v) => !v);
    }
  }, [deferredPrompt, ios]);

  if (installed || (!deferredPrompt && !ios)) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-label="نصب برنامه روی دستگاه"
        aria-expanded={ios && !deferredPrompt ? showHint : undefined}
        title="نصب برنامه روی دستگاه"
        className="inline-flex items-center justify-center gap-2 h-10 w-10 sm:w-auto sm:px-3.5 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-medium text-surface-100 transition-colors hover:bg-white/10 active:bg-white/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <svg
          className="w-[18px] h-[18px] shrink-0 text-primary-300"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" />
        </svg>
        <span className="hidden sm:inline">نصب برنامه</span>
      </button>

      {showHint && (
        <div
          role="dialog"
          aria-label="راهنمای نصب"
          className="absolute top-full left-0 mt-2 w-64 p-3.5 rounded-2xl border border-white/10 bg-surface-900 shadow-xl shadow-black/40 text-right z-50"
        >
          <p className="text-sm font-medium text-surface-100">نصب روی آیفون / آیپد</p>
          <ol className="mt-2 space-y-1.5 text-xs leading-6 text-surface-400 list-decimal pr-4">
            <li>دکمه‌ی «اشتراک‌گذاری» (Share) را در Safari بزن.</li>
            <li>گزینه‌ی «Add to Home Screen» را انتخاب کن.</li>
            <li>روی «Add» بزن.</li>
          </ol>
        </div>
      )}
    </div>
  );
}