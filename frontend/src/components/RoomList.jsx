import { useState, useRef, useEffect, useCallback } from 'react';
import ContextMenu from './ContextMenu';

export default function RoomList({
  rooms,
  currentRoom,
  onlineUsers = [],
  onSwitch,
  onCreate,
  onDelete,
  onLeave,
  onOpenDM,
  onSearchRooms,
  onOpenProfile,
  currentUser,
}) {
  const [newRoom, setNewRoom] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);

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

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setShowSearch(false);
      setSearchResults([]);
      setUserResults([]);
      return;
    }

    setShowSearch(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await onSearchRooms(trimmed);
        setSearchResults(res?.rooms ?? []);
        setUserResults(res?.users ?? []);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
        setUserResults([]);
      }
    }, 250);
  }, [onSearchRooms]);

  useEffect(() => () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  }, []);

  const handleRoomClick = useCallback(async (roomName) => {
    const res = await onSwitch(roomName);
    if (res?.success && showSearch) {
      setSearchQuery('');
      setShowSearch(false);
      setSearchResults([]);
      setUserResults([]);
    }
    return res;
  }, [onSwitch, showSearch]);

  const handleContextMenu = useCallback((e, room) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, room });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ x: null, y: null, room: null });
  }, []);

  const getContextMenuItems = (room) => {
    const isCreator = room.createdBy === currentUser;
    const isMember = room.isMember !== false;

    if (!isMember) {
      return [
        { label: 'پیوستن به اتاق', icon: <JoinIcon />, onClick: () => handleRoomClick(room.name) },
      ];
    }

    if (!room.isPrivate && isCreator) {
      return [
        { label: 'حذف گروه (کامل)', icon: <DeleteIcon />, danger: true, onClick: () => handleDelete(room.name) },
        { label: 'خروج از گروه', icon: <LeaveIcon />, danger: true, onClick: () => onLeave(room.name) },
      ];
    }

    return [
      { label: 'حذف از لیست من', icon: <LeaveIcon />, danger: true, onClick: () => onLeave(room.name) },
    ];
  };

  const displayRooms = showSearch ? searchResults : rooms;

  const privateRooms = displayRooms.filter(r => r.isPrivate);
  const publicRooms = displayRooms.filter(r => !r.isPrivate);
  const currentRoomObj = rooms.find((r) => r.name === currentRoom);
  const isCurrentRoomCreator = currentRoomObj?.createdBy === currentUser;

  return (
    <div className="flex flex-col h-full bg-surface-950/40 backdrop-blur-sm relative">
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

      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <input
            type="text"
            placeholder="جستجوی اتاق یا کاربر..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-surface-900/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
          />
          <svg className="w-4 h-4 text-surface-500 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {showSearch && (searchResults.length > 0 || userResults.length > 0) && (
        <div className="px-3 py-2 text-xs text-surface-500 uppercase tracking-wider border-b border-white/10 bg-surface-900/30">
          نتایج جستجو
        </div>
      )}

      <ul className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin" role="list" aria-label="Chat rooms">
        {showSearch && userResults.length > 0 && (
          <>
            <li className="px-2 py-1 text-xs text-surface-500 uppercase tracking-wider">کاربران</li>
            {userResults.map((u) => (
              <li key={`user-${u.id}`}>
                <div className="w-full px-2 py-2 rounded-xl transition-all duration-200 flex items-center justify-between text-surface-300 hover:bg-white/5 card-hover">
                  <button
                    onClick={() => onOpenDM?.(u.id, u.username)}
                    className="flex-1 min-w-0 flex items-center gap-2 text-right"
                    title="ارسال پیام"
                  >
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0 bg-gradient-to-br from-purple-500 to-indigo-500">
                      {u.username?.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-surface-200">{u.username}</span>
                      <span className={`block text-[10px] ${u.isOnline ? 'text-green-400' : 'text-surface-500'}`}>
                        {u.isOnline ? 'آنلاین' : 'آفلاین — ارسال پیام ممکن است'}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => onOpenProfile?.(u.username)}
                    className="p-2 rounded-lg text-surface-500 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                    title="مشاهده پروفایل"
                    aria-label="مشاهده پروفایل"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </>
        )}

        {showSearch && searchResults.length > 0 && userResults.length > 0 && (
          <li className="px-2 py-1 text-xs text-surface-500 uppercase tracking-wider">اتاق‌ها</li>
        )}

        {(displayRooms.length === 0 && !showSearch) && (
          <p className="text-center text-surface-500 text-xs mt-4">اتاقی یافت نشد.</p>
        )}

        {(displayRooms.length === 0 && showSearch && userResults.length === 0) && (
          <p className="text-center text-surface-500 text-xs mt-4">اتاق یا کاربری با این نام یافت نشد.</p>
        )}

        {privateRooms.length > 0 && (
          <>
            {privateRooms.length > 0 && !showSearch && (
              <li className="px-2 py-1 text-xs text-surface-500 uppercase tracking-wider">چت‌های خصوصی</li>
            )}
            {privateRooms.map((r) => (
              <RoomItem
                key={r.id}
                room={r}
                currentRoom={currentRoom}
                currentUser={currentUser}
                onSwitch={handleRoomClick}
                onlineUsers={onlineUsers}
                onOpenDM={onOpenDM}
                onOpenProfile={onOpenProfile}
                onContextMenu={handleContextMenu}
                showPartnerStatus={!showSearch}
              />
            ))}
          </>
        )}

        {publicRooms.length > 0 && (
          <>
            {publicRooms.length > 0 && !showSearch && privateRooms.length > 0 && (
              <li className="px-2 py-1 text-xs text-surface-500 uppercase tracking-wider">کانال‌های عمومی</li>
            )}
            {publicRooms.map((r) => (
              <RoomItem
                key={r.id}
                room={r}
                currentRoom={currentRoom}
                currentUser={currentUser}
                onSwitch={handleRoomClick}
                onContextMenu={handleContextMenu}
              />
            ))}
          </>
        )}
      </ul>

      {currentRoom && !rooms.find(r => r.name === currentRoom && r.isPrivate) && (
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => (isCurrentRoomCreator ? handleDelete(currentRoom) : onLeave(currentRoom))}
            className="w-full text-center text-sm text-red-400 hover:text-red-300 py-2.5 rounded-xl hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isCurrentRoomCreator ? `حذف گروه #${currentRoom}` : `حذف #${currentRoom} از لیست من`}
          </button>
        </div>
      )}

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

      {!showCreate && !showSearch && (
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-center text-surface-500">برای ایجاد اتاق روی + کلیک کنید</p>
        </div>
      )}

      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextMenu.room ? getContextMenuItems(contextMenu.room) : []}
        onClose={closeContextMenu}
      />
    </div>
  );
}

