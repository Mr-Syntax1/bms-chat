import { useState, useRef, useCallback, useEffect } from 'react';
import {
  apinator,
  subscribeToWebRTC,
  unsubscribeFromWebRTC,
  getWebRTCChannelName,
  bindClientEvent,
  unbindClientEvent,
  triggerClientEvent,
  isChannelSubscribed,
} from '../lib/apinator';

const setVideoSenderParameters = async (sender, maxBitrate = 8_000_000) => {
  if (!sender || !sender.track || sender.track.kind !== 'video') return;
  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    params.encodings[0].maxBitrate = maxBitrate;
    await sender.setParameters(params);
    console.log(`[WebRTC] Video sender bitrate set to ${maxBitrate / 1_000_000} Mbps`);
  } catch (err) {
    console.warn('[WebRTC] Could not set video sender parameters:', err);
  }
};

const sendWebRTCWithCheck = (channelName, eventName, payload) => {
  if (!isChannelSubscribed(channelName)) {
    console.warn(`[WebRTC] Cannot send "${eventName}" on channel "${channelName}": not subscribed`);
    return false;
  }
  return triggerClientEvent(channelName, eventName, payload);
};

// تابع کمکی برای انتظار امن برای سابسکرایب شدن کانال
const waitForSubscription = (channelName, timeoutMs = 5000) => {
  return new Promise((resolve, reject) => {
    const channel = apinator.channel(channelName);
    
    if (channel && channel.subscribed === true) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Subscription timeout'));
    }, timeoutMs);

    const onSubscribed = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      clearTimeout(timeout);
      if (channel) {
        channel.unbind('realtime:subscription_succeeded', onSubscribed);
      }
    };

    if (channel) {
      channel.bind('realtime:subscription_succeeded', onSubscribed);
    }
  });
};

