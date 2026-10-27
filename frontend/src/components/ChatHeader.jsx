import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';

export default function ChatHeader({ isConnected, user, onlineCount, roomName }) {
  return (
    <header className="glass-strong border-b border-surface-200 dark:border-surface-800 px-5 py-4 flex items-center justify-between gap-4 animate-slide-down">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="relative p-3 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-500/20">
          <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-surface-900 dark:text-surface-50 truncate">{roomName}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`status-dot ${isConnected ? 'status-online' : 'status-offline'} animate-pulse-soft`} />
            <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">
              {isConnected ? 'متصل' : 'قطع شده'}
            </span>
            <span className="text-surface-300 dark:text-surface-600">•</span>
            <span className="text-xs text-surface-500 dark:text-surface-400">
              {onlineCount} کاربر آنلاین
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <ThemeToggle />
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800/50">
          <Avatar username={user?.username} color={user?.avatarColor} size="sm" status="online" />
          <span className="text-sm font-medium text-surface-900 dark:text-surface-50">{user?.username}</span>
        </div>
      </div>
    </header>
  );
}