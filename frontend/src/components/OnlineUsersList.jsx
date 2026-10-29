import { useEffect } from 'react';
import Avatar from './Avatar';

export default function OnlineUsersList({ users, currentUser, onClose, onOpenDM }) {
  useEffect(() => {
    const handleClickOutside = () => {
      if (window.innerWidth < 1024) {
        // handled by overlay
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface-950/40">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-success-500/20 to-cyan-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-surface-50 text-sm">کاربران آنلاین</h2>
            <p className="text-[11px] text-surface-500 mt-0.5">{users.length} نفر فعال</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-success animate-pulse-soft">{users.length}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="btn-ghost p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="بستن"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* User List */}
      <ul className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin" role="list" aria-label="Online users">
        {users.map((u, index) => (
          <li key={u.id} className="stagger-item" style={{ animationDelay: `${index * 40}ms` }}>
            <div className={`
              flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative overflow-hidden
              ${u.username === currentUser
                ? 'bg-gradient-to-r from-primary-900/40 to-primary-800/20 ring-1 ring-primary-500/30'
                : 'hover:bg-white/5'
              }
            `}>
              {/* hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-accent-500/5" />
              </div>

              <Avatar
                username={u.username}
                color={u.avatarColor}
                size="md"
                status="online"
              />
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-surface-50 truncate">
                    {u.username}
                  </span>
                  {u.username === currentUser && (
                    <span className="badge badge-primary text-[10px] animate-pulse-soft">شما</span>
                  )}
                </div>
                <span className="text-[11px] text-surface-500">آنلاین</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {u.username !== currentUser && onOpenDM && (
                  <button
                    onClick={() => onOpenDM(u.id, u.username)}
                    className="btn-ghost p-2 rounded-xl text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                    aria-label={`پیام خصوصی به ${u.username}`}
                    title="پیام خصوصی"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                )}
                <button
                  className="btn-ghost p-2 rounded-xl text-surface-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label={`پروفایل ${u.username}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 backdrop-blur-sm">
        <p className="text-xs text-center text-surface-500">کلیک روی آیکون پیام برای چت خصوصی</p>
      </div>
    </div>
  );
}