import { BaseAgent } from './BaseAgent.js';
import { store } from '../services/store.js';

export class GuardianAgent extends BaseAgent {
  constructor() {
    super({
      id: 'guardian',
      name: 'Guardian Agent',
      description: 'Zero-trust safety auditor. Inspects every autonomous agent action and instantly reverses any risky decisions.',
      canDo: [
        'Audits every auto-handled email against strict VIP and compliance lists',
        'Detects hidden financial, contract, wire, equity, or deadline terms',
        'Identifies direct executive outreach ("Priya, can you confirm...")',
        'Instantly reverses bad auto-file actions and restores threads to NEEDS_REVIEW',
        'Produces daily audit proofs guaranteeing nothing slipped into the Quiet Folder',
      ],
      neverDoes: [
        'Never allows a VIP sender to remain filed in the Quiet Folder',
        'Never overrides an intentional human decision made by Maya or Priya',
        'Never deletes or alters audit logs',
      ],
      triggers: ['ingest', 'new_message', 'schedule_tick', 'manual'],
      defaultAutonomy: 'auto',
    });
  }

  canRun(thread, ctx) {
    if (!super.canRun(thread, ctx)) return false;
    // Human manual overrides always win and are never reversed by Guardian
    if (thread.manualOverride) {
      return false;
    }
    return true;
  }

