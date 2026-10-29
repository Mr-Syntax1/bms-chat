const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
];

function getConsistentColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

class UsersStore {
  constructor() {
    this.users = new Map(); // socketId -> { id, userId, username, avatarColor }
  }

  add(socketId, username, userId) {
    const user = {
      id: socketId,
      userId,
      username,
      avatarColor: getConsistentColor(username),
    };
    this.users.set(socketId, user);
    return user;
  }

  remove(socketId) {
    const user = this.users.get(socketId);
    this.users.delete(socketId);
    return user;
  }

  get(socketId) {
    return this.users.get(socketId);
  }

  findByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) return user;
    }
    return null;
  }

  findByUserId(userId) {
    for (const user of this.users.values()) {
      if (user.userId === userId) return user;
    }
    return null;
  }

  getAll() {
    return Array.from(this.users.values());
  }
}

export const users = new UsersStore();