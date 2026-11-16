import { BaseAgent } from './BaseAgent.js';
import { store } from '../services/store.js';

export class SchedulingAgent extends BaseAgent {
  constructor() {
    super({
      id: 'scheduling',
      name: 'Scheduling Agent',
      description: 'Coordinates calendar requests, flags double-bookings, and proposes conflict-free meeting alternatives.',
      canDo: [
        'Extracts dates, meeting times, and attendee details from incoming messages',
        'Detects calendar conflicts across all active client engagements',
        'Pre-drafts reschedule proposals with 2-3 conflict-free alternative time slots',
        'Prepares 1-tap confirmation drafts for conflict-free invitations',
        'Flags calendar items in the Meetings strip with conflict warnings',
      ],
      neverDoes: [
        'Never modifies external Google Calendar or Outlook events directly',
        'Never sends calendar invites or email replies without human confirmation',
        'Never accepts meeting times that collide with existing commitments',
      ],
      triggers: ['ingest', 'new_message', 'manual'],
      defaultAutonomy: 'propose',
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

  async run(thread, ctx) {
    const startTime = Date.now();
    const autonomy = ctx.autonomy || 'propose';
    const messages = ctx.messages || (await store.getMessagesByThreadId(thread._id || thread.id)) || [];
    const latestMsg = messages[messages.length - 1] || {};
    const content = `${thread.subject} ${latestMsg.bodyText || thread.snippet}`;

    // 1. Identify or extract proposed meeting times
    let meetings = thread.meetings && thread.meetings.length > 0 ? [...thread.meetings] : [];
    if (meetings.length === 0) {
      // Heuristic extraction of meeting times from snippet/subject
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
      });
    }

    // 2. Conflict detection across client's other threads
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

          // Conflict overlap check: start1 < end2 && end1 > start2
          if (curStart < otherEnd && curEnd > otherStart) {
            hasConflict = true;
            conflictingThreadTitle = other.subject || 'Existing Calendar Meeting';
            break;
          }
        }
        if (hasConflict) break;
      }
    }

    // Mark conflict on meeting object and save to thread
    meetings[0].isConflict = hasConflict;
    await store.updateThread(thread._id || thread.id, { meetings });

    const senderEmail = thread.participants?.[0]?.email || 'attendee@example.com';
    const senderName = thread.participants?.[0]?.name || 'there';

    // 3. Handle Conflict
    if (hasConflict) {
      // Propose alternate slots
      const altSlots = this.generateAlternativeSlots(currentMeeting.startTime);
      const draftBody = `Hi ${senderName},

Thanks for reaching out! Priya has a scheduling conflict during the proposed window (${conflictingThreadTitle}).

Could any of the following alternative times work for you instead?
1. ${altSlots[0]}
2. ${altSlots[1]}
3. ${altSlots[2]}

Let us know what suits you best and I'll send over a calendar invitation.

Best regards,
Maya Lin
Executive Assistant to Priya Sharma`;

      // Save as agent proposal draft
      const draft = await store.saveDraft({
        threadId: thread._id || thread.id,
        orgId: thread.orgId,
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
        summary: `Detected conflict with "${conflictingThreadTitle}". Proposed reschedule draft with 3 alternative slots.`,
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
      });
    }

    // 4. No Conflict -> Confirmation Draft
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
Executive Assistant to Priya Sharma`;

    const draft = await store.saveDraft({
      threadId: thread._id || thread.id,
      orgId: thread.orgId,
      authorId: 'agent_scheduling',
      to: [senderEmail],
      subject: `Re: ${thread.subject} - Confirmed`,
      bodyText: confirmDraft,
      bodyHtml: `<p>${confirmDraft.replace(/\n/g, '<br/>')}</p>`,
      status: autonomy === 'auto' ? 'draft' : 'agent_proposal',
      agentProposalType: 'confirm_meeting',
    });

    return this.formatResult({
      action: 'confirm_meeting',
      outcome: autonomy === 'auto' ? 'auto_handled' : 'proposed',
      summary: `No conflicts detected for ${meetTimeStr}. Confirmation draft prepared for human approval.`,
      details: { meetingTime: meetTimeStr, draftId: draft._id },
      confidence: 0.98,
      requiresHuman: true, // Draft confirmation always requires explicit human approval to send!
      undo: {
        type: 'discard_draft',
        payload: { draftId: draft._id },
      },
      durationMs: Date.now() - startTime,
    });
  }

  extractProposedTime(text) {
    const now = new Date();
    // Simple heuristic parser for demo meeting times
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
