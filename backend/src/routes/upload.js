import express from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, BUCKET_NAME } from '../config/s3.js'; // 👈 به فایل کانفیگ جدید اشاره می‌کند
import crypto from 'node:crypto';

export const uploadRouter = express.Router();

uploadRouter.post('/presign', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'نام و نوع فایل الزامی است.' });
    }

    // تولید یک کلید یکتا
    const ext = fileName.split('.').pop();
    const key = `uploads/${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    // تولید لینک آپلود موقت (اعتبار ۱۰ دقیقه)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    // 👈 لینک نهایی فایل برای نمایش
    // دقت کن که S3_ENDPOINT در فایل .env حتماً باید با https:// شروع شود
    const publicUrl = `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`;

    console.log('[Upload] presign:', { key, publicUrl, uploadUrl });

    res.json({
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (err) {
    console.error('[Upload] presign error:', err);
    res.status(500).json({ error: 'خطا در ساخت لینک آپلود' });
  }
});