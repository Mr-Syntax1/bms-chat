import { useEffect, useRef } from 'react';
import { apiRequest } from '../../hooks/useChat';
import { usePlayerStore } from '../stores/usePlayerStore';

// کش سطح ماژول: StrictMode دو بار mount می‌کند، نباید دو درخواست بفرستیم
const inflight = new Map(); // roomId → Promise
let releaseTimer = null;

function claimCharacter(roomId, onFull) {
  if (inflight.has(roomId)) return inflight.get(roomId);

  const promise = apiRequest('/api/calls/game/claim-character', { method: 'POST' })
    .then((res) => {
      if (!res?.character) throw new Error('کاراکتر دریافت نشد');
      usePlayerStore.getState().setCharacter(res.character, res.url);
      return res;
    })
    .catch((err) => {
      // شکست کش نشود تا تلاش بعدی دوباره درخواست بفرستد
      inflight.delete(roomId);
      if (err.status === 409) {
        usePlayerStore.getState().setCharacterError('ظرفیت بازی پر است');
        onFull?.();
      } else {
        usePlayerStore.getState().setCharacterError(err.message || 'خطا در اختصاص کاراکتر');
      }
      throw err;
    });

  inflight.set(roomId, promise);
  return promise;
}

/**
 * اختصاص کاراکتر یکتا از بک‌اند قبل از ورود به بازی.
 * اگر ظرفیت پر باشد (۴۰۹)، onFull صدا زده می‌شود.
 */
export function useClaimCharacter({ roomId, enabled = true, onFull }) {
  const onFullRef = useRef(onFull);
  useEffect(() => {
    onFullRef.current = onFull;
  }, [onFull]);

  useEffect(() => {
    if (!enabled || !roomId) return undefined;

    // اگر unmount قبلی در حال آزادسازی بود، لغوش کن
    if (releaseTimer) {
      clearTimeout(releaseTimer);
      releaseTimer = null;
    }

    usePlayerStore.getState().setCharacterLoading(true);
    claimCharacter(roomId, (full) => onFullRef.current?.(full)).catch(() => {});

    return () => {
      // تأخیر کوتاه تا StrictMode دوباره mount شود و آزادسازی بی‌مورد رخ ندهد
      if (releaseTimer) clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => {
        releaseTimer = null;
        inflight.delete(roomId);
        apiRequest('/api/calls/game/release-character', { method: 'POST' }).catch(() => {});
      }, 1000);
    };
  }, [enabled, roomId]);
}
