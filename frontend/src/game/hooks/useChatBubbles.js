import { useEffect } from 'react';
import { getChannel, getRoomChannelName } from '../../lib/ably';
import { showChatBubble, usePlayerStore } from '../stores/usePlayerStore';

const BUBBLE_MS = 5000;

/**
 * اشتراک رویداد پیام‌های اتاق روی همان کانال چت و پرکردن حباب‌ها + لاگ گوشه.
 * (بدون re-render در حلقه‌ی بازی؛ فقط لاگ سه‌تایی در store)
 */
export function useChatBubbles(roomId, user) {
  useEffect(() => {
    if (!roomId || !user?.id) return undefined;

    let channel;
    try {
      channel = getChannel(getRoomChannelName(roomId));
    } catch {
      return undefined;
    }

    const onMessage = (message) => {
      const data = message?.data;
      if (!data) return;
      const senderId = data.senderId ?? data.userId;
      const text = data.text;
      if (!senderId || !text) return;
      // حباب بالای سر برای هر دو طرف؛ خودمان هم حباب محلی می‌گیریم
      showChatBubble(String(senderId), text, BUBBLE_MS);
      usePlayerStore.getState().pushChatLog({
        id: data.id || `${senderId}-${Date.now()}`,
        sender: data.sender || data.username || 'مهمان',
        text,
      });
    };

    channel.subscribe('new-message', onMessage).catch?.(() => {});
    return () => {
      try {
        channel.unsubscribe('new-message', onMessage);
      } catch {
        /* ignore */
      }
    };
  }, [roomId, user?.id]);
}
