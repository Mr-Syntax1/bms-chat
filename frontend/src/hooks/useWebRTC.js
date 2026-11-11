import { useState, useRef, useCallback, useEffect } from 'react';
import { socket } from '../socket';

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
    const remoteStreamRef = useRef(null); //  استریم ریموت دائمی
    const isScreenSharingDuringCallRef = useRef(false);
    const screenVideoSenderRef = useRef(null);
    const screenAudioSenderRef = useRef(null);
    const isDeafenedRef = useRef(false);
    const isVideoOnRef = useRef(false);
    const pendingRenegotiationRef = useRef(false);
    const endCallRef = useRef(null);


    // همگام‌سازی refها
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
    // استریم ریموت دائمی — یک آبجکت یکتا که ترک‌ها به آن
    //    اضافه/حذف می‌شوند؛ دیگر srcObject عوض نمی‌شود و صدا قطع نمی‌شود
    // ============================================================

    const syncRemoteStream = useCallback((tracks) => {
        // ✅ یک MediaStream جدید بساز تا React تغییر را تشخیص دهد
        const newStream = new MediaStream();

        tracks.forEach((t) => {
            if (t && t.readyState === 'live') {
                newStream.addTrack(t);
            }
        });

        // اعمال deafen
        newStream.getAudioTracks().forEach((t) => {
            t.enabled = !isDeafenedRef.current;
        });

        setRemoteStream(newStream);
        setRemoteStreamVersion((v) => v + 1);
    }, []);

    // ============================================================
    // ۱) endCall
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
    // ۲) createPeer
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

            //  هر ترک جدید را به استریم دائمی اضافه کن، نه جایگزین
            peer.ontrack = (event) => {
                const track = event.track;

                // اضافه کردن شنونده برای زمانی که ترک واقعاً فعال می‌شود
                track.onunmute = () => {
                    console.log('[WebRTC] Remote track unmuted:', track.kind);
                    const receivers = peerRef.current.getReceivers();
                    const tracks = receivers.map((r) => r.track).filter(Boolean);
                    syncRemoteStream(tracks);
                };

                if (track.kind === 'audio') {
                    track.enabled = !isDeafenedRef.current;
                }

                const receivers = peerRef.current.getReceivers();
                const tracks = receivers.map((r) => r.track).filter(Boolean);
                syncRemoteStream(tracks);
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
        [endCall, syncRemoteStream]
    );

    // ============================================================
    // ۳) توابع کمکی
    // ============================================================
    const addLocalTracks = useCallback((stream, peer) => {
        stream.getTracks().forEach((track) => {
            peer.addTrack(track, stream);
        });
    }, []);

    const setupRemoteTrackEndHandlers = useCallback(() => {
        if (!peerRef.current) return;
        const receivers = peerRef.current.getReceivers();
        receivers.forEach((receiver) => {
            const track = receiver.track;
            if (track && !track._handlersAttached) {
                track._handlersAttached = true;

                track.onended = () => {
                    console.log('[WebRTC] Remote track ended:', track.kind);
                    setTimeout(() => {
                        if (peerRef.current) {
                            const currentReceivers = peerRef.current.getReceivers();
                            const liveTracks = currentReceivers
                                .map((r) => r.track)
                                .filter((t) => t && t.readyState === 'live');
                            syncRemoteStream(liveTracks);
                        }
                    }, 100);
                };

                // ✅ اضافه کردن onunmute برای زمانی که replaceTrack استفاده می‌شود
                track.onunmute = () => {
                    console.log('[WebRTC] Remote track unmuted:', track.kind);
                    const currentReceivers = peerRef.current.getReceivers();
                    const liveTracks = currentReceivers
                        .map((r) => r.track)
                        .filter((t) => t && t.readyState === 'live');
                    syncRemoteStream(liveTracks);
                };
            }
        });
    }, [syncRemoteStream]);

    const processPendingCandidates = useCallback((peer) => {
        pendingCandidatesRef.current.forEach((candidate) => {
            peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        });
        pendingCandidatesRef.current = [];
    }, []);

    // ============================================================
    // Renegotiation helper — فقط وقتی signalingState پایدار است
    // ============================================================
    const renegotiate = useCallback(async () => {
        const peer = peerRef.current;
        if (!peer || !targetUserIdRef.current) return;

        if (peer.signalingState !== 'stable') {
            pendingRenegotiationRef.current = true;
            return;
        }

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
    // ۴) startCall
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

                // استریم ریموت تازه برای تماس جدید
                remoteStreamRef.current = new MediaStream();
                setRemoteStream(remoteStreamRef.current);

                const constraints =
                    type === 'video'
                        ? { video: true, audio: true }
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
                setupRemoteTrackEndHandlers();

                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                socket.emit('webrtc-offer', { targetUserId, offer });
            } catch (err) {
                console.error('Error starting call:', err);
                endCall();
            }
        },
        [createPeer, addLocalTracks, currentUser, endCall, setupRemoteTrackEndHandlers]
    );

    // ============================================================
    // ۵) answerCall
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

                //  استریم ریموت تازه
                remoteStreamRef.current = new MediaStream();
                setRemoteStream(remoteStreamRef.current);

                const constraints =
                    type === 'video'
                        ? { video: true, audio: true }
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
                setupRemoteTrackEndHandlers();

                await peer.setRemoteDescription(new RTCSessionDescription(offer));
                processPendingCandidates(peer);

                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                socket.emit('webrtc-answer', { targetUserId: fromUserId, answer });
                setIncomingCall(null);
                //  connected را onconnectionstatechange ست می‌کند
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
            currentUser,
            endCall,
            setupRemoteTrackEndHandlers,
        ]
    );

    // ============================================================
    // ۶) کنترل‌ها
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

    // deafen روی ref اعمال می‌شود تا با تعویض استریم از بین نرود
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
        // حین screen share، sender ویدیو متعلق به اسکرین است؛ نزن
        if (isScreenSharingDuringCallRef.current) {
            console.warn('[WebRTC] Cannot toggle camera while screen sharing');
            return;
        }

        if (!isVideoOnRef.current) {
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
                const videoTrack = videoStream.getVideoTracks()[0];

                let needsRenegotiation = false;

                //  ابتدا استریم ترکیبی را بساز، بعد addTrack با همان استریم
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
                    } else {
                        peerRef.current.addTrack(videoTrack, combined);
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
    // توقف شیر اسکرین
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
            // --- ویدیوی اسکرین ---
            if (screenVideoSenderRef.current) {
                const sender = screenVideoSenderRef.current;
                const cameraVideoTrack = cameraStreamRef.current?.getVideoTracks()[0];
                if (cameraVideoTrack && isVideoOnRef.current) {
                    // دوربین روشن بوده → دوربین را برگردان
                    // اطمینان از اینکه تراک دوربین فعال و زنده است
                    cameraVideoTrack.enabled = true;
                    if (cameraVideoTrack.readyState === 'live') {
                        await sender.replaceTrack(cameraVideoTrack);
                    } else {
                        console.warn('[WebRTC] Camera track not live, removing sender and renegotiating');
                        peerRef.current.removeTrack(sender);
                        needsRenegotiation = true;
                    }
                } else {
                    // در تماس صوتی اضافه شده بود → حذف و renegotiate
                    peerRef.current.removeTrack(sender);
                    needsRenegotiation = true;
                }
                screenVideoSenderRef.current = null;
            }

            // --- صدای اسکرین ---
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
        } else {
            if (targetUserIdRef.current) {
                socket.emit('webrtc-stream-updated', {
                    targetUserId: targetUserIdRef.current,
                });
            }
        }

        if (targetUserIdRef.current) {
            socket.emit('webrtc-screen-unlock', {
                targetUserId: targetUserIdRef.current,
            });
        }

        // بازگردانی پیش‌نمایش محلی به دوربین + میکروفون
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
    // ۷) toggleScreenShare
    // ============================================================
    const toggleScreenShare = useCallback(async () => {
        if (isScreenSharingDuringCallRef.current) {
            await stopScreenShareInternal();
            return;
        }

        if (!peerRef.current) return;

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: false,
            });
            const screenTrack = screenStream.getVideoTracks()[0];
            const screenAudioTrack = screenStream.getAudioTracks()[0];

            if (!screenTrack) {
                screenStream.getTracks().forEach((t) => t.stop());
                return;
            }

            screenStreamRef.current = screenStream;
            let needsRenegotiation = false;

            // --- ویدیو ---
            const videoSender = peerRef.current
                .getSenders()
                .find((s) => s.track?.kind === 'video' && s.track.readyState === 'live');

            if (videoSender) {
                await videoSender.replaceTrack(screenTrack);
                screenVideoSenderRef.current = videoSender;
            } else {
                screenVideoSenderRef.current = peerRef.current.addTrack(
                    screenTrack,
                    screenStream
                );
                needsRenegotiation = true;
            }

            // --- صدای اسکرین: همیشه ترک جداگانه ---
            if (screenAudioTrack) {
                // حذف هر sender صوتی قبلیِ اسکرین (برای جلوگیری از انباشت)
                if (screenAudioSenderRef.current) {
                    try {
                        peerRef.current.removeTrack(screenAudioSenderRef.current);
                    } catch (e) {
                        screenAudioSenderRef.current = null;
                        console.log(e);
                    }
                }
                screenAudioSenderRef.current = peerRef.current.addTrack(
                    screenAudioTrack,
                    screenStream
                );
                needsRenegotiation = true;
            }

            // پیش‌نمایش محلی
            const micTrack = cameraStreamRef.current?.getAudioTracks()[0];
            const previewTracks = micTrack ? [screenTrack, micTrack] : [screenTrack];
            const local = new MediaStream(previewTracks);
            localStreamRef.current = local;
            setLocalStream(local);

            if (needsRenegotiation) {
                await renegotiate();
            } else {
                // اگر از replaceTrack استفاده شده (بدون نیاز به renegotiation)، فوراً اطلاع بده
                if (targetUserIdRef.current) {
                    socket.emit('webrtc-stream-updated', {
                        targetUserId: targetUserIdRef.current,
                    });
                }
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
    // ۸) declineCall
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
    // ۹) listenerهای سوکت
    // ============================================================
    useEffect(() => {
        const handleOffer = async ({ fromUserId, fromUsername, offer, renegotiate: isRenegotiation }) => {
            if (
                isRenegotiation &&
                callStateRef.current === 'connected' &&
                fromUserId === targetUserIdRef.current
            ) {
                try {
                    const peer = peerRef.current;
                    if (!peer) return;
                    if (peer.signalingState !== 'stable') {
                        await Promise.all([
                            peer.setLocalDescription({ type: 'rollback' }),
                            peer.setRemoteDescription(new RTCSessionDescription(offer)),
                        ]);
                    } else {
                        await peer.setRemoteDescription(new RTCSessionDescription(offer));
                    }

                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);
                    socket.emit('webrtc-answer', { targetUserId: fromUserId, answer });

                    // سینک اولیه
                    const receivers = peer.getReceivers();
                    const tracks = receivers.map((r) => r.track).filter(Boolean);
                    syncRemoteStream(tracks);
                    setupRemoteTrackEndHandlers();

                    // ✅ سینک دوباره با تاخیر برای رفع مشکل بار دوم
                    setTimeout(() => {
                        if (peerRef.current) {
                            const currentReceivers = peerRef.current.getReceivers();
                            const liveTracks = currentReceivers.map((r) => r.track).filter((t) => t && t.readyState === 'live');
                            syncRemoteStream(liveTracks);
                        }
                    }, 500);

                } catch (err) {
                    console.error('Renegotiation answer failed:', err);
                }
                return;
            }
            // ...
            if (callStateRef.current !== 'idle' && callStateRef.current !== 'ended') {
                return;
            }
            setIncomingCall({ fromUserId, fromUsername, offer });
            setCallState('ringing');
        };

        const handleAnswer = async ({ fromUserId, answer }) => {
            if (peerRef.current && fromUserId === targetUserIdRef.current) {
                await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                processPendingCandidates(peerRef.current);
                setupRemoteTrackEndHandlers();

                //  سینک کردن پس از تکمیل مذاکره
                const receivers = peerRef.current.getReceivers();
                const tracks = receivers.map((r) => r.track).filter(Boolean);
                syncRemoteStream(tracks);

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
                    if (endCallRef.current) {
                        endCallRef.current();
                    }
                }
            }
        };

        // همگام‌سازی استریم دائمی با receiverهای فعلی
        // همگام‌سازی استریم دائمی با receiverهای فعلی
        const handleStreamUpdated = () => {
            if (!peerRef.current) return;

            const doSync = () => {
                if (!peerRef.current) return;
                const receivers = peerRef.current.getReceivers();
                const tracks = receivers
                    .map((r) => r.track)
                    .filter((t) => t && t.readyState === 'live');
                syncRemoteStream(tracks);
                setupRemoteTrackEndHandlers();
            };

            // یک بار فوری
            doSync();
            // چند بار با تاخیر برای اطمینان از دریافت فریم‌های اولیه و رفع Mute شدن ترک
            setTimeout(doSync, 500);
            setTimeout(doSync, 1500);
        };

        const handleScreenLock = () => {
            setRemoteScreenSharing(true);
        };

        const handleScreenUnlock = () => {
            setRemoteScreenSharing(false);
            // Force sync after screen share stops
            setTimeout(() => {
                if (peerRef.current) {
                    const receivers = peerRef.current.getReceivers();
                    const tracks = receivers
                        .map((r) => r.track)
                        .filter((t) => t && t.readyState === 'live');
                    syncRemoteStream(tracks);
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
    }, [processPendingCandidates, endCall, syncRemoteStream, renegotiate, setupRemoteTrackEndHandlers]);

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