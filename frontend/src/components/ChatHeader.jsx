import Avatar from './Avatar';

export default function ChatHeader({ isConnected, user, onlineCount }) {
  return (
    <header className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
      <div>
        <h1 className="font-bold">اتاق چت 🗨️</h1>
        <p className="text-xs text-slate-400">{onlineCount} نفر آنلاین</p>
      </div>
      <div className="flex items-center gap-3">
        <Avatar username={user?.username} color={user?.avatarColor} size="sm" />
        <span className="text-sm">{user?.username}</span>
        <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
    </header>
  );
}