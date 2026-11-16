import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    actorId: { type: String, default: null },
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, enum: ['assistant', 'client', 'system', 'agent'], required: true },
    action: {
      type: String,
      enum: [
        'THREAD_CLASSIFIED',
        'LABEL_OVERRIDDEN',
        'DRAFT_CREATED',
        'DRAFT_SUBMITTED_FOR_APPROVAL',
        'DRAFT_APPROVED',
        'EMAIL_SENT_SIMULATED',
        'EMAIL_SENT_REAL',
        'THREAD_SNOOZED',
        'PLAYBOOK_UPDATED',
        'ACCOUNT_SYNCED',
        'ACCOUNT_DISCONNECTED',
        'ACCOUNT_PURGED',
        'DEMO_MESSAGE_INJECTED',
        'AGENT_RUN',
        'AGENT_ACTION',
        'AGENT_UNDO',
      ],
      required: true,
      index: true,
    },
    threadId: { type: String, default: null, index: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ orgId: 1, createdAt: -1 });

export const ActivityLog =
  mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);
