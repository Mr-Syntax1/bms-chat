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

  // const getGradient = (color) => {
  //   if (!color) return 'from-primary-500 to-primary-600';
  //   const hues = {
  //     indigo: 'from-indigo-500 to-indigo-600',
  //     violet: 'from-violet-500 to-violet-600',
  //     purple: 'from-purple-500 to-purple-600',
  //     pink: 'from-pink-500 to-pink-600',
  //     red: 'from-red-500 to-red-600',
  //     orange: 'from-orange-500 to-orange-600',
  //     amber: 'from-amber-500 to-amber-600',
  //     yellow: 'from-yellow-500 to-yellow-600',
  //     lime: 'from-lime-500 to-lime-600',
  //     green: 'from-green-500 to-green-600',
  //     emerald: 'from-emerald-500 to-emerald-600',
  //     teal: 'from-teal-500 to-teal-600',
  //     cyan: 'from-cyan-500 to-cyan-600',
  //     sky: 'from-sky-500 to-sky-600',
  //     blue: 'from-blue-500 to-blue-600',
  //   };
  //   return hues[color] || `from-[${color}] to-[${color}]`;
  // };

  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold shrink-0 bg-gradient-to-br shadow-lg`}
        style={{ backgroundImage: `linear-gradient(to bottom right, ${color || '#6366f1'}, ${color ? color.replace('500', '600') : '#4f46e5'})` }}
      >
        {username?.charAt(0).toUpperCase()}
      </div>
      {status && (
        <span
          className={`
            absolute bottom-0 left-0 rounded-full border-2 border-surface-900
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