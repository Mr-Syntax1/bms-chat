import Avatar from './Avatar';

export default function ChatHeader({
  isConnected,
  user,
  onlineCount,
  roomName,
  // onLogout,
  onToggleSidebar,
  onOpenProfile,
  unreadNotifications,
  rooms = [],
  onlineUsers = [],
  onOpenNotifications,
  onGoHome,
  onStartCall,
  onGroupCallToggle,
  inGroupCall = false,
  onOpenGame,
  onBrowseCampsites,
}) {

  const handleProfileClick = () => {
    if (onOpenProfile) onOpenProfile();
  };

  const currentRoomObj = rooms.find((r) => r.name === roomName);
  const resolvedDmName = currentRoomObj?.isPrivate
    ? currentRoomObj.dmPartnerUsername
    : null;

  const dmPartner = currentRoomObj?.isPrivate
    ? {
      userId: currentRoomObj.dmPartnerId,
      username: currentRoomObj.dmPartnerUsername,
      avatarIndex: currentRoomObj.avatarIndex ?? null,
      isOnline: onlineUsers.some((u) => u.username === currentRoomObj.dmPartnerUsername),
    }
    : null;

  const isGroupRoom = Boolean(currentRoomObj && !currentRoomObj.isPrivate && !roomName?.startsWith('dm_'));

  const displayTitle = resolvedDmName
    ? `گفتگو با ${resolvedDmName}`
    : roomName?.startsWith('dm_')
      ? 'چت خصوصی'
      : roomName;

  const handleGroupCall = () => {
    if (roomName) onGroupCallToggle?.(roomName);
  };

  return (
    <header className="glass-panel-strong border-b border-white/10 px-3 sm:px-4 py-2 sm:py-2.5 lg:py-3 flex items-center justify-between gap-1.5 sm:gap-2 lg:gap-3 animate-slide-down sticky top-0 z-30 w-full min-h-[52px] sm:min-h-[56px] lg:min-h-[60px] shrink-0">

      {/* سمت چپ: اطلاعات اتاق */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-0 flex-1">
        {/* دکمه لوگو - در موبایل کوچک‌تر */}
        <button
          type="button"
          onClick={onGoHome}
          className="group ml-1 sm:ml-0 relative p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-surface-900 ring-2 ring-primary-500/50 shadow-[0_0_20px_-4px] shadow-primary-500/60 hover:ring-primary-600 hover:shadow-primary-400/80 transition-all duration-200 cursor-pointer shrink-0"
        >
          <img
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg object-contain drop-shadow"
            src="/pwa-192x192.png"
            alt="لوگو"
          />
          <span className="pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl bg-white/5 opacity-0 group-hover:opacity-80 transition-opacity duration-200" />
        </button>

        <div className="min-w-0 flex flex-col justify-center">
          <h1 className="font-bold text-surface-50 truncate text-xs sm:text-sm lg:text-base max-w-[100px] sm:max-w-xs md:max-w-md lg:max-w-xl transition-all duration-300">
            {displayTitle}
          </h1>

          {/* 👈 این بخش از سایز sm به بالا نمایش داده می‌شود (تبلت و دسکتاپ) */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 mt-0.5">
            <span className={`status-dot ${isConnected ? 'status-online' : 'status-offline'} animate-pulse-soft scale-75 sm:scale-100`} />
            <span className="text-xs text-surface-400 font-medium">
              {isConnected ? 'متصل' : 'قطع شده'}
            </span>
            <span className="text-surface-600 text-[8px] sm:text-xs">•</span>
            <span className="text-xs text-surface-400">
              {onlineCount} آنلاین
            </span>
          </div>

          {/* موبایل: نمایش وضعیت اتصال به صورت Compact */}
          <div className="sm:hidden flex items-center gap-1 mt-0.5">
            <span className={`status-dot ${isConnected ? 'status-online' : 'status-offline'} animate-pulse-soft`} />
            <span className="text-xs text-surface-400 font-medium">
              {isConnected ? 'متصل' : 'آفلاین'}
            </span>
          </div>
        </div>
      </div>

      {/* سمت راست: دکمه‌های عملیاتی */}
      <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 shrink-0">

        {/* دکمه منو (همبرگری) - فقط موبایل و تبلت */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden btn-ghost p-1.5 sm:p-2 rounded-lg sm:rounded-xl ml-1 text-surface-400 cursor-pointer hover:text-white hover:bg-white/10 transition-colors"
          title="اتاق‌ها"
          aria-label="منوی اتاق‌ها"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* دکمه اعلان‌ها */}
        <button
          type="button"
          data-notification-toggle
          onClick={onOpenNotifications}
          className="relative btn-ghost ml-1 p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-surface-400 cursor-pointer hover:text-white hover:bg-white/10 transition-colors"
          title="اعلان‌ها"
          aria-label="اعلان‌ها"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 text-[8px] sm:text-[9px] font-bold flex items-center justify-center rounded-full bg-danger-500 text-white animate-pulse-soft">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        {/* تماس خصوصی */}
        {dmPartner && (
          <button
            onClick={() => onStartCall(dmPartner.userId, dmPartner.username, undefined, dmPartner.avatarIndex ?? null)}
            className="btn-ghost p-1.5 sm:p-2 rounded-lg sm:rounded-xl ml-1 text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors cursor-pointer"
            title={`تماس با ${dmPartner.username}`}
            aria-label="تماس تصویری"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}

        {/* تماس گروهی */}
        {isGroupRoom && (
          <button
            type="button"
            onClick={handleGroupCall}
            className={`btn-ghost p-1.5 sm:p-2 rounded-lg sm:rounded-xl ml-1 transition-colors cursor-pointer ${inGroupCall
              ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
              : 'text-primary-400 hover:text-primary-300 hover:bg-primary-500/10'
              }`}
            title={inGroupCall ? 'بازگشت به تماس گروهی' : 'تماس گروهی اتاق'}
            aria-label={inGroupCall ? 'بازگشت به تماس گروهی' : 'تماس گروهی اتاق'}
            aria-pressed={inGroupCall}
          >
            {inGroupCall ? (
              <span className="relative flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="absolute -end-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        )}

        {/* کمپ آتش (بازی سه‌بعدی) */}
        {isGroupRoom && (
          <button
            type="button"
            onClick={() => onOpenGame?.(roomName)}
            className="btn-ghost p-1.5 sm:p-2 rounded-lg sm:rounded-xl ml-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
            title="ورود به کمپ آتش"
            aria-label="ورود به کمپ آتش"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3c1.5 3 4 4.2 4 7.2a4 4 0 11-8 0C8 7.2 10.5 6 12 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 20l1.5-4h13L20 20M4 20h16" />
            </svg>
          </button>
        )}

        {/* مرور کمپ‌های فعال */}
        {!roomName && (
          <button
            type="button"
            onClick={() => onBrowseCampsites?.()}
            className="btn-ghost p-1.5 sm:p-2 rounded-lg sm:rounded-xl ml-1 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors cursor-pointer"
            title="مرور کمپ‌ها"
            aria-label="مرور کمپ‌های فعال"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 20l6-14 6 14M9 12h8M15 20l3-7 3 7" />
            </svg>
          </button>
        )}

        {/* پروفایل - فقط تبلت و دسکتاپ */}
        <button
          onClick={handleProfileClick}
          className="hidden sm:flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-surface-800/50 hover:bg-surface-800 transition-colors cursor-pointer"
          title="پروفایل"
          aria-label="پروفایل"
        >
          <Avatar username={user?.username} avatarIndex={user?.avatarIndex} size="sm" status="online" />
          <span className="hidden md:block text-sm font-medium text-surface-50 max-w-[8rem] truncate">
            {user?.username}
          </span>
          <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* موبایل: دکمه پروفایل ساده */}
        <button
          onClick={handleProfileClick}
          className="sm:hidden btn-ghost p-1.5 rounded-xl text-surface-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="پروفایل"
          aria-label="پروفایل"
        >
          <Avatar username={user?.username} avatarIndex={user?.avatarIndex} size="xs" status="online" />
        </button>

        {/* خروج */}
        {/* <button
          onClick={onLogout}
          className="btn-ghost p-2 sm:p-2.5 rounded-lg sm:rounded-xl cursor-pointer text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="خروج"
          aria-label="خروج"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button> */}
      </div>
    </header>
  );
}