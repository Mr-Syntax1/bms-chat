import { useEffect, useRef, useCallback, useState } from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, currentUsername }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback((smooth = true) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // تشخیص اینکه کاربر در پایین صفحه است یا نه
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 80; // فاصله مجاز از پایین
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);
  }, []);

  // وقتی پیام جدید می‌آید: اگر کاربر پایین بود، اسکرول کن؛ وگرنه دکمه را نشان بده
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(false);
    } else {
      setShowScrollButton(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // اسکرول اولیه بدون انیمیشن
  useEffect(() => {
    scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto p-4 space-y-3 bg-surface-900/30 scrollbar-thin"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center animate-fade-in">
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mb-6 animate-pulse-soft">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 blur-xl -z-10" />
              <svg className="w-10 h-10 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-surface-50 mb-1">هنوز پیامی نیست</h3>
            <p className="text-surface-400 text-sm">اولین کسی باشید که پیام می‌فرستد!</p>
            <div className="mt-6 flex items-center gap-2 text-xs text-surface-500">
              <span className="px-3 py-1.5 rounded-full bg-surface-800/50 border border-white/5">Enter برای ارسال</span>
            </div>
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
      </div>

      {showScrollButton && (
        <button
          onClick={() => {
            scrollToBottom();
            setShowScrollButton(false);
          }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 btn-primary rounded-full p-3 shadow-xl animate-bounce-soft"
          aria-label="اسکرول به پایین"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
}