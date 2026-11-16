import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, required: true, lowercase: true, trim: true },
    isClient: { type: Boolean, default: false },
    isAssistant: { type: Boolean, default: false },
    isVip: { type: Boolean, default: false },
  },
  { _id: false }
);

const MeetingSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    locationOrLink: { type: String, default: null },
    attendees: [{ type: String }],
    isConflict: { type: Boolean, default: false },
  },
  { _id: false }
);

const ThreadSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    connectedAccountId: { type: String, default: 'demo_account' },
    provider: { type: String, enum: ['demo', 'gmail', 'outlook'], required: true },
    providerThreadId: { type: String, required: true, index: true },
    subject: { type: String, required: true, trim: true },
    snippet: { type: String, default: '' },
    participants: [ParticipantSchema],
    messageCount: { type: Number, default: 1 },
    lastMessageAt: { type: Date, required: true, index: true },
    lastMessageId: { type: String, required: true },
    lastDirection: { type: String, enum: ['INBOUND', 'OUTBOUND'], default: 'INBOUND' },

    // Classification & Label state
    currentLabel: {
      type: String,
      enum: ['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'],
      required: true,
      index: true,
    },
    aiLabel: {
      type: String,
      enum: ['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'],
      required: true,
    },
    manualOverride: { type: Boolean, default: false },
    confidence: { type: Number, min: 0, max: 1, default: 0.9 },
    reviewState: {
      type: String,
      enum: ['AUTO_APPLIED', 'FLAGGED_REVIEW', 'HUMAN_CONFIRMED', 'OVERRIDDEN'],
      default: 'AUTO_APPLIED',
    },

    // Segment & State Flags
    isActionRequired: { type: Boolean, default: false, index: true },
    isWaiting: { type: Boolean, default: false, index: true },
    waitingSince: { type: Date, default: null },
    isImportant: { type: Boolean, default: false, index: true },
    isGeneral: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false, index: true },
    isRead: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },

    // Client Decision Queue State
    clientVisible: { type: Boolean, default: false, index: true },
    clientStatus: {
      type: String,
      enum: ['pending', 'handled', 'delegated', 'snoozed'],
      default: 'pending',
      index: true,
    },
    snoozedUntil: { type: Date, default: null },
    clientDecisionNote: { type: String, default: null },

    // Extracted intelligence
    dueDate: { type: Date, default: null },
    meetings: [MeetingSchema],
    assignedTo: { type: String, default: null },

    // Embedded active AI Reasoning
    aiReason: {
      provider: { type: String, default: 'gemini' },
      model: { type: String, default: 'gemini-2.0-flash' },
      reason: { type: String, default: '' },
      evidence: { type: String, default: '' },
      summary: { type: String, default: '' },
      decision: {
        question: { type: String, default: null },
        options: [{ type: String }],
        deadline: { type: String, default: null },
        consequence: { type: String, default: null },
      },
      signalsUsed: [{ type: String }],
      latencyMs: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

ThreadSchema.index({ orgId: 1, currentLabel: 1, isArchived: 1, lastMessageAt: -1 });
ThreadSchema.index({ orgId: 1, clientVisible: 1, clientStatus: 1, lastMessageAt: -1 });

export const Thread = mongoose.models.Thread || mongoose.model('Thread', ThreadSchema);
