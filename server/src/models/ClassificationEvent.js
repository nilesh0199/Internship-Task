import mongoose from 'mongoose';

const ClassificationEventSchema = new mongoose.Schema(
  {
    threadId: { type: String, required: true, index: true },
    previousLabel: { type: String, default: null },
    newLabel: { type: String, required: true },
    triggerType: {
      type: String,
      enum: [
        'INITIAL_SYNC',
        'NEW_MESSAGE_INBOUND',
        'NEW_MESSAGE_OUTBOUND',
        'MANUAL_OVERRIDE',
        'GUARDRAIL_OVERRIDE',
        'DEMO_INJECTION',
      ],
      required: true,
    },
    triggerMessageId: { type: String, default: null },
    actorId: { type: String, default: null },
    actorName: { type: String, default: 'ReplyRight AI' },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

ClassificationEventSchema.index({ threadId: 1, createdAt: -1 });

export const ClassificationEvent =
  mongoose.models.ClassificationEvent ||
  mongoose.model('ClassificationEvent', ClassificationEventSchema);
