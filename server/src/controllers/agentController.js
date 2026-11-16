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
    const targetClientId = req.query?.clientId;
    const client = targetClientId
      ? await store.getClientByOrgAndId(orgId, targetClientId)
      : await store.getClientByOrgId(orgId);
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
    const { enabled, autonomy, clientId } = req.body;
    const orgId = req.user?.orgId || 'org_vortex_001';
    const targetClientId = clientId || req.query?.clientId;

    const client = targetClientId
      ? await store.getClientByOrgAndId(orgId, targetClientId)
      : await store.getClientByOrgId(orgId);
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
    const { threadId, agentId, outcome, clientId, limit = 50 } = req.query;
    const orgId = req.user?.orgId || 'org_vortex_001';

    const runs = await store.getAgentRuns({
      orgId,
      clientId,
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

/**
 * GET /api/agents/status
 * Heartbeat and execution status for background agent ticker
 */
export async function getAgentStatus(req, res, next) {
  try {
    const orgId = req.user?.orgId || 'org_vortex_001';
    const runs = await store.getAgentRuns({ orgId, limit: 1 });
    const lastRun = runs[0];
    const isGlobalEnabled = process.env.AGENTS_ENABLED !== 'false';
    const isTickEnabled = process.env.ENABLE_AGENT_TICK !== 'false';

    return res.status(200).json({
      ok: true,
      data: {
        isRunning: isGlobalEnabled && isTickEnabled,
        enabled: isGlobalEnabled,
        tickEnabled: isTickEnabled,
        lastRunAt: lastRun ? lastRun.createdAt : new Date(),
        activeAgentsCount: 6,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/agents/:id/memory
 * Read standing instruction and active memories for this client + agent
 */
export async function getAgentMemory(req, res, next) {
  try {
    const { id } = req.params;
    const { clientId } = req.query;
    const orgId = req.user?.orgId || 'org_vortex_001';
    const client = clientId
      ? await store.getClientByOrgAndId(orgId, clientId)
      : await store.getClientByOrgId(orgId);

    if (!client) {
      return res.status(404).json({ ok: false, error: { message: 'Client not found', code: 'NOT_FOUND' } });
    }

    const memory = await store.getAgentMemory(client._id, id);
    return res.status(200).json({ ok: true, data: memory });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/agents/:id/memory
 * Update standing instruction (max 500 chars)
 */
export async function updateAgentMemory(req, res, next) {
  try {
    const { id } = req.params;
    const { clientId } = req.query;
    const { instruction } = req.body;
    const orgId = req.user?.orgId || 'org_vortex_001';
    const client = clientId
      ? await store.getClientByOrgAndId(orgId, clientId)
      : await store.getClientByOrgId(orgId);

    if (!client) {
      return res.status(404).json({ ok: false, error: { message: 'Client not found', code: 'NOT_FOUND' } });
    }

    // Sanitize and length-limit (max 500 chars)
    const sanitizedInstruction = typeof instruction === 'string'
      ? instruction.slice(0, 500).replace(/<[^>]*>/g, '').trim()
      : '';

    const updatedClient = await store.updateAgentMemory(client._id, id, { instruction: sanitizedInstruction }, {
      actorId: req.user._id,
      actorName: req.user.name,
      orgId,
    });

    const agentMem = updatedClient?.agentMemory?.[id] || { instruction: sanitizedInstruction, memories: [] };
    return res.status(200).json({ ok: true, data: agentMem });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/agents/:id/memories
 * Add a memory entry (max 200 chars)
 */
export async function addAgentMemoryEntry(req, res, next) {
  try {
    const { id } = req.params;
    const { clientId } = req.query;
    const { text, source = 'manual', pinned = false, enabled = true } = req.body;
    const orgId = req.user?.orgId || 'org_vortex_001';
    const client = clientId
      ? await store.getClientByOrgAndId(orgId, clientId)
      : await store.getClientByOrgId(orgId);

    if (!client) {
      return res.status(404).json({ ok: false, error: { message: 'Client not found', code: 'NOT_FOUND' } });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ ok: false, error: { message: 'Memory text is required', code: 'INVALID_INPUT' } });
    }

    const sanitizedText = text.slice(0, 200).replace(/<[^>]*>/g, '').trim();

    const entry = await store.addAgentMemoryEntry(
      client._id,
      id,
      {
        text: sanitizedText,
        source: source === 'learned' ? 'learned' : 'manual',
        pinned: !!pinned,
        enabled: enabled !== false,
      },
      {
        actorId: req.user._id,
        actorName: req.user.name,
        orgId,
      }
    );

    return res.status(201).json({ ok: true, data: entry });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/agents/:id/memories/:memoryId
 * Remove a specific memory entry
 */
export async function deleteAgentMemoryEntry(req, res, next) {
  try {
    const { id, memoryId } = req.params;
    const { clientId } = req.query;
    const orgId = req.user?.orgId || 'org_vortex_001';
    const client = clientId
      ? await store.getClientByOrgAndId(orgId, clientId)
      : await store.getClientByOrgId(orgId);

    if (!client) {
      return res.status(404).json({ ok: false, error: { message: 'Client not found', code: 'NOT_FOUND' } });
    }

    await store.removeAgentMemoryEntry(client._id, id, memoryId, {
      actorId: req.user._id,
      actorName: req.user.name,
      orgId,
    });

    return res.status(200).json({ ok: true, message: 'Memory removed successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/agents/:id/memories/:memoryId
 * Toggle enable/pinned or update text of a memory entry
 */
export async function toggleAgentMemoryEntry(req, res, next) {
  try {
    const { id, memoryId } = req.params;
    const { clientId } = req.query;
    const { enabled, pinned, text } = req.body;
    const orgId = req.user?.orgId || 'org_vortex_001';
    const client = clientId
      ? await store.getClientByOrgAndId(orgId, clientId)
      : await store.getClientByOrgId(orgId);

    if (!client) {
      return res.status(404).json({ ok: false, error: { message: 'Client not found', code: 'NOT_FOUND' } });
    }

    const updates = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (typeof pinned === 'boolean') updates.pinned = pinned;
    if (typeof text === 'string') updates.text = text.slice(0, 200).trim();

    const updated = await store.toggleAgentMemoryEntry(client._id, id, memoryId, updates, {
      actorId: req.user._id,
      actorName: req.user.name,
      orgId,
    });

    return res.status(200).json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/agents/:id/dry-run
 * Dry-run preview of an agent on a sample thread: with notes vs without notes
 */
export async function dryRunAgent(req, res, next) {
  try {
    const { id } = req.params;
    const { clientId, threadId } = req.body || {};
    const orgId = req.user?.orgId || 'org_vortex_001';
    const client = clientId
      ? await store.getClientByOrgAndId(orgId, clientId)
      : await store.getClientByOrgId(orgId);

    if (!client) {
      return res.status(404).json({ ok: false, error: { message: 'Client not found', code: 'NOT_FOUND' } });
    }

    let thread = null;
    if (threadId) {
      thread = await store.getThreadById(threadId);
    }
    if (!thread) {
      const threads = await store.getThreads({ orgId, clientId: client._id, isArchived: false });
      thread = threads[0] || (await store.getThreads({ orgId }))[0];
    }

    if (!thread) {
      return res.status(404).json({ ok: false, error: { message: 'No sample thread found for dry run', code: 'THREAD_NOT_FOUND' } });
    }

    const messages = await store.getMessagesByThreadId(thread._id || thread.id);
    const agent = AGENT_REGISTRY.find((a) => a.id === id);
    if (!agent) {
      return res.status(404).json({ ok: false, error: { message: 'Agent not found', code: 'AGENT_NOT_FOUND' } });
    }

    // 1. Run WITHOUT notes (clean memory)
    const clientWithoutNotes = {
      ...client,
      agentMemory: {
        ...(client.agentMemory || {}),
        [id]: { instruction: '', memories: [] },
      },
    };
    const ctxWithoutNotes = {
      trigger: 'manual',
      orgId,
      client: clientWithoutNotes,
      playbook: client.playbook || {},
      messages,
      autonomy: 'propose',
      isDryRun: true,
    };

    let resultWithoutNotes = null;
    try {
      resultWithoutNotes = await agent.run({ ...thread }, ctxWithoutNotes);
    } catch (e) {
      resultWithoutNotes = { outcome: 'error', summary: e.message };
    }

    // 2. Run WITH notes
    const ctxWithNotes = {
      trigger: 'manual',
      orgId,
      client,
      playbook: client.playbook || {},
      messages,
      autonomy: 'propose',
      isDryRun: true,
    };

    let resultWithNotes = null;
    try {
      resultWithNotes = await agent.run({ ...thread }, ctxWithNotes);
    } catch (e) {
      resultWithNotes = { outcome: 'error', summary: e.message };
    }

    const mem = client.agentMemory?.[id] || { instruction: '', memories: [] };
    const enabledMemCount = (mem.memories || []).filter((m) => m.enabled !== false).length;
    let notesSummary = 'No active notes configured';
    if (mem.instruction && enabledMemCount > 0) {
      notesSummary = `Applied instruction + ${enabledMemCount} active ${enabledMemCount === 1 ? 'memory' : 'memories'}`;
    } else if (mem.instruction) {
      notesSummary = 'Applied standing instruction';
    } else if (enabledMemCount > 0) {
      notesSummary = `Applied ${enabledMemCount} active ${enabledMemCount === 1 ? 'memory' : 'memories'}`;
    }

    return res.status(200).json({
      ok: true,
      data: {
        agentId: id,
        thread: {
          _id: thread._id,
          subject: thread.subject,
          currentLabel: thread.currentLabel,
          snippet: thread.snippet,
        },
        withoutNotes: {
          action: resultWithoutNotes?.action,
          outcome: resultWithoutNotes?.outcome,
          summary: resultWithoutNotes?.summary,
          confidence: resultWithoutNotes?.confidence,
        },
        withNotes: {
          action: resultWithNotes?.action,
          outcome: resultWithNotes?.outcome,
          summary: resultWithNotes?.summary,
          confidence: resultWithNotes?.confidence,
          notesApplied: notesSummary,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
