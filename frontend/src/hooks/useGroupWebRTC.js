import { useCallback, useEffect, useRef, useState } from 'react';
import { getChannel, subscribeToNotifications } from '../lib/ably';
import { apiRequest } from './useChat';

function buildIceServers() {
  const servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const meteredUser = import.meta.env.VITE_METERED_USERNAME;
  const meteredCredential = import.meta.env.VITE_METERED_CREDENTIAL;
  if (meteredUser && meteredCredential) {
    servers.push(
      { urls: 'turn:global.relay.metered.ca:80', username: meteredUser, credential: meteredCredential },
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

function stopStream(stream) {
  stream?.getTracks().forEach((track) => {
    track.onended = null;
    track.stop();
  });
}

function normalizeParticipant(participant) {
  const participantId = participant.id ?? participant.userId;
  if (participantId == null) return null;
  return {
    id: String(participantId),
    username: participant.username || 'کاربر',
    avatarIndex: participant.avatarIndex ?? null,
    stream: null,
    isLocal: false,
    isMuted: Boolean(participant.isMuted ?? participant.muted),
    isVideoOn: Boolean(participant.isVideoOn ?? participant.video),
  };
}

function mediaError(err) {
  if (['NotAllowedError', 'SecurityError'].includes(err?.name)) return 'دسترسی به میکروفون یا دوربین مجاز نیست';
  if (['NotFoundError', 'OverconstrainedError'].includes(err?.name)) return 'میکروفون یا دوربین پیدا نشد';
  if (err?.name === 'NotReadableError') return 'میکروفون یا دوربین در برنامه دیگری استفاده می‌شود';
  return err?.message || 'خطا در تماس گروهی';
}

export function useGroupWebRTC({ currentUser, connected = false, currentRoom = null, privateCallActive = false } = {}) {
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeRoomCall, setActiveRoomCall] = useState(null);
  const activeRef = useRef(null);
  const busyRef = useRef(false);
  const mediaRef = useRef(null);
  const pcsRef = useRef(new Map());
  const streamsRef = useRef(new Map());
  const candidatesRef = useRef(new Map());
  const callStateRef = useRef('idle');
  const userRef = useRef(currentUser);
  const isMutedRef = useRef(false);
  const isVideoOnRef = useRef(false);
  const privateActiveRef = useRef(privateCallActive);

  useEffect(() => {
    userRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    privateActiveRef.current = privateCallActive;
  }, [privateCallActive]);

  const updateCallState = useCallback((next) => {
    callStateRef.current = next;
    setCallState(next);
  }, []);

  const updateParticipant = useCallback((id, patch) => {
    const key = String(id);
    setParticipants((previous) => previous.map((participant) => (
      participant.id === key ? { ...participant, ...patch } : participant
    )));
  }, []);

  const updateRoster = useCallback((roster) => {
    if (!Array.isArray(roster)) return;
    const me = String(userRef.current?.id ?? '');
    const normalized = roster.map(normalizeParticipant).filter((p) => p && p.id !== me);
    setParticipants((previous) => {
      const local = previous.find((participant) => participant.isLocal);
      const existing = new Map(previous.filter((p) => !p.isLocal).map((p) => [p.id, p]));
      return [
        ...(local ? [local] : []),
        ...normalized.map((participant) => ({ ...existing.get(participant.id), ...participant, stream: streamsRef.current.get(participant.id) || null })),
      ];
    });
  }, []);

  const publish = useCallback((event, to, data = {}) => {
    const call = activeRef.current;
    if (!call) return;
    const channel = getChannel(call.channelName);
    channel.publish(event, {
      ...data,
      to: String(to),
      from: String(userRef.current?.id),
      callId: call.callId,
      peerId: String(to),
    }).catch((err) => setError(err?.message || 'ارسال سیگنال ناموفق بود'));
  }, []);

  const publishState = useCallback(() => {
    const call = activeRef.current;
    if (!call) return;
    getChannel(call.channelName).publish('group-member-state', {
      callId: call.callId,
      from: String(userRef.current?.id),
      to: 'all',
      isMuted: isMutedRef.current,
      isVideoOn: isVideoOnRef.current,
    }).catch(() => {});
  }, []);

  const makePeer = useCallback((peerId) => {
    const call = activeRef.current;
    if (!call || String(peerId) === String(userRef.current?.id)) return null;
    const id = String(peerId);
    const existing = pcsRef.current.get(id);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: buildIceServers(), bundlePolicy: 'max-bundle' });
    const local = mediaRef.current;
    const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
    const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
    const audioTrack = local?.getAudioTracks()[0];
    const videoTrack = local?.getVideoTracks()[0];
    pc.groupTrackReady = Promise.all([
      audioTrack ? audioTransceiver.sender.replaceTrack(audioTrack) : Promise.resolve(),
      videoTrack ? videoTransceiver.sender.replaceTrack(videoTrack) : Promise.resolve(),
    ]);
    pcsRef.current.set(id, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && activeRef.current?.callId === call.callId) {
        publish('ice-candidates', id, { candidate: event.candidate.toJSON() });
      }
    };
    pc.ontrack = (event) => {
      if (activeRef.current?.callId !== call.callId) return;
      let stream = streamsRef.current.get(id);
      if (!stream) {
        stream = new MediaStream();
        streamsRef.current.set(id, stream);
      }
      if (!stream.getTracks().some((track) => track.id === event.track.id)) stream.addTrack(event.track);
      const syncRemote = () => updateParticipant(id, {
        stream: new MediaStream(stream.getTracks()),
        isVideoOn: stream.getVideoTracks().some((track) => track.readyState === 'live' && !track.muted),
      });
      event.track.onended = () => {
        stream.removeTrack(event.track);
        syncRemote();
      };
      event.track.onmute = syncRemote;
      event.track.onunmute = syncRemote;
      syncRemote();
    };
    pc.onconnectionstatechange = () => {
      if (activeRef.current?.callId !== call.callId) return;
      if (pc.connectionState === 'connected') updateCallState('connected');
      if (pc.connectionState === 'failed') setError(`ارتباط با ${id} ناموفق بود`);
    };

    return pc;
  }, [publish, updateCallState, updateParticipant]);

  const sendOffer = useCallback(async (peerId) => {
    const call = activeRef.current;
    const pc = pcsRef.current.get(String(peerId)) || makePeer(peerId);
    if (!call || !pc || pc.signalingState !== 'stable') return;
    await pc.groupTrackReady;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (activeRef.current?.callId !== call.callId) return;
    publish('offer', peerId, { sdp: pc.localDescription });
  }, [makePeer, publish]);

  const flushCandidates = useCallback(async (peerId, pc) => {
    const pending = candidatesRef.current.get(String(peerId)) || [];
    candidatesRef.current.delete(String(peerId));
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        continue;
      }
    }
  }, []);

  const syncLocalTracks = useCallback((stream) => {
    const audioTrack = stream?.getAudioTracks()[0] ?? null;
    const videoTrack = stream?.getVideoTracks()[0] ?? null;
    pcsRef.current.forEach((pc) => {
      const transceivers = pc.getTransceivers();
      const audioSender = transceivers.find((item) => item.receiver?.track?.kind === 'audio')?.sender;
      const videoSender = transceivers.find((item) => item.receiver?.track?.kind === 'video')?.sender;
      audioSender?.replaceTrack(audioTrack).catch(() => {});
      videoSender?.replaceTrack(videoTrack).catch(() => {});
    });
  }, []);

  const onSignal = useCallback(async (event, data) => {
    const call = activeRef.current;
    const me = String(userRef.current?.id ?? '');
    const recipient = String(data?.to ?? data?.peerId ?? '');
    if (!call || !data || data.callId !== call.callId || (recipient !== me && recipient !== 'all') || String(data.from) === me) return;
    const peerId = String(data.from);
    if (!call.roomName || call.roomName !== data.roomName && data.roomName) return;

    if (event === 'offer' && data.sdp) {
      const pc = pcsRef.current.get(peerId) || makePeer(peerId);
      if (!pc) return;
      await pc.groupTrackReady;
      await pc.setRemoteDescription(data.sdp);
      await flushCandidates(peerId, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      publish('answer', peerId, { sdp: pc.localDescription });
      return;
    }
    if (event === 'answer' && data.sdp) {
      const pc = pcsRef.current.get(peerId);
      if (!pc || pc.signalingState !== 'have-local-offer') return;
      await pc.setRemoteDescription(data.sdp);
      await flushCandidates(peerId, pc);
      return;
    }
    if (event === 'ice-candidates') {
      const candidates = Array.isArray(data.candidates) ? data.candidates : data.candidate ? [data.candidate] : [];
      const pc = pcsRef.current.get(peerId);
      for (const candidate of candidates) {
        if (pc?.remoteDescription) {
          try {
            await pc.addIceCandidate(candidate);
          } catch {
            continue;
          }
        } else {
          candidatesRef.current.set(peerId, [...(candidatesRef.current.get(peerId) || []), candidate]);
        }
      }
      return;
    }
    if (event === 'group-member-state') {
      updateParticipant(peerId, {
        isMuted: Boolean(data.isMuted),
        isVideoOn: Boolean(data.isVideoOn),
      });
    }
  }, [flushCandidates, makePeer, publish, updateParticipant]);

  const onMemberJoined = useCallback((data) => {
    const call = activeRef.current;
    const me = String(userRef.current?.id ?? '');
    if (!call || data?.callId !== call.callId || !data.userId || String(data.userId) === me) return;
    const id = String(data.userId);
    setParticipants((previous) => {
      if (previous.some((participant) => participant.id === id)) return previous;
      return [...previous, normalizeParticipant({ ...data, id })];
    });
    publishState();
    if (me.localeCompare(id) < 0) {
      setTimeout(() => sendOffer(id).catch((err) => setError(mediaError(err))), 0);
    }
  }, [publishState, sendOffer]);

  const closePeer = useCallback((peerId) => {
    const id = String(peerId);
    const pc = pcsRef.current.get(id);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pcsRef.current.delete(id);
    }
    streamsRef.current.delete(id);
    candidatesRef.current.delete(id);
    setParticipants((previous) => previous.filter((participant) => participant.id !== id));
  }, []);

  const onMemberLeft = useCallback((data) => {
    const call = activeRef.current;
    const me = String(userRef.current?.id ?? '');
    if (!call || data?.callId !== call.callId || !data.userId || String(data.userId) === me) return;
    closePeer(data.userId);
  }, [closePeer]);

  const detachCallChannel = useCallback((call) => {
    if (!call?.channel) return;
    for (const [event, handler] of call.handlers) call.channel.unsubscribe(event, handler);
    if (call.channel.state === 'attached') call.channel.detach().catch(() => {});
  }, []);

  const resetCall = useCallback((keepError = false) => {
    const call = activeRef.current;
    activeRef.current = null;
    detachCallChannel(call);
    pcsRef.current.forEach((pc) => {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    });
    pcsRef.current.clear();
    streamsRef.current.clear();
    candidatesRef.current.clear();
    stopStream(mediaRef.current);
    mediaRef.current = null;
    isMutedRef.current = false;
    isVideoOnRef.current = false;
    setParticipants([]);
    setCallType(null);
    setRoomName(null);
    setDuration(0);
    setIsMuted(false);
    setIsVideoOn(false);
    updateCallState('idle');
    if (!keepError) setError(null);
  }, [detachCallChannel, updateCallState]);

  const attachCallChannel = useCallback(async (callId, room) => {
    const channelName = `private:group-webrtc-${callId}`;
    const channel = getChannel(channelName);
    const handlers = [];
    const subscribe = (event, callback) => {
      const handler = (message) => {
        try {
          Promise.resolve(callback(message.data)).catch((err) => setError(mediaError(err)));
        } catch (err) {
          setError(mediaError(err));
        }
      };
      channel.subscribe(event, handler);
      handlers.push([event, handler]);
    };
    subscribe('offer', (data) => onSignal('offer', data));
    subscribe('answer', (data) => onSignal('answer', data));
    subscribe('ice-candidates', (data) => onSignal('ice-candidates', data));
    subscribe('group-member-state', (data) => onSignal('group-member-state', data));
    subscribe('group-member-joined', onMemberJoined);
    subscribe('group-member-left', onMemberLeft);
    const call = { callId, roomName: room, channelName, channel, handlers };
    activeRef.current = call;
    if (channel.state !== 'attached') {
      await new Promise((resolve, reject) => {
        const onAttached = () => {
          channel.off('attached', onAttached);
          channel.off('failed', onFailed);
          resolve();
        };
        const onFailed = (stateChange) => {
          channel.off('attached', onAttached);
          channel.off('failed', onFailed);
          reject(new Error(stateChange?.reason?.message || 'دسترسی به کانال تماس ممکن نشد'));
        };
        channel.on('attached', onAttached);
        channel.on('failed', onFailed);
        if (channel.state === 'attached') onAttached();
        else if (channel.state === 'initialized' || channel.state === 'detached') channel.attach();
      });
    }
    return call;
  }, [onMemberJoined, onMemberLeft, onSignal]);

  const initializeSession = useCallback(async (session, type) => {
    const me = userRef.current;
    if (!me?.id) throw new Error('کاربر مشخص نیست');
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('تماس نیازمند مرورگر امن و دسترسی رسانه است');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: type === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    if (activeRef.current?.callId !== session.callId) {
      stopStream(stream);
      throw new Error('تماس دیگر فعال نیست');
    }
    mediaRef.current = stream;
    setCallType(type);
    setRoomName(session.roomName);
    setIsMuted(false);
    const videoOn = type === 'video' && stream.getVideoTracks().length > 0;
    setIsVideoOn(videoOn);
    isMutedRef.current = false;
    isVideoOnRef.current = videoOn;
    setParticipants([
      {
        id: String(me.id),
        username: me.username || 'شما',
        avatarIndex: me.avatarIndex ?? null,
        stream,
        isLocal: true,
        isMuted: false,
        isVideoOn: videoOn,
      },
    ]);
    updateRoster(session.participants || []);
    updateCallState('connecting');
    syncLocalTracks(stream);
    publishState();
    const peers = (session.participants || [])
      .map((participant) => String(participant.id ?? participant.userId))
      .filter((id) => id && id !== String(me.id) && String(me.id).localeCompare(id) < 0);
    await Promise.all(peers.map((id) => sendOffer(id)));
  }, [publishState, sendOffer, syncLocalTracks, updateCallState, updateRoster]);

  const startCall = useCallback(async (requestedRoomName, type = 'audio') => {
    if (privateCallActive) return { success: false, error: 'ابتدا تماس خصوصی را پایان دهید' };
    if (busyRef.current || callStateRef.current !== 'idle') return { success: false, error: 'تماس دیگری فعال است' };
    if (!requestedRoomName) return { success: false, error: 'اتاقی انتخاب نشده است' };
    busyRef.current = true;
    setError(null);
    setIncomingCall(null);
    try {
      const response = await apiRequest('/api/calls/group/start', {
        method: 'POST',
        body: JSON.stringify({ roomName: requestedRoomName, callType: type === 'video' ? 'video' : 'audio' }),
      });
      const session = response.session;
      if (!session?.callId) throw new Error(response.error || 'جلسه تماس ساخته نشد');
      const call = await attachCallChannel(session.callId, session.roomName);
      if (activeRef.current !== call) throw new Error('تماس لغو شد');
      await initializeSession(session, type === 'video' ? 'video' : 'audio');
      return { success: true, callId: session.callId };
    } catch (err) {
      const call = activeRef.current;
      if (call?.callId) {
        apiRequest('/api/calls/group/leave', { method: 'POST', body: JSON.stringify({ callId: call.callId, roomName: call.roomName }) }).catch(() => {});
      }
      resetCall(true);
      const message = mediaError(err);
      setError(message);
      return { success: false, error: message };
    } finally {
      busyRef.current = false;
    }
  }, [attachCallChannel, initializeSession, privateCallActive, resetCall]);

  const joinCall = useCallback(async (invitation = incomingCall) => {
    if (privateCallActive) return { success: false, error: 'ابتدا تماس خصوصی را پایان دهید' };
    if (busyRef.current || callStateRef.current !== 'idle') return { success: false, error: 'تماس دیگری فعال است' };
    if (!invitation?.callId || !invitation?.roomName) return { success: false, error: 'دعوت تماس نامعتبر است' };
    busyRef.current = true;
    setError(null);
    try {
      const call = await attachCallChannel(invitation.callId, invitation.roomName);
      const response = await apiRequest('/api/calls/group/join', {
        method: 'POST',
        body: JSON.stringify({ callId: invitation.callId, roomName: invitation.roomName }),
      });
      const session = response.session;
      if (!session?.callId || session.callId !== invitation.callId || session.roomName !== invitation.roomName) {
        throw new Error(response.error || 'جلسه تماس با دعوت مطابقت ندارد');
      }
      if (activeRef.current !== call) throw new Error('تماس لغو شد');
      setIncomingCall(null);
      await initializeSession(session, session.callType === 'video' ? 'video' : 'audio');
      return { success: true, callId: session.callId };
    } catch (err) {
      const call = activeRef.current;
      if (call?.callId) {
        apiRequest('/api/calls/group/leave', {
          method: 'POST',
          body: JSON.stringify({ callId: call.callId, roomName: call.roomName }),
        }).catch(() => {});
      }
      resetCall(true);
      const message = mediaError(err);
      setError(message);
      return { success: false, error: message };
    } finally {
      busyRef.current = false;
    }
  }, [attachCallChannel, incomingCall, initializeSession, privateCallActive, resetCall]);

  const declineIncomingCall = useCallback(() => setIncomingCall(null), []);

  const joinRoomCall = useCallback(async (room) => {
    if (!room) return { success: false, error: 'اتاقی انتخاب نشده است' };
    try {
      const response = await apiRequest(`/api/calls/group/active?roomName=${encodeURIComponent(room)}`);
      if (!response.session) return { success: false, error: 'تماس فعالی در اتاق وجود ندارد' };
      return joinCall({ callId: response.session.callId, roomName: response.session.roomName });
    } catch (err) {
      const message = mediaError(err);
      setError(message);
      return { success: false, error: message };
    }
  }, [joinCall]);

  const endCall = useCallback(async () => {
    const call = activeRef.current;
    if (!call || busyRef.current) return;
    busyRef.current = true;
    let failed = false;
    try {
      await apiRequest('/api/calls/group/leave', {
        method: 'POST',
        body: JSON.stringify({ callId: call.callId, roomName: call.roomName }),
      });
    } catch (err) {
      failed = true;
      setError(err.message || 'خروج از تماس ناموفق بود');
    } finally {
      resetCall(failed);
      busyRef.current = false;
    }
  }, [resetCall]);

  const toggleMute = useCallback(() => {
    const tracks = mediaRef.current?.getAudioTracks() || [];
    if (!tracks.length) return;
    const nextMuted = tracks.some((track) => track.enabled);
    tracks.forEach((track) => { track.enabled = !nextMuted; });
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);
    updateParticipant(userRef.current?.id, { isMuted: nextMuted });
    publishState();
  }, [publishState, updateParticipant]);

  const toggleVideo = useCallback(async () => {
    if (!activeRef.current || !mediaRef.current) return;
    try {
      if (isVideoOn) {
        const track = mediaRef.current.getVideoTracks()[0];
        await Promise.all(Array.from(pcsRef.current.values()).map((pc) => {
          const sender = pc.getSenders().find((item) => item.track?.kind === 'video' || item === pc.getTransceivers().find((t) => t.receiver.track.kind === 'video')?.sender);
          return sender?.replaceTrack(null);
        }));
        track?.stop();
        const next = new MediaStream(mediaRef.current.getAudioTracks());
        mediaRef.current = next;
        isVideoOnRef.current = false;
        setParticipants((previous) => previous.map((participant) => participant.isLocal ? { ...participant, stream: next, isVideoOn: false } : participant));
        setIsVideoOn(false);
        setCallType('audio');
        publishState();
        return;
      }
      const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      const track = camera.getVideoTracks()[0];
      if (!track || !activeRef.current) {
        stopStream(camera);
        return;
      }
      await Promise.all(Array.from(pcsRef.current.values()).map(async (pc) => {
        const transceiver = pc.getTransceivers().find((item) => item.receiver.track.kind === 'video');
        await transceiver?.sender.replaceTrack(track);
      }));
      const next = new MediaStream([...mediaRef.current.getAudioTracks(), track]);
      mediaRef.current = next;
      isVideoOnRef.current = true;
      setParticipants((previous) => previous.map((participant) => participant.isLocal ? { ...participant, stream: next, isVideoOn: true } : participant));
      setIsVideoOn(true);
      setCallType('video');
      publishState();
    } catch (err) {
      setError(mediaError(err));
    }
  }, [isVideoOn, publishState]);

  useEffect(() => {
    const room = currentRoom;
    let disposed = false;
    if (!connected || !room || room.startsWith('dm_')) {
      const clearTimer = setTimeout(() => {
        if (!disposed) setActiveRoomCall(null);
      }, 0);
      return () => {
        disposed = true;
        clearTimeout(clearTimer);
      };
    }
    const load = () => {
      apiRequest(`/api/calls/group/active?roomName=${encodeURIComponent(room)}`)
        .then((response) => {
          if (!disposed) setActiveRoomCall(response.session || null);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [connected, currentRoom]);

  useEffect(() => {
    const userId = currentUser?.id;
    if (!connected || userId == null) return undefined;
    let channel;
    try {
      channel = subscribeToNotifications(userId);
    } catch {
      return undefined;
    }
    const handler = (message) => {
      const invite = message.data;
      if (!invite?.callId || !invite?.roomName || String(invite.callerId) === String(userId)) return;
      if (privateActiveRef.current || callStateRef.current !== 'idle' || busyRef.current) return;
      setIncomingCall({ ...invite, callType: invite.callType === 'video' ? 'video' : 'audio' });
    };
    channel.subscribe('incoming-group-call', handler);
    return () => channel.unsubscribe('incoming-group-call', handler);
  }, [connected, currentUser?.id]);

  useEffect(() => {
    if (callState !== 'connected') return undefined;
    const startedAt = Date.now();
    const interval = setInterval(() => setDuration(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  useEffect(() => {
    if (callState === 'idle') return undefined;
    const sendHeartbeat = () => {
      const call = activeRef.current;
      if (!call?.callId) return;
      apiRequest('/api/calls/group/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ callId: call.callId }),
      }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [callState]);

  useEffect(() => {
    if (!currentUser?.id && activeRef.current) resetCall(true);
  }, [currentUser?.id, resetCall]);

  useEffect(() => () => {
    const call = activeRef.current;
    if (call) {
      apiRequest('/api/calls/group/leave', {
        method: 'POST',
        body: JSON.stringify({ callId: call.callId, roomName: call.roomName }),
      }).catch(() => {});
    }
    resetCall();
  }, [resetCall]);

  const stableStartCall = useCallback((...args) => startCall(...args), [startCall]);
  const stableJoinCall = useCallback((...args) => joinCall(...args), [joinCall]);

  return {
    callState,
    callType,
    roomName,
    activeRoomCall,
    participants,
    isMuted,
    isVideoOn,
    duration,
    error,
    incomingCall,
    startCall: stableStartCall,
    joinCall: stableJoinCall,
    joinRoomCall,
    declineIncomingCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}
