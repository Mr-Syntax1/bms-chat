import { useState, useRef } from 'react';

export default function RoomList({ 
  rooms, 
  currentRoom, 
  onSwitch, 
  onCreate, 
  onDelete,
  onLeave,
  currentUser
}) {
  const [newRoom, setNewRoom] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const inputRef = useRef(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    setCreating(true);
    setError('');
    const res = await onCreate(newRoom.trim());
    if (res.error) setError(res.error);
    else {
      setNewRoom('');
      setShowCreate(false);
    }
    setCreating(false);
  };

  const handleDelete = async (e, roomName) => {
    e.stopPropagation(); // 👈 جلوگیری از سوییچ شدن اتاق هنگام کلیک روی حذف
    if (window.confirm(`آیا از حذف اتاق "${roomName}" مطمئن هستید؟`)) {
      await onDelete(roomName);
    }
  };

  return (
    <div className="w-56 bg-surface-900 text-white flex flex-col border-r border-surface-700 h-full">
      <div className="p-4 border-b border-surface-700 flex items-center justify-between">
        <h2 className="font-bold text-sm text-surface-300 uppercase tracking-wider">اتاق‌ها</h2>
        <button
          onClick={() => { setShowCreate(true); setTimeout(() => inputRef.current?.focus(), 100); }}
          className="btn-ghost p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          aria-label="Create new room"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto p-2 space-y-1" role="list" aria-label="Chat rooms">
        {rooms.map((r) => (
          <li key={r.id} className="relative group">
            <button
              onClick={() => onSwitch(r.name)}
              className={`
                w-full text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-between
                ${r.name === currentRoom
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-glow-primary'
                  : 'text-surface-300 hover:bg-surface-800 hover:text-white'
                }
              `}
              aria-current={r.name === currentRoom ? 'true' : 'false'}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="truncate"># {r.name}</span>
              </span>
              
              {r.name === currentRoom && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse-soft" aria-hidden="true" />
              )}
            </button>

            {/* 👈 دکمه حذف: فقط برای اتاق‌هایی که کاربر خودش ساخته */}
            {r.createdBy === currentUser && r.name !== 'general' && (
              <button
                onClick={(e) => handleDelete(e, r.name)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-surface-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="حذف اتاق"
                aria-label={`Delete room ${r.name}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* 👈 دکمه خروج از اتاق فعلی */}
      {currentRoom && currentRoom !== 'general' && (
        <div className="p-2 border-t border-surface-700">
          <button
            onClick={onLeave}
            className="w-full text-center text-xs text-red-400 hover:text-red-300 py-2 rounded-lg hover:bg-surface-800 transition-colors"
          >
            خروج از اتاق #{currentRoom}
          </button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="p-2 border-t border-surface-700 animate-slide-down">
          <div className="relative">
            <input
              ref={inputRef}
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder="نام اتاق جدید..."
              className="input-sm w-full pr-10 bg-surface-800 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              disabled={creating}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={creating || !newRoom.trim()}
              className="absolute inset-y-0 left-2 flex items-center text-surface-400 hover:text-white disabled:opacity-50"
              aria-label="Create room"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-1.5 animate-fade-in">{error}</p>}
        </form>
      )}

      {!showCreate && (
        <div className="p-3 border-t border-surface-700">
          <p className="text-xs text-center text-surface-500">برای ایجاد اتاق روی + کلیک کنید</p>
        </div>
      )}
    </div>
  );
}