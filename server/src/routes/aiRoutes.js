import express from 'express';
import { z } from 'zod';
import {
  classifyThread,
  rerunAI,
  summarizeThread,
  generateDraft,
  chatAssistant,
} from '../controllers/aiController.js';
import {
  getAiSettings,
  saveAiSettings,
  testAiSettings,
  deleteAiSettingsKey,
  SaveAiSettingsSchema,
  TestAiSettingsSchema,
} from '../controllers/aiSettingsController.js';
import { authRequired, roleRequired, validate } from '../middleware/index.js';

const router = express.Router();

const ThreadIdParamSchema = z.object({
  threadId: z.string().min(1),
});

const ChatBodySchema = z.object({
  query: z.string().min(1),
  threadId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
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

// Assistant-only BYOK AI Provider & API Key Settings (AES-256-GCM encrypted)
router.get('/settings', authRequired, roleRequired(['assistant']), getAiSettings);
router.put(
  '/settings',
  authRequired,
  roleRequired(['assistant']),
  validate(SaveAiSettingsSchema),
  saveAiSettings
);
router.post(
  '/settings/test',
  authRequired,
  roleRequired(['assistant']),
  validate(TestAiSettingsSchema),
  testAiSettings
);
router.delete('/settings/key', authRequired, roleRequired(['assistant']), deleteAiSettingsKey);

export default router;
