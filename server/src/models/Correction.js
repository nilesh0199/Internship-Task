import mongoose from 'mongoose';

const CorrectionSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    threadId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    previousLabel: { type: String, required: true },
    correctedLabel: { type: String, required: true },
    assistantNote: { type: String, default: '' },
    threadContext: {
      subject: { type: String, default: '' },
      senderEmail: { type: String, default: '' },
      snippet: { type: String, default: '' },
    },
    promotedToPlaybookRule: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CorrectionSchema.index({ clientId: 1, createdAt: -1 });

export const Correction =
  mongoose.models.Correction || mongoose.model('Correction', CorrectionSchema);
