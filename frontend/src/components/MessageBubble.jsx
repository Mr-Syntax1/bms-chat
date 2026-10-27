import Avatar from './Avatar';
import { useMemo } from 'react';

export default function MessageBubble({ msg, isMine, showHeader }) {
  const isSystem = msg.type === 'system';

  const tailStyle = useMemo(() => {
    if (isMine) {
      return {
        borderLeft: '16px solid transparent',
        borderBottom: '16px solid #4f46e5',
      };
    } else {
      return {
        borderRight: '16px solid transparent',
        borderBottom: '16px solid #ffffff',
      };
    }
  }, [isMine]);

  const darkTailStyle = useMemo(() => {
    if (isMine) {
      return { borderBottomColor: '#6366f1' };
    } else {
      return { borderBottomColor: '#27272a' };
    }
  }, [isMine]);

  if (isSystem) {
    return (
      <div className="flex justify-center my-3 animate-fade-in">
        <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700 shadow-sm">
          {msg.text}
        </span>
      </div>
    );
  }

  const time = msg.time || new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex gap-2 animate-fade-in ${isMine ? 'justify-end' : 'justify-start'}`}>
      {!isMine && (
        <div className="w-10 flex-shrink-0">
          {showHeader && <Avatar username={msg.sender} color={msg.avatarColor} size="sm" />}
        </div>
      )}
      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {showHeader && !isMine && (
          <span className="text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1 pr-1 rtl:pr-0 rtl:pl-1">
            {msg.sender}
          </span>
        )}
        <div className={`relative px-4 py-2.5 rounded-2xl text-sm ${isMine ? 'rounded-br-md' : 'rounded-bl-md'}`}>
          <div className={`
            relative py-2 px-4
            ${isMine
              ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg'
              : 'bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 shadow-md border border-surface-200 dark:border-surface-700'
            }
            rounded-xl
          `}>
            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
            <div className="flex items-center justify-end gap-2 mt-1.5">
              <time className={`
                text-[11px] font-medium
                ${isMine ? 'text-primary-100' : 'text-surface-400 dark:text-surface-500'}
              `}>
                {time}
              </time>
              {isMine && (
                <svg className="w-4 h-4 text-primary-100/70" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M18 10c0 2.761-2.239 5-5 5-1.355 0-2.597-.523-3.502-1.354l-1.748 1.748A7.03 7.03 0 0011 18c3.866 0 7-3.134 7-7h2z" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}