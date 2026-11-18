import Avatar from './Avatar';
import InstallButton from './InstallButton';
import { useState } from 'react';

export default function ChatHeader({
  isConnected,
  user,
  onlineCount,
  roomName,
  onLogout,
  onToggleSidebar,
  onOpenProfile,
  unreadNotifications,
  rooms = [],
  onlineUsers = [],
  onOpenNotifications,
  onGoHome,
  onStartCall,
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
      isOnline: onlineUsers.some((u) => u.username === currentRoomObj.dmPartnerUsername),
    }
    : null;

  const isGroupRoom = currentRoomObj && !currentRoomObj.isPrivate && currentRoomObj.members;
  const onlineMembers = onlineUsers;

  const displayTitle = resolvedDmName
    ? `گفتگو با ${resolvedDmName}`
    : roomName?.startsWith('dm_')
      ? 'چت خصوصی'
      : roomName;

  const [showCallMenu, setShowCallMenu] = useState(false);

  const handleGroupCall = () => {
    if (onlineMembers.length > 0) {
      const firstMember = onlineMembers[0];
      onStartCall(firstMember.id, firstMember.username);
    }
    setShowCallMenu(false);
  };

  return (
    <header className="glass-panel-strong border-b border-white/10 px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 animate-slide-down sticky top-0 z-30">

      {/* سمت چپ: اطلاعات اتاق */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* دکمه لوگو - در موبایل کوچک‌تر */}
        <button
          type="button"
          onClick={onGoHome}
          className="group relative p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-surface-900 ring-2 ring-primary-500/50 shadow-[0_0_20px_-4px] shadow-primary-500/60 hover:ring-primary-600 hover:shadow-primary-400/80 transition-all duration-200 cursor-pointer shrink-0"
        >
          <img
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg object-contain drop-shadow"
            src="/pwa-192x192.png"
            alt="لوگو"
          />
          <span className="pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl bg-white/5 opacity-0 group-hover:opacity-80 transition-opacity duration-200" />
        </button>

        <div className="min-w-0 flex flex-col justify-center">
          <h1 className="font-bold text-surface-50 truncate text-sm sm:text-base max-w-[120px] sm:max-w-xs md:max-w-md lg:max-w-lg transition-all duration-300">
            {displayTitle}
          </h1>

          {/* 👈 این بخش از سایز sm به بالا نمایش داده می‌شود (تبلت و دسکتاپ) */}
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 mt-0.5">
            <span className={`status-dot ${isConnected ? 'status-online' : 'status-offline'} animate-pulse-soft scale-75 sm:scale-100`} />
            <span className="text-[10px] sm:text-xs text-surface-400 font-medium">
              {isConnected ? 'متصل' : 'قطع شده'}
            </span>
            <span className="text-surface-600 text-[10px] sm:text-xs">•</span>
            <span className="text-[10px] sm:text-xs text-surface-400">
              {onlineCount} کاربر آنلاین
            </span>
          </div>
        </div>
      </div>

      {/* سمت راست: دکمه‌های عملیاتی */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">

        {/* دکمه منو (همبرگری) - فقط موبایل و تبلت */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden btn-ghost p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-surface-400 cursor-pointer hover:text-white hover:bg-white/10 transition-colors"
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
          className="relative btn-ghost p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-surface-400 cursor-pointer hover:text-white hover:bg-white/10 transition-colors"
          title="اعلان‌ها"
          aria-label="اعلان‌ها"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[9px] sm:text-[10px] font-bold flex items-center justify-center rounded-full bg-danger-500 text-white animate-pulse-soft">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        {/* دکمه نصب - فقط دسکتاپ */}
        <div className="hidden md:block">
          <InstallButton />
        </div>

        {/* تماس خصوصی */}
        {dmPartner && (
          <button
            onClick={() => onStartCall(dmPartner.userId, dmPartner.username)}
            className="btn-ghost p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors cursor-pointer"
            title={`تماس با ${dmPartner.username}`}
            aria-label="تماس تصویری"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}

        {/* تماس گروهی */}
        {isGroupRoom && onlineMembers.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowCallMenu(!showCallMenu)}
              className="btn-ghost p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 transition-colors cursor-pointer"
              title={`تماس گروهی با ${onlineMembers.length} عضو آنلاین`}
              aria-label="تماس گروهی"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>

            {showCallMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCallMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-surface-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl z-50 animate-fade-in origin-top-right">
                  <div className="p-2">
                    <p className="px-3 py-2 text-xs text-surface-500 font-medium uppercase tracking-wider">
                      اعضا برای تماس
                    </p>
                    <div className="max-h-48 overflow-y-auto scrollbar-thin">
                      {onlineMembers.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => {
                            onStartCall(member.id, member.username);
                            setShowCallMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          <Avatar username={member.username} size="sm" avatarIndex={member.avatarIndex} status="online" />
                          <span className="font-medium truncate">{member.username}</span>
                        </button>
                      ))}
                    </div>
                    <hr className="border-white/10 my-1" />
                    <button
                      onClick={handleGroupCall}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-primary-400 hover:bg-primary-500/10 hover:text-primary-300 transition-colors font-medium text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      تماس با همه ({onlineMembers.length})
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
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

        {/* خروج */}
        <button
          onClick={onLogout}
          className="btn-ghost p-2 sm:p-2.5 rounded-lg sm:rounded-xl cursor-pointer text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="خروج"
          aria-label="خروج"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}