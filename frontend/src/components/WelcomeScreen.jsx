import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import InstallButton from './InstallButton';

/* ───────────── helpers ───────────── */

const faNum = (n) => Number(n || 0).toLocaleString('fa-IR');

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'شب‌بخیر';
  if (h < 12) return 'صبح‌بخیر';
  if (h < 17) return 'ظهر‌بخیر';
  if (h < 20) return 'عصر‌بخیر';
  return 'شب‌بخیر';
};

const hueOf = (str) => {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};

const getMemberCount = (r) => r.memberCount ?? r.membersCount ?? r.members?.length ?? r.users?.length ?? null;

const NAME_MIN = 2;
const NAME_MAX = 32;

function Icon({ d, className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const PATH = {
  search: 'M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 19l-7-7 7-7',
};

function Spinner() {
  return <span className="block w-4 h-4 rounded-full border-2 border-surface-600 border-t-surface-200 animate-spin" role="status" aria-label="در حال انجام" />;
}

function Kbd({ children }) {
  return (
    <kbd className="px-1.5 h-5 inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] text-[11px] font-sans text-surface-400">
      {children}
    </kbd>
  );
}

/* ───────────── component ───────────── */

export default function WelcomeScreen({ user, rooms = [], onSelectRoom, onCreateRoom }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState('');

  const greeting = useMemo(getGreeting, []);
  const q = query.trim();

  /* ── آیتم‌های لیست: اتاق‌ها + (در صورت نیاز) ساخت اتاق ── */
  const items = useMemo(() => {
    const publicRooms = rooms.filter((r) => !r.isPrivate);
    const isBms = (r) => r.name.toLowerCase().includes('bms');
    const sorted = [...publicRooms.filter(isBms), ...publicRooms.filter((r) => !isBms(r))];
    const hasBms = sorted.some(isBms);

    let list;
    if (!q) {
      list = sorted.slice(0, 6);
      if (!hasBms) list = [{ id: 'virtual-bms', name: 'bms', isVirtual: true }, ...list].slice(0, 6);
    } else {
      const needle = q.toLowerCase();
      list = sorted.filter((r) => r.name.toLowerCase().includes(needle));
    }

    const out = list.map((room) => ({ kind: 'room', key: room.id, room }));

    const exact = sorted.some((r) => r.name.toLowerCase() === q.toLowerCase());
    if (q && !exact) out.push({ kind: 'create', key: 'create', name: q });

    return out;
  }, [rooms, q]);

  const totalPublic = useMemo(() => rooms.filter((r) => !r.isPrivate).length, [rooms]);

  /* ── فوکوس: فقط روی دسکتاپ (روی موبایل کیبورد بی‌خودی باز نشود) + میانبر Ctrl/⌘ + K ── */
  useEffect(() => {
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) inputRef.current?.focus();

    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── آیتم فعال همیشه در دید باشد ── */
  useEffect(() => {
    document.getElementById(`ws-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  /* ── اجرای انتخاب ── */
  const activate = useCallback(
    async (item) => {
      if (!item || busyKey) return;
      setError('');
      setBusyKey(item.key);
      try {
        if (item.kind === 'create') {
          if (item.name.length < NAME_MIN) return setError(`نام اتاق باید حداقل ${faNum(NAME_MIN)} حرف باشد.`);
          if (item.name.length > NAME_MAX) return setError(`نام اتاق نباید بیشتر از ${faNum(NAME_MAX)} حرف باشد.`);
          const res = await onCreateRoom(item.name);
          if (res?.success || res?.error) onSelectRoom(item.name); // اگر از قبل وجود داشت هم وارد می‌شویم
        } else if (item.room.isVirtual) {
          await onCreateRoom(item.room.name);
          onSelectRoom(item.room.name);
        } else {
          onSelectRoom(item.room.name);
        }
      } catch {
        setError('مشکلی پیش آمد. دوباره تلاش کن.');
      } finally {
        setBusyKey(null);
      }
    },
    [busyKey, onCreateRoom, onSelectRoom]
  );

  const onKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(items[active]);
    } else if (e.key === 'Escape') {
      setQuery('');
      setActive(0);
      setError('');
    }
  };

  const activeId = items[active] ? `ws-opt-${active}` : undefined;

  return (
    <div dir="rtl" className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <style>{`
        @keyframes ws-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .ws-in { animation: ws-in .45s cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .ws-in { animation: none; } }
      `}</style>

      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {/* ───── نوار بالا ───── */}
        <header className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <img src="/pwa-192x192.png" alt="" width={28} height={28} className="w-7 h-7 rounded-lg object-contain" />
            <span className="font-semibold text-surface-100 tracking-tight">چت BMS</span>
          </div>

          <div className="flex items-center gap-2">
            <InstallButton />
            <button
              onClick={() => navigate('/profile')}
              className="rounded-full transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950"
              aria-label="مشاهده پروفایل"
              title="پروفایل"
            >
              <Avatar username={user?.username} avatarIndex={user?.avatarIndex} size="sm" status="online" />
            </button>
          </div>
        </header>

        {/* ───── خوش‌آمدگویی ───── */}
        <section className="ws-in mt-8 sm:mt-16">
          <p className="text-sm text-surface-500">{greeting}</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-surface-50 break-words">
            سلام، {user?.username}
          </h1>
          <p className="mt-3 text-surface-400 leading-7">
            یک اتاق پیدا کن و وارد شو، یا اسم اتاق جدیدت را بنویس تا همین‌جا بسازیمش.
          </p>
        </section>

        {/* ───── جستجو / ساخت ───── */}
        <section className="ws-in mt-6" style={{ animationDelay: '60ms' }}>
          <div className="relative">
            <Icon d={PATH.search} className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500 pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                if (error) setError('');
              }}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="ws-listbox"
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              placeholder="جستجوی اتاق یا ساخت اتاق جدید…"
              className="w-full h-12 sm:h-14 rounded-2xl bg-surface-900 border border-white/10 pr-12 pl-4 sm:pl-24 text-base text-surface-50 placeholder:text-surface-500 outline-none transition-colors focus:border-primary-500/70 focus:ring-4 focus:ring-primary-500/10"
            />
            <div className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 items-center gap-1 pointer-events-none">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/[0.07] bg-surface-900/70 overflow-hidden">
            <div className="flex items-center justify-between px-4 h-10 border-b border-white/[0.06] text-xs text-surface-500">
              <span>{q ? 'نتایج' : 'اتاق‌های پیشنهادی'}</span>
              <span>{q ? `${faNum(items.filter((i) => i.kind === 'room').length)} اتاق` : `${faNum(totalPublic)} اتاق عمومی`}</span>
            </div>

            <ul id="ws-listbox" role="listbox" aria-label="اتاق‌ها" className="p-1.5 max-h-[55vh] overflow-y-auto overscroll-contain">
              {items.map((item, i) => {
                const isActive = i === active;
                const isBusy = busyKey === item.key;
                const isCreate = item.kind === 'create';
                const name = isCreate ? item.name : item.room.name;
                const hue = hueOf(name);
                const members = isCreate ? null : getMemberCount(item.room);
                const invalid = isCreate && (item.name.length < NAME_MIN || item.name.length > NAME_MAX);

                let sub;
                if (isCreate) sub = invalid ? `نام اتاق باید بین ${faNum(NAME_MIN)} تا ${faNum(NAME_MAX)} حرف باشد` : 'اتاق جدید می‌سازی و مستقیم وارد می‌شوی';
                else if (item.room.isVirtual) sub = 'هنوز ساخته نشده؛ با یک کلیک ساخته و وارد می‌شوی';
                else if (members !== null) sub = `${faNum(members)} عضو`;
                else sub = 'عمومی';

                return (
                  <li
                    key={item.key}
                    id={`ws-opt-${i}`}
                    role="option"
                    aria-selected={isActive}
                    aria-disabled={!!busyKey}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => activate(item)}
                    className={`flex items-center gap-3.5 min-h-[56px] px-2.5 py-2 rounded-xl cursor-pointer select-none transition-colors ${
                      isActive ? 'bg-white/[0.06]' : ''
                    } ${busyKey && !isBusy ? 'opacity-60' : ''}`}
                  >
                    {/* تایل */}
                    <div
                      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-semibold text-base"
                      style={
                        isCreate
                          ? undefined
                          : { backgroundColor: `hsl(${hue} 55% 50% / 0.16)`, color: `hsl(${hue} 85% 75%)` }
                      }
                    >
                      {isBusy ? (
                        <Spinner />
                      ) : isCreate ? (
                        <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-500/15 text-primary-300">
                          <Icon d={PATH.plus} />
                        </span>
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* متن */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-surface-100 truncate">
                          {isCreate ? (
                            <>
                              ساخت اتاق <span className="text-primary-300">«{name}»</span>
                            </>
                          ) : (
                            name
                          )}
                        </span>
                        {!isCreate && name.toLowerCase().includes('bms') && (
                          <span className="shrink-0 px-1.5 h-5 inline-flex items-center rounded-md bg-primary-500/10 text-primary-300 text-[10px] font-bold">
                            BMS
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 truncate ${invalid ? 'text-amber-400' : 'text-surface-500'}`}>{sub}</p>
                    </div>

                    {/* نشانگر انتهایی */}
                    <div className="shrink-0 w-8 flex justify-center text-surface-500">
                      {isActive && !isBusy && (
                        <>
                          <span className="hidden sm:block text-sm">↵</span>
                          <Icon d={PATH.back} className="sm:hidden w-5 h-5" />
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <p role="alert" aria-live="polite" className={`mt-3 text-sm text-rose-400 ${error ? '' : 'hidden'}`}>
            {error}
          </p>

          {/* راهنمای کیبورد (فقط دسکتاپ) */}
          <div className="hidden sm:flex items-center justify-center gap-5 mt-5 text-xs text-surface-500">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> حرکت
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Enter</Kbd> ورود
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Esc</Kbd> پاک کردن
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}