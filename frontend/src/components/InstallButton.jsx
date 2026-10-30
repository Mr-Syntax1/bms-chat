import { useState, useEffect } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // اگر از قبل نصب شده، دکمه رو نشون نده
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault(); // جلوگیری از رفتار پیش‌فرض مرورگر
      setDeferredPrompt(e); // ذخیره رویداد برای استفاده بعدی
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); // نمایش پیام نصب مرورگر
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // اگر نصب شده یا مرورگر پشتیبانی نمی‌کنه، دکمه رو نشون نده
  if (isInstalled || !deferredPrompt) return null;

  return (
    <button
      onClick={handleInstall}
      className="btn-ghost p-2 rounded-lg text-primary-400 hover:text-primary-300 hover:bg-white/10 transition-colors flex items-center gap-1.5"
      title="نصب برنامه"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span className="text-xs font-medium hidden sm:block">نصب</span>
    </button>
  );
}