import { useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import { useSpatialVoice } from '../hooks/useSpatialVoice';

// داخل LiveKitRoom اجرا می‌شود تا به اتاق دسترسی داشته باشد
function VoiceBridge({ registerRoom, micEnabled }) {
  const room = useRoomContext();

  useEffect(() => {
    registerRoom(room);
    return () => registerRoom(null);
  }, [room, registerRoom]);

  // میکروفن را با وضعیت دکمه هم‌گام کن
  useEffect(() => {
    const lp = room?.localParticipant;
    if (!lp) return;
    lp.setMicrophoneEnabled(micEnabled).catch(() => {});
  }, [room, micEnabled]);

  return null;
}

export default function SpatialVoice({ roomId, enabled }) {
  const { token, serverUrl, status, error, micEnabled, toggleMic, registerRoom } = useSpatialVoice({
    roomId,
    enabled,
  });

  // اگر LiveKit پیکربندی نشده باشد، فقط یک نشانگر آرام نشان بده
  if (status === 'error') {
    return (
      <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-950/70 border border-warning-500/30 backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-warning-500" />
        <span className="text-[11px] text-warning-500">
          {error?.includes('پیکربندی') ? 'صدای گروهی تنظیم نشده' : 'صدای گروهی در دسترس نیست'}
        </span>
      </div>
    );
  }

  if (status !== 'ready' || !token || !serverUrl) {
    return (
      <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-950/70 border border-white/10 backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-surface-500 animate-pulse" />
        <span className="text-[11px] text-surface-400">
          {status === 'loading' ? 'اتصال به صدای کمپ...' : 'صدا آماده نیست'}
        </span>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video={false}
        onDisconnected={() => {}}
        className="hidden"
      >
        <VoiceBridge registerRoom={registerRoom} micEnabled={micEnabled} />
        <RoomAudioRenderer />
      </LiveKitRoom>

      <button
        type="button"
        onClick={toggleMic}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border backdrop-blur-md transition-colors text-[11px] font-semibold ${
          micEnabled
            ? 'bg-success-500/20 border-success-500/40 text-success-500'
            : 'bg-surface-900/70 border-white/15 text-surface-400'
        }`}
        title={micEnabled ? 'قطع میکروفن' : 'وصل میکروفن'}
      >
        {micEnabled ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 003-3V4.5a3 3 0 00-6 0v8.25a3 3 0 003 3z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.25 9.75v1.5a5.25 5.25 0 01-8.4 4.05M6.75 9.75v1.5c0 .857.2 1.667.555 2.386M12 18.75v3.75m-3.75 0h7.5M3 3l18 18" />
          </svg>
        )}
        صدا
      </button>
    </div>
  );
}
