const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
];

const AVATAR_IMAGES = [
  '/avatars/red.png',
  '/avatars/orange.png',
  '/avatars/yellow.png',
  '/avatars/green.png',
  '/avatars/teal.png',
  '/avatars/blue.png',
  '/avatars/indigo.png',
  '/avatars/purple.png',
  '/avatars/pink.png',
  '/avatars/slate.png',
];

function getAvatarIndex(username) {
  if (!username) return 5; 
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

export default function Avatar({ username, avatarIndex, color, size = 'md', status, className = '', speaking = false }) {
  const sizes = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const statusSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  // منطق هوشمند انتخاب ایندکس 
  let finalIndex;
  if (avatarIndex !== undefined && avatarIndex !== null) {
    finalIndex = avatarIndex; // اگر کاربر دستی انتخاب کرده باشد
  } else if (color) {
    finalIndex = AVATAR_COLORS.indexOf(color); // اگر رنگ دستی پاس داده شده باشد
  } else {
    finalIndex = getAvatarIndex(username); // حالت پیش‌فرض خودکار (بر اساس نام کاربری)
  }

  // اطمینان از معتبر بودن ایندکس (بین ۰ تا ۹)
  const safeIndex = (finalIndex >= 0 && finalIndex < 10) ? finalIndex : 5;

  const finalColor = AVATAR_COLORS[safeIndex];
  const avatarImage = AVATAR_IMAGES[safeIndex];

  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        className={`${sizes[size]} relative rounded-full flex items-center justify-center shrink-0 shadow-lg ring-1 ring-white/10 transition-transform duration-200 hover:scale-105 overflow-hidden ${
          speaking ? 'speaking' : ''
        }`}
        style={{ backgroundColor: finalColor }}
      >
        {/* لایه‌ی عکس اصلی */}
        <img
          src={avatarImage}
          alt={username || 'Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            const fallback = e.target.parentElement.querySelector('.fallback-icon');
            if (fallback) fallback.classList.remove('hidden');
          }}
        />
        
        {/* آیکون پیش‌فرض (فقط در صورتی نمایش داده می‌شود که عکس لود نشود) */}
        <div className="fallback-icon hidden w-full h-full items-center justify-center text-white/70">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3/5 h-3/5">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* نشانگر وضعیت */}
      {status && (
        <span
          className={`
            absolute bottom-0 left-0 rounded-full border-2 border-surface-950
            ${statusSizes[size]}
            ${status === 'online' ? 'bg-green-500 speaking-dot' : ''}
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