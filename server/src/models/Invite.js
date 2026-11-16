import mongoose from 'mongoose';

const InviteSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['assistant', 'client'], default: 'client' },
    tokenHash: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
    },
    invitedBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes
InviteSchema.index({ orgId: 1, email: 1 });

export const Invite = mongoose.models.Invite || mongoose.model('Invite', InviteSchema);
