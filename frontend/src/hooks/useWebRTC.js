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
import { apiRequest } from './useChat'; // ⚠️ در useChat.js باید `export` به apiRequest اضافه شود

/*
 * ===========================================================================
 * معماری سیگنالینگ
 * ===========================================================================
 * ۱) دعوت به تماس (callee هنوز روی کانال تماس subscribe نیست):
 *      caller ──POST /api/calls/signal──► سرور ──'incoming-call'──► private-notifications-<callee>
 *    (سرور هویت caller را از توکن می‌گذارد، پس قابل جعل نیست)
 *
 * ۲) بقیه‌ی سیگنالینگ روی کانال دو نفره‌ی private-webrtc-<a>-<b> و با client event:
 *      callee  ── call-accepted ──► caller      (callee روی کانال آماده است)
 *      caller  ── call-offer    ──► callee
 *      callee  ── call-answer   ──► caller
 *      هر دو   ── ice-candidates (دسته‌ای) ──►
 *      هر دو   ── call-end / call-reject ──►
 *
 * handshake ی call-accepted باعث می‌شود offer قبل از subscribe شدن callee ارسال نشود.
 * ===========================================================================
 */

const ABORTED = 'CALL_ABORTED';
const ICE_FLUSH_DELAY = 150; // ms (برای رعایت rate limit رویدادهای client)
const DISCONNECT_GRACE = 8000; // ms
const SUBSCRIBE_TIMEOUT = 10000; // ms

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
function buildIceServers(custom) {
  if (Array.isArray(custom) && custom.length) return custom;

  const servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

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
    video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
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

/** صبر می‌کند تا subscribe روی کانال کامل شود. */
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
    channel.bind('realtime:subscription_error', onErr); // ✱ نام رویداد را با مستندات چک کنید
    timer = setTimeout(() => done(reject, new Error('اتصال به کانال تماس زمان‌بر شد')), timeout);
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
/**
 * @param {object}   options
 * @param {{id: string|number, username?: string}} options.currentUser کاربر لاگین‌شده
 * @param {boolean}  [options.connected=true]  وضعیت اتصال از useChat (برای bind شدن اعلان تماس)
 * @param {RTCIceServer[]} [options.iceServers] جایگزین STUN/TURN پیش‌فرض
 * @param {number}   [options.ringTimeout=35000] مدت زنگ خوردن (ms)
 */
export function useWebRTC({ currentUser, connected = true, iceServers, ringTimeout = 35000 } = {}) {
  // callState: idle | calling | incoming | connecting | connected
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

  const stateRef = useRef('idle');
  const callRef = useRef(null); // { id, peerId, peerName, type, role, channelName, bound }
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingRemoteCandidatesRef = useRef([]);
  const outboundCandidatesRef = useRef([]);
  const iceFlushTimerRef = useRef(null);
  const ringTimerRef = useRef(null);
  const disconnectTimerRef = useRef(null);
  const userRef = useRef(currentUser);
  const iceServersRef = useRef(iceServers);
  const actionsRef = useRef({});

  userRef.current = currentUser;
  iceServersRef.current = iceServers;

  // -------------------------------------------------------------------------
  // کمک‌ها
  // -------------------------------------------------------------------------
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
    setDuration(0);
  }

  async function prepareLocalMedia(callId, type) {
    const stream = await getMedia(type);
    if (callRef.current?.id !== callId) {
      stopStream(stream);
      throw new Error(ABORTED);
    }
    localStreamRef.current = stream;
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

    await waitForSubscription(call.channelName);
    assertActive(callId);
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
        setRemoteStream(event.streams[0]);
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
        flushIce(); // پایان جمع‌آوری candidate ها
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
      } catch (err) {
        console.warn('[WebRTC] addIceCandidate failed:', err);
      }
    }
  }

  /** همه‌چیز را جمع می‌کند و به حالت idle برمی‌گردد. */
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

    if (call) {
      for (const [event, fn] of call.bound) unbindClientEvent(call.channelName, event, fn);
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
    setIsCameraOff(false);
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

  /** ارسال یک رویداد تکی روی کانال تماس بدون اینکه تماس فعالی داشته باشیم (reject / busy). */
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

  // -------------------------------------------------------------------------
  // اقدام‌های کاربر
  // -------------------------------------------------------------------------
  async function startCall(targetUserId, targetUsername, type = 'audio') {
    const me = userRef.current;
    if (!me?.id) return { success: false, error: 'کاربر مشخص نیست' };
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

  async function acceptCall() {
    const call = callRef.current;
    if (!call || stateRef.current !== 'incoming') return { success: false, error: 'تماس ورودی وجود ندارد' };

    clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
    setState('connecting');

    try {
      await prepareLocalMedia(call.id, call.type);
      await openChannel(call.id);
      createPeerConnection(); // قبل از اعلام آمادگی، pc و track ها آماده‌اند
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
      // callee احتمالاً هنوز روی کانال نیست، پس از مسیر سرور هم لغو می‌شود
      apiRequest('/api/calls/signal', {
        method: 'POST',
        body: JSON.stringify({ type: 'cancel', targetUserId: call.peerId, callId: call.id }),
      }).catch(() => {});
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
  }

  function toggleCamera() {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (!tracks.length) return;
    const wasEnabled = tracks.some((t) => t.enabled);
    tracks.forEach((t) => (t.enabled = !wasEnabled));
    setIsCameraOff(wasEnabled);
  }

  // -------------------------------------------------------------------------
  // رویدادهای ورودی: اعلان‌های سرور (روی کانال notifications)
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
      const { type, sdp } = pc.localDescription;
      sendSignal('call-offer', { sdp: { type, sdp } });
    } catch (err) {
      const r = failCall(call.id, err);
      if (!r.aborted) sendSignal('call-end', { reason: 'error' });
    }
  }

  async function onOffer(data) {
    const call = callRef.current;
    const pc = pcRef.current;
    if (!isCurrent(data) || call.role !== 'callee' || !pc || !data.sdp) return;

    try {
      await pc.setRemoteDescription(data.sdp);
      await flushPendingRemoteCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      assertActive(call.id);
      const { type, sdp } = pc.localDescription;
      sendSignal('call-answer', { sdp: { type, sdp } });
    } catch (err) {
      const r = failCall(call.id, err);
      if (!r.aborted) sendSignal('call-end', { reason: 'error' });
    }
  }

  async function onAnswer(data) {
    const call = callRef.current;
    const pc = pcRef.current;
    if (!isCurrent(data) || call.role !== 'caller' || !pc || !data.sdp) return;

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
        } catch (err) {
          console.warn('[WebRTC] addIceCandidate failed:', err);
        }
      } else {
        pendingRemoteCandidatesRef.current.push(candidate); // قبل از remoteDescription صف می‌شود
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

  actionsRef.current = {
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    onIncoming,
    onCancelled,
    onAccepted,
    onOffer,
    onAnswer,
    onIceCandidates,
    onReject,
    onRemoteEnd,
  };

  // -------------------------------------------------------------------------
  // Effect ها
  // -------------------------------------------------------------------------

  // اعلان تماس ورودی از کانال notifications (کانال را useChat هم subscribe می‌کند؛ subscribe تکراری بی‌خطر است)
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

    const handleIncoming = (d) => actionsRef.current.onIncoming?.(d);
    const handleCancelled = (d) => actionsRef.current.onCancelled?.(d);

    bindEvent(channelName, 'incoming-call', handleIncoming);
    bindEvent(channelName, 'call-cancelled', handleCancelled);

    return () => {
      unbindEvent(channelName, 'incoming-call', handleIncoming);
      unbindEvent(channelName, 'call-cancelled', handleCancelled);
    };
  }, [connected, userId]);

  // مدت تماس
  useEffect(() => {
    if (callState !== 'connected') return undefined;
    const startedAt = Date.now();
    const id = setInterval(() => setDuration(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [callState]);

  // اگر کاربر خارج شد، تماس قطع شود
  useEffect(() => {
    if (userId == null) actionsRef.current.endCall?.('local-ended');
  }, [userId]);

  // بستن تب / unmount
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
  const acceptCallStable = useCallback(() => actionsRef.current.acceptCall(), []);
  const rejectCallStable = useCallback(() => actionsRef.current.rejectCall(), []);
  const endCallStable = useCallback(() => actionsRef.current.endCall('local-ended'), []);
  const toggleMuteStable = useCallback(() => actionsRef.current.toggleMute(), []);
  const toggleCameraStable = useCallback(() => actionsRef.current.toggleCamera(), []);

  return {
    callState, // idle | calling | incoming | connecting | connected
    callType, // 'audio' | 'video' | null
    peer, // { id, username } | null
    incomingCall: callState === 'incoming' ? { peer, callType } : null,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    duration, // ثانیه
    error,
    endReason, // کد دلیل پایان تماس (متن: END_REASON_TEXT[endReason])
    startCall: startCallStable, // (targetUserId, targetUsername, 'audio' | 'video')
    acceptCall: acceptCallStable,
    rejectCall: rejectCallStable,
    endCall: endCallStable,
    toggleMute: toggleMuteStable,
    toggleCamera: toggleCameraStable,
  };
}