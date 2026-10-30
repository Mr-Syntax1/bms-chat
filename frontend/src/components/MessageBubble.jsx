import { useState, useRef, useCallback } from 'react';
import Avatar from './Avatar';
import ContextMenu from './ContextMenu';

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
  const isAudio = msg.fileType?.startsWith('audio/') || msg.fileName?.endsWith('.webm');
  const icon = getFileIcon(msg.fileType, msg.fileName);
  const size = msg.fileSize ? formatBytes(msg.fileSize) : '';


  if (isAudio) {
    return (
      <div className={`flex flex-col gap-2 p-3 rounded-xl min-w-[250px] ${isMine ? 'bg-primary-800/50' : 'bg-surface-800'
        }`}>
        <audio
          controls
          src={msg.fileUrl}
          className="w-full h-10"
          style={{ filter: 'invert(1) hue-rotate(180deg)' }} // برای هماهنگی با تم تیره (اختیاری)
        />
        <div className="flex items-center gap-2 text-xs opacity-70">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span>پیام صوتی</span>
          {size && <span>• {size}</span>}
        </div>
      </div>
    );
  }

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

function DeleteIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function DeleteForEveryoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

export default function MessageBubble({ msg, isMine, showHeader, onDeleteMessage, onEditMessage }) {
  const isSystem = msg.type === 'system';
  const isFile = msg.type === 'file';

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ x: null, y: null });
  const [menuItems, setMenuItems] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text || '');
  const bubbleRef = useRef(null);
  const editInputRef = useRef(null);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ x: null, y: null });
  }, []);

  const handleEdit = useCallback(() => {
    setEditing(true);
    setEditText(msg.text || '');
    closeContextMenu();
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, [msg.text, closeContextMenu]);

  const handleSaveEdit = useCallback(async () => {
    if (!editText.trim()) return;
    const res = await onEditMessage?.(msg.id, editText.trim());
    if (res?.success !== false) setEditing(false);
  }, [msg.id, editText, onEditMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditText(msg.text || '');
    setEditing(false);
  }, [msg.text]);

  const buildMenuItems = useCallback(() => {
    const items = [
      {
        label: 'حذف برای من',
        icon: <DeleteIcon />,
        danger: true,
        onClick: () => onDeleteMessage?.(msg.id, false),
      },
    ];

    // Only the sender can edit or delete for everyone.
    if (isMine) {
      if (!isFile) {
        items.unshift({
          label: 'ویرایش',
          icon: <EditIcon />,
          onClick: handleEdit,
        });
      }
      items.push({
        label: 'حذف برای همه',
        icon: <DeleteForEveryoneIcon />,
        danger: true,
        onClick: () => onDeleteMessage?.(msg.id, true),
      });
    }

    return items;
  }, [isMine, isFile, msg.id, onDeleteMessage, handleEdit]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    if (isSystem) return;

    const rect = bubbleRef.current?.getBoundingClientRect();
    const menuWidth = 180;

    let x = e.clientX;
    let y = e.clientY;

    if (rect) {
      // Anchor the menu right next to the bubble instead of the cursor.
      x = isMine ? rect.right - menuWidth : rect.left;
      y = rect.bottom + 2;
    }

    setContextMenu({ x, y });
    setMenuItems(buildMenuItems());
  }, [isSystem, isMine, buildMenuItems]);

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
    <div
      onContextMenu={handleContextMenu}
      className={`flex gap-2 animate-message-appear ${isMine ? 'justify-end' : 'justify-start'}`}
      dir='ltr'
    >
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

        <div
          ref={bubbleRef}
          className={`
            relative px-4 py-2.5 text-sm rounded-2xl
            ${isMine
              ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg rounded-tr-sm'
              : 'bg-surface-800 text-surface-50 shadow-md border border-surface-700 rounded-tl-sm'
            }
          `}
        >
          {editing ? (
            <div className="flex gap-2">
              <input
                ref={editInputRef}
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="flex-1 bg-surface-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
              <button onClick={handleSaveEdit} className="px-3 py-2 text-sm text-primary-400 hover:text-primary-300">ذخیره</button>
              <button onClick={handleCancelEdit} className="px-3 py-2 text-sm text-surface-400 hover:text-surface-300">انصراف</button>
            </div>
          ) : isFile ? (
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

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        items={menuItems}
        onClose={closeContextMenu}
      />
    </div>
  );
}