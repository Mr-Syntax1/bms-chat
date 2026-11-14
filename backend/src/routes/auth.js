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
  res.cookie('token', token, COOKIE_OPTS);
}

function clearTokenCookie(res) {
  const { maxAge, ...clearOpts } = COOKIE_OPTS;
  res.clearCookie('token', clearOpts);
}

// میدل‌ور احراز هویت با پشتیبانی از کوکی و هدر Bearer
function authMiddleware(req, res, next) {
  let token = req.cookies?.token;
  
  // اگر توکن در کوکی نبود، هدر Authorization را بررسی کن
  if (!token && req.headers.authorization) {
    const [scheme, ...rest] = req.headers.authorization.split(' ');
    if (scheme.toLowerCase() === 'bearer' && rest.length === 1) {
      token = rest[0];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'توکن وجود ندارد' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'توکن نامعتبر است' });
  }

  req.userId = decoded.id;
  req.username = decoded.username;
  req.token = token; // ذخیره توکن برای استفاده در روت‌های بعدی
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
    setTokenCookie(res, token);
    res.json({ user: { id: user._id, username: user.username }, token });
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
    setTokenCookie(res, token);
    res.json({ user: { id: user._id, username: user.username }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// خروج
authRouter.post('/logout', (req, res) => {
  clearTokenCookie(res);
  res.json({ success: true });
});

// بررسی احراز هویت (برای persistence login)
authRouter.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('username');
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }
    // توکن فعلی را برمی‌گردانیم، نه یک توکن جدید
    res.json({ user: { id: user._id, username: user.username }, token: req.token });
  } catch (err) {
    console.error('[Auth/me] error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// پروفایل کاربر
authRouter.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('username createdAt').lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
    }
    const messageCount = await Message.countDocuments({ senderId: req.userId });
    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
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
        createdAt: user.createdAt,
        messageCount,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'خطای سرور' });
  }
});

// دریافت توکن برای تماس
authRouter.get('/call-token', authMiddleware, (req, res) => {
  if (!req.token) {
    return res.status(401).json({ error: 'توکن یافت نشد' });
  }
  res.json({ token: req.token });
});