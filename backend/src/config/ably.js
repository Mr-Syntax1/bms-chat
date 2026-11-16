import { createHttpClient } from '@ably/pubsub-server';

// در نسخه ۳، برای عملیات REST (ساخت توکن و publish) از createHttpClient استفاده می‌شود
export const ably = createHttpClient({
  key: process.env.ABLY_API_KEY,
});

export default ably;