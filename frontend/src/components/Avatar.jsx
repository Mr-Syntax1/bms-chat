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

export default function Avatar({ username, color, size = 'md', status, className = '', speaking = false }) {
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

  const colorIndex = color ? AVATAR_COLORS.indexOf(color) : getAvatarIndex(username);
  const safeIndex = colorIndex !== -1 ? colorIndex : 5;

  const finalColor = AVATAR_COLORS[safeIndex];
  const avatarImage = AVATAR_IMAGES[safeIndex];

  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        className={`${sizes[size]} relative rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-lg ring-1 ring-white/10 transition-transform duration-200 hover:scale-105 overflow-hidden ${
          speaking ? 'speaking' : ''
        }`}
        style={{ backgroundColor: finalColor }}
      >
        <img
          src={avatarImage}
          alt={username || 'Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // این خط به شما در کنسول می‌گوید دقیقاً چه مسیری را درخواست کرده که شکست خورده
            console.warn(`Avatar image failed to load: ${avatarImage}`);
            e.target.style.display = 'none';
          }}
        />
        
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          {username?.charAt(0).toUpperCase()}
        </span>
      </div>

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