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

const USERNAME_RE = /^\S{3,24}$/;
const BIO_MAX = 200;
const PASSWORD_MIN = 8;
const ALLOWED_SETTINGS = ['onlineStatus', 'readReceipts']; // فقط همین‌ها قابل ذخیره‌اند

function setTokenCookie(res, token) {
  res.cookie('token', token, COOKIE_OPTS);
}

function clearTokenCookie(res) {
  const { maxAge, ...clearOpts } = COOKIE_OPTS;
  res.clearCookie('token', clearOpts);
}

// خروجی استاندارد کاربر (برای خودِ کاربر: با تنظیمات خصوصی)
function serializeUser(user, { self = false } = {}) {
  const base = {
    id: user._id.toString(),
    username: user.username,
    bio: user.bio || '',
    createdAt: user.createdAt,
  };
  if (self) {
    base.settings = {
      onlineStatus: user.settings?.onlineStatus ?? true,
      readReceipts: user.settings?.readReceipts ?? true,
    };
  }
  return base;
}

// میدل‌ور احراز هویت با پشتیبانی از کوکی و هدر Bearer
async function authMiddleware(req, res, next) {
  try {
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

    // کاربر باید هنوز وجود داشته باشد (مثلاً حساب حذف نشده باشد)
    const user = await User.findById(decoded.id).select('username tokensValidAfter').lean();
    if (!user) {
      return res.status(401).json({ error: 'کاربر یافت نشد' });
    }

    // «خروج از همه دستگاه‌ها»: توکن‌های صادرشده قبل از این زمان باطل‌اند
    if (user.tokensValidAfter) {
      const validAfterSec = Math.floor(new Date(user.tokensValidAfter).getTime() / 1000);
      if (validAfterSec > (decoded.iat ?? 0)) {
        return res.status(401).json({ error: 'نشست شما منقضی شده است' });
      }
    }

    req.userId = decoded.id;
    req.username = user.username; // از دیتابیس؛ چون نام کاربری قابل تغییر است
    req.token = token;
    next();
  } catch (err) {
    console.error('[Auth/middleware] error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
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
    const user = await User.findById(req.userId).select('username bio settings createdAt');
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }
    // توکن فعلی را برمی‌گردانیم، نه یک توکن جدید
    res.json({ user: serializeUser(user, { self: true }), token: req.token });
  } catch (err) {
    console.error('[Auth/me] error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// پروفایل کاربر
authRouter.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('username bio settings createdAt');
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
    }
    const messageCount = await Message.countDocuments({ senderId: req.userId });
    res.json({
      success: true,
      user: { ...serializeUser(user, { self: true }), messageCount },
    });
  } catch (err) {
    console.error('[Auth/profile] error:', err);
    res.status(500).json({ success: false, error: 'خطای سرور' });
  }
});

// برای دیدن پروفایل دیگران (تنظیمات خصوصی هرگز برگردانده نمی‌شود)
authRouter.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('username bio createdAt');
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر پیدا نشد.' });
    }
    const messageCount = await Message.countDocuments({ senderId: user._id });
    res.json({
      success: true,
      user: { ...serializeUser(user), messageCount },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'خطای سرور' });
  }
});

// ───────────────────────── Settings ─────────────────────────

