import { store } from '../services/store.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * List threads filtered by segment and search query
 */
export async function getThreads(req, res, next) {
  try {
    const { segment = 'all', search, limit = 50, accountId } = req.query;

    const filters = {
      isArchived: segment === 'archived',
    };

    if (req.user?.orgId) {
      filters.orgId = req.user.orgId;
    }

    if (accountId) {
      filters.accountId = accountId;
    }

    if (segment === 'assistant') {
      filters.currentLabel = 'ASSISTANT_TO_REPLY';
    } else if (segment === 'client') {
      filters.currentLabel = 'CLIENT_TO_REPLY';
    } else if (segment === 'no_reply') {
      filters.currentLabel = 'NO_REPLY_NEEDED';
      filters.isArchived = undefined; // Quiet folder includes archived
    } else if (segment === 'needs_review') {
      filters.currentLabel = 'NEEDS_REVIEW';
    } else if (segment === 'waiting') {
      filters.isWaiting = true;
    } else if (segment === 'action') {
      filters.isActionRequired = true;
    } else if (segment === 'important') {
      filters.isImportant = true;
    }

    let threads = await store.getThreads(filters);

    // Client role filtering: clientVisible ONLY, hiding internal notes, in-progress drafts, and quiet folder
    if (req.user?.role === 'client') {
      threads = threads.filter(
        (t) =>
          (t.clientVisible === true || t.currentLabel === 'CLIENT_TO_REPLY') &&
          t.currentLabel !== 'NO_REPLY_NEEDED'
      );
    }

    if (segment === 'meetings') {
      threads = threads.filter((t) => t.meetings?.length > 0);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase();
      threads = threads.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.snippet.toLowerCase().includes(q) ||
          t.participants?.some((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
      );
    }

    return res.status(200).json({
      ok: true,
      data: threads.slice(0, parseInt(limit, 10)),
      total: threads.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get full thread, messages, timeline, and drafts
 */
export async function getThreadById(req, res, next) {
  try {
    const { id } = req.params;
    const thread = await store.getThreadById(id);
    if (!thread) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    // Strict org scoping: return 404 to avoid leaking existence
    if (thread.orgId && req.user?.orgId && thread.orgId !== req.user.orgId) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    // Client role access gate: must be clientVisible and not in quiet folder
    if (req.user?.role === 'client') {
      if (thread.clientVisible === false && thread.currentLabel !== 'CLIENT_TO_REPLY') {
        return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
      }
      if (thread.currentLabel === 'NO_REPLY_NEEDED') {
        return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
      }
    }

    const messages = await store.getMessagesByThreadId(thread._id);
    let events = await store.getClassificationEvents(thread._id);
    let drafts = await store.getDraftsByThreadId(thread._id);

    if (req.user?.role === 'client') {
      // Hide internal in-progress assistant drafts from executive view
      drafts = drafts.filter(
        (d) => d.status === 'pending_client' || d.status === 'approved' || d.status === 'sent'
      );
      // Strip assistant internal notes from timeline events
      events = events.map((e) => ({
        ...e,
        assistantNote: undefined,
      }));
    }

    return res.status(200).json({
      ok: true,
      data: {
        thread,
        messages,
        timeline: events,
        drafts,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Patch thread properties (archive, read, snooze, important)
 */
export async function updateThread(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await store.getThreadById(id);
    if (!existing || (existing.orgId && req.user?.orgId && existing.orgId !== req.user.orgId)) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    const updates = req.body;
    const thread = await store.updateThread(id, updates);

    return res.status(200).json({ ok: true, data: thread });
  } catch (err) {
    next(err);
  }
}

/**
 * Assistant manual override of AI label
 */
export async function overrideLabel(req, res, next) {
  try {
    const { id } = req.params;
    const { newLabel, note = '' } = req.body;

    const thread = await store.getThreadById(id);
    if (!thread || (thread.orgId && req.user?.orgId && thread.orgId !== req.user.orgId)) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    const previousLabel = thread.currentLabel;

    // 1. Update thread
    const updated = await store.updateThread(thread._id, {
      currentLabel: newLabel,
      manualOverride: true,
      reviewState: 'OVERRIDDEN',
    });

    // 2. Record Correction for few-shot prompt injection
    await store.addCorrection({
      orgId: req.user.orgId,
      clientId: thread.clientId,
      threadId: thread._id,
      userId: req.user._id,
      previousLabel,
      correctedLabel: newLabel,
      assistantNote: note,
      threadContext: {
        subject: thread.subject,
        senderEmail: thread.participants?.[0]?.email || '',
        snippet: thread.snippet,
      },
      promotedToPlaybookRule: false,
    });

    // 3. Emit timeline event
    await store.addClassificationEvent({
      threadId: thread._id,
      previousLabel,
      newLabel,
      triggerType: 'MANUAL_OVERRIDE',
      triggerMessageId: thread.lastMessageId,
      actorId: req.user._id,
      actorName: req.user.name || 'Assistant Maya',
      reason: note ? `Manual override: ${note}` : 'Assistant manual override',
    });

    // 4. Log to immutable ActivityLog
    await store.addActivityLog({
      orgId: req.user.orgId,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: 'assistant',
      action: 'LABEL_OVERRIDDEN',
      threadId: thread._id,
      details: { previousLabel, newLabel, note },
    });

    return res.status(200).json({
      ok: true,
      message: 'Label overridden and correction recorded',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Client decision action (Approve draft, Hand to Maya, Snooze, Mark handled)
 */
export async function clientDecision(req, res, next) {
  try {
    const { id } = req.params;
    const { action, note = '', draftId } = req.body; // 'approve', 'hand_to_assistant', 'snooze', 'handled'

    const thread = await store.getThreadById(id);
    if (!thread || (thread.orgId && req.user?.orgId && thread.orgId !== req.user.orgId)) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    let updates = {};
    if (action === 'approve') {
      updates = {
        clientStatus: 'handled',
        clientDecisionNote: 'Approved draft',
      };
      if (draftId) {
        await store.saveDraft({
          _id: draftId,
          status: 'approved',
          clientApproval: {
            approvedAt: new Date(),
            approvedBy: req.user._id,
            clientFeedback: note,
          },
        });
      }
      await store.addActivityLog({
        orgId: req.user.orgId,
        actorId: req.user._id,
        actorName: req.user.name || 'Priya Sharma',
        actorRole: 'client',
        action: 'DRAFT_APPROVED',
        threadId: thread._id,
        details: { note },
      });
    } else if (action === 'hand_to_assistant') {
      updates = {
        currentLabel: 'ASSISTANT_TO_REPLY',
        clientStatus: 'delegated',
        clientDecisionNote: note || 'Delegated by Priya to Maya',
      };
      await store.addClassificationEvent({
        threadId: thread._id,
        previousLabel: thread.currentLabel,
        newLabel: 'ASSISTANT_TO_REPLY',
        triggerType: 'MANUAL_OVERRIDE',
        actorName: 'Priya Sharma (Client)',
        reason: note ? `Handed to assistant: "${note}"` : 'Delegated by client',
      });
    } else if (action === 'snooze') {
      updates = {
        clientStatus: 'snoozed',
        snoozedUntil: new Date(Date.now() + 24 * 3600 * 1000), // Snooze 24h
      };
    } else if (action === 'handled') {
      updates = {
        clientStatus: 'handled',
        isCompleted: true,
      };
    }

    const updated = await store.updateThread(thread._id, updates);
    return res.status(200).json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
}
