import { useState, useEffect, useCallback } from 'react';
import { sileo } from 'sileo';

// آیا همین حالا به صورت اپ نصب‌شده (standalone) اجرا می‌شویم؟
function isStandalone() {
  if (typeof window === 'undefined') return false;
  const modes = ['(display-mode: standalone)', '(display-mode: window-controls-overlay)', '(display-mode: minimal-ui)'];
  return (
    modes.some((q) => window.matchMedia?.(q).matches) ||
    window.navigator.standalone === true
  );
}

// پرامپت ممکن است قبل از mount شدن ری‌اکت شلیک شده باشد؛ از کش سراسری می‌خوانیم.
function getStoredPrompt() {
  if (typeof window === 'undefined') return null;
  return window.__deferredInstallPrompt || null;
}

function clearStoredPrompt() {
  if (typeof window !== 'undefined') window.__deferredInstallPrompt = null;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(getStoredPrompt);
  const [isInstalled, setIsInstalled] = useState(isStandalone);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS 13+
  const isFirefox = /firefox|fxios/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edg|opr|android/i.test(ua);

  useEffect(() => {
    const syncPrompt = () => setDeferredPrompt(getStoredPrompt());

    const onBeforeInstall = (e) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const onInstalled = () => {
      clearStoredPrompt();
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const onCaptured = () => syncPrompt();

    // اگر پرامپت قبل از mount شلیک شده بود، همین‌جا بگیریم.
    syncPrompt();

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('pwa:beforeinstallprompt', onCaptured);

    const mql = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayMode = () => setIsInstalled(isStandalone());
    mql?.addEventListener?.('change', onDisplayMode);

    // وقتی تب دوباره فعال شد، وضعیت را تازه کنیم (مثلاً نصب در تب دیگر).
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setIsInstalled(isStandalone());
        syncPrompt();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // اگر مرورگر پشتیبانی کند، نصب‌بودن را دقیق‌تر تشخیص می‌دهیم.
    navigator.getInstalledRelatedApps?.()
      ?.then((apps) => {
        if (apps && apps.length > 0) setIsInstalled(true);
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('pwa:beforeinstallprompt', onCaptured);
      mql?.removeEventListener?.('change', onDisplayMode);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const showGuide = useCallback(() => {
    let message;
    if (isIOS) {
      message =
        'روی دکمه Share (مربع با فلش رو به بالا) در پایین مرورگر بزنید و "Add to Home Screen" را انتخاب کنید.';
    } else if (isFirefox) {
      message =
        'فایرفاکس نصب مستقیم PWA را پشتیبانی نمی‌کند. برای نصب، از Chrome یا Edge استفاده کنید یا آدرس را در منوی مرورگر به Home Screen اضافه کنید.';
    } else if (isSafari) {
      message =
        'در Safari مک از منوی File گزینه "Add to Dock" را انتخاب کنید.';
    } else {
      message =
        'روی آیکون سه‌نقطه (⋮) در بالای مرورگر بزنید و گزینه "Install App" یا "نصب برنامه" را انتخاب کنید.';
    }

    sileo.info({
      title: 'راهنمای نصب',
      description: message,
      duration: 6000,
    });
  }, [isIOS, isFirefox, isSafari]);

  const handleInstall = async () => {
    // اگر همین حالا به شکل اپ اجرا می‌شویم، پیام مفید بده.
    if (isStandalone()) {
      setIsInstalled(true);
      sileo.success({
        title: 'نصب شده',
        description: 'اپلیکیشن از قبل نصب شده و همین حالا در حالت اپ اجرا می‌شود.',
        duration: 5000,
      });
      return;
    }

    const prompt = deferredPrompt || getStoredPrompt();

    // اگر پرامپت بومی در دسترس نیست، راهنمای دستی بده (کلیک هرگز بی‌اثر نمی‌ماند).
    if (!prompt) {
      showGuide();
      return;
    }

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;

      // پرامپت فقط یک‌بار قابل استفاده است؛ مهم نیست نتیجه چه بود، پاکش کن.
      clearStoredPrompt();
      setDeferredPrompt(null);

      if (choice?.outcome === 'accepted') {
        setIsInstalled(true);
        sileo.success({
          title: 'نصب آغاز شد',
          description: 'اپلیکیشن در حال نصب است...',
          duration: 4000,
        });
      } else {
        // کاربر رد کرد: پرامپت بومی دیگر در این نشست در دسترس نیست.
        showGuide();
      }
    } catch {
      // prompt() روی پرامپت مصرف‌شده یا نامعتبر خطا می‌دهد → fallback امن.
      clearStoredPrompt();
      setDeferredPrompt(null);
      showGuide();
    }
  };

  // فقط اگر واقعاً نصب شده باشد، دکمه مخفی شود
  if (isInstalled) return null;

  return (
    <button
      onClick={handleInstall}
      className="group relative flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl 
                 bg-surface-800/60 backdrop-blur-md border border-white/10 
                 text-surface-200 hover:text-white hover:bg-surface-800 hover:border-primary-500/50
                 text-sm font-medium shadow-sm hover:shadow-lg hover:shadow-primary-500/10
                 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
                 transition-all duration-300 ease-out
                 w-full sm:w-auto cursor-pointer overflow-hidden"
    >
      {/* افکت درخشش ملایم و مدرن هنگام هاور (جایگزین شمر پیچیده) */}
      <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out" />

      {/* آیکون با انیمیشن نرم */}
      <svg
        className="w-4.5 h-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5 text-primary-400 group-hover:text-primary-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>

      <span>نصب اپلیکیشن</span>
    </button>
  );
}