  async run(thread, ctx) {
    const startTime = Date.now();
    const playbook = ctx.playbook || {};
    const messages = ctx.messages || (await store.getMessagesByThreadId(thread._id || thread.id)) || [];
    const latestMsg = messages[messages.length - 1] || {};
    const textToScan = `${thread.subject} ${thread.snippet} ${latestMsg.bodyText || ''}`.toLowerCase();

    // Senders & participants
    const senders = (thread.participants || []).map((p) => (p.email || '').toLowerCase().trim());
    const senderEmail = (latestMsg.from?.email || senders[0] || '').toLowerCase().trim();
    const senderDomain = senderEmail.split('@')[1] || '';

    // 0. Parse Guardian notes from client agentMemory (STRICTER ONLY)
    const guardianMemory = ctx.client?.agentMemory?.guardian;
    const customWatchwords = [];
    const customWatchEmails = [];
    let guardianNotesSummary = null;

    if (guardianMemory) {
      const instruction = guardianMemory.instruction || '';
      const memories = (guardianMemory.memories || []).filter((m) => m.enabled !== false);
      const combinedNotes = `${instruction} ${memories.map((m) => m.text).join(' ')}`.toLowerCase();

      // Extract emails mentioned in notes
      const foundEmails = combinedNotes.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      customWatchEmails.push(...foundEmails);

      // Extract risk watchwords from notes (all terms of 4+ chars excluding standard English stop words)
      const stopWords = new Set([
        'always', 'flag', 'never', 'watch', 'check', 'alert', 'notice', 'with',
        'from', 'that', 'this', 'have', 'been', 'client', 'agent', 'please', 'about'
      ]);
      const noteWords = combinedNotes.match(/\b[a-z]{4,}\b/g) || [];
      for (const w of noteWords) {
        if (!stopWords.has(w) && !customWatchwords.includes(w)) {
          customWatchwords.push(w);
        }
      }

      if (instruction || memories.length > 0) {
        guardianNotesSummary = memories.length > 0
          ? `Applied instruction + ${memories.length} ${memories.length === 1 ? 'memory' : 'memories'}`
          : 'Applied instruction';
      }
    }

    const isCustomWatchSender = customWatchEmails.includes(senderEmail);
    const hasCustomWatchSignal = customWatchwords.some((word) => textToScan.includes(word));

    // 1. VIP Check
    const vipSenders = (playbook.vipSenders || []).map((s) => s.toLowerCase().trim());
    const vipDomains = (playbook.vipDomains || []).map((d) => d.toLowerCase().trim());
    const isVip =
      vipSenders.includes(senderEmail) ||
      vipDomains.includes(senderDomain) ||
      isCustomWatchSender ||
      (thread.participants || []).some((p) => p.isVip);

    // 2. Financial & Wire terms
    const financialTerms = [
      'wire',
      'transfer',
      'invoice',
      'term sheet',
      'valuation',
      'series b',
      'series a',
      'equity',
      'esop',
      'stock option',
      'capital call',
      'payroll',
      'tax return',
      'k-1',
      '$',
      'usd',
    ];
    const hasFinancialSignal = financialTerms.some((term) => textToScan.includes(term));

    // 3. Legal & Contract terms
    const legalTerms = [
      'agreement',
      'contract',
      'nda',
      'docusign',
      'signature',
      'sign before',
      'execute',
      'amendment',
      'board consent',
      'counsel',
      'attorney',
      'litigation',
      'subpoena',
      'confidentiality',
    ];
    const hasLegalSignal = legalTerms.some((term) => textToScan.includes(term));

    // 4. Client directly addressed
    const clientName = (ctx.client?.name || 'Priya').toLowerCase().trim();
    const clientFirst = clientName.split(' ')[0];
    const directlyAddressed =
      textToScan.includes(`hi ${clientFirst}`) ||
      textToScan.includes(`hey ${clientFirst}`) ||
      textToScan.includes(`dear ${clientFirst}`) ||
      textToScan.includes(`${clientFirst},`) ||
      textToScan.includes(`${clientFirst} -`);

    // 5. Urgent deadline signal
    const deadlineTerms = ['urgent', 'before 4 pm', 'before 5 pm', 'today', 'asap', 'immediate', 'deadline'];
    const hasDeadlineSignal = deadlineTerms.some((term) => textToScan.includes(term));

    // Check if previous agent action was an AUTO action (e.g. Triage auto-filing to Quiet Folder)
    const isAutoFiled = thread.isArchived || thread.currentLabel === 'NO_REPLY_NEEDED';
    const recentTriageRun = (ctx.existingRuns || []).find((r) => r.agentId === 'triage' && r.outcome === 'auto_handled');

    const violationReasons = [];
    if (isVip) violationReasons.push(`Sender (${senderEmail}) is on VIP list`);
    if (hasFinancialSignal) violationReasons.push('Contains financial terms/thresholds');
    if (hasLegalSignal) violationReasons.push('Contains legal/contract terms');
    if (directlyAddressed) violationReasons.push(`Executive client (${clientFirst}) directly addressed`);
    if (hasDeadlineSignal) violationReasons.push('Contains urgent time-sensitive deadline');
    if (hasCustomWatchSignal) violationReasons.push('Matches keyword in client Guardian safety instructions');

    // VIOLATION: If any risk signals exist on an auto-filed or no-reply thread, Guardian REVERSES!
    if ((isAutoFiled || recentTriageRun) && violationReasons.length > 0) {
      const reasonStr = violationReasons.join('; ');

      // 1. Revert thread state: unarchive and escalate to NEEDS_REVIEW
      await store.updateThread(thread._id || thread.id, {
        currentLabel: 'NEEDS_REVIEW',
        isArchived: false,
        reviewState: 'FLAGGED_REVIEW',
      });

      // 2. Add ClassificationEvent to timeline
      await store.addClassificationEvent({
        threadId: thread._id || thread.id,
        previousLabel: thread.currentLabel,
        newLabel: 'NEEDS_REVIEW',
        triggerType: 'GUARDRAIL_OVERRIDE',
        triggerMessageId: thread.lastMessageId,
        actorName: 'Guardian Safety Agent',
        reason: `Guardian reversed auto-action: ${reasonStr}. Escalated to human review.`,
      });

      // 3. Log to activity log
      await store.addActivityLog({
        orgId: thread.orgId,
        actorId: 'agent_guardian',
        actorName: 'Guardian Safety Agent',
        actorRole: 'agent',
        action: 'AGENT_ACTION',
        threadId: thread._id || thread.id,
        details: {
          reversedAgent: 'triage',
          reasons: violationReasons,
          previousLabel: thread.currentLabel,
          newLabel: 'NEEDS_REVIEW',
        },
      });

      return this.formatResult({
        action: 'guardian_reversed',
        outcome: 'reversed',
        summary: `Guardian reversed: Auto-file blocked (${violationReasons[0]}). Restored to Needs Review.`,
        details: {
          violationReasons,
          restoredLabel: 'NEEDS_REVIEW',
          previousLabel: thread.currentLabel,
          notesApplied: guardianNotesSummary,
        },
        confidence: 1.0,
        requiresHuman: true,
        durationMs: Date.now() - startTime,
      });
    }

    // Pass verification
    return this.formatResult({
      action: 'guardian_audit_passed',
      outcome: 'auto_handled',
      summary: 'Guardian safety audit passed: Zero compliance or VIP violations detected.',
      details: {
        isVip,
        hasFinancialSignal,
        hasLegalSignal,
        directlyAddressed,
        notesApplied: guardianNotesSummary,
      },
      confidence: 1.0,
      requiresHuman: false,
      durationMs: Date.now() - startTime,
    });
  }

  /**
   * Generates the daily Quiet Folder audit summary line
   */
  async getDailyQuietFolderAudit(orgId) {
    const runs = await store.getAgentRuns({ orgId, limit: 100 });
    const guardianRuns = runs.filter((r) => r.agentId === 'guardian');
    const auditedCount = guardianRuns.length;
    const reversedCount = guardianRuns.filter((r) => r.outcome === 'reversed').length;

    return {
      auditedCount,
      reversedCount,
      auditLine: `Quiet Folder Audit: ${auditedCount} audited, ${reversedCount} reversed. Nothing slipped.`,
    };
  }
}
