import { useState, useRef, useEffect } from 'react';
import { EmojiPicker } from '@ferrucc-io/emoji-picker';

export default function ChatInput({ onSend, onTyping }) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); //  استیت جدید برای پنل
  const typingTimer = useRef(null);
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // پ منطق بستن پنل ایموجی با کلیک بیرون
  useEffect(() => {
    function handleClickOutside(event) {
      // اگر پنل باز است و کلیک خارج از محدوده‌ی پنل بوده
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }

    // فقط وقتی پنل باز است به رویداد کلیک گوش می‌دهیم
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // پاکسازی رویداد هنگام بسته شدن پنل یا unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // تابع اضافه کردن ایموجی به متن
  const handleEmojiSelect = (emoji) => {
    setValue((prev) => prev + emoji);
    // فوکوس را برمی‌گردانیم تا کاربر بتواند ادامه تایپ کند
    inputRef.current?.focus();
  };

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
    setShowEmojiPicker(false); // بستن پنل بعد از ارسال
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

      {/*  پنل ایموجی (فقط زمانی که true باشد رندر می‌شود) */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full mb-4 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            emojisPerRow={8}
            emojiSize={32}
            containerHeight={380}
            className="w-[340px]"
          >
            <EmojiPicker.Header className="p-2 pb-0">
              <EmojiPicker.Input placeholder="جستجوی ایموجی..." className="w-full" />
            </EmojiPicker.Header>
            <EmojiPicker.Group className='gap-2'>
              <EmojiPicker.List hideStickyHeader={true} />
            </EmojiPicker.Group>
          </EmojiPicker>
        </div>
      )}

      <div className={`relative flex items-end gap-3 transition-all duration-300 ${isFocused ? 'scale-[1.01]' : ''}`}>

        {/*  دکمه ایموجی (سمت چپ) */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="p-3 rounded-2xl shrink-0 text-surface-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-surface-800 transition-colors cursor-pointer"
          aria-label="انتخاب ایموجی"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

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