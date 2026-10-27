import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 30
    },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);