import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ContextMenu({ 
  x, 
  y, 
  items, 
  onClose, 
  children,
  className = ''
}) {
  const menuRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // 👈 فقط برای انیمیشن ورود (بدون setState در useEffect)
  useEffect(() => {
    if (x !== null && y !== null && items?.length > 0) {
      // یک فریم صبر می‌کنیم تا مرورگر المان را رندر کند، بعد انیمیشن را فعال می‌کنیم
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    }
  }, [x, y, items]);

  // بستن با کلیک بیرون یا دکمه Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // اگر آیتمی وجود نداشت، منو را رندر نکن
  if (!items?.length || x === null || y === null) return null;

  const menuWidth = 180;
  const menuHeight = items.length * 36 + 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // محاسبه موقعیت برای اینکه منو از صفحه بیرون نزند
  const posX = Math.max(10, Math.min(x, viewportWidth - menuWidth - 10));
  const posY = Math.max(10, Math.min(y, viewportHeight - menuHeight - 10));

  return createPortal(
    <div
      ref={menuRef}
      className={`fixed z-[100] pointer-events-auto ${className}`}
      style={{ left: posX, top: posY }}
      role="menu"
      aria-orientation="vertical"
    >
      <div 
        className={`
          bg-surface-800/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl p-1 min-w-[180px]
          transition-all duration-200 ease-out origin-top
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}
        `}
      >
        {items.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            onClick={() => {
              item.onClick?.();
              onClose?.();
            }}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors duration-150
              ${item.danger 
                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' 
                : 'text-surface-300 hover:bg-white/5 hover:text-white'
              }
              ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
            role="menuitem"
            tabIndex={-1}
          >
            {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
            {item.shortcut && (
              <span className="ml-auto text-xs text-surface-500 font-mono">{item.shortcut}</span>
            )}
          </button>
        ))}
        {children && (
          <>
            <div className="border-t border-white/10 my-1" />
            {children}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// (MenuItem و MenuDivider بدون تغییر)
export const MenuItem = ({ label, onClick, icon, danger, disabled, shortcut }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors duration-150
      ${danger 
        ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' 
        : 'text-surface-300 hover:bg-white/5 hover:text-white'
      }
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    `}
    role="menuitem"
    tabIndex={-1}
  >
    {icon && <span className="w-5 h-5 flex-shrink-0">{icon}</span>}
    <span className="truncate">{label}</span>
    {shortcut && <span className="ml-auto text-xs text-surface-500 font-mono">{shortcut}</span>}
  </button>
);

export const MenuDivider = () => (
  <div className="border-t border-white/10 my-1" role="separator" />
);