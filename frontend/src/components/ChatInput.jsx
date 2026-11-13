import { useState, useRef, useEffect, lazy, Suspense } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const EmojiPickerPanel = lazy(() => import('./EmojiPickerPanel'));

function EmojiPickerFallback() {
  return (
    <div className="w-[340px] h-[380px] flex items-center justify-center bg-surface-900">
      <span className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin block" />
    </div>
  );
}

export default function ChatInput({ onSend, onTyping }) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // استیت‌های ضبط صدا
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const cancelRecordingRef = useRef(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const typingTimer = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        headers: {
          'Content-Type': file.type,
        },
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
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
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
      alert('دسترسی به میکروفون امکان‌پذیر نیست.', err);
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
      if (!uploadRes.ok) throw new Error('آپلود به Upstash ناموفق بود');

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

  return (
    <form
      onSubmit={handleSubmit}
      className="relative p-4 bg-linear-to-t from-surface-950/80 to-surface-950/40 backdrop-blur-xl border-t border-white/10"
    >
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full mb-4 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-surface-700 bg-surface-900 animate-slide-up"
        >
          <Suspense fallback={<EmojiPickerFallback />}>
            <EmojiPickerPanel onEmojiSelect={handleEmojiSelect} />
          </Suspense>
        </div>
      )}

      <div
        className={`relative flex items-end gap-2 transition-all duration-300 ${isFocused ? 'scale-[1.01]' : ''
          }`}
      >
        <button
          type="button"
          disabled={isUploading || isRecording}
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-2xl shrink-0 text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all disabled:opacity-50 cursor-pointer group"
          aria-label="ارسال فایل"
        >
          {isUploading ? (
            <span className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin block" />
          ) : (
            <svg
              className="w-6 h-6 group-hover:scale-110 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.txt"
        />

        {!isRecording && (
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className={`p-3 rounded-2xl shrink-0 transition-all cursor-pointer group ${showEmojiPicker
              ? 'bg-primary-500/15 text-primary-400'
              : 'text-surface-400 hover:text-primary-400 hover:bg-primary-500/10'
              }`}
            aria-label="انتخاب ایموجی"
          >
            <svg
              className="w-6 h-6 group-hover:scale-110 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}

        <div
          className={`flex-1 relative transition-all duration-300 ${isRecording ? 'opacity-50 pointer-events-none' : ''
            }`}
        >
          <label htmlFor="message-input" className="sr-only">
            پیام شما
          </label>
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
            placeholder={isRecording ? 'در حال ضبط...' : 'پیام خود را بنویسید...'}
            className={`
              input w-full pr-24 bg-surface-900/80 border border-white/5
              transition-all duration-300
              ${isFocused ? 'input-glow ring-2 ring-primary-500/20' : 'hover:border-white/10'}
              ${value ? 'bg-surface-900' : ''}
            `}
            autoComplete="off"
            spellCheck={false}
            disabled={isRecording}
          />
          {value && !isRecording && (
            <button
              type="button"
              onClick={() => {
                setValue('');
                onTyping(false);
                clearTimeout(typingTimer.current);
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-3 flex items-center text-surface-500 hover:text-surface-300 transition-colors group"
              aria-label="Clear message"
            >
              <svg
                className="w-5 h-5 group-hover:rotate-90 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* 👈 دکمه میکروفون / تایمر ضبط */}
        {isRecording ? (
          <div className="flex items-center gap-2 bg-red-500/10 px-3 py-2 rounded-2xl border border-red-500/30 shrink-0">
            <button
              type="button"
              onClick={cancelAndStopRecording}
              className="text-surface-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
              title="لغو ضبط"
              aria-label="لغو ضبط"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <span className="text-red-400 text-sm font-mono min-w-[40px] text-center">
              {formatTime(recordingTime)}
            </span>
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />

            <button
              type="button"
              onClick={stopAndSendRecording}
              className="text-gray-500 hover:text-gray-400 p-1 transition-colors cursor-pointer"
              title="پایان ضبط و ارسال"
              aria-label="پایان ضبط و ارسال"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          </div>
        ) : (
          // 👈 اگر ورودی خالی بود، دکمه میکروفون را نشان بده
          !value.trim() && (
            <button
              type="button"
              onClick={startRecording}
              disabled={isUploading}
              className="p-3 rounded-2xl shrink-0 text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 cursor-pointer group"
              aria-label="ضبط پیام صوتی"
            >
              <svg
                className="w-6 h-6 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </button>
          )
        )}

        {/* 👈 اگر ورودی متن داشت، دکمه ارسال را نشان بده */}
        {!isRecording && value.trim() && (
          <button
            type="submit"
            disabled={isUploading}
            className="p-3 rounded-2xl shrink-0 transition-all duration-200 group bg-linear-to-r from-primary-600 via-primary-700 to-accent-600 hover:from-primary-500 hover:to-accent-500 shadow-glow-primary hover:shadow-glow-accent active:scale-95 cursor-pointer"
            aria-label="Send message"
          >
            <svg
              className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}