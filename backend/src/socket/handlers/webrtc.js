import { users } from '../../utils/users.js';

export function handleWebRTCOffer(socket, io) {
  return async function onWebRTCOffer({ targetUserId, offer, renegotiate }, callback) {
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
      renegotiate: !!renegotiate, //  اضافه شد
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

export function handleWebRTCStreamUpdated(socket, io) {
  return async function onWebRTCStreamUpdated({ targetUserId }, callback) {
    const user = users.get(socket.id);
    if (!user) return callback?.({ error: 'ابتدا وارد شوید.' });

    const targetSocket = users.findByUserId(targetUserId);
    if (targetSocket) {
      io.to(targetSocket.id).emit('webrtc-stream-updated', {
        fromUserId: socket.userId,
      });
    }
    callback?.({ success: true });
  };
}

export function handleWebRTCScreenLock(socket, io) {
  return async function onWebRTCScreenLock({ targetUserId }, callback) {
    const targetSocket = users.findByUserId(targetUserId);
    if (targetSocket) {
      io.to(targetSocket.id).emit('webrtc-screen-lock', {
        fromUserId: socket.userId,
      });
    }
    callback?.({ success: true });
  };
}

export function handleWebRTCScreenUnlock(socket, io) {
  return async function onWebRTCScreenUnlock({ targetUserId }, callback) {
    const targetSocket = users.findByUserId(targetUserId);
    if (targetSocket) {
      io.to(targetSocket.id).emit('webrtc-screen-unlock', {
        fromUserId: socket.userId,
      });
    }
    callback?.({ success: true });
  };
}