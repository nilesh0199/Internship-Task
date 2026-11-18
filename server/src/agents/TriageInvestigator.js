import { BaseAgent } from './BaseAgent.js';
import { runAgentLoop, sanitizeUntrustedData } from './runtime/index.js';
import { store } from '../services/store.js';

export class TriageInvestigator extends BaseAgent {
  constructor() {
    super({
      id: 'triage_investigator',
      name: 'Triage Investigator',
      description: 'Closed-loop reasoning agent that investigates ambiguous, low-confidence, or trap threads using evidence-gathering tools.',
      canDo: [
        'Investigates ambiguous sender history and past thread labels',
        'Searches related client threads to disambiguate forwarded messages',
        'Cross-references executive playbook rules and recent assistant overrides',
        'Validates standing instructions and agent memory preferences',
        'Proposes definitive classification only with >= 0.7 confidence and cited evidence',
      ],
      neverDoes: [
        'Never auto-files VIP senders, legal terms, or financial commitments as NO_REPLY_NEEDED',
        'Never transmits external email replies',
        'Never guesses without sufficient evidence (escalates to NEEDS_REVIEW)',
      ],
      triggers: ['ingest', 'new_message', 'manual'],
      defaultAutonomy: 'auto',
      kind: 'agent',
    });
  }

  /**
   * Evaluates if a thread requires closed-loop investigation
   * Triggers when confidence < 0.8, label is NEEDS_REVIEW, or trap patterns exist
   */
  canRun(thread, ctx = {}) {
    if (!super.canRun(thread, ctx)) return false;
    if (thread.manualOverride && ctx.trigger !== 'manual') return false;

    // Direct invocation
    if (ctx.forceInvestigate) return true;

    const confidence = thread.confidence !== undefined ? thread.confidence : 1.0;
    const label = thread.currentLabel;
    const sub = (thread.subject || '').toLowerCase();
    const snip = (thread.snippet || '').toLowerCase();
    const full = `${sub} ${snip}`;

    // Trap pattern detection
    const isForwardedAdvise =
      (sub.startsWith('fwd:') || sub.startsWith('fw:')) &&
      (full.includes('please advise') || full.includes('advise') || full.includes('thoughts?'));
    const isCcTrap = thread.isClientCcOnly || full.includes('cc\'d') || full.includes('fyi only');
    const isAmbiguousQuery = full.includes('per our discussion') || full.includes('status update?');
    const isLowConfidence = confidence < 0.8 || label === 'NEEDS_REVIEW';

    return isLowConfidence || isForwardedAdvise || isCcTrap || isAmbiguousQuery;
  }

