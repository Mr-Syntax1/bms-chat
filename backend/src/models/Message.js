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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    type: {
        type: String,
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

    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isDeletedForEveryone: {
        type: Boolean,
        default: false
    },
    deletedAt: { type: Date, default: null },

    readBy: [{ type: String }], // آرایه‌ای از ID کاربرانی که پیام را خوانده‌اند

    createdAt: {
        type: Date,
        default: Date.now
    },
}, { timestamps: true })

// ایندکس برای مرتب‌سازی سریع پیام‌ها
messageSchema.index({ createdAt: -1 });
// حذف خودکار پس از ۱ روز (۲۴ * ۶۰ * ۶۰ = ۸۶۴۰۰ ثانیه)
messageSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 86400 });
messageSchema.index({ room: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);