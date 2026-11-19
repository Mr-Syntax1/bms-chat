import { useState, useEffect } from 'react';
import { sileo } from 'sileo';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // بررسی نصب بودن از طریق حالت نمایش
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
      // حالت عادی: نمایش پرامپت نصب مرورگر
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } else {
      // حالت فال‌بک: اگر مرورگر پرامپت را نشان ندهد (مثلاً قبلاً رد شده یا سافاری است)
      sileo.info({
        title: 'نصب برنامه',
        description: 'لطفاً از منوی مرورگر (آیکون سه‌نقطه یا دکمه اشتراک‌گذاری) گزینه "Add to Home Screen" یا "نصب برنامه" را انتخاب کنید.',
        duration: 6000,
      });
    }
  };

  // فقط اگر واقعاً نصب شده باشد مخفی شود (دیگر به deferredPrompt وابسته نیست)
  if (isInstalled) return null;

  return (
    <button
      onClick={handleInstall}
      className="group relative flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 overflow-hidden w-full sm:w-auto justify-center sm:justify-start cursor-pointer"
    >
      {/* افکت درخشش هنگام هاور */}
      <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span className="text-sm">نصب اپلیکیشن</span>
      
      {/* نقطه‌ی جلب توجه (فقط زمانی نشان داده می‌شود که پرامپت آماده باشد) */}
      {deferredPrompt && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
      )}
    </button>
  );
}