import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = path.resolve('../dock/shots');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort();

for (const f of files) {
  const { data, info } = await sharp(path.join(DIR, f)).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const n = width * height;
  let sum = 0, sum2 = 0, bright = 0;
  for (let i = 0; i < n; i += 1) {
    const o = i * channels;
    const l = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
    sum += l; sum2 += l * l;
    if (data[o] > 200 && data[o + 1] > 200 && data[o + 2] > 200) bright += 1;
  }
  const mean = sum / n;
  const sd = Math.sqrt(sum2 / n - mean * mean);
  console.log(`${f.padEnd(28)} mean=${mean.toFixed(1).padStart(5)} sd=${sd.toFixed(1).padStart(5)} white=${((bright / n) * 100).toFixed(2)}%`);
}
