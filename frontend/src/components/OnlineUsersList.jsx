import Avatar from './Avatar';

export default function OnlineUsersList({ users, currentUser }) {
  return (
    <aside className="w-64 bg-white border-l hidden md:flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-bold text-slate-800">کاربران آنلاین ({users.length})</h2>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {users.map((u) => (
          <li
            key={u.id}
            className={`flex items-center gap-2 p-2 rounded-lg ${
              u.username === currentUser ? 'bg-indigo-50' : 'hover:bg-slate-50'
            }`}
          >
            <Avatar username={u.username} color={u.avatarColor} size="sm" />
            <span className="text-sm text-slate-700">
              {u.username} {u.username === currentUser && '(شما)'}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}