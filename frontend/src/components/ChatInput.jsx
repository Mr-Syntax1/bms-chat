import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSend, onTyping }) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const typingTimer = useRef(null);
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (!isComposing) {
      onTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => onTyping(false), 2000);
    }
  };

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = (e) => {
    setIsComposing(false);
    handleChange(e);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue('');
    onTyping(false);
    clearTimeout(typingTimer.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative p-4 bg-white/50 dark:bg-surface-950/50 backdrop-blur-xl border-t border-surface-200 dark:border-surface-800">
      <div className={`relative flex items-end gap-3 transition-all duration-300 ${isFocused ? 'scale-[1.01]' : ''}`}>
        <div className="flex-1 relative">
          <label htmlFor="message-input" className="sr-only">پیام شما</label>
          <input
            ref={inputRef}
            id="message-input"
            type="text"
            value={value}
            onChange={handleChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="پیام خود را بنویسید... (Enter برای ارسال)"
            className={`
              input w-full pr-24
              transition-all duration-300
              ${isFocused ? 'ring-2 ring-primary-500/30 shadow-lg' : ''}
              ${value ? 'bg-white dark:bg-surface-900' : ''}
            `}
            autoComplete="off"
            spellCheck={false}
          />
          {value && (
            <button
              type="button"
              onClick={() => { setValue(''); onTyping(false); clearTimeout(typingTimer.current); inputRef.current?.focus(); }}
              className="absolute inset-y-0 right-3 flex items-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label="Clear message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!value.trim()}
          className={`
            btn-primary p-3 rounded-2xl shrink-0 transition-all duration-200
            ${value.trim() 
              ? 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-glow-primary active:scale-95'
              : 'opacity-50 cursor-not-allowed'
            }
          `}
          aria-label="Send message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

    </form>
  );
}