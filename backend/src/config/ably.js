import { createRestClient } from '@ably/pubsub-server';

// در نسخه ۳ سرور، برای ساخت توکن و publish از REST client استفاده می‌کنیم
export const ably = createRestClient({
  key: process.env.ABLY_API_KEY,
});

export default ably;