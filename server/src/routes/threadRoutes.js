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
} from '../controllers/threadController.js';
import {
  getPlaybook,
  updatePlaybook,
  addPlaybookRule,
  saveDraft,
  requestClientApproval,
  sendDraft,
  getActivityLog,
} from '../controllers/playbookController.js';
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
  action: z.enum(['approve', 'hand_to_assistant', 'snooze', 'handled']),
  note: z.string().optional(),
  draftId: z.string().optional(),
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

// Threads (Shared reads, role-governed actions)
router.get('/threads', authRequired, validate(GetThreadsQuerySchema, 'query'), getThreads);
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

// Client-only: decision actions from queue
router.post(
  '/threads/:id/client-decision',
  authRequired,
  roleRequired(['client']),
  validate(IdParamSchema, 'params'),
  validate(ClientDecisionBodySchema),
  clientDecision
);

// Playbook
router.get('/playbook', authRequired, getPlaybook);
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

export default router;
