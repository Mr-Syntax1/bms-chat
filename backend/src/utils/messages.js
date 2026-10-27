export function getPersianTime() {
  return new Date().toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

class MessageStore {
  constructor(limit = 100) {
    this.messages = [];
    this.limit = limit;
  }

  add(message) {
    this.messages.push(message);
    if (this.messages.length > this.limit) {
      this.messages = this.messages.slice(-this.limit);
    }
    return message;
  }

  getAll() {
    return this.messages;
  }
}

export const messageStore = new MessageStore();