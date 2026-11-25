import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../hooks/useChat';

/**
 * مرور کمپ‌های فعال: فهرست اتاق‌های در حال بازی با تعداد بازیکن.
 * انتخاب هر کمپ، اتاق را عوض می‌کند و جریان ورود به بازی را ادامه می‌دهد.
 */
export default function CampsiteBrowser({ open, onClose, onJoin, currentRoomId }) {
  const [campsites, setCampsites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/calls/game/campsites');
      setCampsites(Array.isArray(res?.campsites) ? res.campsites : []);
    } catch (err) {
      setError(err.message || 'دریافت فهرست کمپ‌ها ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    // در تیک بعدی تا setState داخل بدنه‌ی effect رخ ندهد
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [open, load]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="بستن"
        onClick={onClose}
        className="fixed inset-0 cursor-pointer z-[102] cursor-default bg-black/50 backdrop-blur-[2px] cozy-fade-in"
      />

      <div className="fixed left-1/2 top-1/2 z-[103] w-[340px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/12 bg-[#171426]/96 p-4 backdrop-blur-xl cozy-pop-in">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#f5ebdd]">کمپ‌های فعال</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={load}
              className="rounded-lg cursor-pointer border border-white/12 px-2 py-1 text-[10px] text-[#f5ebdd]/70 hover:bg-white/10 hover:text-[#f5ebdd]"
            >
              بازخوانی
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/12 text-[#f5ebdd]/70 hover:bg-white/10 hover:text-[#f5ebdd]"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {loading && <p className="py-6 text-center text-[11px] text-[#f5ebdd]/50">در حال جست‌وجو…</p>}

        {!loading && error && (
          <p className="rounded-xl border border-[#ef4444]/35 bg-[#ef4444]/10 px-3 py-2 text-[11px] text-[#ffb4b4]">
            {error}
          </p>
        )}

        {!loading && !error && campsites.length === 0 && (
          <p className="py-6 text-center text-[11px] text-[#f5ebdd]/45">
            هنوز کمپ فعالی نیست. اولین نفر باش!
          </p>
        )}

        {!loading && !error && campsites.length > 0 && (
          <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-0.5">
            {campsites.map((camp) => {
              const full = camp.players >= camp.capacity;
              const isCurrent = camp.roomId === currentRoomId;
              return (
                <li key={camp.roomId}>
                  <button
                    type="button"
                    disabled={full}
                    onClick={() => onJoin?.(camp.roomId)}
                    className={`flex w-full items-center justify-between gap-2 cursor-pointer rounded-xl border px-3 py-2.5 text-right transition-colors ${
                      isCurrent
                        ? 'border-[#ffc66d]/50 bg-[#ff9a4d]/14'
                        : full
                          ? 'cursor-not-allowed border-white/8 bg-black/30 opacity-55'
                          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold text-[#f5ebdd]">
                        {camp.roomId}
                      </span>
                      <span className="block text-[9.5px] text-[#f5ebdd]/45">
                        {isCurrent ? 'کمپ فعلی تو' : 'کمپ دنج جنگل'}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] ${
                        full
                          ? 'bg-[#ef4444]/18 text-[#ffb4b4]'
                          : 'bg-[#65F5A0]/14 text-[#65F5A0]'
                      }`}
                    >
                      {camp.players}/{camp.capacity}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 text-[9.5px] leading-relaxed text-[#f5ebdd]/35">
          با ورود به یک کمپ، اتاق چت هم به همان کمپ تغییر می‌کند.
        </p>
      </div>
    </>
  );
}
