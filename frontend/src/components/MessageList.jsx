import { useEffect, useRef, useCallback, useState } from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, currentUsername }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-900/50"
      onScroll={handleScroll}
    >
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full py-12 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-primary-900/30 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-surface-50 mb-1">هنوز پیامی نیست</h3>
          <p className="text-surface-400 text-sm">اولین کسی باشید که پیام می‌فرستد!</p>
        </div>
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
      <div ref={messagesEndRef} />
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 btn-primary rounded-full p-3 shadow-xl animate-bounce-soft"
          aria-label="Scroll to bottom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
}