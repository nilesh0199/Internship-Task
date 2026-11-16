import crypto from 'crypto';
import { runDeterministicPrefilters } from './prefilters.js';
import { enforceRiskGuardrails } from './guardrails.js';
import { invokeClassificationLLM } from './llmClient.js';
import { store } from '../services/store.js';
import { logger } from '../utils/logger.js';

// In-memory classification cache: hash(threadId + latestMessageId) -> result
const classificationCache = new Map();

function getCacheKey(threadId, latestMessageId) {
  return `${threadId}_${latestMessageId}`;
}

/**
 * Executes the complete 7-stage classification pipeline for a thread
 * @param {Object} thread
 * @param {Array<Object>} [messages]
 * @param {boolean} [forceRerun=false]
 * @returns {Promise<Object>}
 */
export async function runClassificationPipeline(thread, messages = [], forceRerun = false) {
  const latestMessageId = thread.lastMessageId || (messages[messages.length - 1]?.id || 'msg_1');
  const cacheKey = getCacheKey(thread._id || thread.id, latestMessageId);

  // 0. Cache Check
  if (!forceRerun && classificationCache.has(cacheKey)) {
    return classificationCache.get(cacheKey);
  }

  // 1. Stage 1: Deterministic Prefilters (Zero tokens)
  const prefilterResult = runDeterministicPrefilters(thread, messages);
  let finalResult = null;

  if (prefilterResult) {
    finalResult = {
      ...prefilterResult,
      provider: 'rules_engine',
      model: 'prefilter_v1',
      latencyMs: 1,
    };
  } else {
    // 2. Stage 2: Context assembly (Client playbook + last 10 corrections)
    const client =
      (thread.clientId ? await store.getClientById(thread.clientId) : null) ||
      (await store.getClientByOrgId(thread.orgId));
    const playbook = client?.playbook || {};
    const corrections = await store.getCorrections(thread.clientId || client?._id, 10);
    const triageMemory = client?.agentMemory?.triage || null;

    // 3. Stage 3 & 4: LLM Invocation + Schema Validation & Fallback
    const llmResult = await invokeClassificationLLM(thread, messages, playbook, corrections, triageMemory);

    // 4. Stage 5: In-Code Risk Guardrails
    const guardrailResult = enforceRiskGuardrails(llmResult, thread, messages, playbook);

    // 5. Stage 6: Confidence Threshold Routing
    let routedLabel = guardrailResult.label;
    let reviewState = 'AUTO_APPLIED';

    if (guardrailResult.confidence >= 0.8) {
      routedLabel = guardrailResult.label;
      reviewState = 'AUTO_APPLIED';
    } else if (guardrailResult.confidence >= 0.55) {
      routedLabel = guardrailResult.label;
      reviewState = 'FLAGGED_REVIEW';
    } else {
      routedLabel = 'NEEDS_REVIEW';
      reviewState = 'FLAGGED_REVIEW';
    }

    finalResult = {
      ...guardrailResult,
      label: routedLabel,
      reviewState,
    };
  }

  // 6. Cache the result
  classificationCache.set(cacheKey, finalResult);

  // 7. Update Thread state in store
  const previousLabel = thread.currentLabel;
  const updates = {
    currentLabel: finalResult.label,
    aiLabel: finalResult.label,
    confidence: finalResult.confidence,
    reviewState: finalResult.reviewState,
    isActionRequired: finalResult.action_required,
    dueDate: finalResult.due_date ? new Date(finalResult.due_date) : thread.dueDate,
    aiReason: {
      provider: finalResult.provider,
      model: finalResult.model,
      reason: finalResult.reason,
      evidence: finalResult.evidence,
      summary: finalResult.summary,
      decision: finalResult.decision || null,
      signalsUsed: finalResult.signals_used || [],
      latencyMs: finalResult.latencyMs || 0,
    },
  };

  if (finalResult.decision) {
    updates.clientVisible = true;
    updates.clientStatus = 'pending';
  }

  if (finalResult.meetings?.length) {
    updates.meetings = finalResult.meetings;
  }

  const updatedThread = await store.updateThread(thread._id || thread.id, updates);

  // 8. If label changed, emit a ClassificationEvent
  if (previousLabel !== finalResult.label) {
    await store.addClassificationEvent({
      threadId: thread._id || thread.id,
      previousLabel,
      newLabel: finalResult.label,
      triggerType: forceRerun ? 'MANUAL_OVERRIDE' : 'INITIAL_SYNC',
      triggerMessageId: latestMessageId,
      actorName: `Daybook AI (${finalResult.model || 'Gemini 2.0'})`,
      reason: finalResult.reason,
    });
  }

  return {
    thread: updatedThread,
    classification: finalResult,
  };
}
