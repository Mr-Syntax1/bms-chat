import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }, // گیرنده
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }, // فرستنده
  senderName: {
    type: String,
    required: true
  },
  roomName: {
    type: String,
    required: true
  },
  messagePreview: {
    type: String,
    maxlength: 150
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

notificationSchema.statics.markAllAsRead = async function(userId, roomName) {
  if (roomName) {
    return this.updateMany({ userId, roomName, isRead: false }, { isRead: true });
  }
  return this.updateMany({ userId, isRead: false }, { isRead: true });
};

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;