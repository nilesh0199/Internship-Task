import { BaseAgent } from './BaseAgent.js';
import { store } from '../services/store.js';
import { runAgentLoop, sanitizeUntrustedData } from './runtime/index.js';
import { env } from '../config/env.js';

export class DraftingAgent extends BaseAgent {
  constructor() {
    super({
      id: 'drafting',
      name: 'Drafting Agent',
      description: 'Closed-loop drafting agent that crafts context-aware email replies in the client’s voice and self-reviews with deterministic fact-checking.',
      canDo: [
        'Composes professional drafts for routine assistant tasks and logistics',
        'Prepares one-tap approval replies for executive client decisions',
        'Emulates executive tone and signs appropriately as Maya Lin or Priya Sharma',
        'Self-reviews draft accuracy using check_facts to verify dates, dollar amounts, and attendee names',
        'Performs up to 2 revisions when factual mismatches are detected before proposing',
        'Attaches explicit warnings to drafts if factual discrepancies cannot be resolved',
      ],
      neverDoes: [
        'Never automatically transmits an email without explicit human action',
        'Never creates duplicate drafts for the same message',
        'Never hides factual warnings or hallucinates commitments',
      ],
      triggers: ['ingest', 'new_message', 'manual'],
      defaultAutonomy: 'propose',
      kind: 'agent',
    });
  }

  canRun(thread, ctx) {
    if (!super.canRun(thread, ctx)) return false;
    // Only draft for threads where reply is needed
    if (thread.currentLabel === 'NO_REPLY_NEEDED') {
      return false;
    }
    return true;
  }

