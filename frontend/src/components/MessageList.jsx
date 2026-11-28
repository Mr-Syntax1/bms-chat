import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import MessageBubble from './MessageBubble';
import { BUBBLE_MENU_ICONS } from '../lib/bubbleMenuIcons.jsx';
import ContextMenu from './ContextMenu';
import { animateWillChange, clearWillChange } from '../lib/willChange';

// تبدیل تاریخ میلادی به شمسی — formatter یکبار در سطح ماژول ساخته میشود
const PERSIAN_DATE_FORMATTER = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

function toPersianDate(date) {
  return PERSIAN_DATE_FORMATTER.format(date);
}

// فرمتدهی جداکننده تاریخ (مشابه تلگرام)
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

export default function MessageList({ messages, currentUsername, onDeleteMessage, onEditMessage, currentUserId }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // استیتهای کادر شناور تاریخ
  const [floatingDate, setFloatingDate] = useState('');
  const [isFloatingVisible, setIsFloatingVisible] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const dateObserverRef = useRef(null);
  const dateRefsRef = useRef(new Map());

  // منوی context سراسری — فقط یک نمونه برای تمام پیامها
  const [contextMenu, setContextMenu] = useState(null);
  const [editSignalId, setEditSignalId] = useState(null);

  const openContextMenu = useCallback((messageId, x, y) => {
    setContextMenu({ messageId, x, y });
  }, []);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const menuItems = useMemo(() => {
    if (!contextMenu) return [];
    const id = contextMenu.messageId;
    const msg = messages.find((m) => (m.id || m._id) === id);
    const mine = Boolean(msg && msg.sender === currentUsername && msg.type !== 'system');
    const items = [
      { label: 'حذف برای من', icon: BUBBLE_MENU_ICONS.delete, danger: true, onClick: () => onDeleteMessage?.(id, false) },
    ];
    if (mine) {
      if (msg.type !== 'file') {
        items.unshift({
          label: 'ویرایش',
          icon: BUBBLE_MENU_ICONS.edit,
          onClick: () => {
            setEditSignalId((prev) => ({ id, n: (prev?.n ?? 0) + 1 }));
          },
        });
      }
      items.push({
        label: 'حذف برای همه',
        icon: BUBBLE_MENU_ICONS.deleteEveryone,
        danger: true,
        onClick: () => onDeleteMessage?.(id, true),
      });
    }
    return items;
  }, [contextMenu, messages, currentUsername, onDeleteMessage]);

  const scrollToBottom = useCallback((smooth = true) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // IntersectionObserver for the floating date badge (no layout thrash) (no layout thrash)
  const setupDateObserver = useCallback(() => {
    if (dateObserverRef.current) return;
    const root = containerRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) {
          const label = dateRefsRef.current.get(visible[0].target) || '';
          if (label) {
            setFloatingDate(label);
            setIsFloatingVisible(true);
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => setIsFloatingVisible(false), 1000);
          }
        }
      },
      { root, rootMargin: '0px 0px -95% 0px', threshold: 0 }
    );
    dateObserverRef.current = observer;
    dateRefsRef.current.forEach((_, el) => observer.observe(el));
  }, []);

  const registerDateRef = useCallback((el, label) => {
    if (!el) return;
    dateRefsRef.current.set(el, label);
    dateObserverRef.current?.observe(el);
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);
    if (atBottom) {
      setIsFloatingVisible(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      dateObserverRef.current?.disconnect();
      dateObserverRef.current = null;
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

  // گروهبندی پیامها بر اساس تاریخ و اضافه کردن جداکنندهها — فرمت تاریخ یکبار در هر پیام
  const messagesWithSeparators = useMemo(() => {
    if (!messages.length) return [];

    const result = [];

    messages.forEach((msg, i) => {
      const prev = messages[i - 1];
      const showSeparator = shouldShowDateSeparator(msg, prev);
      const dateLabel = msg.createdAt ? formatDateSeparator(msg.createdAt) : 'امروز';

      if (showSeparator) {
        result.push({
          type: 'date-separator',
          id: `separator-${i}`,
          label: dateLabel,
        });
      }

      result.push({
        type: 'message',
        ...msg,
        dateLabel,
        showHeader: !prev || prev.sender !== msg.sender,
      });
    });

    return result;
  }, [messages]);

  // observe date markers after rows render
  useEffect(() => {
    dateObserverRef.current?.disconnect();
    dateObserverRef.current = null;
    dateRefsRef.current.clear();
    setupDateObserver();
    return () => {
      dateObserverRef.current?.disconnect();
      dateObserverRef.current = null;
    };
  }, [messagesWithSeparators, setupDateObserver]);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">

      {/* کادر شناور تاریخ (مشابه تلگرام) */}
      <div
        onTransitionStart={animateWillChange}
        onTransitionEnd={clearWillChange}
        className={`date-floating-badge absolute top-3 left-1/2 ml-1 -translate-x-1/2 z-20 transition-all duration-300 pointer-events-none ${isFloatingVisible
        ? 'opacity-100 -translate-y-0'
        : 'opacity-0 -translate-y-2'}`}>

        <div className="px-4 py-1.5 rounded-full bg-surface-800/90 backdrop-blur-md border border-white/10 shadow-lg text-xs font-medium text-surface-200 whitespace-nowrap">
          {floatingDate}
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 bg-surface-900/30 scrollbar-thin lg:px-8 xl:px-12"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messagesWithSeparators.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center animate-fade-in">
            <div className="relative w-20 h-20 rounded-2xl bg-linear-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mb-6 animate-pulse-soft">
              <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-primary-500/30 to-accent-500/30 blur-xl -z-10" />
              <svg className="w-10 h-10 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-surface-50 mb-1">هنوز پیامی نیست</h3>
            <p className="text-surface-400 text-sm">اولین کسی باشید که پیام میفرستد!</p>
            <div className="mt-6 flex items-center gap-2 text-xs text-surface-500">
              <span className="px-3 py-1.5 rounded-full bg-surface-800/50 border border-white/5">Enter برای ارسال</span>
            </div>
          </div>
        )}

        {messagesWithSeparators.map((item) => {
          if (item.type === 'date-separator') {
            return <DateSeparator key={item.id} label={item.label} />;
          }

          return (
            <div
              key={item.id}
              className="message-row"
              data-message-date={item.dateLabel}
              ref={(el) => registerDateRef(el, item.dateLabel)}
            >
              <MessageBubble
                msg={item}
                currentUserId={currentUserId}
                isMine={item.sender === currentUsername}
                showHeader={item.showHeader}
                onDeleteMessage={onDeleteMessage}
                onEditMessage={onEditMessage}
                onOpenContextMenu={openContextMenu}
                editSignal={editSignalId?.id === item.id ? editSignalId.n : 0}
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
          className="go-to-latest-btn absolute bottom-6 left-1/2 -translate-x-1/2 z-10 btn-primary rounded-full p-3 shadow-xl animate-bounce-soft cursor-pointer"
          onAnimationStart={animateWillChange}
          onAnimationEnd={clearWillChange}
          aria-label="اسکرول به پایین"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}

      {/* منوی context سراسری — فقط زمانی که باز است document listenerها ثبت میشوند */}
      <ContextMenu
        x={contextMenu?.x ?? null}
        y={contextMenu?.y ?? null}
        items={menuItems}
        onClose={closeContextMenu}
      />
    </div>
  );
}
