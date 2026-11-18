import express from 'express';
import { z } from 'zod';
import {
  getThreads,
  getThreadById,
  updateThread,
  archiveThread,
  overrideLabel,
  clientDecision,
  getTodaySummary,
  composeEmail,
  saveThreadDraft,
  sendThreadReply,
} from '../controllers/threadController.js';
import {
  getPlaybook,
  updatePlaybook,
  updateVipContacts,
  addPlaybookRule,
  saveDraft,
  requestClientApproval,
  sendDraft,
  getActivityLog,
} from '../controllers/playbookController.js';
import { resetDemoData, simulateInboundEmail } from '../controllers/demoController.js';
import { authRequired, roleRequired, validate } from '../middleware/index.js';

const router = express.Router();

const IdParamSchema = z.object({
  id: z.string().min(1),
});

const GetThreadsQuerySchema = z.object({
  segment: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().optional(),
  accountId: z.string().optional(),
  clientId: z.string().optional(),
});

const OverrideLabelBodySchema = z.object({
  newLabel: z.enum(['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW']),
  note: z.string().optional(),
});

const ClientDecisionBodySchema = z.object({
  action: z.enum(['approve', 'reply_direct', 'hand_to_assistant', 'snooze', 'handled', 'undo']),
  note: z.string().optional(),
  draftId: z.string().optional(),
  customText: z.string().optional(),
  duration: z.enum(['4h', 'tomorrow', 'next_week']).optional(),
  previousState: z.record(z.any()).optional(),
});

const ThreadDraftBodySchema = z.object({
  subject: z.string().trim().max(240).optional(),
  bodyText: z.string().trim().max(15000).optional().default(''),
  status: z.enum(['draft', 'pending_client', 'approved']).optional().default('draft'),
});

const ThreadSendBodySchema = z.object({
  subject: z.string().trim().max(240).optional(),
  bodyText: z.string().trim().min(1, 'Reply body cannot be empty').max(15000),
});

const PlaybookBodySchema = z.object({
  topicRules: z.array(z.any()).optional(),
  vipSenders: z.array(z.string()).optional(),
  vipDomains: z.array(z.string()).optional(),
  financialThresholds: z.record(z.any()).optional(),
  customInstructions: z.string().optional(),
});

const AddRuleBodySchema = z.object({
  topic: z.string().min(1),
  disposition: z.enum(['ALWAYS_CLIENT', 'ASSISTANT_CAN_HANDLE', 'NEVER_BOTHER_CLIENT', 'ESCALATE_IF_CONFUSED']),
  description: z.string().optional(),
});

const SaveDraftBodySchema = z.object({
  _id: z.string().optional(),
  threadId: z.string().min(1),
  subject: z.string().optional(),
  bodyText: z.string().optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  status: z.enum(['draft', 'pending_client', 'approved', 'sent']).optional(),
});

// Today Command View (Cross-client)
router.get('/assistant/today', authRequired, roleRequired(['assistant']), getTodaySummary);
router.get('/today', authRequired, roleRequired(['assistant']), getTodaySummary);

const ComposeEmailBodySchema = z.object({
  to: z.string().trim().email('Please enter a valid recipient email address'),
  toName: z.string().trim().max(120).optional().default(''),
  cc: z.string().trim().max(500).optional().default(''),
  subject: z.string().trim().min(1, 'Subject is required').max(240),
  bodyText: z.string().trim().min(1, 'Message body cannot be empty').max(15000),
  clientId: z.string().optional(),
  mode: z.enum(['send', 'draft', 'request_approval']).optional().default('send'),
});

// Threads (Shared reads, role-governed actions)
router.get('/threads', authRequired, validate(GetThreadsQuerySchema, 'query'), getThreads);
router.post('/threads/compose', authRequired, validate(ComposeEmailBodySchema), composeEmail);
router.get('/threads/:id', authRequired, validate(IdParamSchema, 'params'), getThreadById);
router.patch('/threads/:id', authRequired, validate(IdParamSchema, 'params'), updateThread);

// Assistant-only: manual label override & correction recording
router.post(
  '/threads/:id/override',
  authRequired,
  roleRequired(['assistant']),
  validate(IdParamSchema, 'params'),
  validate(OverrideLabelBodySchema),
  overrideLabel
);
router.post(
  '/threads/:id/override-label',
  authRequired,
  roleRequired(['assistant']),
  validate(IdParamSchema, 'params'),
  validate(OverrideLabelBodySchema),
  overrideLabel
);
router.post(
  '/threads/:id/archive',
  authRequired,
  roleRequired(['assistant']),
  validate(IdParamSchema, 'params'),
  archiveThread
);
router.post(
  '/threads/:id/draft',
  authRequired,
  roleRequired(['assistant']),
  validate(IdParamSchema, 'params'),
  validate(ThreadDraftBodySchema),
  saveThreadDraft
);
router.post(
  '/threads/:id/send',
  authRequired,
  roleRequired(['assistant']),
  validate(IdParamSchema, 'params'),
  validate(ThreadSendBodySchema),
  sendThreadReply
);

// Client-only: decision actions from queue
router.post(
  '/threads/:id/client-decision',
  authRequired,
  roleRequired(['client']),
  validate(IdParamSchema, 'params'),
  validate(ClientDecisionBodySchema),
  clientDecision
);

const UpdateVipsBodySchema = z.object({
  vipSenders: z.array(z.string().email('Enter a valid email address')).max(50).optional(),
  vipDomains: z.array(z.string().min(3).max(120)).max(30).optional(),
  clientId: z.string().optional(),
});

// Playbook
router.get('/playbook', authRequired, getPlaybook);
router.put(
  '/playbook/vips',
  authRequired,
  validate(UpdateVipsBodySchema),
  updateVipContacts
);
router.put(
  '/playbook',
  authRequired,
  roleRequired(['assistant']),
  validate(PlaybookBodySchema),
  updatePlaybook
);
router.post(
  '/playbook/add-rule',
  authRequired,
  roleRequired(['assistant']),
  validate(AddRuleBodySchema),
  addPlaybookRule
);

// Drafts (Assistant only for composition, submission, and sending)
router.post(
  '/drafts',
  authRequired,
  roleRequired(['assistant']),
  validate(SaveDraftBodySchema),
  saveDraft
);
router.post(
  '/drafts/:id/request-approval',
  authRequired,
  roleRequired(['assistant']),
  validate(IdParamSchema, 'params'),
  requestClientApproval
);
router.post(
  '/drafts/:id/send',
  authRequired,
  roleRequired(['assistant']),
  validate(IdParamSchema, 'params'),
  sendDraft
);

// Activity Logs
router.get('/activity', authRequired, getActivityLog);

// Demo Workspace Controls
router.post('/demo/reset', authRequired, resetDemoData);
router.post('/demo/simulate-inbound', authRequired, simulateInboundEmail);

export default router;
