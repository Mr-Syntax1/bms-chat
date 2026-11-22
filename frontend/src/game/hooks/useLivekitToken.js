import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../hooks/useChat';

const EMPTY = { roomId: null, token: null, url: null, error: null };

/**
 * دریافت توکن LiveKit از بک‌اند (`/api/livekit/token`).
 * roomName از roomId چت ساخته می‌شود و توکن با JWT همان کاربر صادر می‌شود.
 */
export function useLivekitToken({ roomId, enabled = true }) {
  const [data, setData] = useState(EMPTY);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled || !roomId) return undefined;

    cancelledRef.current = false;
    let cancelled = false;

    apiRequest('/api/livekit/token', {
      method: 'POST',
      body: JSON.stringify({ roomName: roomId, roomId }),
    })
      .then((res) => {
        if (cancelled) return;
        if (!res?.token) throw new Error(res?.error || 'توکن LiveKit دریافت نشد');
        setData({ roomId, token: res.token, url: res.url || null, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setData({ roomId, token: null, url: null, error: err.message || 'خطا در اتصال به LiveKit' });
      });

    return () => {
      cancelled = true;
      cancelledRef.current = true;
    };
  }, [enabled, roomId]);

  const current = data.roomId === roomId ? data : EMPTY;
  const status = !enabled || !roomId
    ? 'idle'
    : current.error
      ? 'error'
      : current.token
        ? 'ready'
        : 'loading';

  const retry = useCallback(() => setData(EMPTY), []);

  return {
    token: current.token,
    serverUrl: current.url,
    status,
    error: current.error,
    retry,
  };
}
