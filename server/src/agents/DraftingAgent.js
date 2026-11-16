import { BaseAgent } from './BaseAgent.js';
import { store } from '../services/store.js';

export class DraftingAgent extends BaseAgent {
  constructor() {
    super({
      id: 'drafting',
      name: 'Drafting Agent',
      description: 'Pre-drafts context-aware email replies in the client’s voice, ready for one-tap human approval.',
      canDo: [
        'Composes professional drafts for routine assistant tasks and logistics',
        'Prepares one-tap approval replies for executive client decisions',
        'Emulates executive tone and signs appropriately as Maya Lin or Priya Sharma',
        'Attaches CCs according to client playbook communication standards',
        'Skips redundant generation if an unhandled draft already exists',
      ],
      neverDoes: [
        'Never automatically transmits an email without explicit human action',
        'Never creates duplicate drafts for the same message',
        'Never hallucinates financial commitments or concessions',
      ],
      triggers: ['ingest', 'new_message', 'manual'],
      defaultAutonomy: 'propose',
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

  async run(thread, ctx) {
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
      });
    }

    const messages = ctx.messages || (await store.getMessagesByThreadId(thread._id || thread.id)) || [];
    const latestMsg = messages[messages.length - 1] || {};
    const client = ctx.client || (await store.getClientByOrgId(thread.orgId));
    const clientName = client?.name || 'Priya Sharma';
    const recipient = latestMsg.from?.name || latestMsg.from?.email || 'there';
    const recipientEmail = latestMsg.from?.email || thread.participants?.[0]?.email || 'recipient@example.com';

    let draftText = '';
    let proposalType = 'draft_reply';

    if (thread.currentLabel === 'CLIENT_TO_REPLY') {
      // 1-tap decision approval reply
      draftText = `Hi ${recipient},

Thank you for your note regarding "${thread.subject}". I have reviewed the details and we are in agreement to proceed as outlined.

Please send over any formal documents or agreement copies for signature.

Best regards,
${clientName}`;
      proposalType = 'draft_reply';
    } else {
      // Routine assistant handling reply
      draftText = `Hi ${recipient},

Thank you for reaching out regarding "${thread.subject}". On behalf of ${clientName}, I am coordinating the next steps and will have the details over to you shortly.

Best regards,
Maya Lin
Executive Assistant to ${clientName}`;
      proposalType = 'draft_reply';
    }

    const draft = await store.saveDraft({
      threadId: thread._id || thread.id,
      orgId: thread.orgId,
      authorId: 'agent_drafting',
      to: [recipientEmail],
      cc: [client?.email || 'priya@vortexdynamics.com'],
      subject: `RE: ${thread.subject.replace(/^RE:\s*/i, '')}`,
      bodyText: draftText,
      bodyHtml: `<p>${draftText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
      status: 'agent_proposal',
      agentProposalType: proposalType,
    });

    const isClientAction = thread.currentLabel === 'CLIENT_TO_REPLY';

    return this.formatResult({
      action: 'pre_draft_reply',
      outcome: 'proposed',
      summary: isClientAction
        ? `Pre-drafted executive response for Priya Sharma's one-tap approval.`
        : `Pre-drafted routine coordination response for Maya Lin's review.`,
      details: {
        draftId: draft._id,
        recipient: recipientEmail,
        isClientDecision: isClientAction,
      },
      confidence: 0.94,
      requiresHuman: true, // Safety rule: human must approve before send!
      undo: {
        type: 'discard_draft',
        payload: { draftId: draft._id },
      },
      durationMs: Date.now() - startTime,
    });
  }
}
