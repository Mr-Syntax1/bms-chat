import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const EmojiPickerPanel = lazy(() => import('./EmojiPickerPanel'));

const MAX_LENGTH = 4000;
const MAX_RECORD_SECONDS = 300; // ۵ دقیقه
const MAX_FILE_MB = 50;
const ACCEPT = 'image/*,application/pdf,.doc,.docx,.txt,audio/*,video/*';

/* ───────────────────────── آیکون‌ها ───────────────────────── */
const Icon = ({ d, className = 'w-6 h-6', stroke = 1.8, fill = 'none' }) => (
  <svg
    className={className}
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const ICONS = {
  clip: 'M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48',
  smile: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01',
  mic: 'M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zM19 11a7 7 0 01-14 0M12 18v3M8 21h8',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  close: 'M6 18L18 6M6 6l12 12',
  trash: 'M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
};

/* ───────────────────────── دکمه‌ی آیکونی ───────────────────────── */
function IconButton({ label, onClick, disabled, active, tone = 'primary', children, buttonRef }) {
  const tones = {
    primary: 'hover:text-primary-300 hover:bg-primary-500/10 active:bg-primary-500/20',
    danger: 'hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20',
  };
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`group relative grid place-items-center shrink-0 size-11 rounded-full cursor-pointer
        transition-all duration-200 outline-none select-none touch-manipulation
        focus-visible:ring-2 focus-visible:ring-primary-400/60
        disabled:opacity-40 disabled:pointer-events-none
        ${active ? 'text-primary-300 bg-primary-500/15' : `text-surface-400 ${tones[tone]}`}`}
    >
      <span className="transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
        {children}
      </span>
    </button>
  );
}

function Spinner({ className = 'size-5' }) {
  return (
    <span
      className={`${className} inline-block rounded-full border-2 border-primary-400 border-t-transparent animate-spin`}
      role="status"
    />
  );
}

function EmojiPickerFallback() {
  return (
    <div className="w-full h-64 grid place-items-center">
      <Spinner className="size-6" />
    </div>
  );
}

