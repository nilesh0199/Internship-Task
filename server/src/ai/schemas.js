import { z } from 'zod';

export const MeetingItemSchema = z.object({
  title: z.string().describe('Title of the meeting'),
  startTime: z.string().nullable().describe('ISO-8601 string or date time description'),
  endTime: z.string().nullable().describe('ISO-8601 string or date time description'),
  locationOrLink: z.string().nullable().describe('Physical address or video call URL'),
  attendees: z.array(z.string()).default([]),
  isConflict: z.boolean().default(false),
});

export const DecisionObjectSchema = z.object({
  question: z.string().describe('The single core question the executive client must answer'),
  options: z.array(z.string()).min(1).describe('Array of actionable options (e.g. Approve, Decline)'),
  deadline: z.string().nullable().describe('Action deadline or timeframe if mentioned'),
  consequence: z.string().nullable().describe('Consequence or risk if delayed/unanswered'),
});

export const ClassificationOutputSchema = z.object({
  label: z.enum([
    'ASSISTANT_TO_REPLY',
    'CLIENT_TO_REPLY',
    'NO_REPLY_NEEDED',
    'NEEDS_REVIEW',
  ]),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0.0 and 1.0'),
  reason: z.string().describe('Concise 1-2 sentence explanation of why this label was assigned'),
  evidence: z.string().describe('Short direct quote or phrase from the email supporting this classification'),
  summary: z.string().describe('Crisp single-sentence summary of the conversation state'),
  decision: DecisionObjectSchema.nullable().describe('Structured decision card (required for CLIENT_TO_REPLY)'),
  action_required: z.boolean().default(false),
  due_date: z.string().nullable().default(null),
  meetings: z.array(MeetingItemSchema).default([]),
  needs_review: z.boolean().default(false),
  signals_used: z.array(z.string()).default([]),
});
