import { Room } from '../models/Room.js'; // ← مسیر مدل خودتان

/**
 * آیا کاربر عضو اتاق است؟ (برای مجوز دادن به کانال presence-room-<roomName>)
 *
 * @param {string} userId    id کاربر لاگین‌شده (از توکن)
 * @param {string} roomName  نام اتاق (decode شده، نه نام کدگذاری‌شده‌ی کانال)
 * @returns {Promise<boolean>}
 */
export async function isRoomMember(userId, roomName) {
  if (!userId || typeof roomName !== 'string' || !roomName) return false;

  // اتاق‌های DM روی کانال private-dm-* هستند؛ هیچ کانال presence ای برایشان مجاز نیست
  if (roomName.startsWith('dm_')) return false;

  try {
    const found = await Room.exists({ name: roomName, members: String(userId) });
    return Boolean(found);
  } catch (err) {
    // id غیرقابل تبدیل به ObjectId = عضو نیست (خطای دیتابیس واقعی دوباره throw می‌شود)
    if (err?.name === 'CastError') return false;
    throw err;
  }
}
