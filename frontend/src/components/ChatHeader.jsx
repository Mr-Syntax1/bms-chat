import Avatar from './Avatar';
import InstallButton from './InstallButton';

export default function ChatHeader({
  isConnected,
  user,
  onlineCount,
  roomName,
  onLogout,
  onToggleSidebar,
  onOpenUsers,
  onOpenProfile,
  unreadNotifications,
  onOpenNotifications,
  dmPartnerName,
}) {
  // برای پروفایل خود کاربر، username نمی‌فرستیم تا به /profile برود
  const handleProfileClick = () => {
    if (onOpenProfile) onOpenProfile();
  };

  const displayTitle = dmPartnerName 
    ? `گفتگو با ${dmPartnerName}` 
    : roomName?.startsWith('dm_') 
      ? 'چت خصوصی' 
      : roomName;

  return (
    <header className="glass-panel-strong border-b border-white/10 px-4 py-3.5 flex items-center justify-between gap-3 animate-slide-down sticky top-0 z-30">
      {/* Left: room info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary-500/15 to-accent-500/15">
          <svg
            className="w-5 h-5 text-primary-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-surface-50 truncate text-base">
            {displayTitle}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`status-dot ${
                isConnected ? 'status-online' : 'status-offline'
              } animate-pulse-soft`}
            />
            <span className="text-xs text-surface-400 font-medium">
              {isConnected ? 'متصل' : 'قطع شده'}
            </span>
            <span className="text-surface-600">•</span>
            <span className="text-xs text-surface-400">
              {onlineCount} کاربر آنلاین
            </span>
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* HAMBURGER -> opens ROOMS (only on mobile/tablet) */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden btn-ghost p-2.5 rounded-xl text-surface-400 cursor-pointer hover:text-white hover:bg-white/10 transition-colors"
          title="اتاق‌ها"
          aria-label="منوی اتاق‌ها"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Online users button (distinct icon) */}
        <button
          onClick={onOpenUsers}
          className="xl:hidden btn-ghost p-2.5 rounded-xl text-surface-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative"
          title="کاربران آنلاین"
          aria-label="کاربران آنلاین"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          {onlineCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[10px] font-bold flex items-center justify-center rounded-full bg-success-500 text-white animate-pulse-soft">
              {onlineCount > 9 ? '9+' : onlineCount}
            </span>
          )}
        </button>

        {/* Notification bell */}
        <button
          type="button"
          data-notification-toggle
          onClick={onOpenNotifications}
          className="relative btn-ghost p-2.5 rounded-xl text-surface-400 cursor-pointer hover:text-white hover:bg-white/10 transition-colors"
          title="اعلان‌ها"
          aria-label="اعلان‌ها"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[10px] font-bold flex items-center justify-center rounded-full bg-danger-500 text-white animate-pulse-soft">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        <InstallButton />

        {/* Profile button (single, desktop) */}
        <button
          onClick={handleProfileClick}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-800/50 hover:bg-surface-800 transition-colors cursor-pointer"
          title="پروفایل"
          aria-label="پروفایل"
        >
          <Avatar username={user?.username} size="sm" status="online" />
          <span className="text-sm font-medium text-surface-50 max-w-[8rem] truncate">
            {user?.username}
          </span>
          <svg
            className="w-4 h-4 text-surface-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="btn-ghost p-2.5 rounded-xl cursor-pointer text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="خروج"
          aria-label="خروج"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}