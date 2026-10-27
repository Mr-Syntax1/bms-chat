import { useSocket } from '../hooks/useSocket';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import OnlineUsersList from './OnlineUsersList';
import TypingIndicator from './TypingIndicator';

export default function Chat({ chat }) {
  const { isConnected } = useSocket();
  const { messages, onlineUsers, typingUsers, user, sendMessage, setTyping } = chat;

  return (
    <div className="h-screen flex bg-slate-100">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto bg-white shadow-xl">
        <ChatHeader isConnected={isConnected} user={user} onlineCount={onlineUsers.length} />
        <MessageList messages={messages} currentUsername={user?.username} />
        <TypingIndicator users={typingUsers.filter((u) => u !== user?.username)} />
        <ChatInput onSend={sendMessage} onTyping={setTyping} />
      </div>
      <OnlineUsersList users={onlineUsers} currentUser={user?.username} />
    </div>
  );
}