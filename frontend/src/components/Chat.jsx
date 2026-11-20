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
    markMessagesAsRead,
  } = chat;

  const [isPending, startTransition] = useTransition();
  const navigate = useNavigate();
  const [sidebar, setSidebar] = useState(null);

  const closeSidebar = useCallback(() => setSidebar(null), []);

  const rtc = useWebRTC({
    currentUser: user,
    connected: connected,
  });

  const handleSwitchRoom = useCallback((roomName, isMobile = false) => {
    if (isMobile) closeSidebar();
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
        if (res?.success) closeSidebar();
      });
    },
    [openDM, closeSidebar]
  );

  const handleOpenProfile = useCallback(
    (username) => {
      if (username) navigate(`/profile/${username}`);
      else navigate('/profile');
    },
    [navigate]
  );

  useEffect(() => {
    if (currentRoom && messages.length > 0 && user?.id) {
      const unseenIds = messages
        .filter(m => m.senderId !== user.id && !m.readBy?.includes(user.id))
        .map(m => m.id || m._id)
        .filter(id => id);

      if (unseenIds.length > 0) {
        markMessagesAsRead(currentRoom, unseenIds);
      }
    }
  }, [messages, currentRoom, user?.id, markMessagesAsRead]);

  const handleOpenNotifications = useCallback(() => {
    setShowNotifications((prev) => {
      const next = !prev;
      if (next) fetchNotifications?.();
      return next;
    });
  }, [fetchNotifications, setShowNotifications]);

  return (
    // 🔑 قانون ۱: ارتفاع دقیق داینامیک + جلوگیری مطلق از اسکرول کل صفحه
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden relative bg-surface-950 text-surface-50">
      
      {/* 🔑 قانون ۲: هدر هرگز نباید کوچک شود (shrink-0) */}
      <div className="shrink-0 z-20 relative">
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
      </div>

      {/* 🔑 قانون ۳: بخش میانی تمام فضای باقیمانده را می‌گیرد و overflow آن مخفی است */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative z-10">
        
        {/* سایدبار دسکتاپ */}
        <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-white/10 glass-panel-strong">
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

        {/* بخش اصلی چت */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 relative bg-surface-950/30">
          {isPending && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-950/60 backdrop-blur-sm animate-fade-in">
              <LoadingSpinner text="در حال ورود به اتاق..." />
            </div>
          )}

          {/* 🔑 قانون ۴: کانتینر داخلی باید flex-col و min-h-0 باشد تا فرزندانش درست رفتار کنند */}
          <div className={`flex-1 flex flex-col min-h-0 transition-opacity duration-300 ${isPending ? 'opacity-30' : 'opacity-100'}`}>
            {currentRoom ? (
              <>
                {/* MessageList خودش باید flex-1 min-h-0 داشته باشد */}
                <MessageList
                  messages={messages}
                  currentUsername={user?.username}
                  onDeleteMessage={deleteMessage}
                  onEditMessage={editMessage}
                  currentUserId={user?.id}
                />

                {/* 🔑 قانون ۵: المان‌های ثابت پایین صفحه باید shrink-0 باشند */}
                <div className="shrink-0">
                  <TypingIndicator users={typingUsers.filter((u) => u && u !== user?.username)} />
                </div>

                <div className="shrink-0">
                  <ChatInput onSend={sendMessage} onTyping={setTyping} />
                </div>
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

      {/* مودال تماس */}
      <CallModal
        call={rtc}
        user={user}
        isCalling={rtc.callState === 'calling' || rtc.callState === 'connecting' || rtc.callState === 'connected'}
        incomingCall={rtc.incomingCall}
        remoteUser={rtc.peer}
        localStream={rtc.localStream}
        remoteStream={rtc.remoteStream}
        callState={rtc.callState}
        callType={rtc.callType}
        isMuted={rtc.isMuted}
        isVideoOn={!rtc.isCameraOff}
        duration={rtc.duration}
        error={rtc.error}
        endReason={rtc.endReason}
        onAnswer={rtc.acceptCall}
        onDecline={rtc.rejectCall}
        onEnd={rtc.endCall}
        onToggleMute={rtc.toggleMute}
        onToggleVideo={rtc.toggleCamera}
        isScreenSharing={rtc.isScreenSharing}
        isDeafened={rtc.isDeafened}
        remoteScreenSharing={rtc.remoteScreenSharing}
        participants={rtc.participants}
        onToggleDeafen={rtc.toggleDeafen}
        onToggleScreenShare={rtc.toggleScreenShare}
      />

      {/* سایدبار موبایل */}
      {sidebar && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in lg:hidden"
            onClick={closeSidebar}
          />
          <div className="fixed top-0 z-50 h-full w-80 max-w-[85vw] glass-panel-strong flex flex-col shadow-2xl right-0 left-auto slide-in-right lg:hidden">
            {sidebar === 'rooms' && (
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
            )}
          </div>
        </>
      )}

      {/* دراپ‌داون اعلان‌ها */}
      <div className="notification-dropdown absolute top-16 right-4 z-30">
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