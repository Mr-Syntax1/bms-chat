import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 30
    },
    
    bio: { type: String, default: '', maxlength: 200 },

    settings: {
        onlineStatus: { type: Boolean, default: true },
        readReceipts: { type: Boolean, default: true },
    },

    tokensValidAfter: { type: Date, default: null },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);