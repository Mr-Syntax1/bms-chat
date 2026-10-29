import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import OnlineUsersList from './OnlineUsersList';
import TypingIndicator from './TypingIndicator';
import RoomList from './RoomList';

export default function Chat({ chat, user, onLogout }) {
  const {
    messages, onlineUsers, typingUsers, rooms, currentRoom,
    sendMessage, setTyping, createRoom, switchRoom, leaveRoom, deleteRoom,
    openDM, deleteMessage,
    connectSocket, disconnectSocket, connected,
  } = chat;

  const navigate = useNavigate();

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, [connectSocket, disconnectSocket]);

  const [sidebar, setSidebar] = useState(null);

  const toggleSidebar = useCallback((panel = 'rooms') => {
    setSidebar((prev) => (prev === panel ? null : panel));
  }, []);

  const closeSidebar = useCallback(() => setSidebar(null), []);

  const handleOpenDM = useCallback(async (targetUserId, targetUsername) => {
    const res = await openDM(targetUserId, targetUsername);
    if (res?.success) {
      closeSidebar();
    }
  }, [openDM, closeSidebar]);

  // 👈 تابع پروفایل برای استفاده در هر دو حالت
  const handleOpenProfile = useCallback((username) => {
    if (username) {
      navigate(`/profile/${username}`);
    } else {
      navigate('/profile');
    }
  }, [navigate]);
  
  return (
    <div className="h-screen flex flex-col bg-aurora overflow-hidden">
      {/* Animated background orbs (decorative) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-500/15 to-primary-500/15 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-gradient-to-br from-accent-500/15 to-pink-500/10 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <ChatHeader
          isConnected={connected}
          user={user}
          onlineCount={onlineUsers.length}
          roomName={currentRoom}
          onLogout={onLogout}
          onToggleSidebar={() => toggleSidebar('rooms')}
          onOpenUsers={() => toggleSidebar('users')}
          onOpenProfile={handleOpenProfile}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Desktop: always visible sidebars */}
          <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-white/10 glass-panel-strong slide-in-left">
            <RoomList
              rooms={rooms}
              currentRoom={currentRoom}
              onSwitch={switchRoom}
              onCreate={createRoom}
              onDelete={deleteRoom}
              onLeave={leaveRoom}
              onOpenDM={handleOpenDM}
              currentUser={user?.username}
            />
          </aside>

          <main className="flex-1 flex flex-col min-w-0 bg-surface-950/30 backdrop-blur-sm">
            <div className="flex-1 overflow-hidden flex flex-col">
              <MessageList
                messages={messages}
                currentUsername={user?.username}
                onDeleteMessage={deleteMessage}
                currentUserId={user?.id}
              />
              <TypingIndicator users={typingUsers.filter((u) => u !== user?.username)} />
              <ChatInput onSend={sendMessage} onTyping={setTyping} />
            </div>
          </main>

          <aside className="hidden xl:flex w-72 shrink-0 flex-col border-l border-white/10 glass-panel-strong slide-in-right">
            <OnlineUsersList
              users={onlineUsers}
              currentUser={user?.username}
              onClose={closeSidebar}
              onOpenDM={handleOpenDM}
              onOpenProfile={handleOpenProfile} // 👈 اصلاح شد
            />
          </aside>
        </div>

        {/* Mobile hamburger overlay panels */}
        {sidebar && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
              onClick={closeSidebar}
            />
            <div
              className={`
                fixed top-0 z-50 h-full w-80 max-w-[85vw] glass-panel-strong
                flex flex-col shadow-2xl
                ${sidebar === 'rooms' ? 'right-0 left-auto slide-in-right' : 'left-0 right-auto slide-in-left'}
              `}
            >
              {sidebar === 'rooms' ? (
                <RoomList
                  rooms={rooms}
                  currentRoom={currentRoom}
                  onSwitch={(name) => { switchRoom(name); closeSidebar(); }}
                  onCreate={createRoom}
                  onDelete={deleteRoom}
                  onLeave={leaveRoom}
                  onOpenDM={handleOpenDM}
                  currentUser={user?.username}
                  onClose={closeSidebar}
                />
              ) : (
                <OnlineUsersList
                  users={onlineUsers}
                  currentUser={user?.username}
                  onOpenDM={handleOpenDM}
                  onClose={closeSidebar}
                  onOpenProfile={handleOpenProfile} // 👈 اصلاح شد
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}