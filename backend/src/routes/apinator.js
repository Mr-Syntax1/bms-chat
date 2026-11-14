import express from 'express';
import { apinator } from '../config/apinator.js';
import { verifyToken } from '../utils/jwt.js';

export const apinatorRouter = express.Router();

function verifyTokenFromCookieOrHeader(req) {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization) {
    const [scheme, ...rest] = req.headers.authorization.split(' ');
    if (scheme.toLowerCase() === 'bearer' && rest.length === 1) {
      token = rest[0];
    }
  }
  if (!token) return null;
  return verifyToken(token);
}

// مسیر احراز هویت کانال‌ها
apinatorRouter.post('/auth', async (req, res) => {
  const { socket_id, channel_name } = req.body;

  const decoded = verifyTokenFromCookieOrHeader(req);
  if (!decoded) {
    return res.status(401).json({ error: 'کاربر لاگین نیست یا توکن نامعتبر است' });
  }

  try {
    const userData = {
      user_id: decoded.id,
      user_info: {
        name: decoded.username,
      },
    };
    
    let channelData = null;

    // بررسی نوع کانال
    if (channel_name.startsWith('presence-room-')) {
      channelData = JSON.stringify(userData);
    } 
    else if (channel_name.startsWith('private-dm-')) {
      // در فرانت‌اند از خط تیره استفاده شده است، پس اینجا هم خط تیره چک می‌شود
      const dmPart = channel_name.replace('private-dm-', '');
      const [id1, id2] = dmPart.split('-');
      
      if (id1 !== decoded.id && id2 !== decoded.id) {
        return res.status(403).json({ error: 'دسترسی به این کانال دایرکت مجاز نیست' });
      }
      channelData = JSON.stringify(userData);
    } 
    else if (channel_name.startsWith('private-notifications-')) {
      const userId = channel_name.replace('private-notifications-', '');
      
      if (userId !== decoded.id) {
        return res.status(403).json({ error: 'دسترسی به این کانال اعلان‌ها مجاز نیست' });
      }
      channelData = JSON.stringify(userData);
    } 
    else if (channel_name.startsWith('private-webrtc-')) {
      const webrtcPart = channel_name.replace('private-webrtc-', '');
      // اصلاح باگ: استفاده از webrtcPart به جای dmPart و استفاده از خط تیره
      const [id1, id2] = webrtcPart.split('-');
      
      if (id1 !== decoded.id && id2 !== decoded.id) {
        return res.status(403).json({ error: 'دسترسی به این کانال تماس مجاز نیست' });
      }
      channelData = JSON.stringify(userData);
    } 
    else {
      channelData = JSON.stringify(userData);
    }

    const auth = apinator.authenticateChannel(socket_id, channel_name, channelData);
    res.json(auth);
  } catch (error) {
    console.error('[Apinator Auth] Error:', error);
    res.status(500).json({ error: 'خطا در احراز هویت کانال' });
  }
});