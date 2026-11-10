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
    const getRemoteStream = useCallback(() => {
        if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
        }
        return remoteStreamRef.current;
    }, []);

    const syncRemoteStream = useCallback(
        (tracks) => {
            const stream = getRemoteStream();
            // حذف trackهایی که دیگه توی لیست نیستن یا readyState مرده دارن
            stream.getTracks().forEach((t) => {
                if (!tracks.includes(t) || t.readyState !== 'live') {
                    stream.removeTrack(t);
                }
            });
            // اضافه کردن trackهای جدید
            tracks.forEach((t) => {
                if (!stream.getTracks().includes(t)) stream.addTrack(t);
            });
            // اعمال deafen
            stream.getAudioTracks().forEach((t) => {
                t.enabled = !isDeafenedRef.current;
            });
            setRemoteStream(stream);
            setRemoteStreamVersion((v) => v + 1);
        },
        [getRemoteStream]
    );

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
                const stream = getRemoteStream();
                const track = event.track;

                // ✅ جدید: اگر ترک تمام شد (مثلاً فرستنده removeTrack کرده)، از استریم حذفش کن
                track.onended = () => {
                    const s = getRemoteStream();
                    if (s.getTracks().includes(track)) {
                        s.removeTrack(track);
                        setRemoteStream(s);
                        setRemoteStreamVersion((v) => v + 1);
                    }
                };

                if (!stream.getTracks().includes(track)) {
                    stream.addTrack(track);
                }
                if (track.kind === 'audio') {
                    track.enabled = !isDeafenedRef.current;
                }
                setRemoteStream(stream);
                setRemoteStreamVersion((v) => v + 1);
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
        [endCall, getRemoteStream]
    );

    // ============================================================
    // ۳) توابع کمکی
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

                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                socket.emit('webrtc-offer', { targetUserId, offer });
            } catch (err) {
                console.error('Error starting call:', err);
                endCall();
            }
        },
        [createPeer, addLocalTracks, currentUser, endCall]
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
                    await sender.replaceTrack(cameraVideoTrack);
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
        }

        if (targetUserIdRef.current) {
            socket.emit('webrtc-stream-updated', {
                targetUserId: targetUserIdRef.current,
            });
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
                    }
                }
                screenAudioSenderRef.current = peerRef.current.addTrack(
                    screenAudioTrack,
                    screenStream
                );
                needsRenegotiation = true;
            }

            if (needsRenegotiation) {
                await renegotiate();
            }

            // پیش‌نمایش محلی
            const micTrack = cameraStreamRef.current?.getAudioTracks()[0];
            const previewTracks = micTrack ? [screenTrack, micTrack] : [screenTrack];
            const local = new MediaStream(previewTracks);
            localStreamRef.current = local;
            setLocalStream(local);

            if (targetUserIdRef.current) {
                socket.emit('webrtc-stream-updated', {
                    targetUserId: targetUserIdRef.current,
                });
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

                    // ✅ جدید: بعد از پردازش offer، ترک‌های ended را از استریم حذف کن
                    {
                        const receivers = peer.getReceivers();
                        const tracks = receivers
                            .map((r) => r.track)
                            .filter((t) => t && t.readyState === 'live');
                        syncRemoteStream(tracks);
                    }

                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);
                    socket.emit('webrtc-answer', { targetUserId: fromUserId, answer });
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

                // اگه renegotiation معلق داریم، الان صدا بزن
                if (pendingRenegotiationRef.current) {
                    pendingRenegotiationRef.current = false;
                    // با کمی تأخیر تا signalingState به stable برسه
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
        const handleStreamUpdated = () => {
            if (!peerRef.current) return;

            const doSync = () => {
                if (!peerRef.current) return;
                const receivers = peerRef.current.getReceivers();
                const tracks = receivers
                    .map((r) => r.track)
                    .filter((t) => t && t.readyState === 'live');
                syncRemoteStream(tracks);
            };

            doSync();
            // ✅ جدید: دوباره بعد از اینکه renegotiation تمام شد امتحان کن
            setTimeout(doSync, 500);
            setTimeout(doSync, 1500);
        };

        const handleScreenLock = () => {
            setRemoteScreenSharing(true);
        };

        const handleScreenUnlock = () => {
            setRemoteScreenSharing(false);
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
    }, [processPendingCandidates, endCall, syncRemoteStream]);

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