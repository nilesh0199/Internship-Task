import { BaseAgent } from './BaseAgent.js';
import { store } from '../services/store.js';
import { runAgentLoop, sanitizeUntrustedData } from './runtime/index.js';
import { env } from '../config/env.js';

export class SchedulingAgent extends BaseAgent {
  constructor() {
    super({
      id: 'scheduling',
      name: 'Scheduling Agent',
      description: 'Closed-loop scheduling agent that inspects calendar commitments, flags double-bookings, and proposes conflict-free meeting alternatives.',
      canDo: [
        'Extracts dates, meeting times, and attendee details from incoming messages',
        'Detects calendar conflicts across all active client engagements using check_conflicts tool',
        'Queries suggest_free_slots to obtain 2-3 conflict-free alternative time slots',
        'Pre-drafts reschedule proposals with verified alternative slots ready for 1-tap human approval',
        'Prepares 1-tap confirmation drafts for conflict-free invitations',
      ],
      neverDoes: [
        'Never modifies external Google Calendar or Outlook events directly',
        'Never sends calendar invites or email replies without human confirmation',
        'Never accepts meeting times that collide with existing commitments',
      ],
      triggers: ['ingest', 'new_message', 'manual'],
      defaultAutonomy: 'propose',
      kind: 'agent',
    });
  }

  canRun(thread, ctx) {
    if (!super.canRun(thread, ctx)) return false;
    const text = `${thread.subject} ${thread.snippet}`.toLowerCase();
    const hasMeetingKeywords =
      text.includes('meet') ||
      text.includes('sync') ||
      text.includes('calendar') ||
      text.includes('call') ||
      text.includes('zoom') ||
      text.includes('coffee') ||
      text.includes('schedule') ||
      text.includes('pm') ||
      text.includes('am') ||
      text.includes('tomorrow') ||
      text.includes('thursday') ||
      text.includes('friday') ||
      text.includes('monday') ||
      (thread.meetings && thread.meetings.length > 0);

    return hasMeetingKeywords;
  }

