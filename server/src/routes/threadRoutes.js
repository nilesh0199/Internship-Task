import express from 'express';
import {
  getThreads,
  getThreadById,
  updateThread,
  overrideLabel,
  clientDecision,
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
import { authRequired } from '../middleware/index.js';

const router = express.Router();

// Threads
router.get('/threads', authRequired, getThreads);
router.get('/threads/:id', authRequired, getThreadById);
router.patch('/threads/:id', authRequired, updateThread);
router.post('/threads/:id/override', authRequired, overrideLabel);
router.post('/threads/:id/client-decision', authRequired, clientDecision);

// Playbook
router.get('/playbook', authRequired, getPlaybook);
router.put('/playbook', authRequired, updatePlaybook);
router.post('/playbook/add-rule', authRequired, addPlaybookRule);

// Drafts
router.post('/drafts', authRequired, saveDraft);
router.post('/drafts/:id/request-approval', authRequired, requestClientApproval);
router.post('/drafts/:id/send', authRequired, sendDraft);

// Activity Logs
router.get('/activity', authRequired, getActivityLog);

export default router;
