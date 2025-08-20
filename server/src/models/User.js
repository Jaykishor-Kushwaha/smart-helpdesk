import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['admin','agent','user'], default: 'user' }
}, { timestamps: { createdAt: true, updatedAt: false } });

export const User = mongoose.model('User', UserSchema);