export function useWebRTC(currentUser) {
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('audio');
  const [participants, setParticipants] = useState([]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [remoteStreamVersion, setRemoteStreamVersion] = useState(0);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const isInitiatorRef = useRef(false);
  const targetUserIdRef = useRef(null);
  const callStateRef = useRef(callState);
  const remoteStreamRef = useRef(null);
  const isScreenSharingDuringCallRef = useRef(false);
  const screenVideoSenderRef = useRef(null);
  const screenAudioSenderRef = useRef(null);
  const isDeafenedRef = useRef(false);
  const isVideoOnRef = useRef(false);
  const pendingRenegotiationRef = useRef(false);
  const endCallRef = useRef(null);
  const webrtcChannelRef = useRef(null);
  const webrtcHandlersRef = useRef({});

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    isVideoOnRef.current = isVideoOn;
  }, [isVideoOn]);

  useEffect(() => {
    isDeafenedRef.current = isDeafened;
  }, [isDeafened]);

  const syncRemoteStream = useCallback((tracks) => {
    const live = tracks.filter((t) => t && t.readyState !== 'ended');
    const audioTracks = live.filter((t) => t.kind === 'audio');
    const videoTracks = live.filter((t) => t.kind === 'video');

    const activeVideo =
      [...videoTracks].reverse().find((t) => !t.muted) ||
      videoTracks[videoTracks.length - 1];

    const newStream = new MediaStream();
    audioTracks.forEach((t) => {
      t.enabled = !isDeafenedRef.current;
      newStream.addTrack(t);
    });
    if (activeVideo) newStream.addTrack(activeVideo);

    remoteStreamRef.current = newStream;
    setRemoteStream(newStream);
    setRemoteStreamVersion((v) => v + 1);
  }, []);

  const attachVideoTrack = async (peer, track, stream) => {
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
  };

  const syncFromPeer = useCallback(() => {
    if (!peerRef.current) return;
    const tracks = peerRef.current
      .getReceivers()
      .map((r) => r.track)
      .filter((t) => t && t.readyState !== 'ended');
    syncRemoteStream(tracks);
  }, [syncRemoteStream]);

  const attachTrackHandlers = useCallback(() => {
    if (!peerRef.current) return;
    peerRef.current.getReceivers().forEach((receiver) => {
      const track = receiver.track;
      if (!track || track._callHandlersAttached) return;
      track._callHandlersAttached = true;
      track.onunmute = () => syncFromPeer();
      track.onended = () => setTimeout(syncFromPeer, 100);
    });
  }, [syncFromPeer]);

  const sendWebRTC = useCallback((eventName, payload) => {
    if (!webrtcChannelRef.current || !targetUserIdRef.current) return;
    sendWebRTCWithCheck(webrtcChannelRef.current, eventName, payload);
  }, []);

  const endCall = useCallback(() => {
    console.log('[WebRTC] Ending call');

    const userId = currentUser?.id;
    const targetId = targetUserIdRef.current;
    const channelName = webrtcChannelRef.current;

    if (channelName && targetId) {
      if (peerRef.current) {
        if (isScreenSharingDuringCallRef.current) {
          sendWebRTC('webrtc-screen-unlock', {
            targetUserId: targetId,
          });
        }
        sendWebRTC('webrtc-hangup', { targetUserId: targetId });
      }

      webrtcChannelRef.current = null;

      setTimeout(() => {
        if (!userId || !targetId) return;
        try {
          unsubscribeFromWebRTC(userId, targetId);
        } catch (err) {
          console.warn('[WebRTC] Unsubscribe error:', err);
        }
      }, 200);
    }

    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }

    pendingCandidatesRef.current = [];
    pendingRenegotiationRef.current = false;
    targetUserIdRef.current = null;
    isInitiatorRef.current = false;
    isScreenSharingDuringCallRef.current = false;
    screenVideoSenderRef.current = null;
    screenAudioSenderRef.current = null;
    isDeafenedRef.current = false;

    setIsCalling(false);
    setIncomingCall(null);
    setRemoteUser(null);
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('ended');
    setIsMuted(false);
    setIsVideoOn(false);
    setIsScreenSharing(false);
    setIsDeafened(false);
    setParticipants([]);
    setRemoteScreenSharing(false);
  }, [currentUser, sendWebRTC]);

  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  const createPeer = useCallback(
    (targetUserId) => {
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          sendWebRTC('webrtc-ice-candidate', {
            targetUserId,
            candidate: event.candidate,
          });
        }
      };

      peer.ontrack = (event) => {
        const track = event.track;
        track.onunmute = () => {
          console.log('[WebRTC] Remote track unmuted:', track.kind);
          syncFromPeer();
        };
        if (track.kind === 'audio') {
          track.enabled = !isDeafenedRef.current;
        }
        attachTrackHandlers();
        syncFromPeer();
      };

      peer.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', peer.connectionState);
        if (
          peer.connectionState === 'disconnected' ||
          peer.connectionState === 'failed'
        ) {
          if (callStateRef.current !== 'ended') endCall();
        } else if (peer.connectionState === 'connected') {
          setCallState('connected');
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state:', peer.iceConnectionState);
        if (
          peer.iceConnectionState === 'disconnected' ||
          peer.iceConnectionState === 'failed'
        ) {
          if (callStateRef.current !== 'ended') endCall();
        }
      };

      return peer;
    },
    [endCall, syncFromPeer, attachTrackHandlers, sendWebRTC]
  );

  const addLocalTracks = useCallback((stream, peer) => {
    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });
  }, []);

  const processPendingCandidates = useCallback((peer) => {
    pendingCandidatesRef.current.forEach((candidate) => {
      peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
    });
    pendingCandidatesRef.current = [];
  }, []);

  const renegotiate = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer || !targetUserIdRef.current) return;

    if (peer.signalingState !== 'stable') {
      pendingRenegotiationRef.current = true;
      return;
    }

    pendingRenegotiationRef.current = false;
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendWebRTC('webrtc-offer', {
        targetUserId: targetUserIdRef.current,
        offer,
        renegotiate: true,
      });
    } catch (err) {
      console.error('Renegotiation failed:', err);
    }
  }, [sendWebRTC]);

  const setupWebRTCListeners = useCallback((channelName) => {
    const handleOffer = async ({
      fromUserId,
      fromUsername,
      offer,
      renegotiate: isRenegotiation,
    }) => {
      if (
        isRenegotiation &&
        callStateRef.current === 'connected' &&
        fromUserId === targetUserIdRef.current
      ) {
        const peer = peerRef.current;
        if (!peer) return;
        try {
          if (peer.signalingState === 'have-local-offer') {
            const amPolite = !currentUser || String(currentUser.id) < String(fromUserId);
            if (amPolite) {
              await peer.setLocalDescription({ type: 'rollback' });
              await peer.setRemoteDescription(new RTCSessionDescription(offer));
              pendingRenegotiationRef.current = true;
            } else {
              console.log('[WebRTC] Glare: impolite side ignores remote offer');
              return;
            }
          } else {
            await peer.setRemoteDescription(new RTCSessionDescription(offer));
          }

          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          sendWebRTC('webrtc-answer', { targetUserId: fromUserId, answer });

          attachTrackHandlers();
          syncFromPeer();
          setTimeout(() => {
            if (peerRef.current) {
              attachTrackHandlers();
              syncFromPeer();
            }
          }, 400);
        } catch (err) {
          console.error('Renegotiation answer failed:', err);
        }
        return;
      }

      if (callStateRef.current !== 'idle' && callStateRef.current !== 'ended') {
        return;
      }
      setIncomingCall({ fromUserId, fromUsername, offer });
      setCallState('ringing');
    };

    const handleAnswer = async ({ fromUserId, answer }) => {
      if (peerRef.current && fromUserId === targetUserIdRef.current) {
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        processPendingCandidates(peerRef.current);
        attachTrackHandlers();
        syncFromPeer();

        if (pendingRenegotiationRef.current) {
          pendingRenegotiationRef.current = false;
          setTimeout(() => renegotiate(), 0);
        }
      }
    };

    const handleIceCandidate = async ({ fromUserId, candidate }) => {
      if (peerRef.current && fromUserId === targetUserIdRef.current) {
        if (peerRef.current.remoteDescription) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      }
    };

    const handleHangup = ({ fromUserId }) => {
      if (callStateRef.current !== 'idle' && callStateRef.current !== 'ended') {
        if (!targetUserIdRef.current || fromUserId === targetUserIdRef.current) {
          console.log('[WebRTC] Remote hangup received, ending call');
          if (endCallRef.current) endCallRef.current();
        }
      }
    };

    const handleStreamUpdated = () => {
      if (!peerRef.current) return;
      attachTrackHandlers();
      syncFromPeer();
      setTimeout(() => {
        if (peerRef.current) {
          attachTrackHandlers();
          syncFromPeer();
        }
      }, 400);
    };

    const handleScreenLock = () => {
      setRemoteScreenSharing(true);
    };

    const handleScreenUnlock = () => {
      setRemoteScreenSharing(false);
      setTimeout(() => {
        if (peerRef.current) {
          attachTrackHandlers();
          syncFromPeer();
        }
      }, 200);
    };

    webrtcHandlersRef.current = {
      handleOffer,
      handleAnswer,
      handleIceCandidate,
      handleHangup,
      handleStreamUpdated,
      handleScreenLock,
      handleScreenUnlock,
    };

    bindClientEvent(channelName, 'webrtc-offer', handleOffer);
    bindClientEvent(channelName, 'webrtc-answer', handleAnswer);
    bindClientEvent(channelName, 'webrtc-ice-candidate', handleIceCandidate);
    bindClientEvent(channelName, 'webrtc-hangup', handleHangup);
    bindClientEvent(channelName, 'webrtc-stream-updated', handleStreamUpdated);
    bindClientEvent(channelName, 'webrtc-screen-lock', handleScreenLock);
    bindClientEvent(channelName, 'webrtc-screen-unlock', handleScreenUnlock);
  }, [processPendingCandidates, renegotiate, syncFromPeer, attachTrackHandlers, currentUser, sendWebRTC]);

  const cleanupWebRTCListeners = useCallback((channelName) => {
    const handlers = webrtcHandlersRef.current;
    if (handlers) {
      unbindClientEvent(channelName, 'webrtc-offer', handlers.handleOffer);
      unbindClientEvent(channelName, 'webrtc-answer', handlers.handleAnswer);
      unbindClientEvent(channelName, 'webrtc-ice-candidate', handlers.handleIceCandidate);
      unbindClientEvent(channelName, 'webrtc-hangup', handlers.handleHangup);
      unbindClientEvent(channelName, 'webrtc-stream-updated', handlers.handleStreamUpdated);
      unbindClientEvent(channelName, 'webrtc-screen-lock', handlers.handleScreenLock);
      unbindClientEvent(channelName, 'webrtc-screen-unlock', handlers.handleScreenUnlock);
      webrtcHandlersRef.current = {};
    }
  }, []);

  const startCall = useCallback(
    async (targetUserId, targetUsername, type = 'audio') => {
      try {
        setCallType(type);
        setIsCalling(true);
        setCallState('ringing');
        isInitiatorRef.current = true;
        targetUserIdRef.current = targetUserId;
        setRemoteUser({ id: targetUserId, username: targetUsername });

        remoteStreamRef.current = new MediaStream();
        setRemoteStream(remoteStreamRef.current);

        const constraints = type === 'video'
          ? {
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
            audio: true
          }
          : { video: false, audio: true };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraStreamRef.current = stream;
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsVideoOn(type === 'video');
        setIsMuted(false);

        if (currentUser) {
          setParticipants([
            { id: currentUser.id, username: currentUser.username, isLocal: true, muted: false, video: type === 'video', screenSharing: false, speaking: false },
            { id: targetUserId, username: targetUsername, isLocal: false, muted: false, video: false, screenSharing: false, speaking: false },
          ]);
        }

        const channelName = getWebRTCChannelName(currentUser.id, targetUserId);
        webrtcChannelRef.current = channelName;

        subscribeToWebRTC(currentUser.id, targetUserId);
        await waitForSubscription(channelName); // 👈 استفاده از تابع کمکی جدید

        setupWebRTCListeners(channelName);

        const peer = createPeer(targetUserId);
        peerRef.current = peer;
        addLocalTracks(stream, peer);
        attachTrackHandlers();

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        sendWebRTC('webrtc-offer', { targetUserId, offer });
      } catch (err) {
        console.error('Error starting call:', err);
        endCall();
      }
    },
    [createPeer, addLocalTracks, attachTrackHandlers, currentUser, endCall, setupWebRTCListeners, sendWebRTC]
  );

  const answerCall = useCallback(
    async (type = 'audio') => {
      if (!incomingCall) return;
      const { fromUserId, fromUsername, offer } = incomingCall;

      try {
        setCallType(type);
        setRemoteUser({ id: fromUserId, username: fromUsername });
        setIsCalling(true);
        setCallState('connecting');
        isInitiatorRef.current = false;
        targetUserIdRef.current = fromUserId;

        remoteStreamRef.current = new MediaStream();
        setRemoteStream(remoteStreamRef.current);

        const constraints = type === 'video'
          ? {
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
            audio: true
          }
          : { video: false, audio: true };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraStreamRef.current = stream;
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsVideoOn(type === 'video');
        setIsMuted(false);

        if (currentUser) {
          setParticipants([
            { id: currentUser.id, username: currentUser.username, isLocal: true, muted: false, video: type === 'video', screenSharing: false, speaking: false },
            { id: fromUserId, username: fromUsername, isLocal: false, muted: false, video: false, screenSharing: false, speaking: false },
          ]);
        }

        const channelName = getWebRTCChannelName(currentUser.id, fromUserId);
        webrtcChannelRef.current = channelName;

        subscribeToWebRTC(currentUser.id, fromUserId);
        await waitForSubscription(channelName); // 👈 استفاده از تابع کمکی جدید

        setupWebRTCListeners(channelName);

        const peer = createPeer(fromUserId);
        peerRef.current = peer;
        addLocalTracks(stream, peer);

        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        processPendingCandidates(peer);
        attachTrackHandlers();

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendWebRTC('webrtc-answer', { targetUserId: fromUserId, answer });
        setIncomingCall(null);
      } catch (err) {
        console.error('Error answering call:', err);
        endCall();
      }
    },
    [incomingCall, createPeer, addLocalTracks, processPendingCandidates, attachTrackHandlers, currentUser, endCall, setupWebRTCListeners, sendWebRTC]
  );

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        setParticipants((prev) =>
          prev.map((p) => (p.isLocal ? { ...p, muted: !audioTrack.enabled } : p))
        );
      }
    }
  }, []);

  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => {
      const next = !prev;
      isDeafenedRef.current = next;
      const stream = remoteStreamRef.current;
      if (stream) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  const toggleVideo = useCallback(async () => {
    if (isScreenSharingDuringCallRef.current) {
      console.warn('[WebRTC] Cannot toggle camera while screen sharing');
      return;
    }

    if (!isVideoOnRef.current) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
          audio: false,
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        let needsRenegotiation = false;

        const combined = new MediaStream(localStreamRef.current.getTracks());
        combined.addTrack(videoTrack);
        localStreamRef.current = combined;
        setLocalStream(combined);

        if (peerRef.current) {
          const sender = peerRef.current.getSenders().find((s) => s.track?.kind === 'video');

          if (sender) {
            await sender.replaceTrack(videoTrack);
            await setVideoSenderParameters(sender, 8_000_000);
          } else {
            const newSender = await attachVideoTrack(peerRef.current, videoTrack, combined);
            await setVideoSenderParameters(newSender, 8_000_000);
            needsRenegotiation = true;
          }
        }

        if (targetUserIdRef.current) {
          sendWebRTC('webrtc-stream-updated', { targetUserId: targetUserIdRef.current });
        }
        if (needsRenegotiation) {
          await renegotiate();
        }
        setIsVideoOn(true);
        setCallType('video');
        setParticipants((prev) =>
          prev.map((p) => (p.isLocal ? { ...p, video: true } : p))
        );
      } catch (err) {
        console.error('Cannot access camera:', err);
      }
    } else {
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        let needsRenegotiation = false;
        if (peerRef.current) {
          const sender = peerRef.current.getSenders().find((s) => s.track === videoTrack);
          if (sender) {
            peerRef.current.removeTrack(sender);
            needsRenegotiation = true;
          }
        }
        videoTrack.stop();
        localStreamRef.current.removeTrack(videoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        if (targetUserIdRef.current) {
          sendWebRTC('webrtc-stream-updated', { targetUserId: targetUserIdRef.current });
        }
        if (needsRenegotiation) {
          await renegotiate();
        }
        setIsVideoOn(false);
        setCallType('audio');
        setParticipants((prev) =>
          prev.map((p) => (p.isLocal ? { ...p, video: false } : p))
        );
      }
    }
  }, [renegotiate, sendWebRTC]);

  const stopScreenShareInternal = useCallback(async () => {
    isScreenSharingDuringCallRef.current = false;

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      screenStreamRef.current = null;
    }

    let needsRenegotiation = false;

    if (peerRef.current) {
      if (screenVideoSenderRef.current) {
        const sender = screenVideoSenderRef.current;
        const cameraVideoTrack = cameraStreamRef.current?.getVideoTracks()[0];
        if (cameraVideoTrack && isVideoOnRef.current) {
          cameraVideoTrack.enabled = true;
          if (cameraVideoTrack.readyState === 'live') {
            await sender.replaceTrack(cameraVideoTrack);
          } else {
            peerRef.current.removeTrack(sender);
            needsRenegotiation = true;
          }
        } else {
          peerRef.current.removeTrack(sender);
          needsRenegotiation = true;
        }
        screenVideoSenderRef.current = null;
      }

      if (screenAudioSenderRef.current) {
        try {
          peerRef.current.removeTrack(screenAudioSenderRef.current);
        } catch (e) {
          console.error('Error removing screen audio sender:', e);
        }
        screenAudioSenderRef.current = null;
        needsRenegotiation = true;
      }
    }

    if (needsRenegotiation) {
      await renegotiate();
    } else if (targetUserIdRef.current) {
      sendWebRTC('webrtc-stream-updated', { targetUserId: targetUserIdRef.current });
    }

    if (targetUserIdRef.current) {
      sendWebRTC('webrtc-screen-unlock', { targetUserId: targetUserIdRef.current });
    }

    if (cameraStreamRef.current) {
      localStreamRef.current = cameraStreamRef.current;
      setLocalStream(cameraStreamRef.current);
    }
    setIsScreenSharing(false);
    setCallType(isVideoOnRef.current ? 'video' : 'audio');
    setParticipants((prev) =>
      prev.map((p) =>
        p.isLocal ? { ...p, screenSharing: false, video: isVideoOnRef.current } : p
      )
    );
  }, [renegotiate, sendWebRTC]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharingDuringCallRef.current) {
      await stopScreenShareInternal();
      return;
    }

    if (!peerRef.current) return;

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

      const videoSender = peerRef.current
        .getSenders()
        .find((s) => s.track?.kind === 'video' && s.track.readyState === 'live');

      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
        await setVideoSenderParameters(videoSender, 8_000_000);
        screenVideoSenderRef.current = videoSender;
      } else {
        const newSender = await attachVideoTrack(peerRef.current, screenTrack, screenStream);
        await setVideoSenderParameters(newSender, 8_000_000);
        screenVideoSenderRef.current = newSender;
        needsRenegotiation = true;
      }

      const micTrack = cameraStreamRef.current?.getAudioTracks()[0];
      const previewTracks = micTrack ? [screenTrack, micTrack] : [screenTrack];
      const local = new MediaStream(previewTracks);
      localStreamRef.current = local;
      setLocalStream(local);

      if (needsRenegotiation) {
        await renegotiate();
      } else if (targetUserIdRef.current) {
        sendWebRTC('webrtc-stream-updated', { targetUserId: targetUserIdRef.current });
      }

      if (targetUserIdRef.current) {
        sendWebRTC('webrtc-screen-lock', { targetUserId: targetUserIdRef.current });
      }

      setIsScreenSharing(true);
      isScreenSharingDuringCallRef.current = true;
      setCallType('screen');
      setParticipants((prev) =>
        prev.map((p) =>
          p.isLocal ? { ...p, screenSharing: true, video: true } : p
        )
      );

      screenTrack.onended = async () => {
        if (!isScreenSharingDuringCallRef.current) return;
        await stopScreenShareInternal();
      };
    } catch (err) {
      console.error('Cannot share screen:', err);
    }
  }, [renegotiate, stopScreenShareInternal, sendWebRTC]);

  const declineCall = useCallback(() => {
    if (incomingCall) {
      if (webrtcChannelRef.current && currentUser?.id) {
        sendWebRTC('webrtc-hangup', { targetUserId: incomingCall.fromUserId });

        setTimeout(() => {
          if (currentUser?.id && incomingCall.fromUserId) {
            try {
              unsubscribeFromWebRTC(currentUser.id, incomingCall.fromUserId);
            } catch (err) {
              console.warn('[WebRTC] Decline unsubscribe error:', err);
            }
          }
        }, 200);
      }

      setIncomingCall(null);
      setCallState('ended');
    }
  }, [incomingCall, currentUser, sendWebRTC]);

  useEffect(() => {
    return () => {
      if (webrtcChannelRef.current && targetUserIdRef.current) {
        cleanupWebRTCListeners(webrtcChannelRef.current);
        try {
          unsubscribeFromWebRTC(currentUser?.id, targetUserIdRef.current);
        } catch (err) {
          console.warn('[WebRTC] Unsubscribe error:', err);
        }
      }
    };
  }, [currentUser, cleanupWebRTCListeners]);

  return {
    isCalling,
    incomingCall,
    remoteUser,
    localStream,
    remoteStream,
    remoteStreamVersion,
    callState,
    callType,
    participants,
    isMuted,
    isVideoOn,
    isScreenSharing,
    isDeafened,
    remoteScreenSharing,
    startCall,
    answerCall,
    endCall,
    declineCall,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
  };
}