import mongoose from 'mongoose';

/**
 * AgentRun Schema
 * Records every autonomous or proposed action executed by a specialized agent.
 * Enables auditability, explainability, reversal (Undo), and funnel analytics.
 */
const AgentRunSchema = new mongoose.Schema(
  {
    agentId: {
      type: String,
      enum: ['triage', 'scheduling', 'followup', 'drafting', 'digest', 'guardian'],
      required: true,
      index: true,
    },
    orgId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    threadId: { type: String, default: null, index: true },
    trigger: {
      type: String,
      enum: ['ingest', 'new_message', 'client_action', 'schedule_tick', 'manual'],
      required: true,
      index: true,
    },
    action: { type: String, required: true, index: true },
    outcome: {
      type: String,
      enum: ['auto_handled', 'proposed', 'escalated', 'skipped', 'error', 'reversed'],
      required: true,
      index: true,
    },
    summary: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    confidence: { type: Number, min: 0, max: 1, default: 0.95 },
    requiresHuman: { type: Boolean, default: false, index: true },
    undo: {
      type: {
        type: String,
        default: null,
      },
      payload: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    undoneAt: { type: Date, default: null },
    usedLLM: { type: Boolean, default: false },
    fallbackUsed: { type: Boolean, default: false },
    notesApplied: { type: String, default: null },
    durationMs: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AgentRunSchema.index({ orgId: 1, createdAt: -1 });
AgentRunSchema.index({ threadId: 1, createdAt: -1 });
AgentRunSchema.index({ orgId: 1, agentId: 1, createdAt: -1 });

export const AgentRun =
  mongoose.models.AgentRun || mongoose.model('AgentRun', AgentRunSchema);
