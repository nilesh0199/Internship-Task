import { BaseAgent } from './BaseAgent.js';
import { store } from '../services/store.js';

export class FollowUpAgent extends BaseAgent {
  constructor() {
    super({
      id: 'followup',
      name: 'Follow-up Agent',
      description: 'Monitors stale waiting threads and queues polite follow-up drafts and client decision reminders.',
      canDo: [
        'Monitors outbound threads awaiting a counterparty response for >3 days',
        'Pre-drafts context-aware follow-up messages for assistant review',
        'Detects decisions pending in Priya Sharma queue for >24 hours',
        'Generates one-click internal reminders for urgent executive decisions',
        'Enforces a strict 24-hour rate limit so no thread is nudged repeatedly',
      ],
      neverDoes: [
        'Never sends automated follow-ups without assistant review',
        'Never nudges external recipients more than once within 24 hours',
        'Never marks a waiting thread as completed without user authorization',
      ],
      triggers: ['schedule_tick', 'client_action', 'manual'],
      defaultAutonomy: 'propose',
    });
  }

  async run(thread, ctx) {
    const startTime = Date.now();
    const playbook = ctx.playbook || {};
    let followupDays = playbook.agentSettings?.followupDays || 3;
    const now = Date.now();
    const client = ctx.client || (await store.getClientByOrgId(thread.orgId));
    const clientName = client?.name || 'Priya Sharma';

    // Parse Follow-up Agent memory notes
    const followupMem = client?.agentMemory?.followup;
    let followupNotesSummary = null;
    let neverNudgeBoard = false;

    if (followupMem) {
      const instruction = (followupMem.instruction || '').toLowerCase();
      const memories = (followupMem.memories || []).filter((m) => m.enabled !== false);
      const combined = `${instruction} ${memories.map((m) => m.text).join(' ')}`.toLowerCase();

      if (combined.includes('2 days')) followupDays = 2;
      if (combined.includes('never nudge board') || combined.includes('board member')) {
        neverNudgeBoard = true;
      }

      if (followupMem.instruction || memories.length > 0) {
        followupNotesSummary = memories.length > 0
          ? `Applied instruction + ${memories.length} ${memories.length === 1 ? 'memory' : 'memories'}`
          : 'Applied instruction';
      }
    }

    // Rate-limiting check: Ensure thread was not nudged in the last 24h
    const recentRuns = await store.getAgentRuns({
      threadId: thread._id || thread.id,
      agentId: 'followup',
      limit: 5,
    });
    const lastNudge = recentRuns.find((r) => r.action.startsWith('nudge_') || r.action.startsWith('draft_'));
    if (lastNudge && now - new Date(lastNudge.createdAt).getTime() < 24 * 3600 * 1000) {
      return this.formatResult({
        action: 'skip_rate_limited',
        outcome: 'skipped',
        summary: 'Thread was already nudged within the last 24 hours.',
        details: { lastNudgeAt: lastNudge.createdAt },
        durationMs: Date.now() - startTime,
      });
    }

    // Case A: Waiting thread stale for > N days
    const isWaiting = thread.isWaiting || thread.lastDirection === 'OUTBOUND';
    const waitingSince = thread.waitingSince ? new Date(thread.waitingSince).getTime() : new Date(thread.lastMessageAt).getTime();
    const daysWaiting = Math.floor((now - waitingSince) / (24 * 3600 * 1000));

    if (isWaiting && daysWaiting >= followupDays) {
      const recipient = thread.participants?.[0]?.name || 'there';
      const recipientEmail = thread.participants?.[0]?.email || 'colleague@example.com';

      if (neverNudgeBoard) {
        const isBoard = (thread.participants || []).some(
          (p) =>
            (p.email && playbook.vipSenders?.includes(p.email)) ||
            p.name?.toLowerCase().includes('board') ||
            thread.subject?.toLowerCase().includes('board')
        );
        if (isBoard) {
          return this.formatResult({
            action: 'skip_board_member',
            outcome: 'skipped',
            summary: `Follow-up skipped for ${recipient}: Client notes specify never nudging board members.`,
            details: { recipientEmail, notesApplied: followupNotesSummary },
            durationMs: Date.now() - startTime,
          });
        }
      }

      const draftBody = `Hi ${recipient},

I wanted to quickly circle back on the note below regarding "${thread.subject}". Please let us know if you need any additional details from our end to proceed.

Best regards,
Maya Lin
Executive Assistant to ${clientName}`;

      let draft = null;
      if (!ctx.isDryRun) {
        draft = await store.saveDraft({
          threadId: thread._id || thread.id,
          orgId: thread.orgId,
          authorId: 'agent_followup',
          to: [recipientEmail],
          subject: `Following up: ${thread.subject}`,
          bodyText: draftBody,
          bodyHtml: `<p>${draftBody.replace(/\n/g, '<br/>')}</p>`,
          status: 'agent_proposal',
          agentProposalType: 'stale_followup',
        });
      } else {
        draft = { _id: 'draft_dry_run_fu_' + Date.now() };
      }

      return this.formatResult({
        action: 'draft_stale_followup',
        outcome: 'proposed',
        summary: `Thread waiting for ${daysWaiting} days (threshold: ${followupDays}d). Drafted polite check-in for assistant approval.`,
        details: {
          daysWaiting,
          followupDays,
          draftId: draft._id,
          notesApplied: followupNotesSummary,
        },
        confidence: 0.95,
        requiresHuman: true,
        undo: ctx.isDryRun ? null : {
          type: 'discard_draft',
          payload: { draftId: draft._id },
        },
        durationMs: Date.now() - startTime,
      });
    }

    // Case B: Decision pending in executive client queue for > 24 hours
    if (thread.currentLabel === 'CLIENT_TO_REPLY' && thread.clientStatus === 'pending') {
      const pendingHours = Math.floor((now - new Date(thread.lastMessageAt).getTime()) / (3600 * 1000));
      if (pendingHours >= 24) {
        return this.formatResult({
          action: 'nudge_client_decision',
          outcome: 'proposed',
          summary: `Pending in ${clientName}'s queue for ${pendingHours} hours. Recommended Maya ping ${clientName} during afternoon sync.`,
          details: {
            pendingHours,
            subject: thread.subject,
            notesApplied: followupNotesSummary,
          },
          confidence: 0.92,
          requiresHuman: true,
          durationMs: Date.now() - startTime,
        });
      }
    }

    // Case C: Handed back to assistant by client
    if (thread.clientStatus === 'delegated') {
      return this.formatResult({
        action: 'notify_delegated_task',
        outcome: 'auto_handled',
        summary: `Priya delegated to Maya with note: "${thread.clientDecisionNote || 'Handed to assistant'}".`,
        details: { note: thread.clientDecisionNote },
        confidence: 0.99,
        requiresHuman: false,
        durationMs: Date.now() - startTime,
      });
    }

    return this.formatResult({
      action: 'check_followup_status',
      outcome: 'skipped',
      summary: 'Thread is active or within acceptable response window.',
      details: { daysWaiting },
      durationMs: Date.now() - startTime,
    });
  }
}