function RoomItem({
  room,
  currentRoom,
  onSwitch,
  onOpenDM,
  onOpenProfile,
  onContextMenu,
  showPartnerStatus = false,
  onlineUsers = [],
}) {
  const isCurrentRoom = room.name === currentRoom;
  const isPrivate = room.isPrivate;

  // وضعیت آنلاین بودن شریک چت خصوصی
  // اگر نام فیلد در پروژه‌ی شما متفاوت است، اینجا را تغییر دهید (مثلاً room.isOnline)
    const partnerOnline = onlineUsers.some(u => u.username === room.dmPartnerUsername);

  const handleItemClick = () => {
    if (isPrivate && room.dmPartnerId && onOpenDM) {
      onOpenDM(room.dmPartnerId, room.dmPartnerUsername);
    } else {
      onSwitch(room.name);
    }
  };

  return (
    <li className="relative group" onContextMenu={(e) => onContextMenu(e, room)}>
      <div
        className={`
          w-full rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-between card-hover
          ${isCurrentRoom
            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-glow-primary relative'
            : 'text-surface-300 hover:bg-white/5 hover:text-white'
          }
        `}
      >
        <button
          type="button"
          onClick={handleItemClick}
          className="flex-1 min-w-0 text-right px-3 py-2.5 flex items-center gap-2"
          aria-current={isCurrentRoom ? 'true' : 'false'}
        >
          <div className="relative shrink-0">
            {isPrivate ? (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, ${room.dmPartnerAvatar || '#6366f1'}, ${room.dmPartnerAvatar || '#6366f1'})`,
                }}
              >
                {room.dmPartnerUsername?.charAt(0).toUpperCase()}
              </div>
            ) : (
              <svg
                className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            )}

            {/* نقطه‌ی سبز روی آواتار در چت خصوصی، اگر آنلاین بود */}
            {isPrivate && partnerOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-surface-950" />
            )}

            {isCurrentRoom && !isPrivate && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-primary-600 animate-pulse-soft" />
            )}
          </div>

          <span className="min-w-0 flex-1">
            <span className="block truncate">
              {isPrivate ? room.dmPartnerUsername || '@' : `#${room.name}`}
            </span>

            {/* نمایش وضعیت آنلاین/آفلاین فقط برای چت‌های خصوصی در حالت عادی */}
            {isPrivate && showPartnerStatus && (
              <span
                className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium w-fit ${partnerOnline
                    ? 'bg-green-500/15 text-green-300 ring-1 ring-inset ring-green-500/30'
                    : 'bg-surface-700/60 text-surface-300 ring-1 ring-inset ring-white/5'
                  }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${partnerOnline ? 'bg-green-400' : 'bg-surface-400'
                    }`}
                />
                {partnerOnline ? 'آنلاین' : 'آفلاین'}
              </span>
            )}
          </span>
        </button>

        {/* دکمه مشاهده پروفایل فقط برای چت‌های خصوصی */}
        {isPrivate && onOpenProfile && room.dmPartnerUsername && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile(room.dmPartnerUsername);
            }}
            className={`p-2 ml-1 cursor-pointer mr-1 rounded-lg transition-colors shrink-0 ${isCurrentRoom
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-surface-500 hover:text-white hover:bg-white/10'
              }`}
            title="مشاهده پروفایل"
            aria-label="مشاهده پروفایل"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        )}
      </div>
    </li>
  );
}

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