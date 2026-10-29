const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
];

// تابع تولید رنگ یکسان بر اساس نام کاربری
function getConsistentColor(username) {
  if (!username) return AVATAR_COLORS[5]; // رنگ پیش‌فرض
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function Avatar({ username, color, size = 'md', status, className = '' }) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  //  اگر پراپ color پاس داده نشده بود، خودش رنگ ثابت رو انتخاب میکنه
  const finalColor = color || getConsistentColor(username);

  // برای ساختن گرادیانت، رنگ اصلی و یک نسخه تیره‌تر از اون رو لازم داریم
  const baseColor = finalColor;
  // یک ترفند ساده برای تیره‌تر کردن: اگر هگز بود، یک درجه تیره‌ترش میکنیم
  // (برای سادگی از همون رنگ به عنوان گرادیانت استفاده میکنیم یا رنگ ثانیه رو ثابت می‌ذاریم)
  const gradientColor = finalColor;

  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-lg ring-1 ring-white/10 transition-transform duration-300 hover:scale-105`}
        style={{ 
          backgroundImage: `linear-gradient(to bottom right, ${baseColor}, ${gradientColor})`,
          // اگر می‌خوای گرادیانت واقعی داشته باشی، می‌تونی یه رنگ تیره‌تر ثابت برای قسمت دوم بذاری
          // backgroundColor: finalColor 
        }}
      >
        {username?.charAt(0).toUpperCase()}
      </div>
      {status && (
        <span
          className={`
            absolute bottom-0 left-0 rounded-full border-2 border-surface-950
            ${statusSizes[size]}
            ${status === 'online' ? 'bg-green-500 shadow-glow-success' : ''}
            ${status === 'away' ? 'bg-yellow-500' : ''}
            ${status === 'offline' ? 'bg-surface-400' : ''}
            animate-scale-in
          `}
          aria-label={status === 'online' ? 'آنلاین' : status === 'away' ? 'دور از کیبورد' : 'آفلاین'}
        />
      )}
    </div>
  );
}