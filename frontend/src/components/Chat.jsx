import { useSocket } from '../hooks/useSocket';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import OnlineUsersList from './OnlineUsersList';
import TypingIndicator from './TypingIndicator';
import RoomList from './RoomList';

export default function Chat({ chat }) {
  const { isConnected } = useSocket();
  const {
    messages, onlineUsers, typingUsers, rooms, currentRoom,
    user, sendMessage, setTyping, createRoom, switchRoom,
  } = chat;

  return (
    <div className="h-screen flex bg-slate-100">
      <RoomList
        rooms={rooms}
        currentRoom={currentRoom}
        onSwitch={switchRoom}
        onCreate={createRoom}
      />
      <div className="flex-1 flex flex-col max-w-4xl mx-auto bg-white shadow-xl">
        <ChatHeader
          isConnected={isConnected}
          user={user}
          onlineCount={onlineUsers.length}
          roomName={currentRoom}
        />
        <MessageList messages={messages} currentUsername={user?.username} />
        <TypingIndicator users={typingUsers.filter((u) => u !== user?.username)} />
        <ChatInput onSend={sendMessage} onTyping={setTyping} />
      </div>
      <OnlineUsersList users={onlineUsers} currentUser={user?.username} />
    </div>
  );
}