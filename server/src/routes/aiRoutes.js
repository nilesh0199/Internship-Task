import express from 'express';
import { z } from 'zod';
import {
  classifyThread,
  rerunAI,
  summarizeThread,
  generateDraft,
  chatAssistant,
} from '../controllers/aiController.js';
import { authRequired, roleRequired, validate } from '../middleware/index.js';

const router = express.Router();

const ThreadIdParamSchema = z.object({
  threadId: z.string().min(1),
});

const ChatBodySchema = z.object({
  query: z.string().min(1),
  conversationHistory: z.array(z.any()).optional(),
});

// Assistant-only AI triggering & drafting
router.post(
  '/classify/:threadId',
  authRequired,
  roleRequired(['assistant']),
  validate(ThreadIdParamSchema, 'params'),
  classifyThread
);
router.post(
  '/rerun/:threadId',
  authRequired,
  roleRequired(['assistant']),
  validate(ThreadIdParamSchema, 'params'),
  rerunAI
);
router.post(
  '/generate-draft/:threadId',
  authRequired,
  roleRequired(['assistant']),
  validate(ThreadIdParamSchema, 'params'),
  generateDraft
);

// Shared executive reading & interactive chat
router.get(
  '/summarize/:threadId',
  authRequired,
  validate(ThreadIdParamSchema, 'params'),
  summarizeThread
);
router.post('/chat', authRequired, validate(ChatBodySchema), chatAssistant);

export default router;
