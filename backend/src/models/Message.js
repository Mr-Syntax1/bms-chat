import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        maxlength: 500
    },
    
    sender: {
        type: String,
        required: true
    },

    senderId: {
        type: String
    },

    avatarColor: {
        type: String
    },

    type: {
        type: String,
        // 'file' اضافه شد
        enum: ['message', 'system', 'file'], 
        default: 'message'
    },

    fileUrl: {
        type: String
    },
    fileName: {
        type: String
    },
    fileType: {
        type: String
    },
    fileSize: {
        type: Number
    },

    room: {
        type: String,
        required: true,
        index: true 
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
});

// ایندکس برای مرتب‌سازی سریع پیام‌ها
messageSchema.index({ createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);