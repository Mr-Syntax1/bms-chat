import { createCallServer } from '@nhanaka/call';
import { verifyToken } from '../utils/jwt.js'; //  ایمپورت تابع verifyToken

export function initCallServer(io) {
  const callServer = createCallServer({
    io,
    callbacks: {
      onValidateToken: async (token) => {
        console.log('[Call] Validating token:', token ? 'EXISTS' : 'MISSING');
        if (!token) return false;
        
        const decoded = verifyToken(token); //  چک کردن اعتبار توکن
        if (!decoded) {
          console.log('[Call] Invalid token');
          return false;
        }
        
        console.log('[Call] Token valid for user:', decoded.username);
        return true;
      },
      onCallInitiated: async (data) => {
        console.log('[Call] New call initiated:', data);
        return true;
      },
      onCallMessage: async (message) => {
        console.log('[Call] Message during call:', message);
      },
    },
  });

  return callServer;
}