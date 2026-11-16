import mongoose from 'mongoose';

const DraftSchema = new mongoose.Schema(
  {
    threadId: { type: String, required: true, index: true },
    orgId: { type: String, required: true },
    authorId: { type: String, required: true },
    to: [{ type: String, required: true }],
    cc: [{ type: String }],
    bcc: [{ type: String }],
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    bodyText: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'agent_proposal', 'pending_client', 'approved', 'sent', 'discarded'],
      default: 'draft',
      index: true,
    },
    agentProposalType: {
      type: String,
      enum: ['draft_reply', 'reschedule_meeting', 'confirm_meeting', 'stale_followup', null],
      default: null,
    },
    clientApproval: {
      approvedAt: { type: Date, default: null },
      approvedBy: { type: String, default: null },
      clientFeedback: { type: String, default: null },
    },
    sentAt: { type: Date, default: null },
    isSimulatedSend: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DraftSchema.index({ threadId: 1, status: 1 });

export const Draft = mongoose.models.Draft || mongoose.model('Draft', DraftSchema);
