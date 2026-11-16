import mongoose from 'mongoose';

const ClassificationSchema = new mongoose.Schema(
  {
    threadId: { type: String, required: true, index: true },
    latestMessageId: { type: String, required: true },
    provider: { type: String, enum: ['gemini', 'groq', 'rules_engine', 'seed'], required: true },
    model: { type: String, required: true },
    promptVersion: { type: String, default: 'v1.0' },
    latencyMs: { type: Number, default: 0 },
    label: {
      type: String,
      enum: ['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'],
      required: true,
    },
    confidence: { type: Number, min: 0, max: 1, required: true },
    reason: { type: String, required: true },
    evidence: { type: String, default: '' },
    summary: { type: String, default: '' },
    decision: {
      question: { type: String, default: null },
      options: [{ type: String }],
      deadline: { type: String, default: null },
      consequence: { type: String, default: null },
    },
    signalsUsed: [{ type: String }],
    guardrailTriggered: { type: Boolean, default: false },
    guardrailRule: { type: String, default: null },
  },
  { timestamps: true }
);

ClassificationSchema.index({ threadId: 1, createdAt: -1 });

export const Classification =
  mongoose.models.Classification || mongoose.model('Classification', ClassificationSchema);
