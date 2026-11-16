import express from 'express';
import {
  getAgents,
  updateAgentPolicy,
  getAgentRuns,
  triggerAgentRun,
  undoAgentAction,
  getAgentSummary,
  getDailyDigest,
  getAgentStream,
  UpdateAgentPolicySchema,
  RunAgentsSchema,
} from '../controllers/agentController.js';
import { authRequired, roleRequired, validate } from '../middleware/index.js';

const router = express.Router();

// Executive Client & Assistant access
router.get('/digest', authRequired, getDailyDigest);

// Assistant Workspace only
router.get('/', authRequired, roleRequired(['assistant']), getAgents);
router.put('/:id', authRequired, roleRequired(['assistant']), validate(UpdateAgentPolicySchema), updateAgentPolicy);
router.get('/runs', authRequired, roleRequired(['assistant']), getAgentRuns);
router.post('/run', authRequired, roleRequired(['assistant']), validate(RunAgentsSchema), triggerAgentRun);
router.post('/runs/:id/undo', authRequired, roleRequired(['assistant']), undoAgentAction);
router.get('/summary', authRequired, roleRequired(['assistant']), getAgentSummary);
router.get('/stream', authRequired, roleRequired(['assistant']), getAgentStream);

export default router;
