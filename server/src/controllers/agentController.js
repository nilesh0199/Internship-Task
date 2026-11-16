import { z } from 'zod';
import {
  getAgentRegistryWithStats,
  runAgentsForThread,
  runAgentsForOrg,
  digestAgent,
  guardianAgent,
  AGENT_REGISTRY,
} from '../agents/index.js';
import { store } from '../services/store.js';
import { logger } from '../utils/logger.js';

export const UpdateAgentPolicySchema = z.object({
  enabled: z.boolean().optional(),
  autonomy: z.enum(['auto', 'propose', 'off']).optional(),
});

export const RunAgentsSchema = z.object({
  threadId: z.string().optional(),
});

/**
 * GET /api/agents
 * Registry of all specialized agents with capabilities, autonomy, and 24h statistics
 */
export async function getAgents(req, res, next) {
  try {
    const orgId = req.user?.orgId || 'org_vortex_001';
    const client = await store.getClientByOrgId(orgId);
    const registry = await getAgentRegistryWithStats(orgId, client);

    return res.status(200).json({
      ok: true,
      data: registry,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/agents/:id
 * Toggle an individual agent's enabled state or autonomy level (persisted in Client Playbook)
 */
export async function updateAgentPolicy(req, res, next) {
  try {
    const { id } = req.params;
    const { enabled, autonomy } = req.body;
    const orgId = req.user?.orgId || 'org_vortex_001';

    const client = await store.getClientByOrgId(orgId);
    if (!client) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Client profile not found', code: 'CLIENT_NOT_FOUND' },
      });
    }

    const currentPlaybook = client.playbook || {};
    const agentAutonomy = { ...(currentPlaybook.agentAutonomy || {}) };
    const agentSettings = { ...(currentPlaybook.agentSettings || {}) };
    const enabledAgents = { ...(agentSettings.enabledAgents || {}) };

    if (typeof enabled === 'boolean') {
      enabledAgents[id] = enabled;
      if (!enabled) {
        agentAutonomy[id] = 'off';
      } else if (agentAutonomy[id] === 'off') {
        agentAutonomy[id] = 'propose';
      }
    }

    if (autonomy) {
      agentAutonomy[id] = autonomy;
      if (autonomy === 'off') {
        enabledAgents[id] = false;
      } else {
        enabledAgents[id] = true;
      }
    }

    agentSettings.enabledAgents = enabledAgents;

    const updatedClient = await store.updateClient(client._id, {
      playbook: {
        ...currentPlaybook,
        agentAutonomy,
        agentSettings,
        updatedAt: new Date(),
      },
    });

    await store.addActivityLog({
      orgId,
      actorId: req.user._id,
      actorName: req.user.name || 'Assistant Maya',
      actorRole: 'assistant',
      action: 'PLAYBOOK_UPDATED',
      details: {
        agentId: id,
        autonomy: agentAutonomy[id],
        enabled: enabledAgents[id],
      },
    });

    return res.status(200).json({
      ok: true,
      message: `Policy for ${id} agent updated successfully`,
      data: {
        agentId: id,
        autonomy: agentAutonomy[id],
        enabled: enabledAgents[id],
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/agents/runs
 * Feed of recent agent runs with optional filters (threadId, agentId, outcome, limit)
 */
export async function getAgentRuns(req, res, next) {
  try {
    const { threadId, agentId, outcome, limit = 50 } = req.query;
    const orgId = req.user?.orgId || 'org_vortex_001';

    const runs = await store.getAgentRuns({
      orgId,
      threadId,
      agentId,
      outcome,
      limit: parseInt(limit, 10),
    });

    return res.status(200).json({
      ok: true,
      data: runs,
      total: runs.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/agents/run
 * Manually trigger agent execution on a specific thread or the entire organization
 */
export async function triggerAgentRun(req, res, next) {
  try {
    const { threadId } = req.body || {};
    const orgId = req.user?.orgId || 'org_vortex_001';

    if (threadId) {
      const thread = await store.getThreadById(threadId);
      if (!thread || (thread.orgId && thread.orgId !== orgId)) {
        return res.status(404).json({
          ok: false,
          error: { message: 'Thread not found', code: 'THREAD_NOT_FOUND' },
        });
      }

      const runs = await runAgentsForThread(thread, 'manual');
      return res.status(200).json({
        ok: true,
        message: `Ran agents for thread "${thread.subject}"`,
        data: {
          threadId: thread._id,
          runsCount: runs.length,
          runs,
        },
      });
    }

    // Run for organization
    const result = await runAgentsForOrg(orgId, 'manual');
    return res.status(200).json({
      ok: true,
      message: `Executed agents across ${result.threadsProcessed} threads (${result.runsGenerated} actions taken)`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/agents/runs/:id/undo
 * Executes the undo action payload to cleanly reverse an autonomous agent action
 */
export async function undoAgentAction(req, res, next) {
  try {
    const { id } = req.params;
    const result = await store.undoAgentRun(id, req.user._id, req.user.name || 'Assistant Maya');

    return res.status(200).json({
      ok: true,
      message: result.alreadyUndone
        ? 'Action was already reversed previously'
        : 'Autonomous action successfully reversed',
      data: result.run,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/agents/summary
 * Funnel overview statistics for the Agent Control Room
 */
export async function getAgentSummary(req, res, next) {
  try {
    const orgId = req.user?.orgId || 'org_vortex_001';
    const threads = await store.getThreads({ orgId });
    const stats = await store.getAgentStats(orgId, 24);
    const audit = await guardianAgent.getDailyQuietFolderAudit(orgId);

    let needMaya = 0;
    let needPriya = 0;
    let autoHandled = stats.autoHandled || 0;

    for (const t of threads) {
      if (t.currentLabel === 'ASSISTANT_TO_REPLY') needMaya++;
      if (t.currentLabel === 'CLIENT_TO_REPLY' && t.clientStatus !== 'handled') needPriya++;
    }

    return res.status(200).json({
      ok: true,
      data: {
        totalEmailsIn: threads.length,
        handledByAgents: autoHandled,
        needMaya,
        needPriya,
        proposalsPending: stats.proposed,
        reversalsToday: stats.reversed,
        hoursSavedEstimate: stats.hoursSavedEstimateHours,
        hoursSavedFormula: 'Estimated at 40s per auto-handled routine email',
        quietFolderAudit: audit,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/agents/digest
 * Morning brief and daily digest briefing for executive and assistant
 */
export async function getDailyDigest(req, res, next) {
  try {
    const orgId = req.user?.orgId || 'org_vortex_001';
    const clientId = req.user?.clientId || 'client_priya_001';
    const digest = await digestAgent.getLatestDigest(clientId, orgId);

    return res.status(200).json({
      ok: true,
      data: digest,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/agents/stream
 * Polling/streaming feed endpoint for live agent activity updates
 */
export async function getAgentStream(req, res, next) {
  try {
    const orgId = req.user?.orgId || 'org_vortex_001';
    const { since } = req.query;

    let runs = await store.getAgentRuns({ orgId, limit: 25 });
    if (since) {
      const sinceDate = new Date(since);
      runs = runs.filter((r) => new Date(r.createdAt) > sinceDate);
    }

    return res.status(200).json({
      ok: true,
      data: {
        timestamp: new Date().toISOString(),
        count: runs.length,
        runs,
      },
    });
  } catch (err) {
    next(err);
  }
}
