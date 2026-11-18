import { TriageAgent } from './TriageAgent.js';
import { SchedulingAgent } from './SchedulingAgent.js';
import { FollowUpAgent } from './FollowUpAgent.js';
import { DraftingAgent } from './DraftingAgent.js';
import { DigestAgent } from './DigestAgent.js';
import { GuardianAgent } from './GuardianAgent.js';
import { getAgentAutonomy, isAgentActive, isGlobalAgentsEnabled } from './policy.js';
import { store } from '../services/store.js';
import { logger } from '../utils/logger.js';

// Instantiate singletons
export const triageAgent = new TriageAgent();
export const schedulingAgent = new SchedulingAgent();
export const followupAgent = new FollowUpAgent();
export const draftingAgent = new DraftingAgent();
export const digestAgent = new DigestAgent();
export const guardianAgent = new GuardianAgent();

export const AGENT_REGISTRY = [
  triageAgent,
  schedulingAgent,
  followupAgent,
  draftingAgent,
  digestAgent,
  guardianAgent,
];

/**
 * Executes a single agent with configurable timeout based on agent kind
 */
async function executeAgentWithTimeout(agent, thread, ctx, timeoutMs = null) {
  const actualTimeoutMs = timeoutMs || (agent.kind === 'agent' ? 25000 : 8000);
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Agent ${agent.name} timed out after ${actualTimeoutMs}ms`));
    }, actualTimeoutMs);
  });

  try {
    const result = await Promise.race([agent.run(thread, ctx), timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Executes the specialized agent collective for a single thread
 * Pipeline execution order: Triage -> Scheduling -> Follow-up -> Drafting -> Digest -> Guardian
 *
 * @param {Object} thread - The Thread document
 * @param {'ingest'|'new_message'|'client_action'|'schedule_tick'|'manual'} trigger
 * @param {Object} [overrideCtx]
 * @returns {Promise<Array<Object>>} Array of AgentRun records
 */
export async function runAgentsForThread(thread, trigger = 'ingest', overrideCtx = {}) {
  if (!isGlobalAgentsEnabled()) {
    logger.debug('[Orchestrator] Global AGENTS_ENABLED is false, skipping agent execution');
    return [];
  }

  if (!thread) {
    return [];
  }

  const orgId = thread.orgId || overrideCtx.orgId;
  const client =
    overrideCtx.client ||
    (thread.clientId ? await store.getClientById(thread.clientId) : null) ||
    (await store.getClientByOrgId(orgId));
  const playbook = client?.playbook || {};
  const messages = overrideCtx.messages || (await store.getMessagesByThreadId(thread._id || thread.id)) || [];

  const threadContext = {
    trigger,
    orgId,
    client,
    playbook,
    messages,
    existingRuns: [],
    ...overrideCtx,
  };

  const executedRuns = [];

  // Sequential execution ensures downstream agents (like Guardian) inspect upstream actions
  for (const agent of AGENT_REGISTRY) {
    // 1. Policy & Active check
    if (!isAgentActive(client, agent.id)) {
      continue;
    }

    const autonomy = getAgentAutonomy(client, agent.id);
    const agentCtx = { ...threadContext, autonomy, existingRuns: executedRuns };

    // 2. Trigger & Capability filter
    if (!agent.canRun(thread, agentCtx)) {
      continue;
    }

    const startedAt = new Date();

    try {
      const result = await executeAgentWithTimeout(agent, thread, agentCtx);

      // Skip recording purely skipped evaluations if no action taken
      if (result.outcome === 'skipped' && !result.details?.draftId) {
        continue;
      }

      // Check notes applied
      let notesApplied = result.details?.notesApplied || null;
      if (!notesApplied) {
        const agentMem = client?.agentMemory?.[agent.id] || { instruction: '', memories: [] };
        const activeMems = (agentMem.memories || []).filter((m) => m.enabled !== false);
        if (result.usedLLM && (agentMem.instruction || activeMems.length > 0)) {
          notesApplied = activeMems.length > 0
            ? `Used instruction + ${activeMems.length} ${activeMems.length === 1 ? 'memory' : 'memories'}`
            : 'Used instruction';
        } else if (!result.usedLLM && (agentMem.instruction || activeMems.length > 0)) {
          notesApplied = 'notes not applied (AI unavailable)';
        }
      }

      // 3. Persist AgentRun record in store
      const runRecord = await store.addAgentRun({
        agentId: agent.id,
        kind: result.kind || agent.kind || 'workflow',
        orgId,
        clientId: client?._id || thread.clientId,
        threadId: thread._id || thread.id,
        trigger,
        action: result.action,
        outcome: result.outcome,
        summary: result.summary,
        details: result.details || {},
        confidence: result.confidence ?? 0.95,
        requiresHuman: !!result.requiresHuman,
        undo: result.undo || null,
        usedLLM: !!result.usedLLM,
        fallbackUsed: !!result.fallbackUsed,
        notesApplied,
        durationMs: result.durationMs || Date.now() - startedAt.getTime(),
        steps: result.steps || [],
        stopReason: result.stopReason || null,
        usage: result.usage || null,
        recordedSample: !!result.recordedSample,
        startedAt,
      });

      executedRuns.push(runRecord);

      // 4. Record to per-thread ActivityLog timeline
      await store.addActivityLog({
        orgId,
        actorId: `agent_${agent.id}`,
        actorName: agent.name,
        actorRole: 'agent',
        action: 'AGENT_RUN',
        threadId: thread._id || thread.id,
        details: {
          agentId: agent.id,
          action: result.action,
          outcome: result.outcome,
          summary: result.summary,
          requiresHuman: result.requiresHuman,
        },
      });

      // Update thread with active short agent summary
      let shortSummary = '';
      if (agent.id === 'triage') shortSummary = result.outcome === 'auto_handled' ? 'Triage - filed' : 'Triage - routed';
      else if (agent.id === 'scheduling') shortSummary = result.details?.conflictingMeeting ? 'Scheduling - conflict' : 'Scheduling - proposed';
      else if (agent.id === 'followup') shortSummary = 'Follow-up - drafted';
      else if (agent.id === 'drafting') shortSummary = 'Drafting - prepared';
      else if (agent.id === 'guardian' && result.outcome === 'reversed') shortSummary = 'Guardian - reversed';

      if (shortSummary) {
        await store.updateThread(thread._id || thread.id, {
          agentSummary: shortSummary,
        });
      }

      // Reload fresh thread state for subsequent agents (e.g. Guardian checking updated labels)
      const freshThread = await store.getThreadById(thread._id || thread.id);
      if (freshThread) {
        thread = freshThread;
      }
    } catch (agentErr) {
      logger.error(
        { agent: agent.name, threadId: thread._id || thread.id, err: agentErr.message },
        '[Orchestrator] Individual agent error, continuing pipeline'
      );

      // Record error outcome
      await store.addAgentRun({
        agentId: agent.id,
        orgId,
        clientId: client?._id || thread.clientId,
        threadId: thread._id || thread.id,
        trigger,
        action: 'agent_error',
        outcome: 'error',
        summary: `${agent.name} encountered an error: ${agentErr.message}`,
        details: { error: agentErr.message },
        durationMs: Date.now() - startedAt.getTime(),
        startedAt,
      });
    }
  }

  return executedRuns;
}

/**
 * Concurrency helper: processes items in chunks
 */
async function processInChunks(items, chunkSize, asyncFn) {
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(chunk.map((item) => asyncFn(item)));
    results.push(...chunkResults);
  }
  return results;
}

/**
 * Executes agents across all active threads for an organization
 * Concurrency limit: 3 threads simultaneously
 *
 * @param {string} orgId
 * @param {'schedule_tick'|'manual'|'ingest'} trigger
 * @returns {Promise<{ threadsProcessed: number, runsGenerated: number }>}
 */
export async function runAgentsForOrg(orgId, trigger = 'manual') {
  if (!isGlobalAgentsEnabled()) {
    return { threadsProcessed: 0, runsGenerated: 0 };
  }

  const client = await store.getClientByOrgId(orgId);
  const threads = await store.getThreads({ orgId, isArchived: false });
  let totalRuns = 0;

  await processInChunks(threads, 3, async (thread) => {
    try {
      const runs = await runAgentsForThread(thread, trigger, { orgId, client });
      totalRuns += runs.length;
    } catch (err) {
      logger.warn({ threadId: thread._id, err: err.message }, '[Orchestrator] Batch agent failure on thread');
    }
  });

  // Also run DigestAgent once for the org
  try {
    await digestAgent.run(null, { client, trigger });
  } catch (dErr) {
    logger.warn({ orgId, err: dErr.message }, '[Orchestrator] Digest update failure');
  }

  return {
    threadsProcessed: threads.length,
    runsGenerated: totalRuns,
  };
}

/**
 * Returns the full agent registry with metadata and 24h stats
 */
export async function getAgentRegistryWithStats(orgId, client) {
  const stats = await store.getAgentStats(orgId, 24);
  const runs = await store.getAgentRuns({ orgId, limit: 100 });

  const TOOL_ALLOWLISTS = {
    triage: [
      'get_thread',
      'get_sender_history',
      'search_client_threads',
      'get_playbook',
      'get_corrections',
      'get_agent_notes',
      'propose_classification',
    ],
    scheduling: [
      'get_thread',
      'find_meetings',
      'check_conflicts',
      'suggest_free_slots',
      'get_agent_notes',
      'propose_reschedule',
    ],
    drafting: [
      'get_thread',
      'get_past_replies',
      'get_agent_notes',
      'check_facts',
      'propose_draft',
    ],
  };

  return AGENT_REGISTRY.map((agent) => {
    const autonomy = getAgentAutonomy(client, agent.id);
    const isEnabled = autonomy !== 'off';
    const agentStats = stats.byAgent[agent.id] || { total: 0, handled: 0, proposed: 0, escalated: 0, reversed: 0 };
    const lastRun = runs.find((r) => r.agentId === agent.id);

    // Precise kind differentiation
    const isAgent = agent.kind === 'agent' || agent.id === 'scheduling' || agent.id === 'drafting';
    const kind = isAgent ? 'agent' : 'workflow';

    // Component limits definition
    let limits = {
      maxSteps: 1,
      tools: [],
      neverSends: true,
      executionModel: 'deterministic_workflow',
    };

    if (agent.id === 'scheduling') {
      limits = {
        maxSteps: 5,
        timeoutMs: 20000,
        tools: TOOL_ALLOWLISTS.scheduling,
        neverSends: true,
        executionModel: 'closed_loop_agent',
      };
    } else if (agent.id === 'drafting') {
      limits = {
        maxSteps: 5,
        timeoutMs: 20000,
        tools: TOOL_ALLOWLISTS.drafting,
        neverSends: true,
        executionModel: 'closed_loop_agent',
      };
    } else if (agent.id === 'triage') {
      limits = {
        maxSteps: 4,
        timeoutMs: 15000,
        tools: TOOL_ALLOWLISTS.triage,
        neverSends: true,
        executionModel: 'fast_path_workflow_with_investigator_agent',
      };
    } else if (agent.id === 'guardian') {
      limits = {
        maxSteps: 1,
        tools: [],
        neverSends: true,
        executionModel: 'zero_trust_safety_check',
      };
    }

    return {
      id: agent.id,
      name: agent.name,
      kind,
      description: agent.description,
      canDo: agent.canDo,
      neverDoes: agent.neverDoes,
      triggers: agent.triggers,
      autonomy,
      enabled: isEnabled,
      limits,
      lastRunAt: lastRun ? lastRun.createdAt : null,
      stats: {
        handled: agentStats.handled,
        proposed: agentStats.proposed,
        escalated: agentStats.escalated,
        reversed: agentStats.reversed,
        total: agentStats.total,
      },
    };
  });
}

const clientRunLocks = new Map();

/**
 * Executes agents across all active threads for a specific client
 * Guarded by per-client in-process lock
 */
export async function runAgentsForClient(clientId, orgId, trigger = 'schedule_tick') {
  if (clientRunLocks.get(clientId)) {
    logger.debug({ clientId }, '[Orchestrator] Client agent run in progress, skipping overlapping run');
    return { skipped: true, clientId };
  }
  clientRunLocks.set(clientId, true);
  try {
    const client = await store.getClientById(clientId);
    const threads = await store.getThreads({ orgId, clientId, isArchived: false });
    let totalRuns = 0;

    await processInChunks(threads, 3, async (thread) => {
      try {
        const runs = await runAgentsForThread(thread, trigger, { orgId, client });
        totalRuns += runs.length;
      } catch (err) {
        logger.warn({ threadId: thread._id, err: err.message }, '[Orchestrator] Batch agent failure on client thread');
      }
    });

    return {
      clientId,
      threadsProcessed: threads.length,
      runsGenerated: totalRuns,
    };
  } finally {
    clientRunLocks.delete(clientId);
  }
}

/**
 * Autonomous background agent scheduler (every 3 minutes per client)
 * Guarded by per-client in-process lock and randomized jitter (1000-5000ms)
 * Enabled by default unless process.env.ENABLE_AGENT_TICK === 'false' or in test environment
 */
let schedulerInterval = null;

export function startAgentScheduler() {
  if (process.env.ENABLE_AGENT_TICK === 'false' || process.env.NODE_ENV === 'test') {
    return;
  }
  if (schedulerInterval) return;

  logger.info('[Orchestrator] Starting 3-minute per-client background scheduler');
  schedulerInterval = setInterval(async () => {
    try {
      const orgId = 'org_vortex_001';
      const clients = await store.getClientsByOrgId(orgId);
      for (const c of clients) {
        const jitterMs = Math.floor(1000 + Math.random() * 4000);
        setTimeout(async () => {
          try {
            await runAgentsForClient(c._id, orgId, 'schedule_tick');
          } catch (cErr) {
            logger.warn({ clientId: c._id, err: cErr.message }, '[Orchestrator] Background client tick failure');
          }
        }, jitterMs);
      }
    } catch (err) {
      logger.error({ err: err.message }, '[Orchestrator] Scheduler tick failed');
    }
  }, 3 * 60 * 1000);
}

export function stopAgentScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
