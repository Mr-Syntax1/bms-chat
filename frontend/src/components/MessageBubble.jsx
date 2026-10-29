import Avatar from './Avatar';

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(fileType, fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (fileType?.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (fileType?.includes('word') || ['doc', 'docx'].includes(ext)) return 'doc';
  if (fileType?.includes('sheet') || ['xls', 'xlsx'].includes(ext)) return 'xls';
  if (fileType?.includes('text') || ext === 'txt') return 'txt';
  return 'file';
}

// تابع جدید برای فرمت‌دهی زمان و تاریخ
function formatMessageDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

  const timeOptions = { hour: '2-digit', minute: '2-digit' };
  const time = date.toLocaleTimeString('fa-IR', timeOptions);

  if (isToday) {
    return time; // اگر امروز بود، فقط ساعت
  } else if (isYesterday) {
    return `دیروز، ${time}`; // اگر دیروز بود
  } else {
    // اگر قدیمی‌تر بود، تاریخ و ساعت
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = date.toLocaleDateString('fa-IR', dateOptions);
    return `${dateStr}، ${time}`;
  }
}

function FilePreview({ msg, isMine }) {
  const isImage = msg.fileType?.startsWith('image/');
  const icon = getFileIcon(msg.fileType, msg.fileName);
  const size = msg.fileSize ? formatBytes(msg.fileSize) : '';

  if (isImage) {
    return (
      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={msg.fileUrl}
          alt={msg.fileName || 'Image'}
          className="max-w-xs max-h-64 rounded-xl object-cover cursor-zoom-in shadow-md"
          loading="lazy"
        />
        <div className="flex items-center gap-2 mt-2 px-1 text-xs opacity-70">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          <p className="font-medium truncate max-w-[200px]">{msg.fileName}</p>
          {size && <span>•</span>}
          {size && <span>{size}</span>}
        </div>
      </a>
    );
  }

  const icons = {
    pdf: <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-2-6V4h-2v6H8v2h6z" /></svg>,
    doc: <svg className="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-2-6V4h-2v6H8v2h6z" /></svg>,
    xls: <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-2-6V4h-2v6H8v2h6z" /></svg>,
    txt: <svg className="w-10 h-10 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-2-6V4h-2v6H8v2h6z" /></svg>,
    image: <svg className="w-10 h-10 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 4.5V5h-13v8.5z" /></svg>,
    file: <svg className="w-10 h-10 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-2-6V4h-2v6H8v2h6z" /></svg>,
  };

  return (
    <a
      href={msg.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-3 rounded-xl border ${isMine
        ? 'border-primary-800 bg-primary-900/30 text-white'
        : 'border-surface-700 bg-surface-800 text-surface-50'
        } hover:bg-opacity-80 transition-colors min-w-[200px] max-w-xs`}
    >
      <div className="flex-shrink-0">{icons[icon]}</div>
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{msg.fileName}</p>
        <p className="text-xs opacity-60">{size}</p>
      </div>
      <svg className="w-5 h-5 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    </a>
  );
}

export default function MessageBubble({ msg, isMine, showHeader }) {
  const isSystem = msg.type === 'system';
  const isFile = msg.type === 'file';

  if (isSystem) {
    return (
      <div className="flex justify-center my-3 animate-fade-in">
        <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-surface-800 text-surface-400 border border-surface-700 shadow-sm">
          {msg.text}
        </span>
      </div>
    );
  }

  const time = msg.createdAt ? formatMessageDate(msg.createdAt) : formatMessageDate(new Date());

  return (
    <div className={`flex gap-2 animate-message-appear ${isMine ? 'justify-end' : 'justify-start'}`} dir='ltr'>

      {!isMine && (
        <div className="w-10 flex-shrink-0 flex justify-start items-end pb-1">
          {showHeader && <Avatar username={msg.sender} color={msg.avatarColor} size="sm" />}
        </div>
      )}

      <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>

        {/* نام فرستنده بالای پیام (فقط برای بقیه) */}
        {showHeader && !isMine && (
          <span className="text-xs font-semibold text-surface-400 mb-1 px-1">
            {msg.sender}
          </span>
        )}

        <div className={`
          relative px-4 py-2.5 text-sm rounded-2xl
          ${isMine
            ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg rounded-tr-sm'
            : 'bg-surface-800 text-surface-50 shadow-md border border-surface-700 rounded-tl-sm'
          }
        `}>
          {isFile ? (
            <FilePreview msg={msg} isMine={isMine} />
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          )}

          <div className="flex items-center justify-end gap-2 mt-1.5">
            <time className={`text-[10px] ${isMine ? 'text-primary-100' : 'text-surface-500'}`}>
              {time}
            </time>
            {/* تیک پیام (فقط برای خودت) */}
            {isMine && (
              <svg
                className="w-4 h-4 text-primary-100/70"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}