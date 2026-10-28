import { Bucket } from "@upstash/blob";
import 'dotenv/config'; 

// از توکن موجود در فایل .env می‌خواند
export const bucket = Bucket.fromEnv(); 