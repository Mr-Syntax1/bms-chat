import { useState, useRef, useEffect } from 'react';
import { EmojiPicker } from '@ferrucc-io/emoji-picker';

export default function ChatInput({ onSend, onTyping }) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // استیت و رفرنس‌های جدید برای فایل
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const typingTimer = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // منطق بستن پنل ایموجی با کلیک بیرون
  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // تابع اضافه کردن ایموجی به متن
  const handleEmojiSelect = (emoji) => {
    setValue((prev) => prev + emoji);
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
    setShowEmojiPicker(false);
    clearTimeout(typingTimer.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // تابع آپلود فایل به Upstash
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);

    try {
      // ۱. گرفتن لینک آپلود از بک‌اند
      const presignRes = await fetch('/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      
      const { uploadUrl, headers, publicUrl } = await presignRes.json();
      if (!uploadUrl) throw new Error('خطا در دریافت لینک آپلود');

      // ۲. آپلود مستقیم فایل به Upstash
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: headers, 
      });

      if (!uploadRes.ok) throw new Error('آپلود به Upstash ناموفق بود');

      // ۳. ارسال پیام با لینک عمومی فایل
      onSend({
        type: 'file',
        fileUrl: publicUrl, 
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        text: file.name,
      });
      
    } catch (err) {
      alert('خطا در آپلود فایل: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // ریست کردن input
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative p-4 bg-surface-950/50 backdrop-blur-xl border-t border-surface-700">

      {/* پنل ایموجی */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full mb-4 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-surface-700 bg-surface-900">
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

        {/* دکمه انتخاب فایل (گیره کاغذ) */}
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-2xl shrink-0 text-surface-500 hover:text-primary-500 hover:bg-surface-800 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="ارسال فایل"
        >
          {isUploading ? (
            <span className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin block"></span>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </button>

        {/* 👈 input مخفی برای انتخاب فایل */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept="image/*,application/pdf,.doc,.docx,.txt" 
        />

        {/* دکمه ایموجی */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="p-3 rounded-2xl shrink-0 text-surface-500 hover:text-primary-500 hover:bg-surface-800 transition-colors cursor-pointer"
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
              ${value ? 'bg-surface-900' : ''}
            `}
            autoComplete="off"
            spellCheck={false}
          />
          {value && (
            <button
              type="button"
              onClick={() => { setValue(''); onTyping(false); clearTimeout(typingTimer.current); inputRef.current?.focus(); }}
              className="absolute inset-y-0 right-3 flex items-center text-surface-400 hover:text-surface-300 transition-colors"
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