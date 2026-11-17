import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import MessageBubble from './MessageBubble';

// تبدیل تاریخ میلادی به شمسی
function toPersianDate(date) {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

// تابع برای فرمت‌دهی جداکننده تاریخ (مشابه تلگرام)
function formatDateSeparator(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDate.getTime() === today.getTime()) {
    return 'امروز';
  } else if (msgDate.getTime() === yesterday.getTime()) {
    return 'دیروز';
  } else {
    return toPersianDate(d);
  }
}

// چک کردن اینکه آیا باید جداکننده تاریخ نمایش داده شود
function shouldShowDateSeparator(currentMsg, prevMsg) {
  if (!prevMsg) return true;
  const currDate = currentMsg.createdAt ? new Date(currentMsg.createdAt) : new Date();
  const prevDate = prevMsg.createdAt ? new Date(prevMsg.createdAt) : new Date();

  const currDay = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate());
  const prevDay = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());

  return currDay.getTime() !== prevDay.getTime();
}

// کامپوننت جداکننده تاریخ (مشابه پیام سیستم)
function DateSeparator({ label }) {
  return (
    <div className="flex justify-center my-4 animate-fade-in">
      <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-surface-800/80 text-surface-400 border border-surface-700/50 shadow-sm backdrop-blur-sm whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

export default function MessageList({ messages, currentUsername, onDeleteMessage, onEditMessage , currentUserId}) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // استیت‌های کادر شناور تاریخ
  const [floatingDate, setFloatingDate] = useState('');
  const [isFloatingVisible, setIsFloatingVisible] = useState(false);
  const scrollTimeoutRef = useRef(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);

    // کادر شناور تاریخ
    if (atBottom) {
      setIsFloatingVisible(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    } else {
      // پیدا کردن تاریخ پیامی که در حال نمایش است
      const containerTop = el.getBoundingClientRect().top;
      const bubbles = el.querySelectorAll('[data-message-date]');
      let currentDate = '';

      for (const bubble of bubbles) {
        const rect = bubble.getBoundingClientRect();
        if (rect.bottom > containerTop + 20) { // 20 پیکسل تلورانس
          currentDate = bubble.getAttribute('data-message-date');
          break;
        }
      }

      if (currentDate) {
        setFloatingDate(currentDate);
        setIsFloatingVisible(true);
      }

      // محو شدن بعد از توقف اسکرول
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsFloatingVisible(false);
      }, 1000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(false);
    } else {
      setTimeout(() => setShowScrollButton(true), 0);
    }
  }, [messages.length, isAtBottom, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  // گروه‌بندی پیام‌ها بر اساس تاریخ و اضافه کردن جداکننده‌ها
  const messagesWithSeparators = useMemo(() => {
    if (!messages.length) return [];

    const result = [];

    messages.forEach((msg, i) => {
      const prev = messages[i - 1];
      const showSeparator = shouldShowDateSeparator(msg, prev);

      if (showSeparator) {
        const dateLabel = msg.createdAt ? formatDateSeparator(msg.createdAt) : 'امروز';
        result.push({
          type: 'date-separator',
          id: `separator-${i}`,
          label: dateLabel
        });
      }

      result.push({
        type: 'message',
        ...msg,
        showHeader: !prev || prev.sender !== msg.sender
      });
    });

    return result;
  }, [messages]);

  return (
    <div className="relative flex-1 min-h-0">
      {/* کادر شناور تاریخ (مشابه تلگرام) */}
      <div
        className={`absolute top-3 left-1/2 ml-1 -translate-x-1/2 z-20 transition-all duration-300 pointer-events-none ${isFloatingVisible
            ? 'opacity-100 -translate-y-0'
            : 'opacity-0 -translate-y-2'
          }`}
      >
        <div className="px-4 py-1.5 rounded-full bg-surface-800/90 backdrop-blur-md border border-white/10 shadow-lg text-xs font-medium text-surface-200 whitespace-nowrap">
          {floatingDate}
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto p-4 space-y-3 bg-surface-900/30 scrollbar-thin lg:px-28"
      >
        {messagesWithSeparators.length === 0 && (
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

        {messagesWithSeparators.map((item) => {
          if (item.type === 'date-separator') {
            return <DateSeparator key={item.id} label={item.label} />;
          }

          // اضافه کردن data-message-date به هر پیام برای تشخیص در اسکرول
          return (
            <div
              key={item.id}
              data-message-date={item.createdAt ? formatDateSeparator(item.createdAt) : 'امروز'}
            >
              <MessageBubble
                msg={item}
                currentUserId={currentUserId}
                isMine={item.sender === currentUsername}
                showHeader={item.showHeader}
                onDeleteMessage={onDeleteMessage}
                onEditMessage={onEditMessage}
              />
            </div>
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
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 btn-primary rounded-full p-3 shadow-xl animate-bounce-soft cursor-pointer"
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