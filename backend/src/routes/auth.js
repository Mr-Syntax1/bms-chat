import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { signToken, verifyToken } from '../utils/jwt.js';

export const authRouter = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setTokenCookie(res, token) {
  console.log('[Auth] Setting cookie, token length:', token?.length);
  res.cookie('token', token, COOKIE_OPTS);
  console.log('[Auth] Cookie set');
}

function clearTokenCookie(res) {
  console.log('[Auth] Clearing cookie');
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
}

// Middleware to verify token and attach user
function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'توکن وجود ندارد' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'توکن نامعتبر است' });
  }
  
  req.userId = decoded.id;
  req.username = decoded.username;
  next();
}

// ثبت‌نام
authRouter.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است.' });
    }
    const exists = await User.findOne({ username: username.trim() });
    if (exists) {
      return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username: username.trim(), password: hashed });
    const token = signToken(user);
    console.log('[Auth/register] Token generated:', token?.substring(0, 20) + '...');
    setTokenCookie(res, token);
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ورود
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username?.trim() });
    if (!user) return res.status(401).json({ error: 'نام کاربری یا رمز اشتباه است.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'نام کاربری یا رمز اشتباه است.' });
    const token = signToken(user);
    console.log('[Auth/login] Token generated:', token?.substring(0, 20) + '...');
    setTokenCookie(res, token);
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// بررسی احراز هویت (برای persistence login)
authRouter.get('/me', async (req, res) => {
  try {
    console.log('[Auth/me] cookies:', req.cookies);
    console.log('[Auth/me] headers.cookie:', req.headers.cookie);
    console.log('[Auth/me] origin:', req.headers.origin);
    const token = req.cookies?.token;
    if (!token) {
      console.log('[Auth/me] No token in cookies');
      return res.status(401).json({ error: 'توکن وجود ندارد' });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('[Auth/me] Token verification failed');
      return res.status(401).json({ error: 'توکن نامعتبر است' });
    }
    
    const user = await User.findById(decoded.id).select('username');
    if (!user) {
      console.log('[Auth/me] User not found:', decoded.id);
      return res.status(401).json({ error: 'کاربر یافت نشد' });
    }
    
    console.log('[Auth/me] Success:', user.username);
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    console.error('[Auth/me] error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// پروفایل کاربر - GET /auth/profile

//  این روت برای پروفایل خودِ کاربر است
authRouter.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('username createdAt avatarColor').lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
    }

    const messageCount = await Message.countDocuments({ senderId: req.userId });

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        avatarColor: user.avatarColor || '#6366f1',
        createdAt: user.createdAt,
        messageCount,
      }
    });
  } catch (err) {
    console.error('[Auth/profile] error:', err);
    res.status(500).json({ success: false, error: 'خطای سرور' });
  }
});

// برای دیدن پروفایل دیگران
authRouter.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر پیدا نشد.' });
    }

    const messageCount = await Message.countDocuments({ senderId: user._id });

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        avatarColor: user.avatarColor || '#6366f1',
        createdAt: user.createdAt,
        messageCount,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'خطای سرور' });
  }
});

// خروج
authRouter.post('/logout', (req, res) => {
  clearTokenCookie(res);
  res.json({ success: true });
});