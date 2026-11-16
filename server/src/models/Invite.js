import mongoose from 'mongoose';

const InviteSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['assistant', 'client'], required: true },
    token: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
    invitedBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Indexes
InviteSchema.index({ code: 1 });

export const Invite = mongoose.models.Invite || mongoose.model('Invite', InviteSchema);