  async run(thread, ctx = {}) {
    const startTime = Date.now();
    const existingDrafts = await store.getDraftsByThreadId(thread._id || thread.id);
    const activeDraft = existingDrafts.find((d) => d.status === 'draft' || d.status === 'agent_proposal');

    // Skip if an active draft already exists for this thread
    if (activeDraft) {
      return this.formatResult({
        action: 'skip_existing_draft',
        outcome: 'skipped',
        summary: 'An active draft already exists for this thread.',
        details: { draftId: activeDraft._id },
        durationMs: Date.now() - startTime,
        kind: 'agent',
      });
    }

    const clientId = ctx.clientId || thread.clientId || 'client_priya_001';
    const orgId = ctx.orgId || thread.orgId || 'org_vortex_001';
    const client = ctx.client || (await store.getClientById(clientId)) || (await store.getClientByOrgId(orgId));
    const clientName = client?.name || 'Priya Sharma';

    // Try Closed-Loop Agent Runtime
    const shouldUseLoop = env.ENABLE_LIVE_AGENT_LOOPS !== false || Boolean(ctx.llmCaller);

    if (shouldUseLoop) {
      const cleanSubject = sanitizeUntrustedData(thread.subject || '');
      const cleanSnippet = sanitizeUntrustedData(thread.snippet || '');

      const goal = `Draft a high-quality reply for thread "${cleanSubject}". Review tone from past replies, consult agent notes, draft reply, self-review using check_facts, revise if needed (max 2 times), and propose draft with any warnings.`;

      const systemPrompt = `You are the Drafting Agent for executive ${clientName}.
Your goal is to produce a reply ready for 1-tap human approval.
Permitted tools: get_thread, get_past_replies, get_agent_notes, check_facts, propose_draft.

CURRENT THREAD:
<untrusted_email_data>
Thread ID: ${thread._id || thread.id}
Subject: ${cleanSubject}
Snippet: ${cleanSnippet}
Label: ${thread.currentLabel || 'ASSISTANT_TO_REPLY'}
</untrusted_email_data>

DRAFTING WORKFLOW:
1. Inspect past replies and agent notes to capture correct signoff and style.
2. Compose initial draft.
3. Call 'check_facts' with your draftText and threadId.
4. If check_facts reports warnings (e.g. dollar mismatches), revise draft and re-check with check_facts (max 2 revisions).
5. Call 'propose_draft' with final text and any remaining warnings.
6. Return final action. Never claim you sent the email.`;

      const loopResult = await runAgentLoop({
        agentId: 'drafting',
        goal,
        systemPrompt,
        tools: [
          'get_thread',
          'get_past_replies',
          'get_agent_notes',
          'check_facts',
          'propose_draft',
        ],
        state: { threadId: thread._id || thread.id },
        limits: { maxSteps: 5, timeoutMs: 15000 },
        ctx: {
          ...ctx,
          threadId: thread._id || thread.id,
          clientId,
          orgId,
        },
        llmCaller: ctx.llmCaller,
      });

      if (loopResult.stopReason === 'goal_reached' && loopResult.finalResult) {
        const final = loopResult.finalResult;
        const draftText = final.draftText || final.text || 'Thank you for your note. We are reviewing and will respond shortly.';
        const warnings = final.warnings || [];
        const isClientAction = thread.currentLabel === 'CLIENT_TO_REPLY';

        const messages = ctx.messages || (await store.getMessagesByThreadId(thread._id || thread.id)) || [];
        const latestMsg = messages[messages.length - 1] || {};
        const recipientEmail = latestMsg.from?.email || thread.participants?.[0]?.email || 'recipient@example.com';

        let draft = null;
        if (!ctx.isDryRun) {
          draft = await store.saveDraft({
            threadId: thread._id || thread.id,
            orgId,
            clientId,
            authorId: 'agent_drafting',
            to: [recipientEmail],
            cc: [client?.email || 'priya@vortexdynamics.com'],
            subject: `RE: ${thread.subject.replace(/^RE:\s*/i, '')}`,
            bodyText: draftText,
            bodyHtml: `<p>${draftText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
            status: 'agent_proposal',
            agentProposalType: isClientAction ? 'draft_reply' : 'assistant_reply',
            warnings,
          });
        } else {
          draft = { _id: 'draft_dry_run_' + Date.now() };
        }

        return this.formatResult({
          action: 'pre_draft_reply',
          outcome: 'proposed',
          summary: warnings.length > 0
            ? `Pre-drafted reply with ${warnings.length} factual warning(s) flagged for human review.`
            : `Pre-drafted fact-checked reply in ${clientName}'s voice for one-tap approval.`,
          details: {
            draftId: draft._id,
            recipient: recipientEmail,
            isClientDecision: isClientAction,
            warnings,
            stepsCount: loopResult.steps?.length || 0,
          },
          confidence: warnings.length > 0 ? 0.8 : 0.95,
          requiresHuman: true,
          undo: ctx.isDryRun ? null : {
            type: 'discard_draft',
            payload: { draftId: draft._id },
          },
          usedLLM: loopResult.usedLLM,
          fallbackUsed: loopResult.fallbackUsed,
          durationMs: Date.now() - startTime,
          kind: 'agent',
          steps: loopResult.steps,
          stopReason: loopResult.stopReason,
          usage: loopResult.usage,
        });
      }
    }

    // Fallback to deterministic drafting
    return await this.runDeterministicFallback(thread, ctx, startTime, client, clientName);
  }

  /**
   * Deterministic drafting workflow fallback
   */
  async runDeterministicFallback(thread, ctx, startTime, client, clientName) {
    const messages = ctx.messages || (await store.getMessagesByThreadId(thread._id || thread.id)) || [];
    const latestMsg = messages[messages.length - 1] || {};
    const recipient = latestMsg.from?.name || latestMsg.from?.email || 'there';
    const recipientEmail = latestMsg.from?.email || thread.participants?.[0]?.email || 'recipient@example.com';

    const draftingMem = client?.agentMemory?.drafting;
    let signoff = clientName;
    let assistantSignoff = `Maya Lin\nExecutive Assistant to ${clientName}`;
    let draftingNotesSummary = null;

    if (draftingMem) {
      const instruction = (draftingMem.instruction || '').toLowerCase();
      const memories = (draftingMem.memories || []).filter((m) => m.enabled !== false);

      if (instruction.includes("rohan's office") || instruction.includes('office of')) {
        signoff = `Rohan's Office`;
        assistantSignoff = `Office of ${clientName}`;
      }

      if (draftingMem.instruction || memories.length > 0) {
        draftingNotesSummary = memories.length > 0
          ? `Applied instruction + ${memories.length} ${memories.length === 1 ? 'memory' : 'memories'}`
          : 'Applied instruction';
      }
    }

    let draftText = '';
    let proposalType = 'draft_reply';

    if (thread.currentLabel === 'CLIENT_TO_REPLY') {
      draftText = `Hi ${recipient},

Thank you for your note regarding "${thread.subject}". I have reviewed the details and we are in agreement to proceed as outlined.

Please send over any formal documents or agreement copies for signature.

Best regards,
${signoff}`;
      proposalType = 'draft_reply';
    } else {
      draftText = `Hi ${recipient},

Thank you for reaching out regarding "${thread.subject}". On behalf of ${clientName}, I am coordinating the next steps and will have the details over to you shortly.

Best regards,
${assistantSignoff}`;
      proposalType = 'assistant_reply';
    }

    if (draftingMem?.instruction?.toLowerCase().includes('no exclamation')) {
      draftText = draftText.replace(/!/g, '.');
    }

    let draft = null;
    if (!ctx.isDryRun) {
      draft = await store.saveDraft({
        threadId: thread._id || thread.id,
        orgId: thread.orgId,
        clientId: thread.clientId,
        authorId: 'agent_drafting',
        to: [recipientEmail],
        cc: [client?.email || 'priya@vortexdynamics.com'],
        subject: `RE: ${thread.subject.replace(/^RE:\s*/i, '')}`,
        bodyText: draftText,
        bodyHtml: `<p>${draftText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
        status: 'agent_proposal',
        agentProposalType: proposalType,
      });
    } else {
      draft = { _id: 'draft_dry_run_' + Date.now() };
    }

    const isClientAction = thread.currentLabel === 'CLIENT_TO_REPLY';

    return this.formatResult({
      action: 'pre_draft_reply',
      outcome: 'proposed',
      summary: isClientAction
        ? `Pre-drafted executive response for ${clientName}'s one-tap approval (workflow fallback).`
        : `Pre-drafted routine coordination response for Maya Lin's review (workflow fallback).`,
      details: {
        draftId: draft._id,
        recipient: recipientEmail,
        isClientDecision: isClientAction,
        notesApplied: draftingNotesSummary,
      },
      confidence: 0.94,
      requiresHuman: true,
      undo: ctx.isDryRun ? null : {
        type: 'discard_draft',
        payload: { draftId: draft._id },
      },
      durationMs: Date.now() - startTime,
      fallbackUsed: true,
      kind: 'agent',
    });
  }
}
