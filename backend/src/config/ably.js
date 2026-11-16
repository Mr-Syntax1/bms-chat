import Ably from 'ably';
import dotenv from 'dotenv';
dotenv.config();

const ably = new Ably.Rest({
  key: process.env.ABLY_API_KEY,
});

export default ably;