import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getChannel,
  getRoomChannelName,
  publishEvent,
} from '../lib/ably';
import { apiRequest } from './useChat';

/*
 * ===========================================================================
 * معماری سیگنالینگ تماس گروهی (Ably + WebRTC mesh)
 * ===========================================================================
 *  - هیچ تماس ورودی‌ای به‌صورت پاپ‌آپ نشان داده نمی‌شود؛ فقط بنر پایین هدر اتاق
 *  - هنگام شروع/پیوستن/خروج، رویداد 'group-call-updated' روی کانال حضور اتاق منتشر می‌شود
 *  - سیگنالینگ روی private:group-webrtc-<callId>:
 *      group-offer / group-answer / group-ice-candidates / group-media-state
 *      group-member-joined / group-member-left   signal-chunk
 *  - هر شرکت‌کننده با هر شرکت‌کننده‌ی دیگر یک RTCPeerConnection دارد (mesh)
 *  - فقط طرفی که شناسه‌ی کوچک‌تری دارد offer می‌فرستد (جلوگیری از glare)
 * ===========================================================================
 */

const ICE_FLUSH_DELAY = 150;
const DISCONNECT_GRACE = 10000;
const PRESENCE_LEAVE_GRACE = 1200;
const SUBSCRIBE_TIMEOUT = 10000;
const HEARTBEAT_INTERVAL = 6000;
const ROOM_POLL_INTERVAL = 4000;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const MAX_INLINE_BYTES = 6000;
const CHUNK_CHARS = 5000;
const CHUNK_TTL = 15000;
const MAX_CHUNK_BUFFERS = 16;

const CHUNKABLE = {
  'group-offer': 'handleOffer',
  'group-answer': 'handleAnswer',
  'group-ice-candidates': 'handleIce',
};

// در mesh هر فرستنده به هر peer جداگانه آپلود می‌کند؛ پس سقف کل = bitrate × تعداد peer
const BITRATE = { camera: 1_500_000, screen: 2_500_000 };
const MIN_BITRATE = { camera: 300_000, screen: 600_000 };

const MAX_FPS = 30;

const VIDEO_CONSTRAINTS = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: MAX_FPS, max: MAX_FPS } };

const SCREEN_CONSTRAINTS = {
  cursor: 'always',
  frameRate: { ideal: MAX_FPS, max: MAX_FPS },
  // در mesh، کپچر 1080p و انکود به چند peer باعث افت شدید فریم می‌شود؛ سقف 720p تعادل خوبی است
  width: { max: 1280 },
  height: { max: 720 },
};

const encoder = new TextEncoder();

// بودجه‌ی آپلود تقریبی (bps)؛ بین peerها تقسیم می‌شود تا آپلود اشباع نشود
const UPLOAD_BUDGET = { camera: 2_600_000, screen: 4_500_000 };

function perPeerBitrate(profile, peerCount) {
  const count = Math.max(1, peerCount);
  const budget = UPLOAD_BUDGET[profile];
  const share = Math.floor(budget / count);
  return Math.max(MIN_BITRATE[profile], Math.min(BITRATE[profile], share));
}

// پروفایل تطبیقی: با رشد تعداد peer، رزولوشن/فریم کمتر و بیت‌ریت سهمیه‌ای کمتر
// تا آپلود اشباع نشود و فریم‌ها در mesh سه‌نفره+ فریز نکنند.
function videoParamsFor(profile, peerCount) {
  const count = Math.max(1, peerCount);
  let scaleResolutionDownBy = 1;
  let maxFramerate = MAX_FPS;
  if (count >= 5) {
    scaleResolutionDownBy = 2;
    maxFramerate = 15;
  } else if (count === 4) {
    scaleResolutionDownBy = 1.75;
    maxFramerate = 20;
  } else if (count === 3) {
    scaleResolutionDownBy = 1.5;
    maxFramerate = 24;
  }
  return {
    maxBitrate: perPeerBitrate(profile, count),
    maxFramerate,
    scaleResolutionDownBy,
    // با ۳+ نفر، حفظ فریم‌ریت به قیمت افت شدید کیفیت تمام صفحه را خراب می‌کند؛
    // حالت متعادل کیفیت/فریم را هم‌زمان پایین می‌آورد.
    degradationPreference: count >= 3 ? 'balanced' : 'maintain-framerate',
  };
}

async function setVideoSenderParameters(sender, profile = 'camera', peerCount = 1) {
  if (!sender?.track || sender.track.kind !== 'video') return;
  try {
    if ('contentHint' in sender.track) {
      sender.track.contentHint = profile === 'screen' ? 'detail' : 'motion';
    }
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
    const tuning = videoParamsFor(profile, peerCount);
    params.encodings[0].maxBitrate = tuning.maxBitrate;
    params.encodings[0].maxFramerate = tuning.maxFramerate;
    params.encodings[0].scaleResolutionDownBy = tuning.scaleResolutionDownBy;
    params.degradationPreference = tuning.degradationPreference;
    await sender.setParameters(params);
  } catch (err) {
    console.debug('[GroupWebRTC] setParameters skipped:', err?.message);
  }
}

function buildIceServers() {
  const servers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: 'stun:stun.relay.metered.ca:80' },
  ];

  const meteredUser = import.meta.env.VITE_METERED_USERNAME;
  const meteredCredential = import.meta.env.VITE_METERED_CREDENTIAL;
  if (meteredUser && meteredCredential) {
    servers.push(
      { urls: 'turn:global.relay.metered.ca:80', username: meteredUser, credential: meteredCredential },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: meteredUser, credential: meteredCredential },
      { urls: 'turn:global.relay.metered.ca:443', username: meteredUser, credential: meteredCredential },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: meteredUser, credential: meteredCredential },
    );
  }

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;
  if (turnUrl && username && credential) {
    servers.push({ urls: turnUrl.split(',').map((url) => url.trim()), username, credential });
  }

  return servers;
}

