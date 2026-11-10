import { users } from '../../utils/users.js';

export function handleWebRTCOffer(socket, io) {
  return async function onWebRTCOffer({ targetUserId, offer }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const targetSocket = users.findByUserId(targetUserId);
    if (!targetSocket) {
      return callback?.({ error: 'کاربر مقصد آنلاین نیست.' });
    }

    io.to(targetSocket.id).emit('webrtc-offer', {
      fromUserId: socket.userId,
      fromUsername: user.username,
      offer,
    });

    callback?.({ success: true });
  };
}

export function handleWebRTCAnswer(socket, io) {
  return async function onWebRTCAnswer({ targetUserId, answer }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const targetSocket = users.findByUserId(targetUserId);
    if (!targetSocket) {
      return callback?.({ error: 'کاربر مقصد آنلاین نیست.' });
    }

    io.to(targetSocket.id).emit('webrtc-answer', {
      fromUserId: socket.userId,
      answer,
    });

    callback?.({ success: true });
  };
}

export function handleWebRTCIceCandidate(socket, io) {
  return async function onWebRTCIceCandidate({ targetUserId, candidate }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const targetSocket = users.findByUserId(targetUserId);
    if (!targetSocket) {
      return callback?.({ error: 'کاربر مقصد آنلاین نیست.' });
    }

    io.to(targetSocket.id).emit('webrtc-ice-candidate', {
      fromUserId: socket.userId,
      candidate,
    });

    callback?.({ success: true });
  };
}

export function handleWebRTCHangup(socket, io) {
  return async function onWebRTCHangup({ targetUserId }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const targetSocket = users.findByUserId(targetUserId);
    if (targetSocket) {
      io.to(targetSocket.id).emit('webrtc-hangup', {
        fromUserId: socket.userId,
      });
    }

    callback?.({ success: true });
  };
}