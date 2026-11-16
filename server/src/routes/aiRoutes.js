import express from 'express';
import {
  classifyThread,
  rerunAI,
  summarizeThread,
  generateDraft,
  chatAssistant,
} from '../controllers/aiController.js';
import { authRequired } from '../middleware/index.js';

const router = express.Router();

router.post('/classify/:threadId', authRequired, classifyThread);
router.post('/rerun/:threadId', authRequired, rerunAI);
router.get('/summarize/:threadId', authRequired, summarizeThread);
router.post('/generate-draft/:threadId', authRequired, generateDraft);
router.post('/chat', authRequired, chatAssistant);

export default router;
