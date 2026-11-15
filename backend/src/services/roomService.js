import { Room } from '../models/Room.js';

export default async function isRoomMember(userId, roomName) {
  try {
    const room = await Room.findOne({ name: roomName });
    if (!room) return false;
    
    // اگر اتاق خصوصی است، فقط اعضا اجازه دارند
    if (room.isPrivate) {
      return room.members.map(String).includes(String(userId));
    }
    // اگر اتاق عمومی است، همه اجازه دارند
    return true;
  } catch (err) {
    console.error('isRoomMember error:', err);
    return false;
  }
}