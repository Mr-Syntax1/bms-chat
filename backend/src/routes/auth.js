import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';

export const authRouter = express.Router();

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
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});