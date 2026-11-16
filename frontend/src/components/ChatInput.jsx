import { useState, useRef, useEffect, lazy, Suspense } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const EmojiPickerPanel = lazy(() => import('./EmojiPickerPanel'));

function EmojiPickerFallback() {
  return (
    <div className="w-full h-64 flex items-center justify-center bg-surface-900/95 rounded-2xl">
      <span className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ChatInput({ onSend, onTyping }) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // استیت‌های ضبط صدا
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const cancelRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const typingTimer = useRef(null);
  
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // فوکوس خودکار هنگام لود
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // تنظیم ارتفاع خودکار Textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`; // حداکثر ۵ خط (حدود 128px)
    }
  }, [value]);

  // بستن ایموجی پنل با کلیک بیرون
  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // پاکسازی تایمرها هنگام Unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        cancelRecordingRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

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
    if (!value.trim() || isUploading || isRecording) return;
    onSend(value.trim());
    setValue('');
    onTyping(false);
    setShowEmojiPicker(false);
    clearTimeout(typingTimer.current);
    // بازگشت ارتفاع به حالت اولیه
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // ==================== ارسال فایل ====================
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const presignRes = await fetch(`${API_URL}/upload/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      
      const { uploadUrl, publicUrl } = await presignRes.json();
      if (!uploadUrl) throw new Error('خطا در دریافت لینک آپلود');

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) throw new Error('آپلود به سرور ابری ناموفق بود');

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
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ==================== ضبط صدا ====================
  const startRecording = async () => {
    try {
      cancelRecordingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        if (!cancelRecordingRef.current) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await uploadAudio(audioBlob);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('دسترسی به میکروفون امکان‌پذیر نیست.',err);
    }
  };

  const stopAndSendRecording = () => {
    cancelRecordingRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const cancelAndStopRecording = () => {
    cancelRecordingRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
    setRecordingTime(0);
  };

  const uploadAudio = async (blob) => {
    setIsUploading(true);
    try {
      const fileName = `voice-${Date.now()}.webm`;
      const fileType = 'audio/webm';

      const presignRes = await fetch(`${API_URL}/upload/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fileName, fileType }),
      });
      const { uploadUrl, headers, publicUrl } = await presignRes.json();
      if (!uploadUrl) throw new Error('خطا در دریافت لینک آپلود');

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: headers,
      });
      if (!uploadRes.ok) throw new Error('آپلود ناموفق بود');

      onSend({
        type: 'file',
        fileUrl: publicUrl,
        fileName: fileName,
        fileType: fileType,
        fileSize: blob.size,
        text: 'پیام صوتی',
      });
    } catch (err) {
      alert('خطا در آپلود پیام صوتی: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ==================== رندر UI ====================
  return (
    <form
      onSubmit={handleSubmit}
      className="relative p-3 sm:p-4 bg-linear-to-t from-surface-950/90 to-surface-950/60 backdrop-blur-xl border-t border-white/10 transition-all duration-300"
    >
      {/* پنل ایموجی با ریسپانسیو کامل */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full mb-2 left-0 sm:left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-surface-900/95 backdrop-blur-md w-[calc(100vw-2rem)] max-w-[360px] max-h-[50vh] sm:max-h-[380px] animate-slide-up"
        >
          <Suspense fallback={<EmojiPickerFallback />}>
            <EmojiPickerPanel onEmojiSelect={handleEmojiSelect} />
          </Suspense>
        </div>
      )}

      {/* حالت ضبط صدا (جایگزین موقت ورودی) */}
      {isRecording ? (
        <div className="flex items-center justify-between w-full bg-red-500/10 border border-red-500/30 rounded-2xl px-3 sm:px-4 py-3 animate-pulse-soft">
          <button
            type="button"
            onClick={cancelAndStopRecording}
            className="flex items-center gap-2 text-surface-400 hover:text-red-400 transition-colors min-h-[44px] px-2"
            aria-label="لغو ضبط"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">لغو</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            <span className="text-red-400 text-base sm:text-lg font-mono font-bold min-w-[45px] text-center">
              {formatTime(recordingTime)}
            </span>
          </div>

          <button
            type="button"
            onClick={stopAndSendRecording}
            className="flex items-center gap-2 text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl transition-all min-h-[44px] shadow-lg shadow-red-500/20"
            aria-label="پایان ضبط و ارسال"
          >
            <span className="hidden sm:inline text-sm font-bold">ارسال</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </button>
        </div>
      ) : (
        /* حالت عادی ورودی */
        <div
          className={`relative flex items-end gap-2 sm:gap-3 transition-all duration-300 ${
            isFocused ? 'scale-[1.01]' : ''
          }`}
        >
          {/* دکمه آپلود فایل */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl shrink-0 text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all disabled:opacity-50 cursor-pointer group min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="ارسال فایل"
          >
            {isUploading ? (
              <span className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf,.doc,.docx,.txt,audio/*,video/*" />

          {/* دکمه ایموجی (فقط وقتی متنی نوشته نشده) */}
          {!value.trim() && (
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className={`p-3 rounded-2xl shrink-0 transition-all cursor-pointer group min-h-[44px] min-w-[44px] flex items-center justify-center ${
                showEmojiPicker
                  ? 'bg-primary-500/15 text-primary-400'
                  : 'text-surface-400 hover:text-primary-400 hover:bg-primary-500/10'
              }`}
              aria-label="انتخاب ایموجی"
            >
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}

          {/* ورودی متن هوشمند */}
          <div className="flex-1 relative">
            <label htmlFor="message-input" className="sr-only">پیام شما</label>
            <textarea
              ref={inputRef}
              id="message-input"
              rows={1}
              value={value}
              onChange={handleChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="پیام خود را بنویسید..."
              className={`
                w-full resize-none overflow-hidden py-3 px-4 pr-12
                bg-surface-900/80 border border-white/5 rounded-2xl text-surface-100 placeholder-surface-500
                transition-all duration-300 focus:outline-none
                ${isFocused ? 'ring-2 ring-primary-500/30 border-primary-500/30 bg-surface-900' : 'hover:border-white/10'}
              `}
              autoComplete="off"
              spellCheck={false}
            />
            
            {/* دکمه پاک کردن متن */}
            {value && (
              <button
                type="button"
                onClick={() => {
                  setValue('');
                  onTyping(false);
                  clearTimeout(typingTimer.current);
                  inputRef.current?.focus();
                  if (inputRef.current) inputRef.current.style.height = 'auto';
                }}
                className="absolute inset-y-0 right-3 flex items-center text-surface-500 hover:text-red-400 transition-colors group"
                aria-label="پاک کردن پیام"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* دکمه میکروفون (وقتی متن خالی است) یا ارسال (وقتی متن دارد) */}
          {!value.trim() ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={isUploading}
              className="p-3 rounded-2xl shrink-0 text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 cursor-pointer group min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="ضبط پیام صوتی"
            >
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isUploading}
              className="p-3 rounded-2xl shrink-0 transition-all duration-200 group bg-linear-to-r from-primary-600 via-primary-700 to-accent-600 hover:from-primary-500 hover:to-accent-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 active:scale-95 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="ارسال پیام"
            >
              <svg className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
      )}
    </form>
  );
}