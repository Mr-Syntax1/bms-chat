import { useEffect } from 'react';
import Avatar from './Avatar';

export default function OnlineUsersList({ users, currentUser, onClose }) {
  useEffect(() => {
    // Close sidebar when clicking outside on mobile
    const handleClickOutside = (e) => {
      if (window.innerWidth < 1024) {
        // This will be handled by the overlay click in Chat.jsx
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface-950/50">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-surface-50 text-sm">کاربران آنلاین</h2>
          <span className="badge badge-primary animate-pulse-soft">{users.length}</span>
        </div>
      </div>

      {/* User List */}
      <ul className="flex-1 overflow-y-auto p-2 space-y-1" role="list" aria-label="Online users">
        {users.map((u) => (
          <li key={u.id}>
            <div className={`
              flex items-center gap-3 p-3 rounded-xl transition-all duration-200
              ${u.username === currentUser ? 'bg-primary-900/20 ring-1 ring-primary-500/30' : 'hover:bg-white/5'}
              group
            `}>
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
                    {u.username === currentUser && (
                      <span className="badge badge-primary text-[10px] animate-pulse-soft mr-2">شما</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="btn-ghost p-2 rounded-xl text-surface-400 hover:text-white hover:bg-white/10 transition-colors" aria-label={`مشاهده پروفایل ${u.username}`}>
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
      <div className="p-3 border-t border-white/10">
        <p className="text-xs text-center text-surface-500">کلیک برای مشاهده پروفایل</p>
      </div>
    </div>
  );
}