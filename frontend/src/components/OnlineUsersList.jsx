import Avatar from './Avatar';

export default function OnlineUsersList({ users, currentUser }) {
  return (
    <aside className="w-64 glass-card border-l border-surface-200 dark:border-surface-800 hidden md:flex flex-col">
      <div className="p-4 border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-surface-900 dark:text-surface-50 text-sm">
            کاربران آنلاین
          </h2>
          <span className="badge badge-primary">{users.length}</span>
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto p-2 space-y-1" role="list" aria-label="Online users">
        {users.map((u) => (
          <li key={u.id}>
            <div className={`
              flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200
              ${u.username === currentUser ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-surface-100 dark:hover:bg-surface-800'}
              group
            `}>
              <Avatar
                username={u.username}
                color={u.avatarColor}
                size="sm"
                status="online"
              />
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">
                  {u.username}
                  {u.username === currentUser && (
                    <span className="badge badge-primary ml-2 text-[10px] mr-2">شما</span>
                  )}
                </span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="btn-ghost p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-300" aria-label={`View ${u.username} profile`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="p-3 border-t border-surface-200 dark:border-surface-800">
        <p className="text-xs text-center text-surface-500 dark:text-surface-400">
          کلیک برای مشاهده پروفایل
        </p>
      </div>
    </aside>
  );
}