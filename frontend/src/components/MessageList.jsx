import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, currentUsername }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
      {messages.length === 0 && (
        <p className="text-center text-slate-400 text-sm mt-10">هنوز پیامی نیست...</p>
      )}
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const showHeader = !prev || prev.sender !== msg.sender;
        return (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMine={msg.sender === currentUsername}
            showHeader={showHeader}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}