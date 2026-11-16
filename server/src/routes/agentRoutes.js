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
  getAgentStatus,
  getAgentMemory,
  updateAgentMemory,
  addAgentMemoryEntry,
  deleteAgentMemoryEntry,
  toggleAgentMemoryEntry,
  dryRunAgent,
  UpdateAgentPolicySchema,
  RunAgentsSchema,
} from '../controllers/agentController.js';
import { authRequired, roleRequired, validate } from '../middleware/index.js';

const router = express.Router();

// Executive Client & Assistant access
router.get('/digest', authRequired, getDailyDigest);

// Assistant Workspace only
router.get('/', authRequired, roleRequired(['assistant']), getAgents);
router.get('/status', authRequired, roleRequired(['assistant']), getAgentStatus);
router.get('/summary', authRequired, roleRequired(['assistant']), getAgentSummary);
router.get('/stream', authRequired, roleRequired(['assistant']), getAgentStream);
router.get('/runs', authRequired, roleRequired(['assistant']), getAgentRuns);
router.post('/run', authRequired, roleRequired(['assistant']), validate(RunAgentsSchema), triggerAgentRun);
router.post('/runs/:id/undo', authRequired, roleRequired(['assistant']), undoAgentAction);

// Agent Memory ("Agent Notes") per Client
router.get('/:id/memory', authRequired, roleRequired(['assistant']), getAgentMemory);
router.put('/:id/memory', authRequired, roleRequired(['assistant']), updateAgentMemory);
router.post('/:id/memories', authRequired, roleRequired(['assistant']), addAgentMemoryEntry);
router.delete('/:id/memories/:memoryId', authRequired, roleRequired(['assistant']), deleteAgentMemoryEntry);
router.patch('/:id/memories/:memoryId', authRequired, roleRequired(['assistant']), toggleAgentMemoryEntry);
router.post('/:id/dry-run', authRequired, roleRequired(['assistant']), dryRunAgent);

router.put('/:id', authRequired, roleRequired(['assistant']), validate(UpdateAgentPolicySchema), updateAgentPolicy);

export default router;
