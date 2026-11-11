import { useState, useRef, useCallback, useEffect } from 'react';
import { socket } from '../socket';

// تابع کمکی برای تنظیم بیت‌ریت و فریم‌ریت ارسال ویدیو
const setVideoSenderParameters = async (sender, maxBitrate = 8_000_000) => {
    if (!sender || !sender.track || sender.track.kind !== 'video') return;
    try {
        const params = sender.getParameters();
        // در برخی مرورگرها (مثل فایرفاکس) ممکن است encodings خالی باشد
        if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
        }
        // تنظیم سقف بیت‌ریت (مثلاً 4 مگابیت بر ثانیه برای کیفیت بالا)
        params.encodings[0].maxBitrate = maxBitrate;
        // تنظیم نرخ فریم (اختیاری، اگر مطمئنی سخت‌افزار می‌کشد)
        // params.encodings[0].maxFramerate = 30;

        await sender.setParameters(params);
        console.log(`[WebRTC] Video sender bitrate set to ${maxBitrate / 1_000_000} Mbps`);
    } catch (err) {
        console.warn('[WebRTC] Could not set video sender parameters:', err);
    }
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

    // Ref sync
    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    useEffect(() => {
        isVideoOnRef.current = isVideoOn;
    }, [isVideoOn]);

    useEffect(() => {
        isDeafenedRef.current = isDeafened;
    }, [isDeafened]);

    // ============================================================
    // Remote stream sync — CRITICAL FIX #2:
    // filter `readyState !== 'ended'`, NOT `=== 'live'`.
    // A muted track is a TRANSIENT state (first frame not arrived,
    // replaceTrack in progress). Dropping it removes audio/video
    // from the UI exactly during renegotiation.
    // Also keeps remoteStreamRef.current ALWAYS current.
    // ============================================================
    const syncRemoteStream = useCallback((tracks) => {
        const live = tracks.filter((t) => t && t.readyState !== 'ended');
        const audioTracks = live.filter((t) => t.kind === 'audio');
        const videoTracks = live.filter((t) => t.kind === 'video');

        // Only one video track is ever shown (screen replaces camera).
        // Prefer the newest unmuted one; otherwise the newest live (muted is
        // transient). This stops a stale muted receiver shadowing the new track.
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

    // Attach lifecycle handlers to every receiver track exactly once.
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

    // ============================================================
    // 1) endCall
    // ============================================================
    const endCall = useCallback(() => {
        console.log('[WebRTC] Ending call');

        if (peerRef.current && targetUserIdRef.current) {
            if (isScreenSharingDuringCallRef.current) {
                socket.emit('webrtc-screen-unlock', {
                    targetUserId: targetUserIdRef.current,
                });
            }
            socket.emit('webrtc-hangup', { targetUserId: targetUserIdRef.current });
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
    }, []);

    useEffect(() => {
        endCallRef.current = endCall;
    }, [endCall]);

    // ============================================================
    // 2) createPeer
    // ============================================================
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
                    socket.emit('webrtc-ice-candidate', {
                        targetUserId,
                        candidate: event.candidate,
                    });
                }
            };

            peer.ontrack = (event) => {
                const track = event.track;
                // Keep muted-but-live tracks; only ended tracks are dropped,
                // and those are handled by syncFromPeer filtering.
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
        [endCall, syncFromPeer, attachTrackHandlers]
    );

    // ============================================================
    // 3) Helpers
    // ============================================================
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

    // ============================================================
    // Renegotiation helper — defers (never drops) when unstable
    // ============================================================
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
            socket.emit('webrtc-offer', {
                targetUserId: targetUserIdRef.current,
                offer,
                renegotiate: true,
            });
        } catch (err) {
            console.error('Renegotiation failed:', err);
        }
    }, []);

    // ============================================================
    // 4) startCall
    // ============================================================
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
                        video: {
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30, max: 30 }
                        },
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
                        {
                            id: currentUser.id,
                            username: currentUser.username,
                            isLocal: true,
                            muted: false,
                            video: type === 'video',
                            screenSharing: false,
                            speaking: false,
                        },
                        {
                            id: targetUserId,
                            username: targetUsername,
                            isLocal: false,
                            muted: false,
                            video: false,
                            screenSharing: false,
                            speaking: false,
                        },
                    ]);
                }

                const peer = createPeer(targetUserId);
                peerRef.current = peer;
                addLocalTracks(stream, peer);
                attachTrackHandlers();

                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                socket.emit('webrtc-offer', { targetUserId, offer });
            } catch (err) {
                console.error('Error starting call:', err);
                endCall();
            }
        },
        [createPeer, addLocalTracks, attachTrackHandlers, currentUser, endCall]
    );

    // ============================================================
    // 5) answerCall
    // ============================================================
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
                        video: {
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30, max: 30 }
                        },
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
                        {
                            id: currentUser.id,
                            username: currentUser.username,
                            isLocal: true,
                            muted: false,
                            video: type === 'video',
                            screenSharing: false,
                            speaking: false,
                        },
                        {
                            id: fromUserId,
                            username: fromUsername,
                            isLocal: false,
                            muted: false,
                            video: false,
                            screenSharing: false,
                            speaking: false,
                        },
                    ]);
                }

                const peer = createPeer(fromUserId);
                peerRef.current = peer;
                addLocalTracks(stream, peer);

                await peer.setRemoteDescription(new RTCSessionDescription(offer));
                processPendingCandidates(peer);
                attachTrackHandlers();

                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                socket.emit('webrtc-answer', { targetUserId: fromUserId, answer });
                setIncomingCall(null);
            } catch (err) {
                console.error('Error answering call:', err);
                endCall();
            }
        },
        [
            incomingCall,
            createPeer,
            addLocalTracks,
            processPendingCandidates,
            attachTrackHandlers,
            currentUser,
            endCall,
        ]
    );

    // ============================================================
    // 6) Controls
    // ============================================================
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
                setParticipants((prev) =>
                    prev.map((p) =>
                        p.isLocal ? { ...p, muted: !audioTrack.enabled } : p
                    )
                );
            }
        }
    }, []);

    const toggleDeafen = useCallback(() => {
        setIsDeafened((prev) => {
            const next = !prev;
            isDeafenedRef.current = next;
            // remoteStreamRef is kept current by syncRemoteStream
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
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30, max: 30 }
                    },
                    audio: false,
                });
                const videoTrack = videoStream.getVideoTracks()[0];
                let needsRenegotiation = false;

                const combined = new MediaStream(localStreamRef.current.getTracks());
                combined.addTrack(videoTrack);
                localStreamRef.current = combined;
                setLocalStream(combined);

                if (peerRef.current) {
                    const sender = peerRef.current
                        .getSenders()
                        .find((s) => s.track?.kind === 'video');

                    if (sender) {
                        await sender.replaceTrack(videoTrack);
                        // بعد از replaceTrack، پارامترها را تنظیم کن
                        await setVideoSenderParameters(sender, 8_000_000);
                    } else {
                        const newSender = await attachVideoTrack(peerRef.current, videoTrack, combined);
                        // بعد از ساخت sender جدید، پارامترها را تنظیم کن
                        await setVideoSenderParameters(newSender, 8_000_000);
                        needsRenegotiation = true;
                    }
                }


                if (targetUserIdRef.current) {
                    socket.emit('webrtc-stream-updated', {
                        targetUserId: targetUserIdRef.current,
                    });
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
                    const sender = peerRef.current
                        .getSenders()
                        .find((s) => s.track === videoTrack);
                    if (sender) {
                        peerRef.current.removeTrack(sender);
                        needsRenegotiation = true;
                    }
                }
                videoTrack.stop();
                localStreamRef.current.removeTrack(videoTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                if (targetUserIdRef.current) {
                    socket.emit('webrtc-stream-updated', {
                        targetUserId: targetUserIdRef.current,
                    });
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
    }, [renegotiate]);

    // ============================================================
    // Stop screen share
    // ============================================================
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
            socket.emit('webrtc-stream-updated', {
                targetUserId: targetUserIdRef.current,
            });
        }

        if (targetUserIdRef.current) {
            socket.emit('webrtc-screen-unlock', {
                targetUserId: targetUserIdRef.current,
            });
        }

        if (cameraStreamRef.current) {
            localStreamRef.current = cameraStreamRef.current;
            setLocalStream(cameraStreamRef.current);
        }
        setIsScreenSharing(false);
        setCallType(isVideoOnRef.current ? 'video' : 'audio');
        setParticipants((prev) =>
            prev.map((p) =>
                p.isLocal
                    ? { ...p, screenSharing: false, video: isVideoOnRef.current }
                    : p
            )
        );
    }, [renegotiate]);

    // ============================================================
    // 7) toggleScreenShare
    // ============================================================
    const toggleScreenShare = useCallback(async () => {
        if (isScreenSharingDuringCallRef.current) {
            await stopScreenShareInternal();
            return;
        }

        if (!peerRef.current) return;

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    frameRate: { ideal: 30, max: 60 } // فقط فریم‌ریت را محدود کن
                },
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
                // Camera was on → swap the track
                await videoSender.replaceTrack(screenTrack);
                // بعد از replaceTrack، پارامترها را تنظیم کن
                await setVideoSenderParameters(videoSender, 8_000_000);
                screenVideoSenderRef.current = videoSender;
            } else {
                // No live video sender
                const newSender = await attachVideoTrack(peerRef.current, screenTrack, screenStream);
                // بعد از ساخت sender جدید
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
                socket.emit('webrtc-stream-updated', {
                    targetUserId: targetUserIdRef.current,
                });
            }

            if (targetUserIdRef.current) {
                socket.emit('webrtc-screen-lock', {
                    targetUserId: targetUserIdRef.current,
                });
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
    }, [renegotiate, stopScreenShareInternal]);

    // ============================================================
    // 8) declineCall
    // ============================================================
    const declineCall = useCallback(() => {
        if (incomingCall) {
            socket.emit('webrtc-hangup', {
                targetUserId: incomingCall.fromUserId,
            });
            setIncomingCall(null);
            setCallState('ended');
        }
    }, [incomingCall]);

    // ============================================================
    // 9) Socket listeners
    // ============================================================
    useEffect(() => {
        const handleOffer = async ({
            fromUserId,
            fromUsername,
            offer,
            renegotiate: isRenegotiation,
        }) => {
            // ---------- Renegotiation offers (mid-call track changes) ----------
            if (
                isRenegotiation &&
                callStateRef.current === 'connected' &&
                fromUserId === targetUserIdRef.current
            ) {
                const peer = peerRef.current;
                if (!peer) return;
                try {
                    if (peer.signalingState === 'have-local-offer') {
                        // GLARE: both peers offered simultaneously.
                        // Perfect negotiation: deterministic politeness.
                        const amPolite = !currentUser || String(currentUser.id) < String(fromUserId);
                        if (amPolite) {
                            // CRITICAL FIX #1: rollback and setRemoteDescription
                            // MUST run sequentially. Never Promise.all them.
                            await peer.setLocalDescription({ type: 'rollback' });
                            await peer.setRemoteDescription(new RTCSessionDescription(offer));
                            // Our local changes were rolled back — re-signal them
                            // after this exchange completes (handleAnswer retries).
                            pendingRenegotiationRef.current = true;
                        } else {
                            console.log('[WebRTC] Glare: impolite side ignores remote offer');
                            return;
                        }
                    } else {
                        // stable OR have-remote-offer (accept newer offer replacing pending)
                        await peer.setRemoteDescription(new RTCSessionDescription(offer));
                    }

                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);
                    socket.emit('webrtc-answer', { targetUserId: fromUserId, answer });

                    attachTrackHandlers();
                    syncFromPeer();
                    // One delayed re-sync covers tracks that attach a beat later
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

            // ---------- Initial call offers ----------
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

                // Retry a deferred renegotiation (unstable state or glare rollback)
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

        const handleSocketDisconnect = () => {
            if (callStateRef.current !== 'idle' && callStateRef.current !== 'ended') {
                console.log('[WebRTC] Socket disconnected during call');
                endCall();
            }
        };

        socket.on('webrtc-offer', handleOffer);
        socket.on('webrtc-answer', handleAnswer);
        socket.on('webrtc-ice-candidate', handleIceCandidate);
        socket.on('webrtc-hangup', handleHangup);
        socket.on('webrtc-stream-updated', handleStreamUpdated);
        socket.on('webrtc-screen-lock', handleScreenLock);
        socket.on('webrtc-screen-unlock', handleScreenUnlock);
        socket.on('disconnect', handleSocketDisconnect);

        return () => {
            socket.off('webrtc-offer', handleOffer);
            socket.off('webrtc-answer', handleAnswer);
            socket.off('webrtc-ice-candidate', handleIceCandidate);
            socket.off('webrtc-hangup', handleHangup);
            socket.off('webrtc-stream-updated', handleStreamUpdated);
            socket.off('webrtc-screen-lock', handleScreenLock);
            socket.off('webrtc-screen-unlock', handleScreenUnlock);
            socket.off('disconnect', handleSocketDisconnect);
        };
    }, [
        processPendingCandidates,
        endCall,
        renegotiate,
        syncFromPeer,
        attachTrackHandlers,
        currentUser,
    ]);

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