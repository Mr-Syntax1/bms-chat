export default function NotificationDropdown({
  notifications,
  unreadCount,
  showNotifications,
  onClose,
  onOpenDM,
  onSwitchRoom,
  isCurrentRoom,
  clearBadge,
}) {
  if (!showNotifications) return null;

  const groupedNotifications = notifications.reduce((acc, notif) => {
    const date = new Date(notif.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key;
    if (date.toDateString() === today.toDateString()) {
      key = 'today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'yesterday';
    } else {
      key = 'other';
    }
    if (!acc[key]) acc[key] = [];
    acc[key].push(notif);
    return acc;
  }, {});

  const groupLabels = { today: 'امروز', yesterday: 'دیروز', other: 'سایر' };

  const handleNotifClick = (notif) => {
    if (notif.isRead) return;
    if (notif.roomName.startsWith('dm_')) {
      const [dm1, dm2] = notif.roomName.split('_');
      const ids = [notif.senderId, dm1 + dm2].sort();
      const targetUserId = ids[0] === ids[1]
        ? ids[0]
        : notif.senderId === ids[0]
        ? ids[1]
        : ids[0];
      onOpenDM?.(targetUserId, notif.senderName);
    } else {
      onSwitchRoom?.(notif.roomName);
    }
    clearBadge?.();
    onClose?.();
  };

  return (
    <div className="absolute right-3 top-full mt-2 w-96 bg-surface-900 border border-white/10 rounded-2xl shadow-2xl z-50 animate-scale-in overflow-hidden">
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-surface-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-surface-50 text-sm">اعلان‌ها</h3>
            <p className="text-[11px] text-surface-500">
              {notifications.length} نوتیفیکیشن •{' '}
              <span className="text-primary-400 font-medium">{unreadCount}</span> خوانده‌نشده
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="btn-ghost p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="بستن"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <ul className="max-h-[70vh] overflow-y-auto scrollbar-thin">
        {notifications.length === 0 ? (
          <li className="p-8 text-center text-surface-500 text-sm">
            <div className="w-14 h-14 rounded-full bg-surface-800/50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925-3.545L12 12m0 0l1.5 1.5m-1.5-1.5L10.5 12m1.5 1.5L12 12" />
              </svg>
            </div>
            <p>هنوز اعلان جدیدی ندارید</p>
            <p className="text-xs text-surface-600 mt-1">وقتی کسی در اتاق‌هایی که نیستید پیام بفرستد، اینجا نمایش داده می‌شود</p>
          </li>
        ) : (
          Object.entries(groupedNotifications).map(([group, notifs]) => (
            <li key={group} className="mb-1">
              {group !== 'other' && (
                <div className="px-3 py-1.5 text-[11px] font-medium text-surface-500 bg-surface-950/30 sticky top-0">
                  {groupLabels[group]}
                </div>
              )}
              {group === 'other' && notifs.length > 0 && (
                <div className="px-3 py-1.5 text-[11px] font-medium text-surface-500 bg-surface-950/30">
                  پیام‌های قدیمی
                </div>
              )}
              {notifs.map((notif, idx) => (
                <li
                  key={notif.id}
                  className={`
                    px-3 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group
                    ${notif.isRead ? 'bg-transparent' : 'bg-primary-900/15 border-r-2 border-primary-500'}
                    ${idx === notifs.length - 1 ? 'border-b-0' : ''}
                  `}
                  onClick={() => handleNotifClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{
                        backgroundImage: `linear-gradient(to bottom right, ${notif.avatarColor || '#3b82f6'}, ${notif.avatarColor || '#3b82f6'})`,
                      }}
                    >
                      {notif.senderName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium ${notif.isRead ? 'text-surface-300' : 'text-white'}`}>
                          {notif.senderName}
                        </span>
                        <span className="text-[10px] text-surface-500 whitespace-nowrap">
                          {new Date(notif.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${notif.isRead ? 'text-surface-500' : 'text-surface-300'}`}>
                        {notif.roomName.startsWith('dm_') ? (
                          <span className="text-purple-400">پیام خصوصی</span>
                        ) : (
                          <span>در #{notif.roomName} پیام داد:</span>
                        )}
                      </p>
                      <p className={`text-xs mt-1 truncate ${notif.isRead ? 'text-surface-600' : 'text-surface-300 font-medium'}`}>
                        {notif.messagePreview}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse-soft shrink-0 mt-1" />
                    )}
                  </div>
                </li>
              ))}
            </li>
          ))
        )}
      </ul>

      <div className="p-3 border-t border-white/10 bg-surface-800/30 flex justify-center">
        <button
          onClick={clearBadge}
          className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
        >
          علامت‌گذاری همه به عنوان خوانده شده
        </button>
      </div>
    </div>
  );
}
