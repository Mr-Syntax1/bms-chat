import { useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import { useLivekitToken } from '../hooks/useLivekitToken';
import { useSpatialVoice } from '../hooks/useSpatialVoice';
import { usePlayerStore } from '../stores/usePlayerStore';
import { setVoiceController, clearVoiceController } from '../voiceControl';
import { attachVoiceActivity, detachVoiceActivity } from '../voiceActivity';

// فعال‌سازی خودکار میکروفن به‌محض اتصال (بعد از کلیک Start)
function MicAutoEnable({ micEnabled }) {
  const room = useRoomContext();

  useEffect(() => {
    const lp = room?.localParticipant;
    if (!lp) return;
    lp.setMicrophoneEnabled(micEnabled).catch(() => {});
  }, [room, micEnabled]);

  return null;
}

// پل ارتباطی: اتاق LiveKit → هوک Spatial + کنترل میکروفن برای HUD
function VoiceBridge({ registerRoom, micEnabled, setMicEnabled }) {
  const room = useRoomContext();
  const setMicEnabledStore = usePlayerStore((s) => s.setMicEnabled);
  const setVoiceReady = usePlayerStore((s) => s.setVoiceReady);

  useEffect(() => {
    registerRoom(room);
    setVoiceReady(Boolean(room));
    // نشانگر صحبت فقط از رویداد واقعی LiveKit تغذیه می‌شود
    if (room) attachVoiceActivity(room);
    return () => {
      detachVoiceActivity();
      registerRoom(null);
      setVoiceReady(false);
    };
  }, [room, registerRoom, setVoiceReady]);

  useEffect(() => {
    setMicEnabledStore(micEnabled);
  }, [micEnabled, setMicEnabledStore]);

  // کنترلر بیرونی: دکمه‌ی میکروفن در HUD
  useEffect(() => {
    const fn = (next) => {
      setMicEnabled(next);
      return true;
    };
    setVoiceController(fn);
    return () => clearVoiceController(fn);
  }, [setMicEnabled]);

  return null;
}

/**
 * صدای ویس LiveKit به‌صورت کامپوننت مستقل (sibling کانواس، نه والد آن)
 * تا با آماده شدن توکن، Canvas بازی remount نشود.
 * توکن از همان ابتدا گرفته می‌شود (برای نمایش پیشرفت واقعی در صفحه‌ی لودینگ)،
 * اما اتصال به اتاق فقط پس از `connect` (یعنی بعد از کلیک ورود) انجام می‌شود
 * تا درخواست دسترسی میکروفن پیش از اقدام کاربر مطرح نشود.
 */
export default function GameVoice({ roomId, enabled = true, connect = true }) {
  const { token, serverUrl, status, error } = useLivekitToken({ roomId, enabled });
  const { micEnabled, setMicEnabled, registerRoom } = useSpatialVoice({ enabled: enabled && connect });
  const setVoiceError = usePlayerStore((s) => s.setVoiceError);
  const setVoiceTokenReady = usePlayerStore((s) => s.setVoiceTokenReady);

  // وضعیت خطای LiveKit را در استور نگه می‌داریم تا HUD پیام درست نشان دهد
  useEffect(() => {
    if (status === 'error') setVoiceError(error || 'اتصال به LiveKit ناموفق بود');
    else if (status === 'ready') setVoiceError(null);
  }, [status, error, setVoiceError]);

  // توکن آماده است؟ (مستقل از اتصال واقعی به اتاق)
  const tokenReady = status === 'ready' && Boolean(token) && Boolean(serverUrl);
  useEffect(() => {
    setVoiceTokenReady(tokenReady);
    return () => setVoiceTokenReady(false);
  }, [tokenReady, setVoiceTokenReady]);

  if (!tokenReady || !connect) return null;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video={false}
      onError={() => setVoiceError('اتصال به LiveKit قطع شد')}
      style={{ display: 'contents' }}
    >
      <RoomAudioRenderer />
      <MicAutoEnable micEnabled={micEnabled} />
      <VoiceBridge registerRoom={registerRoom} micEnabled={micEnabled} setMicEnabled={setMicEnabled} />
    </LiveKitRoom>
  );
}