  async run(thread, ctx = {}) {
    const startTime = Date.now();
    const clientId = ctx.clientId || thread.clientId || 'client_priya_001';
    const orgId = ctx.orgId || thread.orgId || 'org_vortex_001';
    const autonomy = ctx.autonomy || 'auto';

    const cleanSubject = sanitizeUntrustedData(thread.subject || 'Untitled');
    const cleanSnippet = sanitizeUntrustedData(thread.snippet || '');

    const goal = `Investigate thread "${cleanSubject}" to determine whether the client or assistant must reply, or if it requires no reply. Gather evidence using permitted tools and propose classification.`;

    const systemPrompt = `You are the Triage Investigator agent for client ${clientId}.
Your mission is to resolve inbox routing ambiguity with closed-loop evidence gathering.
You have access to tools to inspect sender history, search client threads, consult the playbook, check past human corrections, and review agent notes.

THREAD UNDER INVESTIGATION:
<untrusted_email_data>
Thread ID: ${thread._id || thread.id}
Subject: ${cleanSubject}
Snippet: ${cleanSnippet}
Current Tentative Label: ${thread.currentLabel || 'NEEDS_REVIEW'}
Confidence: ${thread.confidence || 0.5}
</untrusted_email_data>

INVESTIGATION RULES:
1. Call tools sequentially to gather facts (max 4 steps).
2. When you have found concrete evidence, call 'propose_classification' or return final action with label, confidence (0.0 - 1.0), reason, and cited evidence.
3. If confidence is below 0.7 or no evidence is found, set label to 'NEEDS_REVIEW'. NEVER guess.
4. If the sender is a VIP, or money/contract terms are present, NEVER classify as NO_REPLY_NEEDED.`;

    const loopResult = await runAgentLoop({
      agentId: 'triage_investigator',
      goal,
      systemPrompt,
      tools: [
        'get_thread',
        'get_sender_history',
        'search_client_threads',
        'get_playbook',
        'get_corrections',
        'get_agent_notes',
        'propose_classification',
      ],
      state: {
        threadId: thread._id || thread.id,
        initialConfidence: thread.confidence,
        initialLabel: thread.currentLabel,
      },
      limits: {
        maxSteps: 4,
        timeoutMs: 15000,
      },
      ctx: {
        ...ctx,
        threadId: thread._id || thread.id,
        currentLabel: thread.currentLabel,
        senderEmail: thread.participants?.[0]?.email || 'sender@example.com',
        clientId,
        orgId,
      },
      llmCaller: ctx.llmCaller,
    });

    const durationMs = Date.now() - startTime;
    const final = loopResult.finalResult || {};
    const proposedLabel = final.label || final.proposedLabel;
    const proposedConf = typeof final.confidence === 'number' ? final.confidence : 0.6;
    const evidence = final.evidence || [];
    const reason = final.reason || loopResult.stopReason || 'Investigation concluded';

    // Must reach >= 0.7 with at least one cited evidence item to replace low-confidence label
    const meetsThreshold =
      proposedLabel &&
      proposedLabel !== 'NEEDS_REVIEW' &&
      proposedConf >= 0.7 &&
      Array.isArray(evidence) &&
      evidence.length > 0;

    if (meetsThreshold) {
      // Update thread in store
      await store.updateThread(thread._id || thread.id, {
        currentLabel: proposedLabel,
        confidence: proposedConf,
        summary: final.summary || thread.summary,
      });

      return this.formatResult({
        action: 'investigation_resolved_classification',
        outcome: autonomy === 'auto' ? 'auto_handled' : 'proposed',
        summary: `Triage Investigator classified as ${proposedLabel} (${Math.round(proposedConf * 100)}%): ${reason}`,
        details: {
          previousLabel: thread.currentLabel,
          resolvedLabel: proposedLabel,
          confidence: proposedConf,
          evidence,
          reason,
          stepsCount: loopResult.steps?.length || 0,
        },
        confidence: proposedConf,
        requiresHuman: proposedLabel === 'CLIENT_TO_REPLY' || autonomy !== 'auto',
        usedLLM: loopResult.usedLLM,
        fallbackUsed: loopResult.fallbackUsed,
        durationMs,
        kind: 'agent',
        steps: loopResult.steps,
        stopReason: loopResult.stopReason,
        usage: loopResult.usage,
      });
    }

    // Escalated to NEEDS_REVIEW
    await store.updateThread(thread._id || thread.id, {
      currentLabel: 'NEEDS_REVIEW',
      confidence: Math.max(proposedConf, 0.5),
    });

    return this.formatResult({
      action: 'investigation_escalated',
      outcome: 'escalated',
      summary: `Triage Investigator could not definitively resolve (${reason}). Escalated to NEEDS_REVIEW.`,
      details: {
        tentativeLabel: proposedLabel || 'NEEDS_REVIEW',
        confidence: proposedConf,
        reason,
        evidence,
        stopReason: loopResult.stopReason,
        stepsCount: loopResult.steps?.length || 0,
      },
      confidence: proposedConf,
      requiresHuman: true,
      usedLLM: loopResult.usedLLM,
      fallbackUsed: loopResult.fallbackUsed,
      durationMs,
      kind: 'agent',
      steps: loopResult.steps,
      stopReason: loopResult.stopReason,
      usage: loopResult.usage,
    });
  }
}
