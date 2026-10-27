import { useEffect } from 'react';
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
    connectSocket, disconnectSocket, connected,
  } = chat;

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, [connectSocket, disconnectSocket]);

  return (
    <div className="h-screen flex bg-surface-50 dark:bg-surface-950">
      <RoomList
        rooms={rooms}
        currentRoom={currentRoom}
        onSwitch={switchRoom}
        onCreate={createRoom}
        onDelete={deleteRoom}
        onLeave={leaveRoom}
        currentUser={user?.username}
      />
      <div className="flex-1 flex flex-col max-w-4xl mx-auto bg-white dark:bg-surface-950 shadow-2xl border-x border-surface-200 dark:border-surface-800">
        <ChatHeader
          isConnected={connected}
          user={user}
          onlineCount={onlineUsers.length}
          roomName={currentRoom}
          onLogout={onLogout}
        />
        <MessageList messages={messages} currentUsername={user?.username} />
        <TypingIndicator users={typingUsers.filter((u) => u !== user?.username)} />
        <ChatInput onSend={sendMessage} onTyping={setTyping} />
      </div>
      <OnlineUsersList users={onlineUsers} currentUser={user?.username} />
    </div>
  );
}