// ویرایش نام کاربری و بیو
// backend/routes/auth.js (یا هر فایلی که این روت در آن است)
authRouter.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, bio, avatarIndex } = req.body || {};
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });

    let usernameChanged = false;

    if (username !== undefined) {
      // ... (منطق قبلی بررسی نام کاربری) ...
      const clean = username.trim();
      if (clean !== user.username) {
        const taken = await User.exists({ username: clean, _id: { $ne: user._id } });
        if (taken) return res.status(409).json({ success: false, error: 'این نام کاربری قبلاً گرفته شده است.' });
        user.username = clean;
        usernameChanged = true;
      }
    }

    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.trim().length > 200) {
        return res.status(400).json({ success: false, error: 'بیوگرافی نباید بیشتر از ۲۰۰ کاراکتر باشد.' });
      }
      user.bio = bio.trim();
    }

    //  منطق جدید برای ذخیره آواتار 
    if (avatarIndex !== undefined) {
      if (avatarIndex === null || (typeof avatarIndex === 'number' && avatarIndex >= 0 && avatarIndex <= 9)) {
        user.avatarIndex = avatarIndex;
      } else {
        return res.status(400).json({ success: false, error: 'مقدار آواتار نامعتبر است.' });
      }
    }

    await user.save();

    const payload = { success: true, user: serializeUser(user, { self: true }) };
    // اضافه کردن avatarIndex به پاسخ
    payload.user.avatarIndex = user.avatarIndex; 

    if (usernameChanged) {
      const token = signToken(user);
      setTokenCookie(res, token);
      payload.token = token;
    }

    res.json(payload);
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ success: false, error: 'این نام کاربری قبلاً گرفته شده است.' });
    console.error('[Auth/profile PATCH] error:', err);
    res.status(500).json({ success: false, error: 'خطای سرور' });
  }
});

// ذخیره‌ی تنظیمات حریم خصوصی (onlineStatus / readReceipts)
authRouter.patch('/settings', authMiddleware, async (req, res) => {
  try {
    const updates = {};
    for (const key of ALLOWED_SETTINGS) {
      if (req.body?.[key] !== undefined) {
        if (typeof req.body[key] !== 'boolean') {
          return res.status(400).json({ success: false, error: `مقدار ${key} باید true یا false باشد.` });
        }
        updates[`settings.${key}`] = req.body[key];
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'تنظیم معتبری ارسال نشد.' });
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
    }
    res.json({ success: true, settings: serializeUser(user, { self: true }).settings });
  } catch (err) {
    console.error('[Auth/settings] error:', err);
    res.status(500).json({ success: false, error: 'خطای سرور' });
  }
});

// تغییر رمز عبور
authRouter.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'رمز فعلی و رمز جدید الزامی است.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < PASSWORD_MIN) {
      return res.status(400).json({
        success: false,
        error: `رمز جدید باید حداقل ${PASSWORD_MIN} کاراکتر باشد.`,
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ success: false, error: 'رمز فعلی اشتباه است.' });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ success: false, error: 'رمز جدید باید با رمز فعلی متفاوت باشد.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    // سایر دستگاه‌ها بعد از تغییر رمز خارج می‌شوند
    user.tokensValidAfter = new Date();
    await user.save();

    // برای دستگاه فعلی توکن تازه صادر می‌کنیم تا خارج نشود
    const token = signToken(user);
    setTokenCookie(res, token);
    res.json({ success: true, token });
  } catch (err) {
    console.error('[Auth/change-password] error:', err);
    res.status(500).json({ success: false, error: 'خطای سرور' });
  }
});

// خروج از همه‌ی دستگاه‌ها (همین دستگاه هم شامل است)
authRouter.post('/logout-all', authMiddleware, async (req, res) => {
  try {
    await User.updateOne({ _id: req.userId }, { $set: { tokensValidAfter: new Date() } });
    clearTokenCookie(res);
    res.json({ success: true });
  } catch (err) {
    console.error('[Auth/logout-all] error:', err);
    res.status(500).json({ success: false, error: 'خطای سرور' });
  }
});

// حذف دائمی حساب
authRouter.delete('/account', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ success: false, error: 'رمز عبور الزامی است.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ success: false, error: 'رمز عبور اشتباه است.' });
    }

    // پیام‌های ارسالی کاربر پاک می‌شوند (اگر مدل Message فیلد دیگری مثل receiverId دارد، در صورت نیاز اضافه کن)
    await Message.deleteMany({ senderId: user._id });
    await User.deleteOne({ _id: user._id });

    clearTokenCookie(res);
    res.json({ success: true });
  } catch (err) {
    console.error('[Auth/account DELETE] error:', err);
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