import mongoose from 'mongoose';

const ConnectedAccountSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    provider: { type: String, enum: ['demo', 'gmail', 'outlook'], required: true },
    emailAddress: { type: String, required: true },
    status: { type: String, enum: ['idle', 'syncing', 'error', 'disconnected'], default: 'idle' },
    lastSyncedAt: { type: Date, default: null },
    scopes: [{ type: String }],
    auth: {
      accessTokenCipher: { type: String, default: null },
      refreshTokenCipher: { type: String, default: null },
      iv: { type: String, default: null },
      authTag: { type: String, default: null },
      expiresAt: { type: Date, default: null },
    },
    error: {
      code: { type: String, default: null },
      message: { type: String, default: null },
      occurredAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

ConnectedAccountSchema.index({ orgId: 1, provider: 1, emailAddress: 1 });

export const ConnectedAccount =
  mongoose.models.ConnectedAccount || mongoose.model('ConnectedAccount', ConnectedAccountSchema);
