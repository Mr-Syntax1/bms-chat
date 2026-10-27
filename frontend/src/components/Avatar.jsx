export default function Avatar({ username, color, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      style={{ backgroundColor: color || '#6366f1' }}
    >
      {username?.charAt(0).toUpperCase()}
    </div>
  );
}