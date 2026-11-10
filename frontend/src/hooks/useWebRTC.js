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

    const peerRef = useRef(null);
    const localStreamRef = useRef(null);
    const cameraStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const pendingCandidatesRef = useRef([]);
    const isInitiatorRef = useRef(false);
    const targetUserIdRef = useRef(null);
    const callStateRef = useRef(callState);
    const remoteStreamRef = useRef(remoteStream);

    // همگام‌سازی refها
    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    useEffect(() => {
        remoteStreamRef.current = remoteStream;
    }, [remoteStream]);

    // ============================================================
    // ۱) endCall
    // ============================================================
    const endCall = useCallback(() => {
        console.log('[WebRTC] Ending call');

        if (peerRef.current && targetUserIdRef.current) {
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
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }

        pendingCandidatesRef.current = [];
        targetUserIdRef.current = null;

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
    }, []);

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

            peer.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(new MediaStream(event.streams[0].getTracks()));
                } else if (event.track) {
                    setRemoteStream((prev) => {
                        const tracks = prev ? prev.getTracks() : [];
                        if (tracks.includes(event.track)) return prev;
                        return new MediaStream([...tracks, event.track]);
                    });
                }
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
        [endCall]
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
                    setParticipants((prev) => [
                        ...prev.filter(p => p.id !== fromUserId),
                        {
                            id: fromUserId,
                            username: fromUsername,
                            isLocal: false,
                            muted: false,
                            video: type === 'video',
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
                setCallState('connected');
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

    const toggleDeafen = useCallback(() => {
        setIsDeafened((prev) => {
            const next = !prev;
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
        if (!isVideoOn) {
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
                const videoTrack = videoStream.getVideoTracks()[0];

                if (peerRef.current) {
                    const sender = peerRef.current
                        .getSenders()
                        .find((s) => s.track?.kind === 'video');
                    if (sender) {
                        await sender.replaceTrack(videoTrack);
                    } else {
                        peerRef.current.addTrack(videoTrack, localStreamRef.current);
                    }
                }

                if (localStreamRef.current) {
                    localStreamRef.current.addTrack(videoTrack);
                    setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                }
                setIsVideoOn(true);
                setCallType(isScreenSharing ? 'screen' : 'video');
                setParticipants((prev) =>
                    prev.map((p) => (p.isLocal ? { ...p, video: true } : p))
                );
            } catch (err) {
                console.error('Cannot access camera:', err);
            }
        } else {
            const videoTrack = localStreamRef.current?.getVideoTracks()[0];
            if (videoTrack) {
                if (peerRef.current) {
                    const sender = peerRef.current
                        .getSenders()
                        .find((s) => s.track === videoTrack);
                    if (sender) peerRef.current.removeTrack(sender);
                }
                videoTrack.stop();
                localStreamRef.current.removeTrack(videoTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                setIsVideoOn(false);
                setCallType(isScreenSharing ? 'screen' : 'audio');
                setParticipants((prev) =>
                    prev.map((p) => (p.isLocal ? { ...p, video: false } : p))
                );
            }
        }
    }, [isVideoOn, isScreenSharing]);

    const toggleScreenShare = useCallback(async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: true,
                });
                const screenTrack = screenStream.getVideoTracks()[0];
                const screenAudioTrack = screenStream.getAudioTracks()[0];
                screenStreamRef.current = screenStream;

                if (peerRef.current) {
                    const videoSender = peerRef.current
                        .getSenders()
                        .find((s) => s.track?.kind === 'video');
                    if (videoSender) {
                        await videoSender.replaceTrack(screenTrack);
                    } else {
                        peerRef.current.addTrack(screenTrack, screenStream);
                    }

                    if (screenAudioTrack) {
                        const audioSender = peerRef.current
                            .getSenders()
                            .find((s) => s.track?.kind === 'audio');
                        if (audioSender) {
                            await audioSender.replaceTrack(screenAudioTrack);
                        }
                    }
                }

                if (targetUserIdRef.current) {
                    socket.emit('webrtc-stream-updated', {
                        targetUserId: targetUserIdRef.current,
                    });
                }

                const combinedStream = new MediaStream();
                if (cameraStreamRef.current) {
                    cameraStreamRef.current
                        .getAudioTracks()
                        .forEach((t) => combinedStream.addTrack(t));
                }
                combinedStream.addTrack(screenTrack);
                if (screenAudioTrack) combinedStream.addTrack(screenAudioTrack);

                setLocalStream(combinedStream);
                setIsScreenSharing(true);
                setCallType('screen');
                setParticipants((prev) =>
                    prev.map((p) =>
                        p.isLocal ? { ...p, screenSharing: true, video: true } : p
                    )
                );

                screenTrack.onended = () => {
                    toggleScreenShare();
                };
            } catch (err) {
                console.error('Cannot share screen:', err);
            }
        } else {
            screenStreamRef.current?.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;

            if (peerRef.current && cameraStreamRef.current) {
                const cameraVideoTrack = cameraStreamRef.current.getVideoTracks()[0];
                const cameraAudioTrack = cameraStreamRef.current.getAudioTracks()[0];

                const videoSender = peerRef.current
                    .getSenders()
                    .find((s) => s.track?.kind === 'video');
                if (videoSender && cameraVideoTrack) {
                    await videoSender.replaceTrack(cameraVideoTrack);
                }

                const audioSender = peerRef.current
                    .getSenders()
                    .find((s) => s.track?.kind === 'audio');
                if (audioSender && cameraAudioTrack) {
                    await audioSender.replaceTrack(cameraAudioTrack);
                }
            }

            if (targetUserIdRef.current) {
                socket.emit('webrtc-stream-updated', {
                    targetUserId: targetUserIdRef.current,
                });
            }

            if (cameraStreamRef.current) {
                setLocalStream(cameraStreamRef.current);
            }
            setIsScreenSharing(false);
            setCallType(isVideoOn ? 'video' : 'audio');
            setParticipants((prev) =>
                prev.map((p) => (p.isLocal ? { ...p, screenSharing: false } : p))
            );
        }
    }, [isScreenSharing, isVideoOn]);

    // ============================================================
    // ۷) declineCall
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
    // ۸) listenerهای سوکت
    // ============================================================
    useEffect(() => {
        const handleOffer = ({ fromUserId, fromUsername, offer }) => {
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
                setCallState('connected');
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
            if (fromUserId === targetUserIdRef.current) {
                console.log('[WebRTC] Remote hangup received');
                endCall();
            }
        };

        const handleStreamUpdated = ({ fromUserId }) => {
            if (fromUserId === targetUserIdRef.current && peerRef.current) {
                const receivers = peerRef.current.getReceivers();
                const tracks = receivers.map((r) => r.track).filter(Boolean);
                if (tracks.length > 0) {
                    setRemoteStream(new MediaStream(tracks));
                    setRemoteStreamVersion((v) => v + 1);
                    
                    // 🔥 این خط برای بزرگ شدن صفحه سمت گیرنده ضروری است
                    const hasVideo = tracks.some(t => t.kind === 'video' && t.readyState === 'live');
                    if (hasVideo) {
                        setCallType('screen');
                    }
                }
            }
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
        socket.on('disconnect', handleSocketDisconnect);

        return () => {
            socket.off('webrtc-offer', handleOffer);
            socket.off('webrtc-answer', handleAnswer);
            socket.off('webrtc-ice-candidate', handleIceCandidate);
            socket.off('webrtc-hangup', handleHangup);
            socket.off('webrtc-stream-updated', handleStreamUpdated);
            socket.off('disconnect', handleSocketDisconnect);
        };
    }, [processPendingCandidates, endCall]);

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