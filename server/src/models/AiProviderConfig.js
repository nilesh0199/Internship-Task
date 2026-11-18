import mongoose from 'mongoose';

const AiProviderConfigSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, unique: true, index: true },
    provider: {
      type: String,
      enum: ['gemini', 'openai', 'anthropic', 'groq', 'openrouter'],
      required: true,
    },
    model: { type: String, required: true, trim: true },
    encryptedApiKey: {
      cipherText: { type: String, default: '' },
      iv: { type: String, default: '' },
      authTag: { type: String, default: '' },
    },
    keyHint: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    lastTestedAt: { type: Date, default: null },
    lastTestStatus: {
      type: String,
      enum: ['untested', 'verified', 'failed'],
      default: 'untested',
    },
    lastTestError: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const AiProviderConfig = mongoose.model('AiProviderConfig', AiProviderConfigSchema);