/* ───────────────────────── کامپوننت اصلی ───────────────────────── */
export default function ChatInput({ onSend, onTyping }) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const cancelRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const typingTimer = useRef(null);
  const errorTimer = useRef(null);
  const dragDepth = useRef(0);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  const hasText = value.trim().length > 0;
  const nearLimit = value.length > MAX_LENGTH * 0.85;
  const isTouch = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches,
    []
  );

  const bars = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({
      h: 25 + ((i * 37) % 70),
      d: (i % 7) * 0.11,
    })),
    []
  );

  const showError = useCallback((msg) => {
    setError(msg);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(''), 4500);
  }, []);

  useEffect(() => {
    if (!isTouch) inputRef.current?.focus();
  }, [isTouch]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const onOutside = (e) => {
      if (emojiPickerRef.current?.contains(e.target)) return;
      if (emojiButtonRef.current?.contains(e.target)) return;
      setShowEmojiPicker(false);
    };
    const onEsc = (e) => e.key === 'Escape' && setShowEmojiPicker(false);
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(typingTimer.current);
      clearTimeout(errorTimer.current);
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== 'inactive') {
        cancelRecordingRef.current = true;
        rec.stop();
      }
    };
  }, []);

  const handleEmojiSelect = (emoji) => {
    const el = inputRef.current;

    // اگر المان اینپوت در دسترس نبود، فقط مقدار را اضافه کن
    if (!el) {
      setValue((prev) => prev + emoji);
      return;
    }

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);

    // ۱. آپدیت استیت
    setValue(next);

    // ۲. بازگرداندن فوکوس و مکان نما با روش مطمئن برای موبایل
    // استفاده از setTimeout(0) به جای requestAnimationFrame برای پایداری بیشتر در iOS/Android
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = start + emoji.length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const emitTyping = () => {
    onTyping?.(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping?.(false), 2000);
  };

  const handleChange = (e) => {
    setValue(e.target.value.slice(0, MAX_LENGTH));
    if (!isComposing) emitTyping();
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!hasText || isUploading || isRecording) return;
    onSend(value.trim());
    setValue('');
    onTyping?.(false);
    setShowEmojiPicker(false);
    clearTimeout(typingTimer.current);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing || isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey && !isTouch) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const presignAndUpload = async (blobOrFile, fileName, fileType) => {
    const presignRes = await fetch(`${API_URL}/upload/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fileName, fileType }),
    });
    if (!presignRes.ok) throw new Error('خطا در ارتباط با سرور');
    const { uploadUrl, headers, publicUrl } = await presignRes.json();
    if (!uploadUrl) throw new Error('لینک آپلود دریافت نشد');

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: blobOrFile,
      headers: headers || { 'Content-Type': fileType },
    });
    if (!uploadRes.ok) throw new Error('آپلود ناموفق بود');
    return publicUrl;
  };

  const uploadFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return showError(`حجم فایل نباید بیشتر از ${MAX_FILE_MB} مگابایت باشد`);
    }
    setIsUploading(true);
    setUploadLabel(file.name);
    try {
      const publicUrl = await presignAndUpload(file, file.name, file.type);
      onSend({
        type: 'file',
        fileUrl: publicUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        text: file.name,
      });
    } catch (err) {
      showError(err.message || 'خطا در آپلود فایل');
    } finally {
      setIsUploading(false);
      setUploadLabel('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInput = (e) => uploadFile(e.target.files?.[0]);

  const handlePaste = (e) => {
    const file = [...(e.clipboardData?.files || [])][0];
    if (file) {
      e.preventDefault();
      uploadFile(file);
    }
  };

  const onDragEnter = (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    uploadFile(e.dataTransfer?.files?.[0]);
  };

  const pickMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    return types.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || '';
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      return showError('مرورگر شما از ضبط صدا پشتیبانی نمی‌کند');
    }
    try {
      cancelRecordingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = rec;
      audioChunksRef.current = [];

      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!cancelRecordingRef.current && audioChunksRef.current.length) {
          const type = rec.mimeType || mimeType || 'audio/webm';
          await uploadAudio(new Blob(audioChunksRef.current, { type }), type);
        }
      };

      rec.start();
      setIsRecording(true);
      setRecordingTime(0);
      setShowEmojiPicker(false);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch (err) {
      console.error(err);
      showError('دسترسی به میکروفون امکان‌پذیر نیست. مجوز مرورگر را بررسی کنید.');
    }
  };

  const finishRecording = (cancel) => {
    cancelRecordingRef.current = cancel;
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
    if (cancel) setRecordingTime(0);
  };

  const stopAndSendRecording = useCallback(() => finishRecording(false), []);
  const cancelAndStopRecording = useCallback(() => finishRecording(true), []);

  useEffect(() => {
    if (isRecording && recordingTime >= MAX_RECORD_SECONDS) stopAndSendRecording();
  }, [recordingTime, isRecording, stopAndSendRecording]);

  const uploadAudio = async (blob, type) => {
    setIsUploading(true);
    setUploadLabel('پیام صوتی');
    try {
      const baseType = type.split(';')[0];
      const ext = baseType.includes('mp4') ? 'm4a' : baseType.includes('ogg') ? 'ogg' : 'webm';
      const fileName = `voice-${Date.now()}.${ext}`;
      const publicUrl = await presignAndUpload(blob, fileName, baseType);
      onSend({
        type: 'file',
        fileUrl: publicUrl,
        fileName,
        fileType: baseType,
        fileSize: blob.size,
        text: 'پیام صوتی',
      });
    } catch (err) {
      showError(err.message || 'خطا در ارسال پیام صوتی');
    } finally {
      setIsUploading(false);
      setUploadLabel('');
      setRecordingTime(0);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  /* ───────────────────────── رندر ───────────────────────── */
  return (
    <form
      onSubmit={handleSubmit}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      dir="rtl"
      className="relative w-full px-2 sm:px-4 lg:px-6 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-linear-to-t from-surface-950 via-surface-950/80 to-surface-950/40 border-t border-white/[0.08] flex-shrink-0"

    >
      <style>{`
        @keyframes cic-wave { 0%,100% { transform: scaleY(.25) } 50% { transform: scaleY(1) } }
        @keyframes cic-up   { from { opacity:0; transform: translateY(12px) scale(.98) } to { opacity:1; transform:none } }
        @keyframes cic-sheet{ from { transform: translateY(100%) } to { transform:none } }
        @keyframes cic-pop  { from { opacity:0; transform: scale(.6) rotate(-20deg) } to { opacity:1; transform:none } }
        @media (prefers-reduced-motion: reduce) { .cic-anim { animation: none !important } }
      `}</style>

      {/* تغییر ۲: حذف max-w-4xl برای فول‌ویدث شدن در دسکتاپ */}
      <div className="w-full">
        {error && (
          <div
            role="alert"
            className="cic-anim mb-2 flex items-start gap-2 rounded-2xl border border-red-500/25 bg-red-500/10
                       px-3 py-2.5 text-sm text-red-200 shadow-lg shadow-red-950/30"
            style={{ animation: 'cic-up .25s ease-out' }}
          >
            <Icon d={ICONS.alert} className="size-5 shrink-0 mt-0.5 text-red-400" />
            <p className="flex-1 leading-6">{error}</p>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="بستن"
              className="grid place-items-center size-7 -m-0.5 rounded-full text-red-300/70 hover:bg-red-500/20 hover:text-red-200 transition cursor-pointer"
            >
              <Icon d={ICONS.close} className="size-4" />
            </button>
          </div>
        )}

        {isUploading && (
          <div
            className="cic-anim mb-2 flex items-center gap-3 rounded-2xl border border-primary-500/20 bg-primary-500/10 px-3 py-2.5"
            style={{ animation: 'cic-up .25s ease-out' }}
          >
            <Spinner />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-primary-200/80">در حال ارسال...</p>
              <p className="truncate text-sm font-medium text-surface-100" dir="auto">{uploadLabel}</p>
            </div>
            <div className="hidden xs:block h-1 w-20 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 rounded-full bg-primary-400 animate-pulse" />
            </div>
          </div>
        )}

        {/* تغییر ۳: اصلاح کامل موقعیت ایموجی پیکر برای دسکتاپ و موبایل */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            role="dialog"
            aria-label="انتخاب ایموجی"
            onMouseDown={(e) => e.preventDefault()}
            className="z-50 absolute bottom-full left-0 mb-2 sm:mb-3 w-[320px] sm:w-[360px]"
            style={{
              animation: 'slideInLeft 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
            }}
          >
            <div className="w-full bg-surface-900 border border-white/10 shadow-2xl shadow-black/50
                    rounded-2xl flex flex-col overflow-hidden
                    max-h-[50vh] sm:max-h-[420px]
                    pb-[env(safe-area-inset-bottom)] sm:pb-0">

              {/* هندل موبایل (برای حس کشیدن از پایین در موبایل، اختیاری است) */}
              <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                <span className="h-1.5 w-10 rounded-full bg-white/20" />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <Suspense fallback={<EmojiPickerFallback />}>
                  <EmojiPickerPanel onEmojiSelect={handleEmojiSelect} />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {isRecording ? (
          <div
            className="cic-anim flex items-center gap-2 sm:gap-3 rounded-[28px] border border-red-500/25
                       bg-linear-to-l from-red-500/15 to-red-500/5 p-1.5 shadow-lg shadow-red-950/20 w-full"
            style={{ animation: 'cic-up .25s ease-out' }}
          >
            <IconButton label="لغو ضبط" tone="danger" onClick={cancelAndStopRecording}>
              <Icon d={ICONS.trash} />
            </IconButton>

            <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
              <span className="relative grid place-items-center size-3 shrink-0">
                <span className="absolute inset-0 rounded-full bg-red-500/60 animate-ping" />
                <span className="size-2.5 rounded-full bg-red-500" />
              </span>
              <span className="w-11 shrink-0 font-mono text-base font-semibold tabular-nums text-red-300" dir="ltr">
                {formatTime(recordingTime)}
              </span>
              <div className="flex h-8 flex-1 items-center justify-center gap-[3px] overflow-hidden" aria-hidden="true">
                {bars.map((b, i) => (
                  <span
                    key={i}
                    className={`cic-anim w-[3px] shrink-0 origin-center rounded-full bg-red-400/80 ${i > 14 ? 'hidden sm:block' : ''}`}
                    style={{
                      height: `${b.h}%`,
                      animation: `cic-wave 1.1s ease-in-out ${b.d}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={stopAndSendRecording}
              aria-label="پایان ضبط و ارسال"
              className="grid place-items-center size-12 shrink-0 rounded-full bg-linear-to-br from-red-500 to-rose-600 text-white cursor-pointer
                         shadow-lg shadow-red-500/30 transition active:scale-90 hover:brightness-110 outline-none
                         focus-visible:ring-2 focus-visible:ring-red-300/60 touch-manipulation"
            >
              <Icon d={ICONS.send} className="size-5" stroke={2.4} />
            </button>
          </div>
        ) : (
          <div
            className={`relative flex items-end gap-1 sm:gap-2 rounded-2xl sm:rounded-3xl border p-1.5 sm:p-2 transition-all duration-300 w-full
              ${isFocused
                ? 'border-primary-500/40 bg-surface-900 shadow-[0_0_0_4px_rgba(99,102,241,0.08)]'
                : 'border-white/10 bg-surface-900/85 hover:bg-surface-900 hover:border-white/20'}`}
          >
            <IconButton label="ارسال فایل" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
              <Icon d={ICONS.clip} />
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              onChange={handleFileInput}
              className="hidden"
              tabIndex={-1}
            />

            <div className="relative min-w-0 flex-1">
              <label htmlFor="message-input" className="sr-only">پیام شما</label>
              <textarea
                ref={inputRef}
                id="message-input"
                rows={1}
                dir="auto"
                value={value}
                maxLength={MAX_LENGTH}
                onChange={handleChange}
                onPaste={handlePaste}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={(e) => {
                  setIsComposing(false);
                  handleChange(e);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="...پیام خود را بنویسید"
                enterKeyHint={isTouch ? 'enter' : 'send'}
                autoComplete="off"
                spellCheck={false}
                className="block w-full resize-none bg-transparent px-3 py-3 sm:px-3 sm:py-[11px] text-[16px] sm:text-[15px] placeholder:text-right leading-[22px]
                           text-surface-50 placeholder:text-surface-500 outline-none
                           max-h-40 overflow-y-auto scrollbar-thin"
              />
              {nearLimit && (
                <span
                  className={`pointer-events-none absolute -top-5 left-1 text-[11px] tabular-nums
                    ${value.length >= MAX_LENGTH ? 'text-red-400' : 'text-surface-500'}`}
                  dir="ltr"
                >
                  {value.length}/{MAX_LENGTH}
                </span>
              )}
            </div>

            <IconButton
              label="انتخاب ایموجی"
              buttonRef={emojiButtonRef}
              active={showEmojiPicker}
              onClick={() => setShowEmojiPicker((p) => !p)}
            >
              <Icon d={ICONS.smile} />
            </IconButton>

            {hasText ? (
              <button
                key="send"
                type="submit"
                disabled={isUploading}
                aria-label="ارسال پیام"
                className="cic-anim grid place-items-center size-11 shrink-0 rounded-full text-white outline-none touch-manipulation cursor-pointer
                           bg-linear-to-br from-primary-500 via-primary-600 to-accent-600
                           shadow-lg shadow-primary-500/30 transition-all duration-200
                           hover:shadow-primary-500/50 hover:brightness-110 active:scale-90
                           focus-visible:ring-2 focus-visible:ring-primary-300/70 disabled:opacity-50"
                style={{ animation: 'cic-pop .25s cubic-bezier(.2,.8,.2,1)' }}
              >
                <Icon d={ICONS.send} className="size-5" stroke={2.5} />
              </button>
            ) : (
              <button
                key="mic"
                type="button"
                onClick={startRecording}
                disabled={isUploading}
                aria-label="ضبط پیام صوتی"
                className="cic-anim grid place-items-center size-11 shrink-0 rounded-full outline-none touch-manipulation cursor-pointer
                           bg-white/[0.06] text-surface-200 transition-all duration-200
                           hover:bg-red-500/15 hover:text-red-300 active:scale-90
                           focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:opacity-40"
                style={{ animation: 'cic-pop .25s cubic-bezier(.2,.8,.2,1)' }}
              >
                <Icon d={ICONS.mic} />
              </button>
            )}
          </div>
        )}

        {/* {!isRecording && !isTouch && (
          <p className="mt-2 hidden px-3 text-[11px] text-surface-500 lg:block">
            <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-sans border border-white/10">Enter</kbd> ارسال ·{' '}
            <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-sans border border-white/10">Shift + Enter</kbd> خط جدید
          </p>
        )} */}
      </div>

      {isDragging && (
        <div
          className="cic-anim absolute inset-2 z-50 grid place-items-center rounded-3xl border-2 border-dashed
                     border-primary-400/70 bg-surface-950/90 backdrop-blur-md"
          style={{ animation: 'cic-up .2s ease-out' }}
        >
          <div className="flex flex-col items-center gap-2 text-primary-200">
            <Icon d={ICONS.upload} className="size-8" />
            <p className="text-sm font-medium">فایل را اینجا رها کنید</p>
          </div>
        </div>
      )}
    </form>
  );
}