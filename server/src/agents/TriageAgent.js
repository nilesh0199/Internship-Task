import { BaseAgent } from './BaseAgent.js';
import { runClassificationPipeline } from '../ai/pipeline.js';
import { store } from '../services/store.js';
import { TriageInvestigator } from './TriageInvestigator.js';

export class TriageAgent extends BaseAgent {
  constructor() {
    super({
      id: 'triage',
      name: 'Triage Agent',
      description: 'Classifies inbound threads, routes to the appropriate queue, and auto-files low-risk notifications.',
      canDo: [
        'Evaluates multi-message thread context using 7-stage AI pipeline',
        'Auto-files newsletters and automated receipts to Quiet Folder (with 1-click Undo)',
        'Routes delegated tasks to Maya Lin (Assistant Workspace)',
        'Escalates executive decisions to Priya Sharma (Client Decision Queue)',
        'Flags low confidence threads (< 0.7) for human review',
      ],
      neverDoes: [
        'Never auto-files VIP contacts, legal docs, or financial terms',
        'Never permanently deletes emails',
        'Never transmits external replies',
      ],
      triggers: ['ingest', 'new_message', 'manual'],
      defaultAutonomy: 'auto',
      kind: 'workflow',
    });
  }

  canRun(thread, ctx) {
    if (!super.canRun(thread, ctx)) return false;
    // Don't re-triage threads that have already been manually overridden by a human
    if (thread.manualOverride && ctx.trigger !== 'manual') {
      return false;
    }
    return true;
  }

  async run(thread, ctx) {
    const startTime = Date.now();
    const messages = ctx.messages || (await store.getMessagesByThreadId(thread._id || thread.id)) || [];
    const autonomy = ctx.autonomy || 'auto';

    // Invoke existing classification pipeline (reuses cache & LLM/rules fallback)
    const { thread: updatedThread, classification } = await runClassificationPipeline(
      thread,
      messages,
      ctx.trigger === 'manual'
    );

    const durationMs = Date.now() - startTime;
    const label = classification.label;
    const confidence = classification.confidence || 0.9;
    const usedLLM = classification.provider !== 'rules_engine';
    const fallbackUsed = classification.fallbackUsed || classification.provider === 'heuristic_fallback';

    // 1. Confident NO_REPLY_NEEDED -> Auto-file to Quiet Folder
    if (label === 'NO_REPLY_NEEDED') {
      if (autonomy === 'auto') {
        await store.updateThread(thread._id || thread.id, {
          isArchived: true,
        });

        return this.formatResult({
          action: 'auto_file_quiet_folder',
          outcome: 'auto_handled',
          summary: `Auto-filed to Quiet Folder: ${classification.reason || 'Automated update requiring no reply'}.`,
          details: {
            label,
            confidence,
            signalsUsed: classification.signals_used || [],
            archived: true,
          },
          confidence,
          requiresHuman: false,
          undo: {
            type: 'unarchive_thread',
            payload: {
              previousLabel: thread.currentLabel,
              isArchived: thread.isArchived || false,
            },
          },
          usedLLM,
          fallbackUsed,
          durationMs,
        });
      } else {
        return this.formatResult({
          action: 'propose_file_quiet_folder',
          outcome: 'proposed',
          summary: `Proposed for Quiet Folder: ${classification.reason || 'No reply needed'}.`,
          details: { label, confidence },
          confidence,
          requiresHuman: true,
          usedLLM,
          fallbackUsed,
          durationMs,
        });
      }
    }

    // 2. ASSISTANT_TO_REPLY -> Routed to Assistant Queue
    if (label === 'ASSISTANT_TO_REPLY') {
      return this.formatResult({
        action: 'route_assistant_queue',
        outcome: 'auto_handled',
        summary: `Routed to Assistant Workspace: ${classification.reason || 'Actionable by executive assistant'}.`,
        details: { label, confidence, signalsUsed: classification.signals_used || [] },
        confidence,
        requiresHuman: false,
        usedLLM,
        fallbackUsed,
        durationMs,
      });
    }

    // 3. CLIENT_TO_REPLY -> Escalate to Client Queue
    if (label === 'CLIENT_TO_REPLY') {
      return this.formatResult({
        action: 'escalate_client_queue',
        outcome: 'escalated',
        summary: `Escalated to Priya Sharma (Client Queue): ${classification.reason || 'Requires founder review or signature'}.`,
        details: {
          label,
          confidence,
          decision: classification.decision || null,
        },
        confidence,
        requiresHuman: true,
        usedLLM,
        fallbackUsed,
        durationMs,
      });
    }

    // 4. NEEDS_REVIEW / Low-confidence / Trap pattern -> Closed-loop Triage Investigator
    if ((confidence < 0.8 || label === 'NEEDS_REVIEW') && !ctx.skipInvestigator) {
      const investigator = new TriageInvestigator();
      const currentThread = updatedThread || thread;
      if (investigator.canRun(currentThread, ctx)) {
        const invResult = await investigator.run(currentThread, ctx);
        return invResult;
      }
    }

    return this.formatResult({
      action: 'flag_human_review',
      outcome: 'escalated',
      summary: `Flagged for Human Review: ${classification.reason || 'Confidence threshold below 70%'}.`,
      details: { label, confidence },
      confidence,
      requiresHuman: true,
      usedLLM,
      fallbackUsed,
      durationMs,
    });
  }
}
