import { useCallback, useEffect, useRef, useState } from 'react';

function hasLiveVideo(stream) {
  return Boolean(stream?.getVideoTracks?.().some((track) => track.readyState === 'live' && !track.muted && track.enabled));
}

function useStreamObject(stream, enabled = true) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (el.srcObject !== (stream || null)) el.srcObject = stream || null;
    if (enabled && stream) el.play?.().catch(() => {});
    return () => {
      el.pause?.();
      el.srcObject = null;
    };
  }, [stream, enabled]);

  return ref;
}

function MediaTile({ participant }) {
  const stream = participant.stream;
  const showVideo = participant.isVideoOn && hasLiveVideo(stream);
  const videoRef = useStreamObject(stream, showVideo);

  return (
    <div className="relative aspect-video min-h-32 overflow-hidden rounded-2xl bg-surface-900 ring-1 ring-white/10">
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${participant.isLocal ? '-scale-x-100' : ''}`}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-surface-800 to-surface-900 text-4xl font-bold text-primary-300">
          {(participant.username || '?').slice(0, 1).toUpperCase()}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 pb-2.5 pt-6 text-sm text-white">
        <span className="truncate font-medium">{participant.isLocal ? 'شما' : participant.username}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-white/75">
          {participant.isMuted && (
            <span className="rounded-full bg-rose-500/90 px-2 py-0.5 font-semibold text-white">بی‌صدا</span>
          )}
          {participant.isVideoOn && (
            <span className="rounded-full bg-emerald-500/80 px-2 py-0.5 font-semibold text-white">تصویر</span>
          )}
        </span>
      </div>
    </div>
  );
}

function RemoteAudio({ participant, onBlocked }) {
  const audioRef = useStreamObject(participant.stream, true);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !participant.stream) return undefined;
    el.play?.().catch(() => onBlocked?.());
    return undefined;
  }, [participant.stream, audioRef, onBlocked]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

export default function GroupCallModal({ call, onJoin, onDecline }) {
  const [minimized, setMinimized] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const handleAudioBlocked = useCallback(() => setAudioBlocked(true), []);

  useEffect(() => {
    if (!audioBlocked) return undefined;
    const resume = () => {
      document.querySelectorAll('audio').forEach((el) => {
        el.play?.().then(() => setAudioBlocked(false)).catch(() => {});
      });
    };
    window.addEventListener('pointerdown', resume, { once: true });
    return () => window.removeEventListener('pointerdown', resume);
  }, [audioBlocked]);

  if (!call) return null;
  const invite = call.incomingCall;
  const active = call.callState !== 'idle';
  if (!invite && !active) return null;

  if (invite) {
    return (
      <div dir="rtl" role="dialog" aria-modal="true" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
        <section className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface-950 text-white shadow-2xl">
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-primary-500/20 text-3xl font-bold text-primary-200">
              {(invite.callerName || '?').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold">دعوت به تماس گروهی</h2>
              <h3 className="mt-1 text-xl font-semibold">{invite.callerName || 'کاربر'}</h3>
              <p className="mt-2 text-sm text-surface-400">
                {invite.roomTitle || invite.roomName} · تماس {invite.callType === 'video' ? 'تصویری' : 'صوتی'}
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onDecline} className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold hover:bg-white/15">رد کردن</button>
              <button type="button" onClick={() => onJoin(invite)} className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-400">پیوستن</button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const remotes = call.participants.filter((participant) => !participant.isLocal);
  const connecting = call.callState !== 'connected';

  return (
    <>
      {remotes.map((participant) => (
        <RemoteAudio key={`audio-${participant.id}`} participant={participant} onBlocked={handleAudioBlocked} />
      ))}

      {minimized ? (
        <div dir="rtl" className="fixed bottom-4 end-4 z-[110] flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-2xl border border-white/10 bg-surface-950/95 p-3 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{call.roomName || 'تماس گروهی'}</p>
              <p className="text-xs text-surface-400" dir="ltr" style={{ textAlign: 'right' }}>
                {formatDuration(call.duration)} · {call.participants.length}
              </p>
            </div>
            <span className={`h-2 w-2 shrink-0 rounded-full ${connecting ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMinimized(false)} className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">بازگشت به تماس</button>
            <button type="button" onClick={call.toggleMute} className={`rounded-lg px-3 py-2 text-xs font-semibold ${call.isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/15'}`}>{call.isMuted ? 'وصل صدا' : 'بی‌صدا'}</button>
            <button type="button" onClick={call.endCall} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500">پایان</button>
          </div>
        </div>
      ) : (
        <div dir="rtl" role="dialog" aria-modal="true" aria-label="تماس گروهی" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-6">
          <section className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface-950 text-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">{call.roomName || 'تماس گروهی'}</h2>
                <p className="mt-1 text-xs text-surface-400">
                  <span dir="ltr" className="tabular-nums">{formatDuration(call.duration)}</span>
                  <span className="mx-1.5">·</span>
                  {call.participants.length} شرکت‌کننده
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs ${connecting ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                  {connecting ? 'در حال اتصال' : 'متصل'}
                </span>
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  title="کوچک کردن تماس"
                  aria-label="کوچک کردن تماس"
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15"
                >
                  کوچک‌کردن
                </button>
              </div>
            </header>

            {call.error && (
              <p role="alert" className="mx-4 mt-3 rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-200 sm:mx-6">{call.error}</p>
            )}

            <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {call.participants.map((participant) => (
                  <MediaTile key={participant.id} participant={participant} />
                ))}
              </div>
              {call.participants.length === 1 && (
                <p className="mt-5 text-center text-sm text-surface-400">در انتظار پیوستن دیگران…</p>
              )}
            </main>

            <footer className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 p-4">
              {audioBlocked && (
                <button
                  type="button"
                  onClick={() => {
                    document.querySelectorAll('audio').forEach((el) => {
                      el.play?.().then(() => setAudioBlocked(false)).catch(() => {});
                    });
                  }}
                  className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
                >
                  برای پخش صدا کلیک کنید
                </button>
              )}
              <button
                type="button"
                onClick={call.toggleMute}
                aria-pressed={call.isMuted}
                className={`rounded-full px-5 py-3 text-sm font-semibold ${call.isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/15'}`}
              >
                {call.isMuted ? 'روشن‌کردن میکروفون' : 'بی‌صدا کردن'}
              </button>
              <button
                type="button"
                onClick={call.toggleVideo}
                aria-pressed={call.isVideoOn}
                className={`rounded-full px-5 py-3 text-sm font-semibold ${call.isVideoOn ? 'bg-primary-500 text-white' : 'bg-white/10 hover:bg-white/15'}`}
              >
                {call.isVideoOn ? 'خاموش‌کردن دوربین' : 'روشن‌کردن دوربین'}
              </button>
              <button
                type="button"
                onClick={call.endCall}
                className="rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-500"
              >
                پایان تماس
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
