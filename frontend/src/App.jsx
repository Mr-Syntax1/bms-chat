import { useChat } from './hooks/useChat';
import Login from './components/Login';
import Chat from './components/Chat';

export default function App() {
  const chat = useChat();

  if (!chat.user) {
    return <Login onJoin={chat.join} error={chat.error} />;
  }
  return <Chat chat={chat} />;
}