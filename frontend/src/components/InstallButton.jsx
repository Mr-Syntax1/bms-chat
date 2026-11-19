import { useState, useEffect } from 'react';
import { sileo } from 'sileo';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // تشخیص سیستم عامل برای نمایش راهنمای دقیق‌تر
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // حالت ۱: مرورگر اجازه نصب مستقیم می‌دهد (کروم دسکتاپ/اندروید)
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } else {
      // حالت ۲: مرورگر اجازه نصب مستقیم نمی‌دهد (آیفون یا رد شده توسط کاربر)
      const message = isIOS
        ? 'برای نصب، روی دکمه Share (مربع با فلش رو به بالا) در پایین مرورگر بزنید و "Add to Home Screen" را انتخاب کنید.'
        : 'برای نصب، روی آیکون سه‌نقطه (⋮) در بالای مرورگر یا کنار url گزینه  "Install App" یا "نصب برنامه" را انتخاب کنید.';

      sileo.info({
        title: 'راهنمای نصب',
        description: message,
        duration: 6000,
      });
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
      <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

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