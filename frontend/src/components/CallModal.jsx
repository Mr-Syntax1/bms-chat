import { useEffect, useRef, useState } from 'react';


const hasRemoteAudio = (stream) =>
  !!stream && typeof stream.getAudioTracks === 'function'
    ? stream.getAudioTracks().some((t) => t.enabled)
    : false;

const ControlButton = ({ active, activeBg, activeShadow, onClick, title, children, disabled }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
     className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${
      disabled
        ? 'opacity-40 cursor-not-allowed'
        : active
        ? `${activeBg} text-white shadow-md ${activeShadow}`
        : 'bg-[#1e1f22] text-[#b5bac1] hover:bg-[#383a40] hover:text-[#dbdee1]'
    }`}
  >
    {children}
  </button>
);

export default function CallModal({
  isCalling,
  incomingCall,
  remoteUser,
  localStream,
  remoteStream,
  callState,
  callType,
  participants = [], // مقدار پیش‌فرض برای جلوگیری از خطا
  isMuted,
  isVideoOn,
  remoteStreamVersion,
  remoteScreenSharing,
  isScreenSharing,
  isDeafened,
  onAnswer,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleDeafen,
  onToggleVideo,
  onToggleScreenShare,
  user,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const durationRef = useRef(null);
  const startTimeRef = useRef(null);


  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      const video = remoteVideoRef.current;
      video.srcObject = remoteStream;
      // برای جلوگیری از مشکل play
      video.play().catch(() => { });
    }
  }, [remoteStream, remoteStreamVersion]);

  useEffect(() => {
    if (callState === 'connected') {
      startTimeRef.current = Date.now();
      durationRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }

    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
      if (callState !== 'connected') {
        startTimeRef.current = null;
      }
    };
  }, [callState]);

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getColorFromName = (name) => {
    if (!name) return 'bg-surface-800';
    const colors = [
      'bg-primary-500', 'bg-accent-500', 'bg-purple-500',
      'bg-pink-500', 'bg-orange-500', 'bg-teal-500',
      'bg-indigo-500', 'bg-cyan-500', 'bg-emerald-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // ===================== RINGING STATE (Outgoing) =====================
  if (callState === 'ringing' && !incomingCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-sm mx-4">
          <div className="bg-[#1e1f22] rounded-2xl p-8 text-center shadow-2xl border border-white/[0.04]">
            {/* Avatar with ripple */}
            <div className="relative w-28 h-28 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-[#5865f2]/20 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-[#5865f2]/10 animate-pulse" />
              <div className={`relative w-28 h-28 rounded-full ${getColorFromName(remoteUser?.username)} flex items-center justify-center text-4xl font-bold text-white shadow-xl`}>
                {getInitials(remoteUser?.username)}
              </div>
            </div>

            <p className="text-[#f2f3f5] text-xl font-bold">{remoteUser?.username}</p>
            <p className="text-[#b5bac1] text-sm mt-1.5 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5865f2] animate-pulse" />
              در حال زنگ زدن...
            </p>

            <div className="flex items-center justify-center gap-2 mt-4 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5865f2] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#5865f2] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#5865f2] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>

            <button
              onClick={onEnd}
              className="w-full bg-[#ed4245] hover:bg-[#c03537] text-white py-3 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-500/20 active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-5 h-5 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              لغو تماس
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== INCOMING CALL STATE =====================
  if (incomingCall && callState === 'ringing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-sm mx-4">
          <div className="bg-[#1e1f22] rounded-2xl p-8 text-center shadow-2xl border border-white/[0.04]">
            <p className="text-[#b5bac1] text-xs font-semibold uppercase tracking-widest mb-6">تماس ورودی</p>

            {/* Avatar with green pulse */}
            <div className="relative w-28 h-28 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full bg-[#23a559]/20 animate-ping" />
              <div className={`relative w-28 h-28 rounded-full ${getColorFromName(incomingCall.fromUsername)} flex items-center justify-center text-4xl font-bold text-white shadow-xl`}>
                {getInitials(incomingCall.fromUsername)}
              </div>
            </div>

            <p className="text-[#f2f3f5] text-xl font-bold">{incomingCall.fromUsername}</p>
            <p className="text-[#b5bac1] text-sm mt-1.5">
              {callType === 'video' ? 'می‌خواهد تماس تصویری برقرار کند' : 'می‌خواهد تماس صوتی برقرار کند'}
            </p>

            <div className="flex gap-5 justify-center mt-8">
              {/* Decline */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onDecline}
                  className="w-16 h-16 rounded-full bg-[#ed4245] hover:bg-[#c03537] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/25"
                  title="رد تماس"
                >
                  <svg className="w-7 h-7 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </button>
                <span className="text-[#b5bac1] text-xs font-medium">رد کردن</span>
              </div>

              {/* Answer audio */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => onAnswer('audio')}
                  className="w-16 h-16 rounded-full bg-[#23a559] hover:bg-[#1a7a43] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-green-500/25"
                  title="پاسخ با صدا"
                >
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </button>
                <span className="text-[#b5bac1] text-xs font-medium">پاسخ صوتی</span>
              </div>

              {/* Answer video */}
              {callType === 'video' && (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => onAnswer('video')}
                    className="w-16 h-16 rounded-full bg-[#5865f2] hover:bg-[#4752c4] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25"
                    title="پاسخ با تصویر"
                  >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <span className="text-[#b5bac1] text-xs font-medium">پاسخ تصویری</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== CONNECTED / CONNECTING STATE =====================
  if (isCalling && (callState === 'connected' || callState === 'connecting')) {
    // تشخیص اینکه آیا remoteStream ویدیو داره یا نه
    const remoteHasVideo = remoteStream && remoteStream.getVideoTracks().some((t) => t.kind === 'video' && t.readyState === 'live');

    // localStream همیشه ویدیو داره (کamera یا screen) - پس localVideo همیشه نشون داده بشه
    const localHasVideo = (localStream && localStream.getVideoTracks().length > 0) || isVideoOn || isScreenSharing;

    const showRemoteVideo = remoteHasVideo;
    const showLocalVideo = localHasVideo;


    return (
      <div className="fixed inset-0 bg-[#000000] z-50 flex flex-col animate-fade-in">
        {/* Main Call Area */}
        <div className="flex-1 flex relative overflow-hidden">
          {/* Remote Video / Avatar */}
          <div className="flex-1 flex items-center justify-center relative bg-[#313338]">
            {showRemoteVideo ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ objectFit: 'contain' }}
                />
                {/* Name badge over video */}
                <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-lg text-[#f2f3f5] text-sm font-semibold flex items-center gap-2">
                  {remoteUser?.username}
                  {hasRemoteAudio(remoteStream) && (
                    <span className="w-2 h-2 rounded-full bg-[#23a559]" />
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-6 text-center">
                {/* Avatar with speaking ring (Discord style) */}
                <div className="relative">
                  <div
                    className={`w-36 h-36 rounded-full ${getColorFromName(remoteUser?.username)} flex items-center justify-center text-6xl font-bold text-white shadow-2xl transition-all duration-200`}
                    style={{
                      boxShadow: hasRemoteAudio(remoteStream)
                        ? '0 0 0 4px #23a559, 0 0 30px rgba(35,165,89,0.35)'
                        : '0 0 0 4px rgba(255,255,255,0.06)',
                    }}
                  >
                    {getInitials(remoteUser?.username)}
                  </div>
                </div>
                <div>
                  <p className="text-[#f2f3f5] text-2xl font-bold">{remoteUser?.username}</p>
                  <p className="text-[#b5bac1] text-sm mt-1 flex items-center justify-center gap-2">
                    {callState === 'connecting' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#f0b232] animate-pulse" />
                        در حال اتصال...
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#23a559]" />
                        متصل
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Local Video - PiP */}
            {showLocalVideo && (
              <div className="absolute top-5 right-5 w-52 aspect-video bg-[#1e1f22] rounded-xl overflow-hidden border border-white/10 shadow-2xl z-10 transition-all hover:scale-105 hover:z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {isMuted && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#ed4245]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v-2m0 0l-5-5m5 5l5-5" />
                    </svg>
                  </div>
                )}
                <div className="absolute bottom-1.5 left-2 text-[10px] font-medium text-white/70 bg-black/40 px-1.5 py-0.5 rounded">
                  شما
                </div>
              </div>
            )}

            {/* Call Duration */}
            {callState === 'connected' && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[#f2f3f5] font-mono text-xs font-semibold shadow-lg border border-white/5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ed4245] animate-pulse" />
                {formatDuration(callDuration)}
              </div>
            )}

            {/* Participants Toggle */}
            {participants.length > 0 && (
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className={`absolute top-5 left-5 backdrop-blur-md p-2.5 rounded-xl transition-all ${showParticipants
                  ? 'bg-[#5865f2] text-white'
                  : 'bg-black/60 text-[#b5bac1] hover:text-white hover:bg-black/80'
                  }`}
                aria-label="مشارکت‌کنندگان"
              >
                <div className="relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ed4245] text-white text-[10px] font-bold flex items-center justify-center">
                    {participants.length}
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Participants Panel — Discord sidebar style */}
          {showParticipants && (
            <div className="w-72 bg-[#1e1f22] border-l border-black/40 flex flex-col animate-slide-in-right">
              <div className="px-4 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
                <h3 className="text-[#f2f3f5] text-sm font-bold uppercase tracking-wide">
                  در تماس —  {participants.length}
                </h3>
                <button
                  onClick={() => setShowParticipants(false)}
                  className="p-1 text-[#b5bac1] hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {/* Me */}
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#383a40]/50 transition-colors group">
                  <div className="relative">
                    <div className={`w-9 h-9 rounded-full ${getColorFromName(user?.username)} flex items-center justify-center text-sm font-bold text-white`}>
                      {getInitials(user?.username)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#23a559] border-[3px] border-[#1e1f22]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f2f3f5] text-sm font-medium truncate">{user?.username} <span className="text-[#b5bac1] text-xs">(شما)</span></p>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                    {isMuted && (
                      <svg className="w-4 h-4 text-[#ed4245]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    )}
                    {isDeafened && (
                      <svg className="w-4 h-4 text-[#f0b232]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                    {isVideoOn && (
                      <svg className="w-4 h-4 text-[#23a559]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Others */}
                {participants
                  .filter((p) => !p.isLocal)
                  .map((p) => (
                    <div key={p.id}
                      className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#383a40]/50 transition-colors group ${p.speaking ? 'bg-[#383a40]/70' : ''
                        }`}
                    >
                      <div className="relative">
                        <div
                          className={`w-9 h-9 rounded-full ${getColorFromName(p.username)} flex items-center justify-center text-sm font-bold text-white transition-all ${p.speaking ? 'speaking' : ''
                            }`}
                          style={p.speaking ? { boxShadow: '0 0 0 2px #23a559' } : undefined}
                        >
                          {getInitials(p.username)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#1e1f22] ${p.speaking ? 'speaking-dot bg-[#23a559]' : 'bg-[#80848e]'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#f2f3f5] text-sm font-medium truncate">{p.username}</p>
                        {p.speaking && <p className="text-[#23a559] text-[11px] font-medium">در حال صحبت...</p>}
                      </div>
                      <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        {p.muted && (
                          <svg className="w-4 h-4 text-[#ed4245]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        )}
                        {p.video && (
                          <svg className="w-4 h-4 text-[#23a559]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar — Discord style pill */}
        <div className="h-24 flex items-center justify-center gap-2.5 px-4 pb-5">
          <div className="flex items-center gap-2.5 bg-[#1e1f22]/90 backdrop-blur-xl px-4 py-2.5 rounded-full border border-white/[0.04] shadow-2xl">

            <ControlButton
              active={isMuted}
              activeBg="bg-[#ed4245]"
              activeShadow="shadow-red-500/25"
              onClick={onToggleMute}
              title={isMuted ? 'روشن کردن میکروفون' : 'قطع میکروفون'}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v-2m0 0l-5-5m5 5l5-5" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7H5v-3a7 7 0 1114 0v3z" />
                </svg>
              )}
            </ControlButton>

            <ControlButton
              active={isDeafened}
              activeBg="bg-[#f0b232]"
              activeShadow="shadow-yellow-500/25"
              onClick={onToggleDeafen}
              title={isDeafened ? 'وصل کردن صدا' : 'قطع صدا'}
            >
              {isDeafened ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </ControlButton>

            <ControlButton
              active={isVideoOn}
              activeBg="bg-[#5865f2]"
              activeShadow="shadow-indigo-500/25"
              onClick={onToggleVideo}
              title={isVideoOn ? 'خاموش کردن دوربین' : 'روشن کردن دوربین'}
            >
              {isVideoOn ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a24.255 24.255 0 00-5.714 0" />
                </svg>
              )}
            </ControlButton>

            <ControlButton
              active={isScreenSharing}
              activeBg="bg-[#5865f2]"
              activeShadow="shadow-indigo-500/25"
              onClick={onToggleScreenShare}
              title={isScreenSharing ? 'توقف اشتراک صفحه' : 'اشتراک صفحه'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </ControlButton>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10 mx-1" />

            {/* End Call */}
            <button
              onClick={onEnd}
              title="قطع تماس"
              className="w-14 h-14 rounded-full bg-[#ed4245] hover:bg-[#c03537] text-white flex items-center justify-center transition-all duration-150 active:scale-90 shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
            >
              <svg className="w-6 h-6 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ENDED STATE
  if (callState === 'ended') {
    return null;
  }

  return null;
}