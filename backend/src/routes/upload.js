import express from 'express';
import { bucket } from '../config/upstash.js';
import crypto from 'node:crypto';

export const uploadRouter = express.Router();

uploadRouter.post('/presign', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'نام و نوع فایل الزامی است.' });
    }

    // تولید یک کلید یکتا برای جلوگیری از تداخل نام فایل‌ها
    const ext = fileName.split('.').pop();
    const key = `uploads/${crypto.randomUUID()}.${ext}`;

    // تولید لینک آپلود موقت (اعتبار ۱۰ دقیقه)
    const upload = await bucket.signedUploadUrl(key, {
      contentType: fileType,
      expiresIn: '10m',
    });

    // لینک عمومی فایل (برای نمایش بعد از آپلود)
    const publicUrl = bucket.publicUrl(key);

    res.json({ 
      uploadUrl: upload.url, 
      headers: upload.headers, // هدرهایی که فرانت‌اند باید هنگام آپلود بفرستد
      publicUrl, 
      key 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ساخت لینک آپلود' });
  }
});