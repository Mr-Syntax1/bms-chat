export default function LoadingSpinner({ text = "در حال بارگذاری..." }) {
  return (
    // این کلاس‌ها باعث می‌شوند لودینگ روی کل ناحیه‌ی پیام‌ها بیفتد اما پس‌زمینه‌اش خیلی شفاف باشد
    <div className="flex flex-col items-center justify-center animate-fade-in">
      <div className="relative flex items-center justify-center w-20 h-20 mb-4">
        {/* هاله‌های چرخان */}
        <div className="absolute inset-0 rounded-full border-4 border-primary-500/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-4 border-t-primary-500 border-r-transparent border-b-accent-500 border-l-transparent animate-spin" style={{ animationDuration: '1s' }} />
        <div className="absolute inset-4 rounded-full border-4 border-t-transparent border-r-accent-400 border-b-transparent border-l-primary-400 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
        
        {/* لوگو یا آیکون وسط */}
        <img src="/pwa-192x192.png" alt="loading" className="w-8 h-8 rounded-lg shadow-lg" />
      </div>
      <p className="text-surface-200 font-medium animate-pulse text-sm">{text}</p>
    </div>
  );
}