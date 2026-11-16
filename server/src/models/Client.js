import mongoose from 'mongoose';

const TopicRuleSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    disposition: {
      type: String,
      enum: ['ALWAYS_CLIENT', 'ASSISTANT_CAN_HANDLE', 'NEVER_BOTHER_CLIENT'],
      required: true,
    },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const PlaybookSchema = new mongoose.Schema(
  {
    vipSenders: [{ type: String, lowercase: true, trim: true }],
    vipDomains: [{ type: String, lowercase: true, trim: true }],
    topicRules: [TopicRuleSchema],
    financialThresholds: {
      maxAssistantApprovalUsd: { type: Number, default: 1000 },
    },
    customInstructions: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ClientSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    title: { type: String, default: 'Founder & CEO' },
    company: { type: String, default: 'Vortex Dynamics' },
    avatarUrl: { type: String, default: null },
    playbook: {
      type: PlaybookSchema,
      default: () => ({
        vipSenders: ['mark.suster@upfront.com', 'anjali.sharma@gmail.com'],
        vipDomains: ['upfront.com', 'fenwick.com', 'vortexdynamics.com'],
        topicRules: [
          {
            topic: 'Term Sheets & Equity Financing',
            disposition: 'ALWAYS_CLIENT',
            description: 'All venture capital negotiations and signatures',
          },
          {
            topic: 'Executive Hiring Offers',
            disposition: 'ALWAYS_CLIENT',
            description: 'Offers with salary > $200k or equity > 0.5%',
          },
          {
            topic: 'Meeting Scheduling & Travel',
            disposition: 'ASSISTANT_CAN_HANDLE',
            description: 'Coordination, flights, calendar rescheduling',
          },
          {
            topic: 'Cold Sales Pitches',
            disposition: 'NEVER_BOTHER_CLIENT',
            description: 'Unsolicited marketing solicitations',
          },
        ],
        financialThresholds: { maxAssistantApprovalUsd: 1000 },
        customInstructions: 'If an email is from my sister Anjali Sharma, always route to Client to Reply.',
        updatedAt: new Date(),
      }),
    },
  },
  { timestamps: true }
);

// Clean index declaration
ClientSchema.index({ orgId: 1, email: 1 });

export const Client = mongoose.models.Client || mongoose.model('Client', ClientSchema);
