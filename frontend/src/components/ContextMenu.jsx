import { useEffect, useRef, useState, useCallback } from 'react';

export default function ContextMenu({ 
  x, 
  y, 
  items, 
  onClose, 
  children,
  className = ''
}) {
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = useCallback(() => {
    const el = menuRef.current;
    if (el) {
      el.classList.remove('animate-scale-in');
      el.classList.add('animate-scale-out');
      setTimeout(() => {
        setIsOpen(false);
        onClose?.();
      }, 100);
    } else {
      setIsOpen(false);
      onClose?.();
    }
  }, [onClose]);

  useEffect(() => {
    if (x !== null && y !== null && items?.length > 0) {
      setTimeout(() => setIsOpen(true), 0);
      requestAnimationFrame(() => {
        menuRef.current?.classList.add('animate-scale-in');
      });
    } else {
      setTimeout(() => setIsOpen(false), 0);
    }
  }, [x, y, items]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') closeMenu();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenu]);

  if (!isOpen || !items?.length) return null;

  const menuWidth = 180;
  const menuHeight = items.length * 36 + 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const posX = Math.min(x, viewportWidth - menuWidth - 10);
  const posY = Math.min(y, viewportHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 pointer-events-auto ${className}`}
      style={{ left: posX, top: posY }}
      role="menu"
      aria-orientation="vertical"
    >
      <div className="bg-surface-800/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl p-1 min-w-[180px] animate-scale-in">
        {items.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            onClick={() => {
              item.onClick?.();
              closeMenu();
            }}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150
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
    </div>
  );
}

export const MenuItem = ({ label, onClick, icon, danger, disabled, shortcut }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150
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