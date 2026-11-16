import { useCallback, useEffect, useRef, useState } from 'react';
import {
  apinator,
  subscribeToWebRTC,
  unsubscribeFromWebRTC,
  getWebRTCChannelName,
  bindClientEvent,
  unbindClientEvent,
  triggerClientEvent,
  subscribeToNotifications,
  getNotificationChannelName,
  bindEvent,
  unbindEvent,
} from '../lib/apinator';
import { apiRequest } from './useChat';

const ABORTED = 'CALL_ABORTED';
const ICE_FLUSH_DELAY = 150;
const DISCONNECT_GRACE = 8000;
const SUBSCRIBE_TIMEOUT = 10000;

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
const setVideoSenderParameters = async (sender, maxBitrate = 8_000_000) => {
  if (!sender || !sender.track || sender.track.kind !== 'video') return;
  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    params.encodings[0].maxBitrate = maxBitrate;
    await sender.setParameters(params);
  } catch (err) {
    console.warn('[WebRTC] Could not set video sender parameters:', err);
  }
};

function buildIceServers(custom) {
  if (Array.isArray(custom) && custom.length) return custom;

  const METERED_USERNAME = import.meta.env.VITE_METERED_USERNAME;
  const METERED_CREDENTIAL = import.meta.env.VITE_METERED_CREDENTIAL;

  const servers = [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: METERED_USERNAME,
      credential: METERED_CREDENTIAL,
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: METERED_USERNAME,
      credential: METERED_CREDENTIAL,
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: METERED_USERNAME,
      credential: METERED_CREDENTIAL,
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: METERED_USERNAME,
      credential: METERED_CREDENTIAL,
    },
  ];
  const turnUrl = import.meta.env.VITE_TURN_URL;
  if (turnUrl) {
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
    video:
      type === 'video'
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        : false,
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

function waitForSubscription(channelName, timeout = SUBSCRIBE_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const channel = apinator.channel(channelName);
    if (!channel) return reject(new Error('کانال تماس در دسترس نیست'));
    if (channel.subscribed === true) return resolve(channel);

    let timer;
    const done = (fn, arg) => {
      clearTimeout(timer);
      channel.unbind('realtime:subscription_succeeded', onOk);
      channel.unbind('realtime:subscription_error', onErr);
      fn(arg);
    };
    const onOk = () => done(resolve, channel);
    const onErr = () => done(reject, new Error('دسترسی به کانال تماس رد شد'));

    channel.bind('realtime:subscription_succeeded', onOk);
    channel.bind('realtime:subscription_error', onErr);
    timer = setTimeout(() => done(reject, new Error('اتصال به کانال تماس زمان‌بر شد')), timeout);
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useWebRTC({ currentUser, connected = true, iceServers, ringTimeout = 35000 } = {}) {
  const [callState, setCallStateRaw] = useState('idle');
  const [callType, setCallType] = useState(null);
  const [peer, setPeer] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [endReason, setEndReason] = useState(null);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);

  const stateRef = useRef('idle');
  const callRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenVideoSenderRef = useRef(null);
  const isScreenSharingDuringCallRef = useRef(false);
  const pendingRemoteCandidatesRef = useRef([]);
  const outboundCandidatesRef = useRef([]);
  const iceFlushTimerRef = useRef(null);
  const ringTimerRef = useRef(null);
  const disconnectTimerRef = useRef(null);
  const userRef = useRef(currentUser);
  const iceServersRef = useRef(iceServers);
  const actionsRef = useRef({});
  const isDeafenedRef = useRef(false);
  const isCameraOffRef = useRef(false);

  useEffect(() => {
    userRef.current = currentUser;
    iceServersRef.current = iceServers;
  }, [currentUser, iceServers]);

  useEffect(() => {
    isDeafenedRef.current = isDeafened;
  }, [isDeafened]);

  useEffect(() => {
    isCameraOffRef.current = isCameraOff;
  }, [isCameraOff]);

  function setState(next) {
    stateRef.current = next;
    setCallStateRaw(next);
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

  function sendSignal(event, data = {}) {
    const call = callRef.current;
    if (!call) return false;
    return triggerClientEvent(call.channelName, event, {
      callId: call.id,
      from: userRef.current?.id,
      ...data,
    });
  }

  function flushIce() {
    clearTimeout(iceFlushTimerRef.current);
    iceFlushTimerRef.current = null;
    const batch = outboundCandidatesRef.current.splice(0);
    if (batch.length) sendSignal('ice-candidates', { candidates: batch });
  }

  function beginCall({ id, peerId, peerName, type, role }) {
    const me = userRef.current;
    const channelName = getWebRTCChannelName(me.id, peerId);
    callRef.current = { id, peerId: String(peerId), peerName, type, role, channelName, bound: [] };
    pendingRemoteCandidatesRef.current = [];
    outboundCandidatesRef.current = [];
    setPeer({ id: String(peerId), username: peerName });
    setCallType(type);
    setError(null);
    setEndReason(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setIsDeafened(false);
    setDuration(0);
    setRemoteScreenSharing(false);

    if (me) {
      setParticipants([
        {
          id: me.id,
          username: me.username,
          isLocal: true,
          muted: false,
          video: type === 'video',
          screenSharing: false,
          speaking: false,
        },
        {
          id: peerId,
          username: peerName,
          isLocal: false,
          muted: false,
          video: false,
          screenSharing: false,
          speaking: false,
        },
      ]);
    }
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
  }

  async function openChannel(callId) {
    const call = callRef.current;
    const me = userRef.current;
    subscribeToWebRTC(me.id, call.peerId);
    const on = (event, handlerName) => {
      const fn = (data) => actionsRef.current[handlerName]?.(data);
      bindClientEvent(call.channelName, event, fn);
      call.bound.push([event, fn]);
    };
    on('call-accepted', 'onAccepted');
    on('call-offer', 'onOffer');
    on('call-answer', 'onAnswer');
    on('ice-candidates', 'onIceCandidates');
    on('call-reject', 'onReject');
    on('call-end', 'onRemoteEnd');
    on('call-stream-updated', 'onStreamUpdated');
    on('call-screen-lock', 'onScreenLock');
    on('call-screen-unlock', 'onScreenUnlock');
    await waitForSubscription(call.channelName);
    assertActive(callId);
  }

  async function attachVideoTrack(peer, track, stream) {
    const reusable = peer
      .getTransceivers()
      .find(
        (t) =>
          t.receiver?.track?.kind === 'video' &&
          t.currentDirection !== 'stopped' &&
          !t.sender.track
      );
    if (reusable) {
      await reusable.sender.replaceTrack(track);
      reusable.direction = 'sendrecv';
      return reusable.sender;
    }
    return peer.addTrack(track, stream);
  }

  function createPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: buildIceServers(iceServersRef.current),
      bundlePolicy: 'max-bundle',
    });
    pcRef.current = pc;
    const local = localStreamRef.current;
    local?.getTracks().forEach((track) => pc.addTrack(track, local));

    const fallbackRemote = new MediaStream();
    pc.ontrack = (event) => {
      if (pcRef.current !== pc) return;
      if (event.streams[0]) {
        const stream = event.streams[0];
        stream.getAudioTracks().forEach((t) => (t.enabled = !isDeafenedRef.current));
        setRemoteStream(stream);
      } else {
        fallbackRemote.addTrack(event.track);
        setRemoteStream(fallbackRemote);
      }
    };

    pc.onicecandidate = (event) => {
      if (pcRef.current !== pc) return;
      if (event.candidate) {
        outboundCandidatesRef.current.push(event.candidate.toJSON());
        if (!iceFlushTimerRef.current) {
          iceFlushTimerRef.current = setTimeout(flushIce, ICE_FLUSH_DELAY);
        }
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
        if (stateRef.current !== 'connected') setState('connected');
      } else if (s === 'disconnected') {
        if (!disconnectTimerRef.current) {
          disconnectTimerRef.current = setTimeout(
            () => actionsRef.current.endCall('connection-lost'),
            DISCONNECT_GRACE
          );
        }
      } else if (s === 'failed') {
        setError('برقراری ارتباط ناموفق بود (ممکن است به TURN نیاز باشد)');
        actionsRef.current.endCall('connection-failed');
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
    outboundCandidatesRef.current = [];
    pendingRemoteCandidatesRef.current = [];
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      try {
        pc.close();
      } catch {
        /* ignore */
      }
    }

    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    screenVideoSenderRef.current = null;
    isScreenSharingDuringCallRef.current = false;

    if (call) {
      for (const [event, fn] of call.bound) unbindClientEvent(call.channelName, event, fn);
      const me = userRef.current;
      if (me?.id) {
        try {
          unsubscribeFromWebRTC(me.id, call.peerId);
        } catch {
          /* ignore */
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
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setIsDeafened(false);
    setParticipants([]);
    setRemoteScreenSharing(false);
    setEndReason(reason);
    setState('idle');
  }

  function failCall(callId, err) {
    if (err?.message === ABORTED) return { success: false, aborted: true };
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
      triggerClientEvent(name, event, { callId, from: me.id, ...data });
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

  async function renegotiate() {
    const pc = pcRef.current;
    const call = callRef.current;
    if (!pc || !call) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal('call-offer', {
        sdp: { type: offer.type, sdp: offer.sdp },
        renegotiate: true,
      });
    } catch (err) {
      console.error('Renegotiation failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // اقدام‌های کاربر
  // -------------------------------------------------------------------------
  async function startCall(targetUserId, targetUsername, type = 'audio') {
    const me = userRef.current;
    if (!me?.id) return { success: false, error: 'کاربر مشخص نیست' };
    if (stateRef.current !== 'idle') {
      return { success: false, error: 'در حال حاضر یک تماس فعال دارید' };
    }
    if (String(targetUserId) === String(me.id)) {
      return { success: false, error: 'نمی‌توانید با خودتان تماس بگیرید' };
    }
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

  async function acceptCall() {
    const call = callRef.current;
    if (!call || stateRef.current !== 'incoming') {
      return { success: false, error: 'تماس ورودی وجود ندارد' };
    }
    clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
    setState('connecting');
    try {
      await prepareLocalMedia(call.id, call.type);
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
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    if (!tracks.length) return;
    const wasEnabled = tracks.some((t) => t.enabled);
    tracks.forEach((t) => (t.enabled = !wasEnabled));
    setIsMuted(wasEnabled);
    setParticipants((prev) => prev.map((p) => (p.isLocal ? { ...p, muted: wasEnabled } : p)));
  }

  function toggleDeafen() {
    setIsDeafened((prev) => {
      const next = !prev;
      isDeafenedRef.current = next;
      const stream = remoteStream;
      if (stream) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }

  // 👈 منطق کامل toggleCamera (با افزودن ویدیو در صورت نبود)
  async function toggleCamera() {
    if (isScreenSharingDuringCallRef.current) return;
    const pc = pcRef.current;
    if (!pc) return;
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];

    if (!videoTrack) {
      // روشن کردن دوربین
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const newTrack = videoStream.getVideoTracks()[0];
        const combined = new MediaStream([...localStreamRef.current.getTracks(), newTrack]);
        localStreamRef.current = combined;
        setLocalStream(combined);

        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(newTrack);
        else await attachVideoTrack(pc, newTrack, combined);

        await renegotiate(); // برای اعمال track جدید
        setIsCameraOff(false);
        setParticipants((prev) => prev.map((p) => (p.isLocal ? { ...p, video: true } : p)));
      } catch (err) {
        console.error(err);
      }
    } else {
      // خاموش کردن دوربین
      const wasEnabled = videoTrack.enabled;
      videoTrack.enabled = !wasEnabled;
      setIsCameraOff(!wasEnabled);
      setParticipants((prev) => prev.map((p) => (p.isLocal ? { ...p, video: !wasEnabled } : p)));
    }
  }

  async function stopScreenShareInternal() {
    isScreenSharingDuringCallRef.current = false;
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      screenStreamRef.current = null;
    }
    let needsRenegotiation = false;
    const pc = pcRef.current;
    if (pc && screenVideoSenderRef.current) {
      const sender = screenVideoSenderRef.current;
      const camTrack = cameraStreamRef.current?.getVideoTracks()[0];
      if (camTrack && !isCameraOffRef.current) {
        await sender.replaceTrack(camTrack);
        await setVideoSenderParameters(sender, 8_000_000);
      } else {
        pc.removeTrack(sender);
        needsRenegotiation = true;
      }
      screenVideoSenderRef.current = null;
    }
    if (needsRenegotiation) await renegotiate();
    else sendSignal('call-stream-updated');
    sendSignal('call-screen-unlock');
    if (cameraStreamRef.current) {
      localStreamRef.current = cameraStreamRef.current;
      setLocalStream(cameraStreamRef.current);
    }
    setIsScreenSharing(false);
    setParticipants((prev) =>
      prev.map((p) => (p.isLocal ? { ...p, screenSharing: false, video: !isCameraOffRef.current } : p))
    );
  }

  async function toggleScreenShare() {
    if (isScreenSharingDuringCallRef.current) {
      await stopScreenShareInternal();
      return;
    }
    const pc = pcRef.current;
    if (!pc) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', frameRate: { ideal: 30, max: 60 } },
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) {
        screenStream.getTracks().forEach((t) => t.stop());
        return;
      }
      screenStreamRef.current = screenStream;
      let needsRenegotiation = false;
      const videoSender = pc
        .getSenders()
        .find((s) => s.track?.kind === 'video' && s.track.readyState === 'live');
      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
        await setVideoSenderParameters(videoSender, 8_000_000);
        screenVideoSenderRef.current = videoSender;
      } else {
        const newSender = await attachVideoTrack(pc, screenTrack, screenStream);
        await setVideoSenderParameters(newSender, 8_000_000);
        screenVideoSenderRef.current = newSender;
        needsRenegotiation = true;
      }
      const micTrack = cameraStreamRef.current?.getAudioTracks()[0];
      const local = new MediaStream(micTrack ? [screenTrack, micTrack] : [screenTrack]);
      localStreamRef.current = local;
      setLocalStream(local);
      if (needsRenegotiation) await renegotiate();
      else sendSignal('call-stream-updated');
      sendSignal('call-screen-lock');
      setIsScreenSharing(true);
      isScreenSharingDuringCallRef.current = true;
      setParticipants((prev) =>
        prev.map((p) => (p.isLocal ? { ...p, screenSharing: true, video: true } : p))
      );
      screenTrack.onended = async () => {
        if (isScreenSharingDuringCallRef.current) await stopScreenShareInternal();
      };
    } catch (err) {
      console.error('Cannot share screen:', err);
    }
  }

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
    } catch {
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

  const isCurrent = (data) => callRef.current && data?.callId === callRef.current.id;

  async function onAccepted(data) {
    const call = callRef.current;
    if (!isCurrent(data) || call.role !== 'caller' || stateRef.current !== 'calling') return;
    clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
    setState('connecting');
    try {
      const pc = createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      assertActive(call.id);
      sendSignal('call-offer', { sdp: { type: offer.type, sdp: offer.sdp } });
    } catch (err) {
      const r = failCall(call.id, err);
      if (!r.aborted) sendSignal('call-end', { reason: 'error' });
    }
  }

  async function onOffer(data) {
    const call = callRef.current;
    const pc = pcRef.current;
    if (!isCurrent(data) || !pc || !data.sdp) return;
    if (data.renegotiate) {
      if (pc.signalingState !== 'stable') return;
      await pc.setRemoteDescription(data.sdp);
      await flushPendingRemoteCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal('call-answer', { sdp: { type: answer.type, sdp: answer.sdp } });
      return;
    }
    if (call.role !== 'callee') return;
    try {
      await pc.setRemoteDescription(data.sdp);
      await flushPendingRemoteCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      assertActive(call.id);
      sendSignal('call-answer', { sdp: { type: answer.type, sdp: answer.sdp } });
    } catch (err) {
      const r = failCall(call.id, err);
      if (!r.aborted) sendSignal('call-end', { reason: 'error' });
    }
  }

  async function onAnswer(data) {
    const call = callRef.current;
    const pc = pcRef.current;
    if (!isCurrent(data) || call.role !== 'caller' || !pc || !data.sdp) return;
    if (pc.signalingState !== 'have-local-offer') return;
    try {
      await pc.setRemoteDescription(data.sdp);
      await flushPendingRemoteCandidates();
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

  function onReject(data) {
    const call = callRef.current;
    if (!isCurrent(data) || call.role !== 'caller') return;
    cleanup(data.reason === 'busy' ? 'busy' : 'rejected');
  }

  function onRemoteEnd(data) {
    if (!isCurrent(data)) return;
    cleanup('remote-ended');
  }

  function onStreamUpdated() {
    if (!callRef.current) return;
  }

  function onScreenLock() {
    setRemoteScreenSharing(true);
    setParticipants((prev) =>
      prev.map((p) => (!p.isLocal ? { ...p, screenSharing: true, video: true } : p))
    );
  }

  function onScreenUnlock() {
    setRemoteScreenSharing(false);
    setParticipants((prev) =>
      prev.map((p) => (!p.isLocal ? { ...p, screenSharing: false, video: false } : p))
    );
  }

  useEffect(() => {
    actionsRef.current = {
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleDeafen,
      toggleCamera,
      toggleScreenShare,
      onIncoming,
      onCancelled,
      onAccepted,
      onOffer,
      onAnswer,
      onIceCandidates,
      onReject,
      onRemoteEnd,
      onStreamUpdated,
      onScreenLock,
      onScreenUnlock,
    };
  });

  const userId = currentUser?.id;
  useEffect(() => {
    if (!connected || userId == null) return;
    let channelName;
    try {
      subscribeToNotifications(userId);
      channelName = getNotificationChannelName(userId);
    } catch {
      return;
    }
    const handleIncoming = (d) => actionsRef.current.onIncoming?.(d);
    const handleCancelled = (d) => actionsRef.current.onCancelled?.(d);
    bindEvent(channelName, 'incoming-call', handleIncoming);
    bindEvent(channelName, 'call-cancelled', handleCancelled);
    return () => {
      unbindEvent(channelName, 'incoming-call', handleIncoming);
      unbindEvent(channelName, 'call-cancelled', handleCancelled);
    };
  }, [connected, userId]);

  useEffect(() => {
    if (callState !== 'connected') return;
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

  const startCallStable = useCallback((...args) => actionsRef.current.startCall(...args), []);
  const acceptCallStable = useCallback(() => actionsRef.current.acceptCall(), []);
  const rejectCallStable = useCallback(() => actionsRef.current.rejectCall(), []);
  const endCallStable = useCallback(() => actionsRef.current.endCall('local-ended'), []);
  const toggleMuteStable = useCallback(() => actionsRef.current.toggleMute(), []);
  const toggleDeafenStable = useCallback(() => actionsRef.current.toggleDeafen(), []);
  const toggleCameraStable = useCallback(() => actionsRef.current.toggleCamera(), []);
  const toggleScreenShareStable = useCallback(() => actionsRef.current.toggleScreenShare(), []);

  return {
    callState,
    callType,
    peer,
    incomingCall: callState === 'incoming' ? { peer, callType } : null,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    duration,
    error,
    endReason,
    isScreenSharing,
    isDeafened,
    remoteScreenSharing,
    participants,
    startCall: startCallStable,
    acceptCall: acceptCallStable,
    rejectCall: rejectCallStable,
    endCall: endCallStable,
    toggleMute: toggleMuteStable,
    toggleDeafen: toggleDeafenStable,
    toggleCamera: toggleCameraStable,
    toggleScreenShare: toggleScreenShareStable,
  };
}