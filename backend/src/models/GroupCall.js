import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const groupCallSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  callId: {
    type: String,
    required: true,
    unique: true,
    default: randomUUID,
  },
  callType: {
    type: String,
    required: true,
    enum: ['audio', 'video'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: {
    type: [participantSchema],
    default: [],
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

groupCallSchema.index(
  { roomName: 1, active: 1 },
  { unique: true, partialFilterExpression: { active: true }, name: 'one_active_call_per_room' },
);

export const GroupCall = mongoose.model('GroupCall', groupCallSchema);
