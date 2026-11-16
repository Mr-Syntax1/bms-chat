import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ably,
  subscribeToWebRTC,
  unsubscribeFromWebRTC,
  getWebRTCChannelName,
  bindEvent,
  unbindEvent,
  publishEvent,
  subscribeToNotifications,
  getNotificationChannelName,
} from '../lib/ably';
import { apiRequest } from './useChat';

/*
 * ===========================================================================
 * معماری سیگنالینگ (Ably)
 * ===========================================================================
 * ۱) دعوت: caller ──POST /api/calls/signal──► سرور ──'incoming-call'──► private:notifications-<callee>
 * ۲) بقیه روی کانال private:webrtc-<a>-<b> با publish event:
 *      call-accepted / call-offer / call-answer / ice-candidates / call-end / call-reject
 *      call-media-state (بی‌صدا، دوربین، اشتراک صفحه)   call-stream-updated
 *      signal-chunk (تکه‌های پیام‌های بزرگ؛ مثل SDP تماس تصویری)
 *
 * نکات مهم:
 *  - پیام‌های بزرگ (SDP تصویری) تکه‌تکه می‌شوند تا از سقف اندازه‌ی پیام رد نشوند
 *  - remote stream از روی receiver ها ساخته می‌شود
 *  - renegotiation به‌صورت perfect negotiation است
 * ===========================================================================
 */

const ABORTED = 'CALL_ABORTED';
const ICE_FLUSH_DELAY = 150; // ms
const DISCONNECT_GRACE = 10000; // ms
const SUBSCRIBE_TIMEOUT = 10000; // ms

// سقف اندازه‌ی پیام معمولاً ~10KB است؛ بالاتر از این مقدار تکه‌تکه می‌فرستیم
const MAX_INLINE_BYTES = 6000;
const CHUNK_CHARS = 5000;
const CHUNK_TTL = 15000; // ms
const MAX_CHUNK_BUFFERS = 8;
const CHUNKABLE = {
  'call-offer': 'onOffer',
  'call-answer': 'onAnswer',
  'ice-candidates': 'onIceCandidates',
};

// روی TURN (relay) پهنای باند محدود است
const BITRATE = { camera: 1_500_000, screen: 2_500_000 };

const VIDEO_CONSTRAINTS = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } };

const encoder = new TextEncoder();

export const END_REASON_TEXT = {
  'local-ended': 'تماس پایان یافت',
  'remote-ended': 'طرف مقابل تماس را پایان داد',
  rejected: 'تماس رد شد',
  busy: 'کاربر در تماس دیگری است',
  'no-answer': 'پاسخی داده نشد',
  cancelled: 'تماس لغو شد',
  missed: 'تماس بی‌پاسخ',
  'rejected-local': 'تماس را رد کردید',
  'connection-lost': 'ارتباط قطع شد',
  'connection-failed': 'برقراری ارتباط ناموفق بود',
  error: 'خطا در تماس',
  unmounted: 'تماس پایان یافت',
};

// ---------------------------------------------------------------------------
// توابع کمکی
// ---------------------------------------------------------------------------
async function setVideoSenderParameters(sender, profile = 'camera') {
  if (!sender?.track || sender.track.kind !== 'video') return;
  try {
    if ('contentHint' in sender.track) {
      sender.track.contentHint = profile === 'screen' ? 'detail' : 'motion';
    }
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
    params.encodings[0].maxBitrate = BITRATE[profile];
    if (profile === 'screen') params.encodings[0].maxFramerate = 15;
    else delete params.encodings[0].maxFramerate;
    params.degradationPreference = profile === 'screen' ? 'maintain-resolution' : 'balanced';
    await sender.setParameters(params);
  } catch (err) {
    console.debug('[WebRTC] setParameters skipped:', err?.message);
  }
}

function buildIceServers(custom) {
  if (Array.isArray(custom) && custom.length) return custom;

  const servers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: 'stun:stun.relay.metered.ca:80' },
  ];

  const user = import.meta.env.VITE_METERED_USERNAME;
  const credential = import.meta.env.VITE_METERED_CREDENTIAL;

  if (user && credential) {
    servers.push(
      { urls: 'turn:global.relay.metered.ca:80', username: user, credential },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: user, credential },
      { urls: 'turn:global.relay.metered.ca:443', username: user, credential },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: user, credential }
    );
  }

  const turnUrl = import.meta.env.VITE_TURN_URL;
  if (turnUrl && import.meta.env.VITE_TURN_USERNAME && import.meta.env.VITE_TURN_CREDENTIAL) {
    servers.push({
      urls: turnUrl.split(',').map((u) => u.trim()),
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }
  return servers;
}

const newCallId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function stopStream(stream) {
  stream?.getTracks().forEach((t) => {
    try {
      t.onended = null;
      t.stop();
    } catch {
      /* ignore */
    }
  });
}

async function getMedia(type) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('مرورگر شما از تماس پشتیبانی نمی‌کند (نیازمند HTTPS است)');
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: type === 'video' ? { ...VIDEO_CONSTRAINTS, facingMode: 'user' } : false,
  });
}

function errorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'دسترسی به میکروفون/دوربین مجاز نیست';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'میکروفون یا دوربین پیدا نشد';
    case 'NotReadableError':
      return 'میکروفون یا دوربین توسط برنامه‌ی دیگری استفاده می‌شود';
    default:
      return err?.message || 'خطای ناشناخته در تماس';
  }
}

// بررسی اتصال کانال در Ably
function waitForSubscription(channelName, timeout = SUBSCRIBE_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const channel = ably.channels.get(channelName);
    if (channel.state === 'attached') return resolve(channel);

    let timer;
    const done = (fn, arg) => {
      clearTimeout(timer);
      channel.off('attached', onOk);
      channel.off('failed', onErr);
      fn(arg);
    };
    const onOk = () => done(resolve, channel);
    const onErr = (err) => done(reject, new Error(`دسترسی به کانال تماس رد شد: ${err?.message}`));

    channel.on('attached', onOk);
    channel.on('failed', onErr);
    timer = setTimeout(() => done(reject, new Error('اتصال به کانال تماس زمان‌بر شد')), timeout);
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useWebRTC({ currentUser, connected = true, iceServers, ringTimeout = 35000 } = {}) {
  const [callState, setCallStateRaw] = useState('idle');
  const [callType, setCallType] = useState(null); // 'audio' | 'video' | 'screen'
  const [peer, setPeer] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteStreamVersion, setRemoteStreamVersion] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOnState] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [endReason, setEndReason] = useState(null);

  const stateRef = useRef('idle');
  const isDeafenedRef = useRef(false);
  const remoteScreenSharingRef = useRef(false);
  const callRef = useRef(null); // { id, peerId, peerName, type, role, channelName, bound }
  const pcRef = useRef(null);

  const localStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenVideoSenderRef = useRef(null);
  const isScreenSharingDuringCallRef = useRef(false);
  const isVideoOnRef = useRef(false);

  const remoteStreamRef = useRef(null);
  const remoteSigRef = useRef('');

  const negotiationRef = useRef({ makingOffer: false, pending: false });
  const restartTriedRef = useRef(false);
  const pendingRemoteCandidatesRef = useRef([]);
  const outboundCandidatesRef = useRef([]);
  const chunkBuffersRef = useRef(new Map());

  const iceFlushTimerRef = useRef(null);
  const ringTimerRef = useRef(null);
  const disconnectTimerRef = useRef(null);

  const userRef = useRef(currentUser);
  const iceServersRef = useRef(iceServers);
  const actionsRef = useRef({});

  useEffect(() => {
    userRef.current = currentUser;
    iceServersRef.current = iceServers;
  }, [currentUser, iceServers]);

  // -------------------------------------------------------------------------
  // کمک‌ها
  // -------------------------------------------------------------------------
  function setState(next) {
    stateRef.current = next;
    setCallStateRaw(next);
  }

  function setVideoOn(value) {
    isVideoOnRef.current = value;
    setIsVideoOnState(value);
  }

  function assertActive(callId) {
    if (callRef.current?.id !== callId) throw new Error(ABORTED);
  }

  function clearTimers() {
    clearTimeout(ringTimerRef.current);
    clearTimeout(iceFlushTimerRef.current);
    clearTimeout(disconnectTimerRef.current);
    ringTimerRef.current = null;
    iceFlushTimerRef.current = null;
    disconnectTimerRef.current = null;
  }

  function clearChunkBuffers() {
    for (const buf of chunkBuffersRef.current.values()) clearTimeout(buf.timer);
    chunkBuffersRef.current.clear();
  }

  function sendSignal(event, data = {}) {
    const call = callRef.current;
    if (!call) return false;

    const payload = { callId: call.id, from: userRef.current?.id, ...data };
    const json = JSON.stringify(payload);
    const bytes = encoder.encode(json).length;

    if (import.meta.env.DEV) console.debug(`[WebRTC] signal ${event} (${bytes} bytes)`);

    if (bytes <= MAX_INLINE_BYTES) {
      publishEvent(call.channelName, event, payload).catch(err => {
        console.warn(`[WebRTC] signal "${event}" failed:`, err);
      });
      return true;
    }

    const msgId = newCallId().slice(0, 8);
    const total = Math.ceil(json.length / CHUNK_CHARS);
    for (let index = 0; index < total; index += 1) {
      publishEvent(call.channelName, 'signal-chunk', {
        callId: call.id,
        from: userRef.current?.id,
        msgId,
        event,
        index,
        total,
        part: json.slice(index * CHUNK_CHARS, (index + 1) * CHUNK_CHARS),
      }).catch(err => console.warn('[WebRTC] chunk publish failed:', err));
    }
    return true;
  }

  function flushIce() {
    clearTimeout(iceFlushTimerRef.current);
    iceFlushTimerRef.current = null;
    const batch = outboundCandidatesRef.current.splice(0);
    if (batch.length) sendSignal('ice-candidates', { candidates: batch });
  }

  function sendMediaState() {
    const audio = cameraStreamRef.current?.getAudioTracks()[0];
    sendSignal('call-media-state', {
      muted: audio ? !audio.enabled : false,
      video: isVideoOnRef.current,
      screenSharing: isScreenSharingDuringCallRef.current,
    });
  }

  function updateLocalParticipant(patch) {
    setParticipants((prev) => prev.map((p) => (p.isLocal ? { ...p, ...patch } : p)));
  }

  function beginCall({ id, peerId, peerName, type, role }) {
    const me = userRef.current;
    const channelName = getWebRTCChannelName(me.id, peerId);
    callRef.current = { id, peerId: String(peerId), peerName, type, role, channelName, bound: [] };

    pendingRemoteCandidatesRef.current = [];
    outboundCandidatesRef.current = [];
    negotiationRef.current = { makingOffer: false, pending: false };
    restartTriedRef.current = false;
    remoteStreamRef.current = null;
    remoteSigRef.current = '';
    clearChunkBuffers();

    isScreenSharingDuringCallRef.current = false;
    isDeafenedRef.current = false;
    remoteScreenSharingRef.current = false;

    setPeer({ id: String(peerId), username: peerName });
    setCallType(type);
    setError(null);
    setEndReason(null);
    setIsMuted(false);
    setVideoOn(false);
    setIsScreenSharing(false);
    setIsDeafened(false);
    setRemoteScreenSharing(false);
    setDuration(0);
    setRemoteStream(null);

    setParticipants([
      { id: me.id, username: me.username, isLocal: true, muted: false, video: type === 'video', screenSharing: false, speaking: false },
      { id: peerId, username: peerName, isLocal: false, muted: false, video: false, screenSharing: false, speaking: false },
    ]);
  }

  async function prepareLocalMedia(callId, type) {
    const stream = await getMedia(type);
    if (callRef.current?.id !== callId) {
      stopStream(stream);
      throw new Error(ABORTED);
    }
    localStreamRef.current = stream;
    cameraStreamRef.current = stream;
    setLocalStream(stream);
    setVideoOn(stream.getVideoTracks().length > 0);
  }

  async function openChannel(callId) {
    const call = callRef.current;
    const me = userRef.current;
    subscribeToWebRTC(me.id, call.peerId);

    const on = (event, handlerName) => {
      const fn = (message) => actionsRef.current[handlerName]?.(message.data); // Ably message.data
      bindEvent(call.channelName, event, fn);
      call.bound.push([event, fn]);
    };
    on('call-accepted', 'onAccepted');
    on('call-offer', 'onOffer');
    on('call-answer', 'onAnswer');
    on('ice-candidates', 'onIceCandidates');
    on('signal-chunk', 'onSignalChunk');
    on('call-reject', 'onReject');
    on('call-end', 'onRemoteEnd');
    on('call-media-state', 'onMediaState');
    on('call-stream-updated', 'onStreamUpdated');

    await waitForSubscription(call.channelName);
    assertActive(callId);
  }

  function syncRemoteStream(tracks) {
    const live = tracks.filter((t) => t && t.readyState !== 'ended');
    const audio = live.filter((t) => t.kind === 'audio');
    const video = live.filter((t) => t.kind === 'video');

    let activeVideo = null;
    if (video.length > 0) {
      if (isScreenSharingDuringCallRef.current) {
        activeVideo = video[0];
      } else if (remoteScreenSharingRef.current) {
        activeVideo = video[video.length - 1];
      } else {
        activeVideo = video[0];
      }
    }

    audio.forEach((t) => {
      t.enabled = !isDeafenedRef.current;
    });

    const picked = activeVideo ? [...audio, activeVideo] : audio;
    const signature = picked.map((t) => `${t.id}:${t.muted ? 'm' : 'u'}`).join('|');

    if (remoteStreamRef.current && signature === remoteSigRef.current) return;
    if (!picked.length) return;

    remoteSigRef.current = signature;
    const stream = new MediaStream(picked);
    remoteStreamRef.current = stream;
    setRemoteStream(stream);
    setRemoteStreamVersion((v) => v + 1);
  }

  function syncFromPeer() {
    const pc = pcRef.current;
    if (!pc) return;
    syncRemoteStream(pc.getReceivers().map((r) => r.track));
  }

  function attachTrackHandlers() {
    const pc = pcRef.current;
    if (!pc) return;
    pc.getReceivers().forEach((receiver) => {
      const track = receiver.track;
      if (!track || track._callHandlersAttached) return;
      track._callHandlersAttached = true;
      track.onunmute = () => syncFromPeer();
      track.onmute = () => syncFromPeer();
      track.onended = () => setTimeout(syncFromPeer, 100);
    });
  }

  function resyncSoon() {
    attachTrackHandlers();
    syncFromPeer();
    setTimeout(() => {
      if (pcRef.current) {
        attachTrackHandlers();
        syncFromPeer();
      }
    }, 400);
  }

  function applyVideoParams() {
    const pc = pcRef.current;
    if (!pc) return;
    const profile = isScreenSharingDuringCallRef.current ? 'screen' : 'camera';
    pc.getSenders().forEach((s) => {
      if (s.track?.kind === 'video') setVideoSenderParameters(s, profile);
    });
  }

  async function attachVideoTrack(pc, track, stream) {
    const reusable = pc
      .getTransceivers()
      .find((t) => t.receiver?.track?.kind === 'video' && t.currentDirection !== 'stopped' && !t.sender.track);
    if (reusable) {
      await reusable.sender.replaceTrack(track);
      reusable.direction = 'sendrecv';
      return reusable.sender;
    }
    return pc.addTrack(track, stream);
  }

  function createPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: buildIceServers(iceServersRef.current),
      bundlePolicy: 'max-bundle',
    });
    pcRef.current = pc;

    const local = localStreamRef.current;
    local?.getTracks().forEach((track) => pc.addTrack(track, local));

    pc.ontrack = (event) => {
      if (pcRef.current !== pc) return;
      if (event.track.kind === 'audio') event.track.enabled = !isDeafenedRef.current;
      attachTrackHandlers();
      syncFromPeer();
    };

    pc.onicecandidate = (event) => {
      if (pcRef.current !== pc) return;
      if (event.candidate) {
        outboundCandidatesRef.current.push(event.candidate.toJSON());
        if (!iceFlushTimerRef.current) iceFlushTimerRef.current = setTimeout(flushIce, ICE_FLUSH_DELAY);
      } else {
        flushIce();
      }
    };

    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      const s = pc.connectionState;

      if (s === 'connected') {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
        restartTriedRef.current = false;
        if (stateRef.current !== 'connected') setState('connected');
      } else if (s === 'disconnected') {
        if (!disconnectTimerRef.current) {
          disconnectTimerRef.current = setTimeout(
            () => actionsRef.current.endCall('connection-lost'),
            DISCONNECT_GRACE
          );
        }
      } else if (s === 'failed') {
        const role = callRef.current?.role;
        if (role === 'caller' && !restartTriedRef.current) {
          restartTriedRef.current = true;
          actionsRef.current.renegotiate?.({ iceRestart: true });
        }
        if (!disconnectTimerRef.current) {
          disconnectTimerRef.current = setTimeout(() => {
            setError('برقراری ارتباط ناموفق بود (ممکن است به TURN نیاز باشد)');
            actionsRef.current.endCall('connection-failed');
          }, role === 'caller' && restartTriedRef.current ? DISCONNECT_GRACE : 4000);
        }
      }
    };

    return pc;
  }

  async function flushPendingRemoteCandidates() {
    const pc = pcRef.current;
    if (!pc) return;
    const list = pendingRemoteCandidatesRef.current.splice(0);
    for (const c of list) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* ignore */
      }
    }
  }

  function cleanup(reason) {
    const call = callRef.current;
    clearTimers();
    clearChunkBuffers();
    outboundCandidatesRef.current = [];
    pendingRemoteCandidatesRef.current = [];
    negotiationRef.current = { makingOffer: false, pending: false };

    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      try { pc.close(); } catch { /* ignore */ }
    }

    stopStream(screenStreamRef.current);
    stopStream(cameraStreamRef.current);
    stopStream(localStreamRef.current);
    screenStreamRef.current = null;
    cameraStreamRef.current = null;
    localStreamRef.current = null;
    screenVideoSenderRef.current = null;
    isScreenSharingDuringCallRef.current = false;
    isDeafenedRef.current = false;
    remoteScreenSharingRef.current = false;
    remoteStreamRef.current = null;
    remoteSigRef.current = '';

    if (call) {
      for (const [event, fn] of call.bound) {
        unbindEvent(call.channelName, event, fn);
      }
      const me = userRef.current;
      if (me?.id) {
        try {
          unsubscribeFromWebRTC(me.id, call.peerId);
        } catch (err) {
          console.warn('[WebRTC] unsubscribe error:', err);
        }
      }
    }
    callRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setPeer(null);
    setCallType(null);
    setDuration(0);
    setIsMuted(false);
    setVideoOn(false);
    setIsScreenSharing(false);
    setIsDeafened(false);
    setRemoteScreenSharing(false);
    setParticipants([]);
    setEndReason(reason);
    setState('idle');
  }

  function failCall(callId, err) {
    if (err?.message === ABORTED) return { success: false, aborted: true };
    console.error('[WebRTC] call failed:', err);
    const msg = errorMessage(err);
    if (callRef.current?.id === callId) {
      setError(msg);
      cleanup('error');
    }
    return { success: false, error: msg };
  }

  async function sendOneShot(peerId, callId, event, data = {}) {
    const me = userRef.current;
    if (!me?.id) return;
    try {
      const name = getWebRTCChannelName(me.id, peerId);
      subscribeToWebRTC(me.id, peerId);
      await waitForSubscription(name, 8000);
      await publishEvent(name, event, { callId, from: me.id, ...data });
    } catch (err) {
      console.warn('[WebRTC] one-shot signal failed:', err);
    } finally {
      setTimeout(() => {
        if (callRef.current?.peerId !== String(peerId)) {
          try {
            unsubscribeFromWebRTC(me.id, peerId);
          } catch {
            /* ignore */
          }
        }
      }, 1000);
    }
  }

  async function createAndSendOffer({ renegotiate: isRenegotiation, iceRestart = false } = {}) {
    const pc = pcRef.current;
    const call = callRef.current;
    if (!pc || !call) return;
    const neg = negotiationRef.current;

    neg.makingOffer = true;
    try {
      if (iceRestart) pc.restartIce();
      await pc.setLocalDescription();
      assertActive(call.id);
      const { type, sdp } = pc.localDescription;
      sendSignal('call-offer', { sdp: { type, sdp }, renegotiate: Boolean(isRenegotiation) });
    } finally {
      neg.makingOffer = false;
    }
  }

  async function renegotiate(opts = {}) {
    const pc = pcRef.current;
    if (!pc || !callRef.current) return;
    const neg = negotiationRef.current;

    if (neg.makingOffer || pc.signalingState !== 'stable') {
      neg.pending = true;
      return;
    }
    neg.pending = false;

    try {
      await createAndSendOffer({ renegotiate: true, iceRestart: Boolean(opts.iceRestart) });
    } catch (err) {
      if (err?.message !== ABORTED) console.error('[WebRTC] renegotiation failed:', err);
    }
  }

  function runPendingRenegotiation() {
    const neg = negotiationRef.current;
    if (neg.pending) {
      neg.pending = false;
      setTimeout(() => actionsRef.current.renegotiate?.(), 0);
    }
  }

  // -------------------------------------------------------------------------
  // اقدام‌های کاربر
  // -------------------------------------------------------------------------
  async function startCall(targetUserId, targetUsername, type = 'audio') {
    const me = userRef.current;
    console.debug('[WebRTC] startCall', { me: me?.id, targetUserId, type, state: stateRef.current });

    if (!me?.id) return { success: false, error: 'کاربر مشخص نیست' };
    if (targetUserId == null || targetUserId === '') return { success: false, error: 'کاربر مقصد مشخص نیست' };
    if (stateRef.current !== 'idle') return { success: false, error: 'در حال حاضر یک تماس فعال دارید' };
    if (String(targetUserId) === String(me.id)) return { success: false, error: 'نمی‌توانید با خودتان تماس بگیرید' };
    if (type !== 'audio' && type !== 'video') type = 'audio';

    const callId = newCallId();
    try {
      beginCall({ id: callId, peerId: targetUserId, peerName: targetUsername, type, role: 'caller' });
      setState('calling');

      await prepareLocalMedia(callId, type);
      await openChannel(callId);

      await apiRequest('/api/calls/signal', {
        method: 'POST',
        body: JSON.stringify({ type: 'invite', targetUserId, callId, callType: type }),
      });
      assertActive(callId);

      ringTimerRef.current = setTimeout(() => actionsRef.current.endCall('no-answer'), ringTimeout);
      return { success: true, callId };
    } catch (err) {
      return failCall(callId, err);
    }
  }

  async function acceptCall(mediaType) {
    const call = callRef.current;
    if (!call || stateRef.current !== 'incoming') {
      return { success: false, error: 'تماس ورودی وجود ندارد' };
    }

    const effectiveType = mediaType === 'audio' ? 'audio' : call.type;
    if (effectiveType !== call.type) {
      callRef.current.type = effectiveType;
      setCallType(effectiveType);
    }

    clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
    setState('connecting');

    try {
      await prepareLocalMedia(call.id, effectiveType);
      await openChannel(call.id);
      createPeerConnection();
      sendSignal('call-accepted');
      return { success: true };
    } catch (err) {
      const result = failCall(call.id, err);
      if (!result.aborted) sendOneShot(call.peerId, call.id, 'call-end', { reason: 'error' });
      return result;
    }
  }

  function rejectCall() {
    const call = callRef.current;
    if (!call || stateRef.current !== 'incoming') return;
    const { peerId, id } = call;
    cleanup('rejected-local');
    sendOneShot(peerId, id, 'call-reject', { reason: 'rejected' });
  }

  function endCall(reason = 'local-ended') {
    const call = callRef.current;
    if (!call) return;

    if (call.role === 'caller' && stateRef.current === 'calling') {
      apiRequest('/api/calls/signal', {
        method: 'POST',
        body: JSON.stringify({ type: 'cancel', targetUserId: call.peerId, callId: call.id }),
      }).catch(() => { });
    }
    if (stateRef.current !== 'incoming') sendSignal('call-end', { reason });

    cleanup(reason);
  }

  function toggleMute() {
    const tracks = cameraStreamRef.current?.getAudioTracks() ?? [];
    if (!tracks.length) return;
    const wasEnabled = tracks.some((t) => t.enabled);
    tracks.forEach((t) => {
      t.enabled = !wasEnabled;
    });
    setIsMuted(wasEnabled);
    updateLocalParticipant({ muted: wasEnabled });
    sendMediaState();
  }

  function toggleDeafen() {
    const next = !isDeafenedRef.current;
    isDeafenedRef.current = next;
    setIsDeafened(next);
    remoteStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
  }

  async function toggleVideo() {
    const pc = pcRef.current;
    if (!pc || !cameraStreamRef.current) return;
    if (isScreenSharingDuringCallRef.current) {
      console.warn('[WebRTC] Cannot toggle camera while screen sharing');
      return;
    }

    if (!isVideoOnRef.current) {
      let camStream;
      try {
        camStream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS, audio: false });
      } catch (err) {
        console.error('[WebRTC] Cannot access camera:', err);
        setError(errorMessage(err));
        return;
      }
      const track = camStream.getVideoTracks()[0];
      if (pcRef.current !== pc) {
        track.stop();
        return;
      }

      const combined = new MediaStream([...cameraStreamRef.current.getAudioTracks(), track]);
      cameraStreamRef.current = combined;
      localStreamRef.current = combined;
      setLocalStream(combined);

      const liveSender = pc.getSenders().find((s) => s.track?.kind === 'video' && s.track.readyState === 'live');
      let needsRenegotiation = false;
      if (liveSender) {
        await liveSender.replaceTrack(track);
        await setVideoSenderParameters(liveSender, 'camera');
      } else {
        const sender = await attachVideoTrack(pc, track, combined);
        await setVideoSenderParameters(sender, 'camera');
        needsRenegotiation = true;
      }

      setVideoOn(true);
      setCallType('video');
      updateLocalParticipant({ video: true });

      if (needsRenegotiation) await renegotiate();
      else sendSignal('call-stream-updated');
      sendMediaState();
    } else {
      const track = cameraStreamRef.current.getVideoTracks()[0];
      if (!track) {
        setVideoOn(false);
        return;
      }
      const sender = pc.getSenders().find((s) => s.track === track);
      if (sender) pc.removeTrack(sender);
      track.stop();

      const next = new MediaStream(cameraStreamRef.current.getAudioTracks());
      cameraStreamRef.current = next;
      localStreamRef.current = next;
      setLocalStream(next);

      setVideoOn(false);
      setCallType('audio');
      updateLocalParticipant({ video: false });

      await renegotiate();
      sendMediaState();
    }
  }

  async function stopScreenShareInternal() {
    isScreenSharingDuringCallRef.current = false;
    stopStream(screenStreamRef.current);
    screenStreamRef.current = null;

    const pc = pcRef.current;
    let needsRenegotiation = false;

    if (pc && screenVideoSenderRef.current) {
      const sender = screenVideoSenderRef.current;
      const camTrack = cameraStreamRef.current?.getVideoTracks()[0];
      if (camTrack && isVideoOnRef.current && camTrack.readyState === 'live') {
        await sender.replaceTrack(camTrack);
        await setVideoSenderParameters(sender, 'camera');
      } else {
        try {
          pc.removeTrack(sender);
        } catch {
          /* ignore */
        }
        needsRenegotiation = true;
      }
      screenVideoSenderRef.current = null;
    }

    if (cameraStreamRef.current) {
      localStreamRef.current = cameraStreamRef.current;
      setLocalStream(cameraStreamRef.current);
    }
    setIsScreenSharing(false);
    setCallType(isVideoOnRef.current ? 'video' : 'audio');
    updateLocalParticipant({ screenSharing: false, video: isVideoOnRef.current });

    if (needsRenegotiation) await renegotiate();
    else sendSignal('call-stream-updated');
    sendMediaState();
  }

  async function toggleScreenShare() {
    if (isScreenSharingDuringCallRef.current) {
      await stopScreenShareInternal();
      return;
    }

    const pc = pcRef.current;
    if (!pc) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('مرورگر شما از اشتراک صفحه پشتیبانی نمی‌کند');
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', frameRate: { ideal: 15, max: 30 } },
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack || pcRef.current !== pc) {
        stopStream(screenStream);
        return;
      }
      screenStreamRef.current = screenStream;

      let needsRenegotiation = false;
      const liveSender = pc.getSenders().find((s) => s.track?.kind === 'video' && s.track.readyState === 'live');
      if (liveSender) {
        await liveSender.replaceTrack(screenTrack);
        screenVideoSenderRef.current = liveSender;
      } else {
        screenVideoSenderRef.current = await attachVideoTrack(pc, screenTrack, screenStream);
        needsRenegotiation = true;
      }

      isScreenSharingDuringCallRef.current = true;
      await setVideoSenderParameters(screenVideoSenderRef.current, 'screen');

      const micTrack = cameraStreamRef.current?.getAudioTracks()[0];
      const preview = new MediaStream(micTrack ? [screenTrack, micTrack] : [screenTrack]);
      localStreamRef.current = preview;
      setLocalStream(preview);

      setIsScreenSharing(true);
      setCallType('screen');
      updateLocalParticipant({ screenSharing: true, video: true });

      if (needsRenegotiation) await renegotiate();
      else sendSignal('call-stream-updated');
      sendMediaState();

      screenTrack.onended = async () => {
        if (isScreenSharingDuringCallRef.current) await stopScreenShareInternal();
      };
    } catch (err) {
      if (err?.name !== 'NotAllowedError') console.error('[WebRTC] Cannot share screen:', err);
      isScreenSharingDuringCallRef.current = false;
      stopStream(screenStreamRef.current);
      screenStreamRef.current = null;
    }
  }

  // -------------------------------------------------------------------------
  // رویدادهای ورودی: اعلان‌های سرور
  // -------------------------------------------------------------------------
  function onIncoming(data) {
    const me = userRef.current;
    if (!me?.id || !data) return;
    const { callId, callerId, callerName, callType: type } = data;
    if (typeof callId !== 'string' || callerId == null) return;
    if (String(callerId) === String(me.id)) return;

    if (stateRef.current !== 'idle') {
      sendOneShot(callerId, callId, 'call-reject', { reason: 'busy' });
      return;
    }

    try {
      beginCall({
        id: callId,
        peerId: callerId,
        peerName: callerName || 'Unknown',
        type: type === 'video' ? 'video' : 'audio',
        role: 'callee',
      });
    } catch (err) {
      console.warn('[WebRTC] incoming call error:', err);
      return;
    }

    setState('incoming');
    ringTimerRef.current = setTimeout(() => cleanup('missed'), ringTimeout);
  }

  function onCancelled(data) {
    const call = callRef.current;
    if (!call || data?.callId !== call.id) return;
    if (call.role === 'callee' && stateRef.current !== 'connected') cleanup('cancelled');
  }

  // -------------------------------------------------------------------------
  // رویدادهای ورودی: سیگنالینگ روی کانال تماس
  // -------------------------------------------------------------------------
  const isCurrent = (data) => Boolean(callRef.current) && data?.callId === callRef.current.id;

  async function onAccepted(data) {
    const call = callRef.current;
    if (!isCurrent(data) || call.role !== 'caller' || stateRef.current !== 'calling') return;

    clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
    setState('connecting');

    try {
      createPeerConnection();
      await createAndSendOffer({ renegotiate: false });
    } catch (err) {
      const r = failCall(call.id, err);
      if (!r.aborted) sendSignal('call-end', { reason: 'error' });
    }
  }

  async function onOffer(data) {
    const call = callRef.current;
    const pc = pcRef.current;
    if (!isCurrent(data) || !pc || !data.sdp) return;

    const neg = negotiationRef.current;
    const polite = call.role === 'callee';
    const collision = neg.makingOffer || pc.signalingState !== 'stable';

    if (collision && !polite) {
      console.debug('[WebRTC] glare: impolite side ignores remote offer');
      return;
    }

    try {
      if (collision && pc.signalingState === 'have-local-offer') {
        await pc.setLocalDescription({ type: 'rollback' });
        neg.pending = true;
      }

      await pc.setRemoteDescription(data.sdp);
      await flushPendingRemoteCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      assertActive(call.id);

      const { type, sdp } = pc.localDescription;
      sendSignal('call-answer', { sdp: { type, sdp } });

      resyncSoon();
      applyVideoParams();
      runPendingRenegotiation();
    } catch (err) {
      if (data.renegotiate) {
        console.error('[WebRTC] renegotiation answer failed:', err);
        return;
      }
      const r = failCall(call.id, err);
      if (!r.aborted) sendSignal('call-end', { reason: 'error' });
    }
  }

  async function onAnswer(data) {
    const call = callRef.current;
    const pc = pcRef.current;
    if (!isCurrent(data) || !pc || !data.sdp) return;
    if (pc.signalingState !== 'have-local-offer') return;

    try {
      await pc.setRemoteDescription(data.sdp);
      await flushPendingRemoteCandidates();
      resyncSoon();
      applyVideoParams();
      runPendingRenegotiation();
    } catch (err) {
      const r = failCall(call.id, err);
      if (!r.aborted) sendSignal('call-end', { reason: 'error' });
    }
  }

  async function onIceCandidates(data) {
    if (!isCurrent(data) || !Array.isArray(data.candidates)) return;
    const pc = pcRef.current;

    for (const candidate of data.candidates) {
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          /* ignore */
        }
      } else {
        pendingRemoteCandidatesRef.current.push(candidate);
      }
    }
  }

  function onSignalChunk(data) {
    if (!isCurrent(data)) return;
    const handlerName = CHUNKABLE[data.event];
    if (
      !handlerName ||
      typeof data.msgId !== 'string' ||
      typeof data.part !== 'string' ||
      !Number.isInteger(data.index) ||
      !Number.isInteger(data.total) ||
      data.total < 1 ||
      data.total > 20 ||
      data.index < 0 ||
      data.index >= data.total
    ) {
      return;
    }

    const buffers = chunkBuffersRef.current;
    let buf = buffers.get(data.msgId);
    if (!buf) {
      if (buffers.size >= MAX_CHUNK_BUFFERS) {
        const oldest = buffers.keys().next().value;
        clearTimeout(buffers.get(oldest)?.timer);
        buffers.delete(oldest);
      }
      buf = {
        parts: new Array(data.total),
        count: 0,
        total: data.total,
        timer: setTimeout(() => buffers.delete(data.msgId), CHUNK_TTL),
      };
      buffers.set(data.msgId, buf);
    }

    if (buf.parts[data.index] === undefined) {
      buf.parts[data.index] = data.part;
      buf.count += 1;
    }
    if (buf.count < buf.total) return;

    clearTimeout(buf.timer);
    buffers.delete(data.msgId);

    let payload;
    try {
      payload = JSON.parse(buf.parts.join(''));
    } catch {
      console.warn('[WebRTC] invalid chunked payload');
      return;
    }
    actionsRef.current[handlerName]?.(payload);
  }

  function onReject(data) {
    const call = callRef.current;
    if (!isCurrent(data) || call.role !== 'caller') return;
    cleanup(data.reason === 'busy' ? 'busy' : 'rejected');
  }

  function onRemoteEnd(data) {
    if (!isCurrent(data)) return;
    cleanup('remote-ended');
  }

  function onStreamUpdated(data) {
    if (!isCurrent(data)) return;
    resyncSoon();
  }

  function onMediaState(data) {
    if (!isCurrent(data)) return;
    const screen = Boolean(data.screenSharing);
    remoteScreenSharingRef.current = screen;
    setRemoteScreenSharing(screen);
    setParticipants((prev) =>
      prev.map((p) =>
        p.isLocal ? p : { ...p, muted: Boolean(data.muted), video: Boolean(data.video) || screen, screenSharing: screen }
      )
    );
    if (!screen) setTimeout(resyncSoon, 200);
  }

  useEffect(() => {
    actionsRef.current = {
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleDeafen,
      toggleVideo,
      toggleScreenShare,
      renegotiate,
      sendMediaState,
      onIncoming,
      onCancelled,
      onAccepted,
      onOffer,
      onAnswer,
      onIceCandidates,
      onSignalChunk,
      onReject,
      onRemoteEnd,
      onStreamUpdated,
      onMediaState,
    };
  });

  // -------------------------------------------------------------------------
  // Effect ها
  // -------------------------------------------------------------------------
  const userId = currentUser?.id;

  useEffect(() => {
    if (!connected || userId == null) return undefined;

    let channelName;
    try {
      subscribeToNotifications(userId);
      channelName = getNotificationChannelName(userId);
    } catch (err) {
      console.warn('[WebRTC] notifications subscribe error:', err);
      return undefined;
    }

    const handleIncoming = (message) => actionsRef.current.onIncoming?.(message.data);
    const handleCancelled = (message) => actionsRef.current.onCancelled?.(message.data);
    
    bindEvent(channelName, 'incoming-call', handleIncoming);
    bindEvent(channelName, 'call-cancelled', handleCancelled);

    return () => {
      unbindEvent(channelName, 'incoming-call', handleIncoming);
      unbindEvent(channelName, 'call-cancelled', handleCancelled);
    };
  }, [connected, userId]);

  useEffect(() => {
    if (callState === 'connected') actionsRef.current.sendMediaState?.();
  }, [callState]);

  useEffect(() => {
    if (callState !== 'connected') return undefined;
    const startedAt = Date.now();
    const id = setInterval(() => setDuration(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [callState]);

  useEffect(() => {
    if (userId == null) actionsRef.current.endCall?.('local-ended');
  }, [userId]);

  useEffect(() => {
    const onPageHide = () => actionsRef.current.endCall?.('local-ended');
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      actionsRef.current.endCall?.('unmounted');
    };
  }, []);

  // -------------------------------------------------------------------------
  // API پایدار
  // -------------------------------------------------------------------------
  const startCallStable = useCallback((...args) => actionsRef.current.startCall(...args), []);
  const acceptCallStable = useCallback((mediaType) => actionsRef.current.acceptCall(mediaType), []);
  const rejectCallStable = useCallback(() => actionsRef.current.rejectCall(), []);
  const endCallStable = useCallback(() => actionsRef.current.endCall('local-ended'), []);
  const toggleMuteStable = useCallback(() => actionsRef.current.toggleMute(), []);
  const toggleDeafenStable = useCallback(() => actionsRef.current.toggleDeafen(), []);
  const toggleVideoStable = useCallback(() => actionsRef.current.toggleVideo(), []);
  const toggleScreenShareStable = useCallback(() => actionsRef.current.toggleScreenShare(), []);

  return {
    callState,
    callType,
    peer,
    incomingCall:
      callState === 'incoming'
        ? { peer, callType, fromUserId: peer?.id, fromUsername: peer?.username }
        : null,
    localStream,
    remoteStream,
    remoteStreamVersion,
    isMuted,
    isCameraOff: !isVideoOn,
    isVideoOn,
    isScreenSharing,
    isDeafened,
    remoteScreenSharing,
    participants,
    duration,
    error,
    endReason,

    startCall: startCallStable,
    acceptCall: acceptCallStable,
    rejectCall: rejectCallStable,
    endCall: endCallStable,
    toggleMute: toggleMuteStable,
    toggleDeafen: toggleDeafenStable,
    toggleCamera: toggleVideoStable,
    toggleScreenShare: toggleScreenShareStable,

    isCalling: callState === 'calling' || callState === 'connecting' || callState === 'connected',
    remoteUser: peer,
    answerCall: acceptCallStable,
    declineCall: rejectCallStable,
    toggleVideo: toggleVideoStable,
  };
}