
class UsersStore {
  constructor() {
    this.users = new Map();
  }

  add(socketId, username, userId) {
    const user = {
      id: socketId,// آی‌دی اتصال سوکت (با هر رفرش عوض می‌شود)
      userId: userId, // آی‌دی دائمی دیتابیس
      username,
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

  findByUserId(userId) {
    for (const user of this.users.values()) {
      if (user.userId === userId) return user;
    }
    return null;
  }

  findByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) return user;
    }
    return null;
  }

  getAll() {
    return Array.from(this.users.values());
  }
}

export const users = new UsersStore();
