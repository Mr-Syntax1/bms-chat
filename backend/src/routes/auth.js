import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken, verifyToken } from '../utils/jwt.js';

export const authRouter = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: false,
  sameSite: 'none', // برای cross-origin localhost
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setTokenCookie(res, token) {
  res.cookie('token', token, COOKIE_OPTS);
}

function clearTokenCookie(res) {
  res.clearCookie('token', { httpOnly: true, secure: false, sameSite: 'none' });
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
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'توکن وجود ندارد' });
    
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'توکن نامعتبر است' });
    
    const user = await User.findById(decoded.id).select('username');
    if (!user) return res.status(401).json({ error: 'کاربر یافت نشد' });
    
    res.json({ user: { id: user._id, username: user.username } });
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