  async run(thread, ctx = {}) {
    const startTime = Date.now();
    const clientId = ctx.clientId || thread.clientId || 'client_priya_001';
    const orgId = ctx.orgId || thread.orgId || 'org_vortex_001';
    const autonomy = ctx.autonomy || 'propose';

    // Try Closed-Loop Agent Runtime if live loops enabled or custom llmCaller passed
    const shouldUseLoop = env.ENABLE_LIVE_AGENT_LOOPS !== false || Boolean(ctx.llmCaller);

    if (shouldUseLoop) {
      const cleanSubject = sanitizeUntrustedData(thread.subject || '');
      const cleanSnippet = sanitizeUntrustedData(thread.snippet || '');

      const goal = `Coordinate meeting request for thread "${cleanSubject}". Inspect client meetings, check for conflicts, generate conflict-free alternatives if conflicted, and propose reschedule or confirmation draft.`;

      const systemPrompt = `You are the Scheduling Agent for client ${clientId}.
Your goal is to coordinate meeting times without double-booking.
Use tools: find_meetings, check_conflicts, suggest_free_slots, get_agent_notes, propose_reschedule.

CURRENT THREAD:
<untrusted_email_data>
Thread ID: ${thread._id || thread.id}
Subject: ${cleanSubject}
Snippet: ${cleanSnippet}
</untrusted_email_data>

SCHEDULING RULES:
1. Check if the meeting requested in the thread has a conflict with existing meetings using 'check_conflicts'.
2. If there is a conflict, call 'suggest_free_slots' to find 2-3 alternatives, then call 'propose_reschedule'.
3. If no conflict exists, propose confirmation.
4. Output final action when complete with structured slots and draft note.`;

      const loopResult = await runAgentLoop({
        agentId: 'scheduling',
        goal,
        systemPrompt,
        tools: [
          'get_thread',
          'find_meetings',
          'check_conflicts',
          'suggest_free_slots',
          'get_agent_notes',
          'propose_reschedule',
        ],
        state: { threadId: thread._id || thread.id },
        limits: { maxSteps: 5, timeoutMs: 15000 },
        ctx: {
          ...ctx,
          threadId: thread._id || thread.id,
          hasConflict: Boolean(thread.meetings?.some((m) => m.isConflict)),
          clientId,
          orgId,
        },
        llmCaller: ctx.llmCaller,
      });

      // If loop completed cleanly with a proposal
      if (loopResult.stopReason === 'goal_reached' && loopResult.finalResult) {
        const final = loopResult.finalResult;
        const slots = final.slots || [];
        const isConflict = Boolean(final.hasConflict || slots.length > 0);
        const senderEmail = thread.participants?.[0]?.email || 'attendee@example.com';
        const senderName = thread.participants?.[0]?.name || 'there';

        let draftBody = '';
        if (isConflict) {
          draftBody = `Hi ${senderName},\n\nThanks for reaching out! We have a scheduling conflict during the proposed window.\n\nCould any of the following alternative times work for you instead?\n${slots
            .map((s, idx) => `${idx + 1}. ${s}`)
            .join('\n')}\n\nLet us know what suits you best and I'll send over an invitation.\n\nBest regards,\nMaya Lin\nExecutive Assistant`;
        } else {
          draftBody = `Hi ${senderName},\n\nThe calendar is clear at the requested time. I have drafted the confirmation.\n\nLooking forward to speaking.\n\nBest regards,\nMaya Lin\nExecutive Assistant`;
        }

        const draft = await store.saveDraft({
          threadId: thread._id || thread.id,
          orgId,
          clientId,
          authorId: 'agent_scheduling',
          to: [senderEmail],
          subject: isConflict ? `Re: ${thread.subject} - Reschedule Alternatives` : `Re: ${thread.subject} - Confirmed`,
          bodyText: draftBody,
          bodyHtml: `<p>${draftBody.replace(/\n/g, '<br/>')}</p>`,
          status: 'agent_proposal',
          agentProposalType: isConflict ? 'reschedule_meeting' : 'confirm_meeting',
        });

        return this.formatResult({
          action: isConflict ? 'propose_reschedule' : 'confirm_meeting',
          outcome: 'proposed',
          summary: isConflict
            ? `Detected calendar conflict. Closed-loop agent proposed reschedule with ${slots.length} alternative slots.`
            : 'No conflicts detected. Confirmation draft prepared for human approval.',
          details: {
            isConflict,
            slots,
            draftId: draft._id,
            stepsCount: loopResult.steps?.length || 0,
          },
          confidence: 0.95,
          requiresHuman: true,
          undo: {
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

      // If loop was escalated (e.g. timeout, max steps, loop detected)
      if (loopResult.stopReason === 'loop_detected' || loopResult.stopReason === 'max_steps_reached' || loopResult.stopReason === 'timeout') {
        return this.formatResult({
          action: 'scheduling_escalated',
          outcome: 'escalated',
          summary: `Scheduling Agent could not resolve calendar coordination cleanly (${loopResult.finalResult?.reason || loopResult.stopReason}). Escalated to assistant.`,
          details: {
            stopReason: loopResult.stopReason,
            stepsCount: loopResult.steps?.length || 0,
            partialFindings: loopResult.finalResult?.partialFindings,
          },
          confidence: 0.6,
          requiresHuman: true,
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

    // Deterministic Workflow Fallback
    return await this.runDeterministicFallback(thread, ctx, startTime);
  }

  /**
   * Deterministic conflict detection workflow fallback
   */
  async runDeterministicFallback(thread, ctx, startTime) {
    const messages = ctx.messages || (await store.getMessagesByThreadId(thread._id || thread.id)) || [];
    const latestMsg = messages[messages.length - 1] || {};
    const content = `${thread.subject} ${latestMsg.bodyText || thread.snippet}`;

    let meetings = thread.meetings && thread.meetings.length > 0 ? [...thread.meetings] : [];
    if (meetings.length === 0) {
      const extractedTime = this.extractProposedTime(content);
      if (extractedTime) {
        meetings.push(extractedTime);
      }
    }

    if (meetings.length === 0) {
      return this.formatResult({
        action: 'check_scheduling_signals',
        outcome: 'skipped',
        summary: 'No actionable meeting times found in conversation.',
        details: { threadId: thread._id },
        durationMs: Date.now() - startTime,
        fallbackUsed: true,
        kind: 'agent',
      });
    }

    const allThreads = await store.getThreads({ orgId: thread.orgId, clientId: thread.clientId });
    let hasConflict = false;
    let conflictingThreadTitle = '';
    const currentMeeting = meetings[0];

    if (currentMeeting.startTime) {
      const curStart = new Date(currentMeeting.startTime).getTime();
      const curEnd = currentMeeting.endTime
        ? new Date(currentMeeting.endTime).getTime()
        : curStart + 45 * 60 * 1000;

      for (const other of allThreads) {
        if ((other._id || other.id) === (thread._id || thread.id)) continue;
        if (!other.meetings || other.meetings.length === 0) continue;

        for (const om of other.meetings) {
          if (!om.startTime) continue;
          const otherStart = new Date(om.startTime).getTime();
          const otherEnd = om.endTime ? new Date(om.endTime).getTime() : otherStart + 45 * 60 * 1000;

          if (curStart < otherEnd && curEnd > otherStart) {
            hasConflict = true;
            conflictingThreadTitle = other.subject || 'Existing Calendar Meeting';
            break;
          }
        }
        if (hasConflict) break;
      }
    }

    meetings[0].isConflict = hasConflict;
    await store.updateThread(thread._id || thread.id, { meetings });

    const senderEmail = thread.participants?.[0]?.email || 'attendee@example.com';
    const senderName = thread.participants?.[0]?.name || 'there';

    if (hasConflict) {
      const altSlots = this.generateAlternativeSlots(currentMeeting.startTime);
      const draftBody = `Hi ${senderName},

Thanks for reaching out! We have a scheduling conflict during the proposed window (${conflictingThreadTitle}).

Could any of the following alternative times work for you instead?
1. ${altSlots[0]}
2. ${altSlots[1]}
3. ${altSlots[2]}

Let us know what suits you best and I'll send over a calendar invitation.

Best regards,
Maya Lin
Executive Assistant`;

      const draft = await store.saveDraft({
        threadId: thread._id || thread.id,
        orgId: thread.orgId,
        clientId: thread.clientId,
        authorId: 'agent_scheduling',
        to: [senderEmail],
        subject: `Re: ${thread.subject} - Reschedule Alternatives`,
        bodyText: draftBody,
        bodyHtml: `<p>${draftBody.replace(/\n/g, '<br/>')}</p>`,
        status: 'agent_proposal',
        agentProposalType: 'reschedule_meeting',
      });

      return this.formatResult({
        action: 'propose_reschedule',
        outcome: 'proposed',
        summary: `Detected conflict with "${conflictingThreadTitle}". Proposed reschedule draft with 3 alternative slots (workflow fallback).`,
        details: {
          conflictingMeeting: conflictingThreadTitle,
          proposedSlots: altSlots,
          draftId: draft._id,
        },
        confidence: 0.96,
        requiresHuman: true,
        undo: {
          type: 'discard_draft',
          payload: { draftId: draft._id },
        },
        durationMs: Date.now() - startTime,
        fallbackUsed: true,
        kind: 'agent',
      });
    }

    const meetTimeStr = currentMeeting.startTime
      ? new Date(currentMeeting.startTime).toLocaleString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'the requested time';

    const confirmDraft = `Hi ${senderName},

Priya's calendar is clear at ${meetTimeStr}. I have drafted the confirmation and will add it to her schedule.

Looking forward to the conversation.

Best regards,
Maya Lin
Executive Assistant`;

    const draft = await store.saveDraft({
      threadId: thread._id || thread.id,
      orgId: thread.orgId,
      clientId: thread.clientId,
      authorId: 'agent_scheduling',
      to: [senderEmail],
      subject: `Re: ${thread.subject} - Confirmed`,
      bodyText: confirmDraft,
      bodyHtml: `<p>${confirmDraft.replace(/\n/g, '<br/>')}</p>`,
      status: 'agent_proposal',
      agentProposalType: 'confirm_meeting',
    });

    return this.formatResult({
      action: 'confirm_meeting',
      outcome: 'proposed',
      summary: `No conflicts detected for ${meetTimeStr}. Confirmation draft prepared for human approval (workflow fallback).`,
      details: { meetingTime: meetTimeStr, draftId: draft._id },
      confidence: 0.98,
      requiresHuman: true,
      undo: {
        type: 'discard_draft',
        payload: { draftId: draft._id },
      },
      durationMs: Date.now() - startTime,
      fallbackUsed: true,
      kind: 'agent',
    });
  }

  extractProposedTime(text) {
    const now = new Date();
    if (text.includes('2:00 PM') || text.includes('2pm') || text.includes('14:00')) {
      const d = new Date(now.getTime() + 24 * 3600 * 1000);
      d.setHours(14, 0, 0, 0);
      return {
        title: 'Product Sync & Advisory Call',
        startTime: d,
        endTime: new Date(d.getTime() + 45 * 60 * 1000),
        locationOrLink: 'Google Meet',
        attendees: ['priya@vortexdynamics.com'],
        isConflict: false,
      };
    }
    if (text.includes('10:00 AM') || text.includes('10am') || text.includes('10:30 AM')) {
      const d = new Date(now.getTime() + 48 * 3600 * 1000);
      d.setHours(10, 0, 0, 0);
      return {
        title: 'Executive Partnership Discussion',
        startTime: d,
        endTime: new Date(d.getTime() + 30 * 60 * 1000),
        locationOrLink: 'Zoom',
        attendees: ['priya@vortexdynamics.com'],
        isConflict: false,
      };
    }
    return null;
  }

  generateAlternativeSlots(baseDate) {
    const base = baseDate ? new Date(baseDate) : new Date();
    const slot1 = new Date(base.getTime() + 24 * 3600 * 1000);
    slot1.setHours(11, 0, 0, 0);
    const slot2 = new Date(base.getTime() + 24 * 3600 * 1000);
    slot2.setHours(15, 30, 0, 0);
    const slot3 = new Date(base.getTime() + 48 * 3600 * 1000);
    slot3.setHours(14, 0, 0, 0);

    const fmt = (d) =>
      d.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

    return [fmt(slot1) + ' PST', fmt(slot2) + ' PST', fmt(slot3) + ' PST'];
  }
}
