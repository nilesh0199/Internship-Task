import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['assistant', 'client', 'admin'], required: true },
    orgId: { type: String, required: true, index: true },
    clientId: { type: String, default: null }, // Linked client profile for client accounts
    avatarUrl: { type: String, default: null },
    lastLoginAt: { type: Date, default: null },
    preferences: {
      notificationsEnabled: { type: Boolean, default: true },
      theme: { type: String, enum: ['editorial', 'light', 'dark'], default: 'editorial' },
      keyboardShortcutsEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

UserSchema.index({ orgId: 1, role: 1 });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
