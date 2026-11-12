import { useState, useEffect, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import RoomList from './RoomList';
import NotificationDropdown from './NotificationDropdown';
import WelcomeScreen from './WelcomeScreen';
import LoadingSpinner from './LoadingSpinner';
import { useWebRTC } from '../hooks/useWebRTC';
import CallModal from './CallModal';

export default function Chat({ chat, user, onLogout }) {
  const {
    messages,
    onlineUsers,
    typingUsers,
    rooms,
    currentRoom,
    sendMessage,
    setTyping,
    createRoom,
    switchRoom,
    leaveRoom,
    deleteRoom,
    searchRooms,
    openDM,
    deleteMessage,
    editMessage,
    connectSocket,
    disconnectSocket,
    connected,
    notifications,
    unreadCount,
    showNotifications,
    fetchNotifications,
    markNotificationsAsRead,
    setUnreadCount,
    setShowNotifications,
  } = chat;

  const [isPending, startTransition] = useTransition();
  const navigate = useNavigate();
  const [sidebar, setSidebar] = useState(null);
  const closeSidebar = useCallback(() => setSidebar(null), []);
  const rtc = useWebRTC(user);

  const handleSwitchRoom = useCallback((roomName, isMobile = false) => {
    // ۱. اگر در موبایل هستیم، ابتدا سایدبار را فوراً ببندیم
    if (isMobile) {
      closeSidebar();
    }

    // ۲. سپس عملیات تغییر اتاق را شروع کنیم
    startTransition(() => {
      switchRoom(roomName);
    });
  }, [switchRoom, closeSidebar]);

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, [connectSocket, disconnectSocket]);

  const toggleSidebar = useCallback((panel = 'rooms') => {
    setSidebar((prev) => (prev === panel ? null : panel));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !e.target.closest('.notification-dropdown') &&
        !e.target.closest('[data-notification-toggle]')
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [setShowNotifications]);

  const handleGoHome = useCallback(() => {
    handleSwitchRoom(null);
  }, [handleSwitchRoom]);

  const handleOpenDM = useCallback(
    async (targetUserId, targetUsername) => {
      startTransition(async () => {
        const res = await openDM(targetUserId, targetUsername);
        if (res?.success) {
          closeSidebar();
        }
      });
    },
    [openDM, closeSidebar]
  );

  const handleOpenProfile = useCallback(
    (username) => {
      if (username) {
        navigate(`/profile/${username}`);
      } else {
        navigate('/profile');
      }
    },
    [navigate]
  );

  const handleOpenNotifications = useCallback(() => {
    setShowNotifications((prev) => {
      const next = !prev;
      if (next) fetchNotifications?.();
      return next;
    });
  }, [fetchNotifications, setShowNotifications]);

  return (
    <div className="h-screen flex flex-col bg-aurora overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-linear-to-br from-primary-500/20 to-accent-500/20 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-linear-to-br from-cyan-500/15 to-primary-500/15 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-linear-to-br from-accent-500/15 to-pink-500/10 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <ChatHeader
          isConnected={connected}
          rooms={rooms}
          onGoHome={handleGoHome}
          user={user}
          onlineUsers={onlineUsers}
          onlineCount={onlineUsers.length}
          roomName={currentRoom}
          onLogout={onLogout}
          onToggleSidebar={() => toggleSidebar('rooms')}
          onOpenProfile={handleOpenProfile}
          unreadNotifications={unreadCount}
          onOpenNotifications={handleOpenNotifications}
          onStartCall={rtc.startCall}
        />

        <div className="flex-1 flex overflow-hidden">
          <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-white/10 glass-panel-strong slide-in-left">
            <RoomList
              rooms={rooms}
              onlineUsers={onlineUsers}
              currentRoom={currentRoom}
              onSwitch={(name) => handleSwitchRoom(name, false)}
              onCreate={createRoom}
              onDelete={deleteRoom}
              onLeave={leaveRoom}
              onOpenDM={handleOpenDM}
              onSearchRooms={searchRooms}
              onOpenProfile={handleOpenProfile}
              currentUser={user?.id}
            />
          </aside>

          {/* ناحیه پیام‌ها با لودینگ اختصاصی */}
          <main className="flex-1 flex flex-col min-w-0 bg-surface-950/30 relative">
            
            {/* لودینگ فقط داخل ناحیه پیام‌ها */}
            {isPending && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-950/40  animate-fade-in">
                <LoadingSpinner text="در حال ورود به اتاق..." />
              </div>
            )}

            {/* محتوای پیام‌ها (در حالت لودینگ، محو می‌شود) */}
            <div className={`flex-1 overflow-hidden flex flex-col transition-all duration-300 ${isPending ? 'opacity-30' : ''}`}>
              {currentRoom ? (
                <>
                  <MessageList
                    messages={messages}
                    currentUsername={user?.username}
                    onDeleteMessage={deleteMessage}
                    onEditMessage={editMessage}
                    currentUserId={user?.id}
                  />
                  <TypingIndicator
                    users={typingUsers.filter((u) => u !== user?.username)}
                  />
                  <ChatInput onSend={sendMessage} onTyping={setTyping} />
                </>
              ) : (
                <WelcomeScreen
                  user={user}
                  rooms={rooms}
                  onSelectRoom={handleSwitchRoom}
                  onCreateRoom={createRoom}
                />
              )}
            </div>
          </main>
        </div>

        <CallModal
          isCalling={rtc.isCalling}
          remoteScreenSharing={rtc.remoteScreenSharing}
          incomingCall={rtc.incomingCall}
          remoteUser={rtc.remoteUser}
          localStream={rtc.localStream}
          remoteStream={rtc.remoteStream}
          remoteStreamVersion={rtc.remoteStreamVersion}
          callState={rtc.callState}
          callType={rtc.callType}
          participants={rtc.participants}
          isMuted={rtc.isMuted}
          isVideoOn={rtc.isVideoOn}
          isScreenSharing={rtc.isScreenSharing}
          isDeafened={rtc.isDeafened}
          onAnswer={rtc.answerCall}
          onDecline={rtc.declineCall}
          onEnd={rtc.endCall}
          onToggleMute={rtc.toggleMute}
          onToggleDeafen={rtc.toggleDeafen}
          onToggleVideo={rtc.toggleVideo}
          onToggleScreenShare={rtc.toggleScreenShare}
          user={user}
        />

        {sidebar && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
              onClick={closeSidebar}
            />
            <div className="fixed top-0 z-50 h-full w-80 max-w-[85vw] glass-panel-strong flex flex-col shadow-2xl right-0 left-auto slide-in-right">
              {sidebar === 'rooms' ? (
                <RoomList
                  rooms={rooms}
                  onlineUsers={onlineUsers}
                  currentRoom={currentRoom}
                  onSwitch={(name) => handleSwitchRoom(name, true)}
                  onCreate={createRoom}
                  onDelete={deleteRoom}
                  onLeave={leaveRoom}
                  onOpenDM={handleOpenDM}
                  onSearchRooms={searchRooms}
                  onOpenProfile={handleOpenProfile}
                  currentUser={user?.id}
                  onClose={closeSidebar}
                />
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="notification-dropdown">
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          showNotifications={showNotifications}
          onClose={() => setShowNotifications(false)}
          onOpenDM={handleOpenDM}
          onSwitchRoom={(name) => {
            handleSwitchRoom(name);
            closeSidebar();
          }}
          clearBadge={() => {
            markNotificationsAsRead();
            setUnreadCount(0);
          }}
        />
      </div>
    </div>
  );
}