import { useState, useRef, useEffect, useCallback } from 'react';
import ContextMenu from './ContextMenu';

export default function RoomList({ 
  rooms, 
  currentRoom, 
  onSwitch, 
  onCreate, 
  onDelete,
  onLeave,
  onOpenDM,
  currentUser,
}) {
  const [newRoom, setNewRoom] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ x: null, y: null, room: null });

  useEffect(() => {
    if (showCreate) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showCreate]);

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

  const handleDelete = async (roomName) => {
    if (window.confirm(`آیا از حذف اتاق "${roomName}" مطمئن هستید؟`)) {
      await onDelete(roomName);
    }
  };

  const handleContextMenu = useCallback((e, room) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, room });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ x: null, y: null, room: null });
  }, []);

  const getContextMenuItems = (room) => {
    const isCreator = room.createdBy === currentUser;
    const isMember = room.isMember !== false; // Default to true for backward compatibility
    const isCurrentRoom = room.name === currentRoom;

    if (isCreator && room.name !== 'general') {
      return [
        { label: 'حذف اتاق', icon: <DeleteIcon />, danger: true, onClick: () => handleDelete(room.name) },
      ];
    } else if (isMember && !isCurrentRoom) {
      return [
        { label: 'خروج از اتاق', icon: <LeaveIcon />, danger: true, onClick: () => onLeave(room.name) },
      ];
    } else if (!isMember) {
      return [
        { label: 'پیوستن به اتاق', icon: <JoinIcon />, onClick: () => onSwitch(room.name) },
      ];
    }
    return [];
  };

  // Filter rooms based on search
  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate private and public rooms
  const privateRooms = filteredRooms.filter(r => r.isPrivate);
  const publicRooms = filteredRooms.filter(r => !r.isPrivate);

  return (
    <div className="flex flex-col h-full bg-surface-950/40 backdrop-blur-sm relative">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="font-bold text-sm text-surface-300 uppercase tracking-wider">اتاق‌ها</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowCreate(true); }}
            className="btn-ghost p-2 rounded-xl text-surface-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="ایجاد اتاق جدید"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <input
            type="text"
            placeholder="جستجوی اتاق..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-900/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
          />
          <svg className="w-4 h-4 text-surface-500 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Room List */}
      <ul className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin" role="list" aria-label="Chat rooms">
        {filteredRooms.length === 0 && (
          <p className="text-center text-surface-500 text-xs mt-4">اتاقی یافت نشد.</p>
        )}

        {privateRooms.length > 0 && (
          <>
            <li className="px-2 py-1 text-xs text-surface-500 uppercase tracking-wider">чат‌های خصوصی</li>
            {privateRooms.map((r) => (
              <RoomItem
                key={r.id}
                room={r}
                currentRoom={currentRoom}
                currentUser={currentUser}
                onSwitch={onSwitch}
                onOpenDM={onOpenDM}
                onContextMenu={handleContextMenu}
              />
            ))}
          </>
        )}

        {publicRooms.length > 0 && (
          <>
            {privateRooms.length > 0 && (
              <li className="px-2 py-1 text-xs text-surface-500 uppercase tracking-wider">کانال‌های عمومی</li>
            )}
            {publicRooms.map((r) => (
              <RoomItem
                key={r.id}
                room={r}
                currentRoom={currentRoom}
                currentUser={currentUser}
                onSwitch={onSwitch}
                onContextMenu={handleContextMenu}
              />
            ))}
          </>
        )}
      </ul>

      {/* Leave Room Button */}
      {currentRoom && currentRoom !== 'general' && !rooms.find(r => r.name === currentRoom && r.isPrivate) && (
        <div className="p-3 border-t border-white/10">
          <button
            onClick={onLeave}
            className="w-full text-center text-sm text-red-400 hover:text-red-300 py-2.5 rounded-xl hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            خروج از #{currentRoom}
          </button>
        </div>
      )}

      {/* Create Room Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="p-3 border-t border-white/10 animate-slide-down">
          <div className="relative">
            <input
              ref={inputRef}
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder="نام اتاق جدید..."
              className="input-sm w-full pr-12 bg-surface-800 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={creating}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={creating || !newRoom.trim()}
              className="absolute inset-y-0 left-3 flex items-center text-surface-400 hover:text-white disabled:opacity-50"
              aria-label="ایجاد اتاق"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2 animate-fade-in">{error}</p>}
        </form>
      )}

      {!showCreate && (
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-center text-surface-500">برای ایجاد اتاق روی + کلیک کنید</p>
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextMenu.room ? getContextMenuItems(contextMenu.room) : []}
        onClose={closeContextMenu}
      />
    </div>
  );
}

// Room Item Component
function RoomItem({ room, currentRoom, onSwitch, onOpenDM, onContextMenu }) {
  const isCurrentRoom = room.name === currentRoom;
  const isPrivate = room.isPrivate;

  return (
    <li className="relative group" onContextMenu={(e) => onContextMenu(e, room)}>
      <button
        onClick={() => { 
          if (isPrivate && onOpenDM) {
            onOpenDM(room);
          } else {
            onSwitch(room.name); 
          }
        }}
        className={`
          w-full text-right px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-between card-hover
          ${isCurrentRoom
            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-glow-primary relative'
            : 'text-surface-300 hover:bg-white/5 hover:text-white'
          }
        `}
        aria-current={isCurrentRoom ? 'true' : 'false'}
      >
        <span className="flex items-center gap-2">
          <div className="relative">
            {isPrivate ? (
              <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            )}
            {isCurrentRoom && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-primary-600 animate-pulse-soft" />
            )}
          </div>
          <span className="truncate">{isPrivate ? '@' : '#'} {room.name}</span>
        </span>
        
        {isCurrentRoom && (
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse-soft" />
        )}
      </button>
    </li>
  );
}

// Icon Components
function DeleteIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function JoinIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}