const newCallId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function stopStream(stream) {
  stream?.getTracks().forEach((track) => {
    try {
      track.onended = null;
      track.stop();
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
      return err?.message || 'خطای ناشناخته در تماس گروهی';
  }
}

function waitForSubscription(channelName, timeout = SUBSCRIBE_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const channel = getChannel(channelName);
    if (channel.state === 'attached') return resolve(channel);

    let timer;
    const done = (fn, arg) => {
      clearTimeout(timer);
      channel.off('attached', onOk);
      channel.off('failed', onErr);
      fn(arg);
    };
    const onOk = () => done(resolve, channel);
    const onErr = (err) => done(reject, new Error(`دسترسی به کانال تماس گروهی رد شد: ${err?.message || err?.reason?.message || ''}`));

    channel.on('attached', onOk);
    channel.on('failed', onErr);
    timer = setTimeout(() => done(reject, new Error('اتصال به کانال تماس گروهی زمان‌بر شد')), timeout);

    if (channel.state === 'initialized' || channel.state === 'detached') channel.attach?.();
  });
}

function findTransceiver(pc, kind) {
  return pc.getTransceivers().find(
    (item) => item.receiver?.track?.kind === kind || item.sender?.track?.kind === kind,
  );
}

export function useGroupWebRTC({ currentUser, connected = false, currentRoom = null, privateCallActive = false } = {}) {
  const [callState, setCallStateRaw] = useState('idle');
  const [callType, setCallType] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOnState] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [endReason, setEndReason] = useState(null);
  const [activeRoomCall, setActiveRoomCall] = useState(null);

  const stateRef = useRef('idle');
  const callRef = useRef(null); // { callId, roomName, channelName, handlers }
  const peersRef = useRef(new Map());
  const chunkBuffersRef = useRef(new Map());

  const cameraRef = useRef(null);
  const screenRef = useRef(null);
  const mutedRef = useRef(false);
  const videoOnRef = useRef(false);
  const screenSharingRef = useRef(false);
  const deafenedRef = useRef(false);

  const busyRef = useRef(false);
  const preparingCallIdRef = useRef(null);

  const userRef = useRef(currentUser);
  const roomRef = useRef(currentRoom);
  const privateActiveRef = useRef(privateCallActive);
  const actionsRef = useRef({});

  const userId = currentUser?.id;

  useEffect(() => {
    userRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    roomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    privateActiveRef.current = privateCallActive;
  }, [privateCallActive]);

  // -------------------------------------------------------------------------
  // کمک‌ها
  // -------------------------------------------------------------------------
  function setState(next) {
    stateRef.current = next;
    setCallStateRaw(next);
  }

  function setVideoOn(value) {
    videoOnRef.current = value;
    setIsVideoOnState(value);
  }

  function sendingVideoTrack() {
    if (screenSharingRef.current) return screenRef.current?.getVideoTracks()[0] || null;
    return videoOnRef.current ? cameraRef.current?.getVideoTracks()[0] || null : null;
  }

  function updateLocal(patch) {
    setParticipants((previous) =>
      previous.map((participant) => (participant.isLocal ? { ...participant, ...patch } : participant)),
    );
  }

  function upsertRemote(id, patch = {}) {
    const key = String(id);
    setParticipants((previous) => {
      const index = previous.findIndex((participant) => !participant.isLocal && participant.id === key);
      if (index === -1) {
        return [...previous, {
          id: key,
          username: patch.username || 'کاربر',
          avatarIndex: patch.avatarIndex ?? null,
          stream: patch.stream || null,
          isLocal: false,
          muted: Boolean(patch.muted),
          video: Boolean(patch.video),
          screenSharing: Boolean(patch.screenSharing),
        }];
      }
      const next = [...previous];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function sendSignal(event, to, data = {}) {
    const call = callRef.current;
    const me = userRef.current;
    if (!call || !to) return false;

    const payload = { callId: call.callId, from: me?.id, to: String(to), ...data };
    const json = JSON.stringify(payload);
    const bytes = encoder.encode(json).length;

    if (import.meta.env.DEV) console.debug(`[GroupWebRTC] ${event} -> ${to} (${bytes} bytes)`);

    if (bytes <= MAX_INLINE_BYTES) {
      publishEvent(call.channelName, event, payload).catch((err) => {
        console.warn(`[GroupWebRTC] signal "${event}" failed:`, err);
      });
      return true;
    }

    const msgId = newCallId().slice(0, 8);
    const total = Math.ceil(json.length / CHUNK_CHARS);
    for (let index = 0; index < total; index += 1) {
      publishEvent(call.channelName, 'signal-chunk', {
        callId: call.callId,
        from: me?.id,
        to: String(to),
        msgId,
        event,
        index,
        total,
        part: json.slice(index * CHUNK_CHARS, (index + 1) * CHUNK_CHARS),
      }).catch((err) => console.warn('[GroupWebRTC] chunk publish failed:', err));
    }
    return true;
  }

  function publishMediaState() {
    const call = callRef.current;
    if (!call) return;
    const me = userRef.current;
    publishEvent(call.channelName, 'group-media-state', {
      callId: call.callId,
      from: me?.id,
      to: 'all',
      muted: mutedRef.current,
      video: videoOnRef.current,
      screenSharing: screenSharingRef.current,
      username: me?.username ?? null,
      avatarIndex: me?.avatarIndex ?? null,
    }).catch(() => {});
  }

  function flushIce(peerId) {
    const entry = peersRef.current.get(String(peerId));
    if (!entry) return;
    clearTimeout(entry.iceTimer);
    entry.iceTimer = null;
    const batch = entry.outbound.splice(0);
    if (batch.length) sendSignal('group-ice-candidates', peerId, { candidates: batch });
  }

  function applyLocalTracks(pc) {
    if (!pc) return false;
    const audio = cameraRef.current?.getAudioTracks()[0] || null;
    const video = sendingVideoTrack();
    let needsRenegotiation = false;

    const audioTransceiver = findTransceiver(pc, 'audio');
    const videoTransceiver = findTransceiver(pc, 'video');

    if (audioTransceiver) {
      if (audioTransceiver.direction !== 'sendrecv') needsRenegotiation = true;
      audioTransceiver.direction = 'sendrecv';
      audioTransceiver.sender.replaceTrack(audio).catch(() => {});
    } else if (audio) {
      try {
        pc.addTrack(audio, new MediaStream([audio]));
      } catch {
        /* ignore */
      }
    }

    if (videoTransceiver) {
      // اگر ترنسیور از offer به‌صورت recvonly ساخته شده، برای ارسال دوربین باید sendrecv شود (نیازمند renegotiation)
      if (video && videoTransceiver.direction !== 'sendrecv') needsRenegotiation = true;
      videoTransceiver.direction = 'sendrecv';
      videoTransceiver.sender.replaceTrack(video).catch(() => {});
      if (video) setVideoSenderParameters(videoTransceiver.sender, screenSharingRef.current ? 'screen' : 'camera', peersRef.current.size);
    } else if (video) {
      try {
        const sender = pc.addTrack(video, new MediaStream([video]));
        setVideoSenderParameters(sender, screenSharingRef.current ? 'screen' : 'camera', peersRef.current.size);
        needsRenegotiation = true;
      } catch {
        /* ignore */
      }
    }

    return needsRenegotiation;
  }

  function applyVideoSenderProfile() {
    const profile = screenSharingRef.current ? 'screen' : 'camera';
    peersRef.current.forEach((entry) => {
      entry.pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'video') setVideoSenderParameters(sender, profile, peersRef.current.size);
      });
    });
  }

  function syncTracksToPeers() {
    peersRef.current.forEach((entry, id) => {
      const needsRenegotiation = applyLocalTracks(entry.pc);
      // هر طرفی که تغییر ترک/جهت دارد و اتصالش stable است می‌تواند offer تازه بفرستد
      if (needsRenegotiation && entry.pc.signalingState === 'stable') {
        sendOffer(id, { renegotiate: true }).catch(() => {});
      }
    });
  }

  function refreshLocalPreview() {
    const mic = cameraRef.current?.getAudioTracks()[0] || null;
    if (screenSharingRef.current) {
      const screen = screenRef.current?.getVideoTracks()[0] || null;
      const preview = new MediaStream(screen ? (mic ? [screen, mic] : [screen]) : (mic ? [mic] : []));
      setLocalStream(preview);
      updateLocal({ stream: preview, screenSharing: true, video: true });
      return;
    }
    const preview = cameraRef.current;
    setLocalStream(preview);
    updateLocal({ stream: preview, screenSharing: false, video: videoOnRef.current });
  }

  function resyncPeer(peerId) {
    const id = String(peerId);
    const entry = peersRef.current.get(id);
    if (!entry || !entry.remoteStream) return;

    const live = entry.remoteStream.getTracks().filter((track) => track && track.readyState !== 'ended');
    const audio = live.filter((track) => track.kind === 'audio');
    const video = live.filter((track) => track.kind === 'video');
    const activeVideo = video.find((track) => !track.muted && track.enabled) || null;

    audio.forEach((track) => {
      track.enabled = !deafenedRef.current;
    });

    const picked = activeVideo ? [...audio, activeVideo] : audio;
    // امضای پایدار بر اساس شناسه‌ی ترک‌ها؛ mute/unmute باعث ساخت MediaStream تازه نمی‌شود
    // (srcObject churn روی <video> در تماس ۳+ نفره باعث فلیکر/فریز می‌شد)
    const signature = picked.map((track) => track.id).join('|');
    if (!picked.length || signature === entry.remoteSig) return;

    entry.remoteSig = signature;
    upsertRemote(id, { stream: new MediaStream(picked) });
  }

  function attachTrackHandlers(entry) {
    if (!entry?.pc) return;
    entry.pc.getReceivers().forEach((receiver) => {
      const track = receiver.track;
      if (!track || track._groupHandlersAttached) return;
      track._groupHandlersAttached = true;
      track.onmute = () => resyncPeer(entry.peerId);
      track.onunmute = () => resyncPeer(entry.peerId);
      track.onended = () => setTimeout(() => resyncPeer(entry.peerId), 100);
    });
  }

  function resyncSoon(peerId) {
    const entry = peersRef.current.get(String(peerId));
    if (!entry) return;
    attachTrackHandlers(entry);
    resyncPeer(peerId);
    setTimeout(() => resyncPeer(peerId), 400);
  }

  function closePeer(peerId) {
    const id = String(peerId);
    const entry = peersRef.current.get(id);
    if (!entry) return;
    clearTimeout(entry.disconnectTimer);
    clearTimeout(entry.iceTimer);
    entry.pc.onicecandidate = null;
    entry.pc.ontrack = null;
    entry.pc.onconnectionstatechange = null;
    try {
      entry.pc.close();
    } catch {
      /* ignore */
    }
    peersRef.current.delete(id);
    setParticipants((previous) => previous.filter((participant) => participant.isLocal || participant.id !== id));
    // با کم شدن تعداد peer، سهم آپلود بقیه زیاد می‌شود؛ پروفایل را دوباره اعمال کن
    applyVideoSenderProfile();
  }

  function createPeer(peerId, role) {
    const call = callRef.current;
    const me = String(userRef.current?.id ?? '');
    const id = String(peerId);
    if (!call || !me || id === me) return null;

    const existing = peersRef.current.get(id);
    if (existing) return existing;

    const pc = new RTCPeerConnection({
      iceServers: buildIceServers(),
      bundlePolicy: 'max-bundle',
    });
    const entry = {
      peerId: id,
      pc,
      role,
      remoteStream: new MediaStream(),
      remoteSig: '',
      outbound: [],
      pending: [],
      iceTimer: null,
      disconnectTimer: null,
      restartTried: false,
    };
    peersRef.current.set(id, entry);

    try {
      if (role === 'offerer') {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        pc.addTransceiver('video', { direction: 'sendrecv' });
        applyLocalTracks(pc);
      }
    } catch (err) {
      console.warn('[GroupWebRTC] transceiver setup failed:', err?.message);
    }

    pc.onicecandidate = (event) => {
      if (peersRef.current.get(id) !== entry) return;
      if (event.candidate) {
        entry.outbound.push(event.candidate.toJSON());
        if (!entry.iceTimer) entry.iceTimer = setTimeout(() => flushIce(id), ICE_FLUSH_DELAY);
      } else {
        flushIce(id);
      }
    };

    pc.ontrack = (event) => {
      if (peersRef.current.get(id) !== entry) return;
      if (event.track.kind === 'audio') event.track.enabled = !deafenedRef.current;
      if (!entry.remoteStream.getTracks().some((track) => track.id === event.track.id)) {
        entry.remoteStream.addTrack(event.track);
      }
      attachTrackHandlers(entry);
      resyncPeer(id);
      resyncSoon(id);
    };

    pc.onconnectionstatechange = () => {
      if (peersRef.current.get(id) !== entry) return;
      const state = pc.connectionState;

      if (state === 'connected') {
        clearTimeout(entry.disconnectTimer);
        entry.disconnectTimer = null;
        entry.restartTried = false;
        applyLocalTracks(pc);
        resyncSoon(id);
        if (stateRef.current !== 'connected') {
          setState('connected');
          publishMediaState();
        }
      } else if (state === 'disconnected') {
        if (!entry.disconnectTimer) {
          entry.disconnectTimer = setTimeout(() => closePeer(id), DISCONNECT_GRACE);
        }
      } else if (state === 'failed') {
        if (role === 'offerer' && !entry.restartTried) {
          entry.restartTried = true;
          try {
            pc.restartIce();
          } catch {
            /* ignore */
          }
          actionsRef.current.sendOffer?.(id, { iceRestart: true });
        }
        if (!entry.disconnectTimer) {
          entry.disconnectTimer = setTimeout(() => closePeer(id), DISCONNECT_GRACE);
        }
      }
    };

    // با اضافه شدن peer جدید، تعداد نفرات عوض شده؛ پروفایل بیت‌ریت/رزولوشن
    // همه‌ی فرستنده‌های قبلی هم باید بازتنظیم شود (وگرنه آپلود اشباع می‌شود)
    applyVideoSenderProfile();

    return entry;
  }

  async function sendOffer(peerId, { iceRestart = false } = {}) {    const call = callRef.current;
    if (!call) return;
    const entry = createPeer(peerId, 'offerer');
    if (!entry) return;
    if (entry.pc.signalingState !== 'stable') return;

    try {
      if (iceRestart) entry.pc.restartIce();
      applyLocalTracks(entry.pc);
      await entry.pc.setLocalDescription(await entry.pc.createOffer());
      if (callRef.current?.callId !== call.callId) return;
      sendSignal('group-offer', peerId, { sdp: entry.pc.localDescription });
    } catch (err) {
      console.warn('[GroupWebRTC] offer failed:', err?.message);
    }
  }

  async function flushPendingCandidates(peerId, entry) {
    const pending = entry.pending.splice(0);
    for (const candidate of pending) {
      try {
        await entry.pc.addIceCandidate(candidate);
      } catch {
        /* ignore */
      }
    }
  }

  function cleanup(reason) {
    const call = callRef.current;
    preparingCallIdRef.current = null;
    if (call) {
      for (const [event, handler] of call.handlers) {
        try {
          if (event === '__presence-leave') {
            getChannel(call.channelName).presence.unsubscribe('leave', handler);
          } else if (event === '__presence-enter') {
            getChannel(call.channelName).presence.unsubscribe('enter', handler);
          } else {
            getChannel(call.channelName).unsubscribe(event, handler);
          }
        } catch {
          /* ignore */
        }
      }
      try {
        getChannel(call.channelName).presence.leave().catch(() => {});
      } catch {
        /* ignore */
      }
    }
    callRef.current = null;

    peersRef.current.forEach((entry) => {
      clearTimeout(entry.disconnectTimer);
      clearTimeout(entry.iceTimer);
      entry.pc.onicecandidate = null;
      entry.pc.ontrack = null;
      entry.pc.onconnectionstatechange = null;
      try {
        entry.pc.close();
      } catch {
        /* ignore */
      }
    });
    peersRef.current.clear();

    for (const buffer of chunkBuffersRef.current.values()) clearTimeout(buffer.timer);
    chunkBuffersRef.current.clear();

    stopStream(screenRef.current);
    stopStream(cameraRef.current);
    screenRef.current = null;
    cameraRef.current = null;

    mutedRef.current = false;
    videoOnRef.current = false;
    screenSharingRef.current = false;
    deafenedRef.current = false;

    setParticipants([]);
    setLocalStream(null);
    setRoomName(null);
    setCallType(null);
    setDuration(0);
    setIsMuted(false);
    setVideoOn(false);
    setIsScreenSharing(false);
    setIsDeafened(false);
    setEndReason(reason);
    setState('idle');
  }

  function failCall(err) {
    console.error('[GroupWebRTC] call failed:', err);
    const message = errorMessage(err);
    cleanup('error');
    setError(message);
    return { success: false, error: message };
  }

  async function prepareLocalMedia(callId, type) {
    preparingCallIdRef.current = callId;
    const stream = await getMedia(type);
    if (preparingCallIdRef.current !== callId) {
      stopStream(stream);
      throw new Error('تماس گروهی دیگر فعال نیست');
    }
    cameraRef.current = stream;
    const videoOn = type === 'video' && stream.getVideoTracks().length > 0;
    setVideoOn(videoOn);
    setCallType(type);
    setLocalStream(stream);

    const me = userRef.current;
    setParticipants([{
      id: String(me?.id ?? ''),
      username: me?.username || 'شما',
      avatarIndex: me?.avatarIndex ?? null,
      stream,
      isLocal: true,
      muted: false,
      video: videoOn,
      screenSharing: false,
    }]);
    return stream;
  }

  function addRemoteProfiles(list) {
    const me = String(userRef.current?.id ?? '');
    const remotes = (list || [])
      .map((participant) => ({
        id: String(participant.id ?? participant.userId ?? ''),
        username: participant.username || 'کاربر',
        avatarIndex: participant.avatarIndex ?? null,
      }))
      .filter((participant) => participant.id && participant.id !== me);

    if (!remotes.length) return;
    setParticipants((previous) => {
      const next = [...previous];
      remotes.forEach((remote) => {
        if (!next.some((participant) => !participant.isLocal && participant.id === remote.id)) {
          next.push({
            id: remote.id,
            username: remote.username,
            avatarIndex: remote.avatarIndex,
            stream: null,
            isLocal: false,
            muted: false,
            video: false,
            screenSharing: false,
          });
        }
      });
      return next;
    });
  }

  async function offerToExisting(list) {
    const me = String(userRef.current?.id ?? '');
    const peers = (list || [])
      .map((participant) => String(participant.id ?? participant.userId ?? ''))
      .filter((id) => id && id !== me && me.localeCompare(id) < 0);
    await Promise.all(peers.map((id) => sendOffer(id)));
  }

  async function openChannel(callId, room) {
    const existing = callRef.current;
    if (existing?.callId === callId) return;

    const channelName = `private:group-webrtc-${callId}`;
    const channel = getChannel(channelName);
    const handlers = [];
    const on = (event, handlerName) => {
      const handler = (message) => {
        const fn = actionsRef.current?.[handlerName];
        if (!fn) return;
        Promise.resolve(fn(message.data)).catch((err) => {
          console.warn('[GroupWebRTC] handler error:', err);
        });
      };
      channel.subscribe(event, handler);
      handlers.push([event, handler]);
    };

    on('group-offer', 'handleOffer');
    on('group-answer', 'handleAnswer');
    on('group-ice-candidates', 'handleIce');
    on('signal-chunk', 'handleSignalChunk');
    on('group-media-state', 'handleMediaState');
    on('group-member-joined', 'handleJoined');
    on('group-member-left', 'handleLeft');

    const onPresenceLeave = (member) => {
      const peerId = String(member?.clientId ?? '');
      const me = String(userRef.current?.id ?? '');
      if (!peerId || peerId === me) return;
      setTimeout(async () => {
        try {
          const members = await channel.presence.get();
          if (members.some((item) => String(item.clientId) === peerId)) return;
        } catch {
          /* ignore */
        }
        closePeer(peerId);
        actionsRef.current.refreshActiveRoomCall?.();
      }, PRESENCE_LEAVE_GRACE);
    };

    const onPresenceEnter = (member) => {
      const peerId = String(member?.clientId ?? '');
      const me = String(userRef.current?.id ?? '');
      if (!peerId || peerId === me) return;
      const data = member?.data || {};
      upsertRemote(peerId, { username: data.username, avatarIndex: data.avatarIndex ?? null });
      if (peersRef.current.has(peerId)) return;
      if (me.localeCompare(peerId) < 0) {
        sendOffer(peerId).catch(() => {});
      }
    };

    channel.presence.subscribe('leave', onPresenceLeave);
    channel.presence.subscribe('enter', onPresenceEnter);
    handlers.push(['__presence-leave', onPresenceLeave]);
    handlers.push(['__presence-enter', onPresenceEnter]);

    callRef.current = { callId, roomName: room, channelName, handlers };
    await waitForSubscription(channelName);

    if (callRef.current?.callId !== callId) throw new Error('تماس گروهی لغو شد');

    try {
      const me = userRef.current;
      await channel.presence.enter({
        id: String(me?.id ?? ''),
        username: me?.username ?? null,
        avatarIndex: me?.avatarIndex ?? null,
      });
    } catch (err) {
      console.warn('[GroupWebRTC] presence enter failed:', err?.message);
    }
  }

  // -------------------------------------------------------------------------
  // بنر تماس فعال اتاق
  // -------------------------------------------------------------------------
  async function refreshActiveRoomCall() {
    const room = roomRef.current;
    if (!room || String(room).startsWith('dm_')) {
      setActiveRoomCall(null);
      return;
    }
    try {
      const response = await apiRequest(`/api/calls/group/active?roomName=${encodeURIComponent(room)}`);
      if (roomRef.current !== room) return;
      setActiveRoomCall(response.session || null);
    } catch {
      /* ignore */
    }
  }

  // -------------------------------------------------------------------------
  // اقدام‌های کاربر
  // -------------------------------------------------------------------------
  async function startCall(room, type = 'audio') {
    if (!room) return { success: false, error: 'اتاقی انتخاب نشده است' };
    if (privateActiveRef.current) return { success: false, error: 'ابتدا تماس خصوصی را پایان دهید' };
    if (stateRef.current !== 'idle' || busyRef.current) return { success: false, error: 'در حال حاضر یک تماس فعال دارید' };
    const effectiveType = type === 'video' ? 'video' : 'audio';

    busyRef.current = true;
    setError(null);
    setEndReason(null);

    let createdCallId = null;
    try {
      const response = await apiRequest('/api/calls/group/start', {
        method: 'POST',
        body: JSON.stringify({ roomName: room, callType: effectiveType }),
      });
      const session = response.session;
      if (!session?.callId) throw new Error(response.error || 'جلسه‌ی تماس ساخته نشد');
      createdCallId = session.callId;

      await prepareLocalMedia(session.callId, effectiveType);
      await openChannel(session.callId, session.roomName);
      setRoomName(session.roomTitle || session.roomName);
      addRemoteProfiles(session.participants);
      setState('connected');
      publishMediaState();
      refreshActiveRoomCall();

      return { success: true, callId: session.callId };
    } catch (err) {
      if (createdCallId) {
        apiRequest('/api/calls/group/leave', {
          method: 'POST',
          body: JSON.stringify({ callId: createdCallId, roomName: room }),
        }).catch(() => {});
      }
      return failCall(err);
    } finally {
      busyRef.current = false;
    }
  }

  async function joinCall(invite, mediaType) {
    if (!invite?.callId || !invite?.roomName) return { success: false, error: 'دعوت تماس نامعتبر است' };
    if (privateActiveRef.current) return { success: false, error: 'ابتدا تماس خصوصی را پایان دهید' };
    if (stateRef.current !== 'idle' || busyRef.current) return { success: false, error: 'در حال حاضر یک تماس فعال دارید' };

    busyRef.current = true;
    setError(null);
    setEndReason(null);

    try {
      const effectiveType = mediaType === 'audio' ? 'audio' : (invite.callType === 'video' ? 'video' : 'audio');

      await prepareLocalMedia(invite.callId, effectiveType);
      await openChannel(invite.callId, invite.roomName);

      const response = await apiRequest('/api/calls/group/join', {
        method: 'POST',
        body: JSON.stringify({ callId: invite.callId, roomName: invite.roomName }),
      });
      const session = response.session;
      if (!session?.callId || session.callId !== invite.callId) {
        throw new Error(response.error || 'در حال حاضر امکان پیوستن نیست');
      }

      setRoomName(session.roomTitle || session.roomName);
      addRemoteProfiles(session.participants);
      setState('connecting');
      publishMediaState();

      await offerToExisting(session.participants);
      refreshActiveRoomCall();

      return { success: true, callId: session.callId };
    } catch (err) {
      const call = callRef.current;
      if (call?.callId) {
        apiRequest('/api/calls/group/leave', {
          method: 'POST',
          body: JSON.stringify({ callId: call.callId, roomName: call.roomName }),
        }).catch(() => {});
      }
      return failCall(err);
    } finally {
      busyRef.current = false;
    }
  }

  async function joinRoomCall(room) {
    if (!room) return { success: false, error: 'اتاقی انتخاب نشده است' };
    if (privateActiveRef.current) return { success: false, error: 'ابتدا تماس خصوصی را پایان دهید' };
    if (stateRef.current !== 'idle') return { success: false, error: 'در حال حاضر یک تماس فعال دارید' };

    try {
      const response = await apiRequest(`/api/calls/group/active?roomName=${encodeURIComponent(room)}`);
      const session = response.session;
      if (!session) {
        setActiveRoomCall(null);
        return { success: false, error: 'تماس فعالی در این اتاق وجود ندارد' };
      }
      return joinCall(session);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      return { success: false, error: message };
    }
  }

  async function toggleGroupCall(room) {
    const target = room || roomRef.current;
    if (!target) return { success: false, error: 'اتاقی انتخاب نشده است' };
    if (stateRef.current !== 'idle') return { success: false, error: 'در حال حاضر یک تماس فعال دارید' };

    try {
      const response = await apiRequest(`/api/calls/group/active?roomName=${encodeURIComponent(target)}`);
      const session = response.session;
      if (session) return joinCall(session);
      return startCall(target, 'audio');
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      return { success: false, error: message };
    }
  }

  function endCall(reason = 'local-ended') {
    const call = callRef.current;
    if (!call) return;
    apiRequest('/api/calls/group/leave', {
      method: 'POST',
      body: JSON.stringify({ callId: call.callId, roomName: call.roomName }),
    })
      .catch(() => {})
      .finally(() => actionsRef.current.refreshActiveRoomCall?.());
    cleanup(reason);
  }

  function toggleMute() {
    const tracks = cameraRef.current?.getAudioTracks() ?? [];
    if (!tracks.length) return;
    const wasEnabled = tracks.some((track) => track.enabled);
    tracks.forEach((track) => {
      track.enabled = !wasEnabled;
    });
    mutedRef.current = wasEnabled;
    setIsMuted(wasEnabled);
    updateLocal({ muted: wasEnabled });
    publishMediaState();
  }

  function toggleDeafen() {
    const next = !deafenedRef.current;
    deafenedRef.current = next;
    setIsDeafened(next);
    peersRef.current.forEach((entry) => {
      entry.remoteStream?.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
    });
  }

  async function toggleVideo() {
    if (!callRef.current || !cameraRef.current) return;
    if (screenSharingRef.current) {
      setError('در حال اشتراک صفحه نمی‌توانید دوربین را تغییر دهید');
      return;
    }

    if (!videoOnRef.current) {
      let camStream;
      try {
        camStream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS, audio: false });
      } catch (err) {
        console.error('[GroupWebRTC] Cannot access camera:', err);
        setError(errorMessage(err));
        return;
      }
      const track = camStream.getVideoTracks()[0];
      if (!track || !callRef.current) {
        stopStream(camStream);
        return;
      }

      const combined = new MediaStream([...cameraRef.current.getAudioTracks(), track]);
      cameraRef.current = combined;
      setVideoOn(true);
      setCallType('video');
      refreshLocalPreview();
      syncTracksToPeers();
      publishMediaState();
    } else {
      const track = cameraRef.current.getVideoTracks()[0];
      if (!track) {
        setVideoOn(false);
        return;
      }
      const next = new MediaStream(cameraRef.current.getAudioTracks());
      cameraRef.current = next;
      setVideoOn(false);
      setCallType('audio');
      refreshLocalPreview();
      syncTracksToPeers();
      track.stop();
      publishMediaState();
    }
  }

  function stopScreenShareInternal() {
    screenSharingRef.current = false;
    stopStream(screenRef.current);
    screenRef.current = null;
    setIsScreenSharing(false);
    setCallType(videoOnRef.current ? 'video' : 'audio');
    refreshLocalPreview();
    syncTracksToPeers();
    applyVideoSenderProfile();
    publishMediaState();
  }

  async function toggleScreenShare() {
    if (screenSharingRef.current) {
      stopScreenShareInternal();
      return;
    }
    if (!callRef.current) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('مرورگر شما از اشتراک صفحه پشتیبانی نمی‌کند');
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: SCREEN_CONSTRAINTS,
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack || !callRef.current) {
        stopStream(screenStream);
        return;
      }
      screenRef.current = screenStream;
      screenSharingRef.current = true;
      setIsScreenSharing(true);
      setCallType('screen');
      refreshLocalPreview();
      syncTracksToPeers();
      applyVideoSenderProfile();
      publishMediaState();

      screenTrack.onended = () => {
        if (screenSharingRef.current) stopScreenShareInternal();
      };
    } catch (err) {
      if (err?.name !== 'NotAllowedError') {
        console.error('[GroupWebRTC] Cannot share screen:', err);
        setError(errorMessage(err));
      }
      stopStream(screenRef.current);
      screenRef.current = null;
      screenSharingRef.current = false;
    }
  }

  // -------------------------------------------------------------------------
  // رویدادهای ورودی
  // -------------------------------------------------------------------------
  function handleJoined(data) {
    const call = callRef.current;
    const me = String(userRef.current?.id ?? '');
    if (!call || !data?.userId || data.callId !== call.callId || String(data.userId) === me) return;
    const id = String(data.userId);
    upsertRemote(id, { username: data.username, avatarIndex: data.avatarIndex ?? null });
    publishMediaState();
    actionsRef.current.refreshActiveRoomCall?.();
    if (me.localeCompare(id) < 0) {
      sendOffer(id).catch((err) => console.warn('[GroupWebRTC] offer on join failed:', err));
    }
  }

  function handleLeft(data) {
    const call = callRef.current;
    const me = String(userRef.current?.id ?? '');
    if (!call || !data?.userId || data.callId !== call.callId || String(data.userId) === me) return;
    closePeer(data.userId);
    actionsRef.current.refreshActiveRoomCall?.();
  }

  async function handleOffer(data) {
    const call = callRef.current;
    const me = String(userRef.current?.id ?? '');
    if (!call || !data?.sdp || String(data.to) !== me) return;
    const peerId = String(data.from);
    if (!peerId || peerId === me) return;

    const entry = createPeer(peerId, 'answerer');
    if (!entry) return;

    // جلوگیری از glare در renegotiation: طرف با شناسه‌ی کوچک‌تر (impolite) offer خودش را نگه می‌دارد
    if (entry.pc.signalingState === 'have-local-offer' && me.localeCompare(peerId) < 0) {
      return;
    }

    try {
      if (entry.pc.signalingState === 'have-local-offer') {
        await entry.pc.setLocalDescription({ type: 'rollback' });
      }
      await entry.pc.setRemoteDescription(data.sdp);
      await flushPendingCandidates(peerId, entry);
      applyLocalTracks(entry.pc);
      attachTrackHandlers(entry);
      const answer = await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      if (callRef.current?.callId !== call.callId) return;
      sendSignal('group-answer', peerId, { sdp: entry.pc.localDescription });
      resyncSoon(peerId);
    } catch (err) {
      console.error('[GroupWebRTC] offer handling failed:', err);
    }
  }

  async function handleAnswer(data) {
    const me = String(userRef.current?.id ?? '');
    if (!data?.sdp || String(data.to) !== me) return;
    const peerId = String(data.from);
    const entry = peersRef.current.get(peerId);
    if (!entry || entry.pc.signalingState !== 'have-local-offer') return;

    try {
      await entry.pc.setRemoteDescription(data.sdp);
      await flushPendingCandidates(peerId, entry);
      resyncSoon(peerId);
    } catch (err) {
      console.error('[GroupWebRTC] answer handling failed:', err);
    }
  }

  async function handleIce(data) {
    const me = String(userRef.current?.id ?? '');
    if (!data || String(data.to) !== me) return;
    const peerId = String(data.from);
    const entry = peersRef.current.get(peerId);
    const candidates = Array.isArray(data.candidates) ? data.candidates : data.candidate ? [data.candidate] : [];

    for (const candidate of candidates) {
      if (!candidate) continue;
      if (entry?.pc.remoteDescription) {
        try {
          await entry.pc.addIceCandidate(candidate);
        } catch {
          /* ignore */
        }
      } else if (entry) {
        entry.pending.push(candidate);
      }
    }
  }

  function handleMediaState(data) {
    const call = callRef.current;
    const me = String(userRef.current?.id ?? '');
    if (!call || !data || data.callId !== call.callId) return;
    if (data.from == null || String(data.from) === me) return;
    if (data.to !== 'all' && String(data.to) !== me) return;

    const screen = Boolean(data.screenSharing);
    const patch = {
      muted: Boolean(data.muted),
      video: Boolean(data.video) || screen,
      screenSharing: screen,
    };
    if (data.username) patch.username = data.username;
    if (data.avatarIndex != null) patch.avatarIndex = data.avatarIndex;
    upsertRemote(String(data.from), patch);
    if (screen) resyncSoon(String(data.from));
  }

  function handleSignalChunk(data) {
    const me = String(userRef.current?.id ?? '');
    if (!data || String(data.to) !== me) return;
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

    const key = `${data.from}:${data.msgId}`;
    const buffers = chunkBuffersRef.current;
    let buffer = buffers.get(key);
    if (!buffer) {
      if (buffers.size >= MAX_CHUNK_BUFFERS) {
        const oldest = buffers.keys().next().value;
        clearTimeout(buffers.get(oldest)?.timer);
        buffers.delete(oldest);
      }
      buffer = {
        parts: new Array(data.total),
        count: 0,
        total: data.total,
        timer: setTimeout(() => buffers.delete(key), CHUNK_TTL),
      };
      buffers.set(key, buffer);
    }

    if (buffer.parts[data.index] === undefined) {
      buffer.parts[data.index] = data.part;
      buffer.count += 1;
    }
    if (buffer.count < buffer.total) return;

    clearTimeout(buffer.timer);
    buffers.delete(key);

    let payload;
    try {
      payload = JSON.parse(buffer.parts.join(''));
    } catch {
      console.warn('[GroupWebRTC] invalid chunked payload');
      return;
    }
    actionsRef.current[handlerName]?.(payload);
  }

  useEffect(() => {
    actionsRef.current = {
      startCall,
      joinCall,
      joinRoomCall,
      toggleGroupCall,
      endCall,
      toggleMute,
      toggleDeafen,
      toggleVideo,
      toggleScreenShare,
      sendOffer,
      publishMediaState,
      refreshActiveRoomCall,
      handleJoined,
      handleLeft,
      handleOffer,
      handleAnswer,
      handleIce,
      handleMediaState,
      handleSignalChunk,
    };
  });

  // -------------------------------------------------------------------------
  // Effect ها
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (callState === 'idle') return undefined;
    const startedAt = Date.now();
    const id = setInterval(() => setDuration(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [callState]);

  useEffect(() => {
    if (callState === 'idle') return undefined;
    const heartbeat = () => {
      const call = callRef.current;
      if (!call?.callId) return;
      apiRequest('/api/calls/group/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ callId: call.callId }),
      }).catch(() => {});
      try {
        const channel = getChannel(call.channelName);
        channel.presence.get()
          .then((members) => {
            const me = String(userRef.current?.id ?? '');
            if (!members.some((member) => String(member.clientId) === me)) {
              return channel.presence.enter({ id: me, username: userRef.current?.username ?? null, avatarIndex: userRef.current?.avatarIndex ?? null });
            }
            return undefined;
          })
          .catch(() => {});
      } catch {
        /* ignore */
      }
    };
    heartbeat();
    const timer = setInterval(heartbeat, HEARTBEAT_INTERVAL);
    return () => clearInterval(timer);
  }, [callState]);

  useEffect(() => {
    let disposed = false;
    const load = () => {
      if (disposed) return;
      actionsRef.current.refreshActiveRoomCall?.();
    };

    if (!connected || !currentRoom || currentRoom.startsWith('dm_')) {
      const timer = setTimeout(() => {
        if (!disposed) setActiveRoomCall(null);
      }, 0);
      return () => {
        disposed = true;
        clearTimeout(timer);
      };
    }

    load();
    const interval = setInterval(load, ROOM_POLL_INTERVAL);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [connected, currentRoom]);

  useEffect(() => {
    if (!connected || !currentRoom || currentRoom.startsWith('dm_')) return undefined;
    const channelName = getRoomChannelName(currentRoom);
    const channel = getChannel(channelName);

    const handler = () => actionsRef.current.refreshActiveRoomCall?.();
    channel.subscribe('group-call-updated', handler);
    return () => {
      try {
        getChannel(channelName).unsubscribe('group-call-updated', handler);
      } catch {
        /* ignore */
      }
    };
  }, [connected, currentRoom]);
  useEffect(() => {
    if (userId == null) actionsRef.current.endCall?.('local-ended');
  }, [userId]);

  useEffect(() => {
    const onPageHide = () => {
      const call = callRef.current;
      if (call?.callId) {
        const body = JSON.stringify({ callId: call.callId, roomName: call.roomName });
        try {
          fetch(`${API_BASE}/api/calls/group/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
            credentials: 'include',
          }).catch(() => {});
        } catch {
          /* ignore */
        }
        try {
          getChannel(call.channelName).presence.leave().catch(() => {});
        } catch {
          /* ignore */
        }
      }
      actionsRef.current.endCall?.('local-ended');
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      actionsRef.current.endCall?.('unmounted');
    };
  }, []);

  // -------------------------------------------------------------------------
  // API پایدار
  // -------------------------------------------------------------------------
  const startCallStable = useCallback((room, type) => actionsRef.current.startCall(room, type), []);
  const joinCallStable = useCallback((invite, mediaType) => actionsRef.current.joinCall(invite, mediaType), []);
  const joinRoomCallStable = useCallback((room) => actionsRef.current.joinRoomCall(room), []);
  const toggleGroupCallStable = useCallback((room) => actionsRef.current.toggleGroupCall(room), []);
  const endCallStable = useCallback(() => actionsRef.current.endCall('local-ended'), []);
  const toggleMuteStable = useCallback(() => actionsRef.current.toggleMute(), []);
  const toggleDeafenStable = useCallback(() => actionsRef.current.toggleDeafen(), []);
  const toggleVideoStable = useCallback(() => actionsRef.current.toggleVideo(), []);
  const toggleScreenShareStable = useCallback(() => actionsRef.current.toggleScreenShare(), []);

  const remoteScreenSharing = participants.some((participant) => !participant.isLocal && participant.screenSharing);
  const inRoomCall = callState !== 'idle';

  return {
    callState,
    callType,
    roomName,
    participants,
    localStream,
    isMuted,
    isCameraOff: !isVideoOn,
    isVideoOn,
    isScreenSharing,
    isDeafened,
    remoteScreenSharing,
    duration,
    error,
    endReason,
    activeRoomCall,
    inRoomCall,

    startCall: startCallStable,
    joinCall: joinCallStable,
    joinRoomCall: joinRoomCallStable,
    toggleGroupCall: toggleGroupCallStable,
    endCall: endCallStable,
    toggleMute: toggleMuteStable,
    toggleDeafen: toggleDeafenStable,
    toggleCamera: toggleVideoStable,
    toggleVideo: toggleVideoStable,
    toggleScreenShare: toggleScreenShareStable,
  };
}

export { newCallId as createGroupCallId };
