import { store } from '../services/store.js';
import { runAgentsForThread } from '../agents/index.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * List threads filtered by segment and search query
 */
export async function getThreads(req, res, next) {
  try {
    const { segment = 'all', search, limit = 50, accountId, clientId } = req.query;

    const filters = {
      isArchived: segment === 'archived',
    };

    if (req.user?.orgId) {
      filters.orgId = req.user.orgId;
    }

    if (req.user?.role === 'client' && req.user.clientId) {
      filters.clientId = req.user.clientId;
    } else if (req.user?.role === 'assistant' && clientId) {
      filters.clientId = clientId;
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

    if (segment === 'proposals') {
      const proposals = await store.getAgentProposals(req.user?.orgId);
      const proposalThreadIds = proposals.map((p) => String(p.threadId));
      threads = threads.filter(
        (t) =>
          proposalThreadIds.includes(String(t._id || t.id)) ||
          t.agentSummary?.toLowerCase().includes('proposed') ||
          t.agentSummary?.toLowerCase().includes('drafted') ||
          t.agentSummary?.toLowerCase().includes('conflict') ||
          t.meetings?.some((m) => m.isConflict)
      );
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

    const pendingDraftIds = await store.getPendingDraftThreadIds(req.user?.orgId);
    const enriched = threads.slice(0, parseInt(limit, 10)).map((t) => ({
      ...t,
      hasPendingDraft: pendingDraftIds.has(String(t._id || t.id)),
    }));

    return res.status(200).json({
      ok: true,
      data: enriched,
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

    // Strict client scoping for client role: cannot access cross-client threads
    if (req.user?.role === 'client' && req.user.clientId && thread.clientId && thread.clientId !== req.user.clientId) {
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
 * Assistant archive thread action
 */
export async function archiveThread(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await store.getThreadById(id);
    if (!existing || (existing.orgId && req.user?.orgId && existing.orgId !== req.user.orgId)) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    const thread = await store.updateThread(id, { isArchived: true });
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
    if (
      !thread ||
      (thread.orgId && req.user?.orgId && thread.orgId !== req.user.orgId) ||
      (req.user?.role === 'client' && req.user.clientId && thread.clientId && thread.clientId !== req.user.clientId)
    ) {
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
    const { action, note = '', draftId, customText, duration } = req.body;

    const thread = await store.getThreadById(id);
    if (
      !thread ||
      (thread.orgId && req.user?.orgId && thread.orgId !== req.user.orgId) ||
      (req.user?.role === 'client' && req.user.clientId && thread.clientId && thread.clientId !== req.user.clientId)
    ) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    const now = new Date();
    let updates = {};
    if (action === 'approve') {
      const existingDrafts = await store.getDraftsByThreadId(thread._id);
      const targetDraft = existingDrafts.find((d) => d._id === draftId) || existingDrafts[0];
      const sentBody = (customText && customText.trim()) || targetDraft?.bodyText || 'Approved and sent by executive.';
      const recipient = thread.participants?.find((p) => !p.isClient) || thread.participants?.[0] || { email: 'recipient@example.com' };

      updates = {
        currentLabel: 'NO_REPLY_NEEDED',
        lastDirection: 'OUTBOUND',
        lastMessageAt: now,
        isWaiting: true,
        isActionRequired: false,
        clientStatus: 'handled',
        isCompleted: true,
        clientDecisionNote: customText ? 'Approved edited draft & sent (simulated)' : 'Approved prepared draft & sent (simulated)',
      };
      if (draftId || targetDraft?._id) {
        await store.saveDraft({
          _id: draftId || targetDraft._id,
          ...(customText ? { bodyText: customText } : {}),
          status: 'sent',
          sentAt: now,
          isSimulatedSend: !env.SEND_ENABLED,
          clientApproval: {
            approvedAt: now,
            approvedBy: req.user._id,
            clientFeedback: note,
          },
        });
      }
      await store.addMessage({
        orgId: req.user.orgId,
        threadId: thread._id,
        clientId: thread.clientId,
        from: { name: req.user.name || 'Executive', email: req.user.email },
        to: [{ name: recipient.name || recipient.email, email: recipient.email }],
        subject: `RE: ${thread.subject}`,
        snippet: sentBody.slice(0, 140),
        bodyText: sentBody,
        direction: 'OUTBOUND',
        date: now,
        receivedAt: now,
      });
      await store.addActivityLog({
        orgId: req.user.orgId,
        actorId: req.user._id,
        actorName: req.user.name || 'Priya Sharma',
        actorRole: 'client',
        action: 'DRAFT_APPROVED',
        threadId: thread._id,
        details: { draftId: draftId || null, editedByClient: Boolean(customText), simulated: !env.SEND_ENABLED },
      });
    } else if (action === 'reply_direct') {
      const replyBody = (note && note.trim()) || 'Replied directly by executive.';
      const recipient = thread.participants?.find((p) => !p.isClient) || thread.participants?.[0] || { email: 'recipient@example.com' };

      updates = {
        currentLabel: 'NO_REPLY_NEEDED',
        lastDirection: 'OUTBOUND',
        lastMessageAt: now,
        isWaiting: true,
        isActionRequired: false,
        clientStatus: 'handled',
        isCompleted: true,
        clientDecisionNote: 'Direct executive reply sent (simulated)',
      };
      await store.addMessage({
        orgId: req.user.orgId,
        threadId: thread._id,
        clientId: thread.clientId,
        from: { name: req.user.name || 'Executive', email: req.user.email },
        to: [{ name: recipient.name || recipient.email, email: recipient.email }],
        subject: `RE: ${thread.subject}`,
        snippet: replyBody.slice(0, 140),
        bodyText: replyBody,
        direction: 'OUTBOUND',
        date: now,
        receivedAt: now,
      });
      await store.addActivityLog({
        orgId: req.user.orgId,
        actorId: req.user._id,
        actorName: req.user.name || 'Priya Sharma',
        actorRole: 'client',
        action: 'CLIENT_DIRECT_REPLY',
        threadId: thread._id,
        details: { simulated: !env.SEND_ENABLED, hasReplyContent: Boolean(note && note.trim()) },
      });
    } else if (action === 'undo') {
      const prev = req.body.previousState || {};
      updates = {
        currentLabel: prev.currentLabel || 'CLIENT_TO_REPLY',
        clientStatus: prev.clientStatus || 'pending',
        isCompleted: Boolean(prev.isCompleted),
        isWaiting: Boolean(prev.isWaiting),
        isActionRequired: prev.isActionRequired !== undefined ? Boolean(prev.isActionRequired) : true,
        snoozedUntil: prev.snoozedUntil || null,
        clientDecisionNote: '',
      };
      await store.addActivityLog({
        orgId: req.user.orgId,
        actorId: req.user._id,
        actorName: req.user.name || 'Priya Sharma',
        actorRole: 'client',
        action: 'CLIENT_DECISION_UNDONE',
        threadId: thread._id,
        details: { restoredLabel: updates.currentLabel, restoredStatus: updates.clientStatus },
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
        actorName: `${req.user.name || 'Priya Sharma'} (Client)`,
        reason: note ? `Handed to assistant: "${note}"` : 'Delegated by client',
      });
      await store.addActivityLog({
        orgId: req.user.orgId,
        actorId: req.user._id,
        actorName: req.user.name || 'Priya Sharma',
        actorRole: 'client',
        action: 'HANDED_TO_ASSISTANT',
        threadId: thread._id,
        details: { delegated: true },
      });
    } else if (action === 'snooze') {
      const hours = duration === '4h' ? 4 : duration === 'next_week' ? 168 : 24;
      updates = {
        clientStatus: 'snoozed',
        snoozedUntil: new Date(Date.now() + hours * 3600 * 1000),
      };
      await store.addActivityLog({
        orgId: req.user.orgId,
        actorId: req.user._id,
        actorName: req.user.name || 'Priya Sharma',
        actorRole: 'client',
        action: 'THREAD_SNOOZED',
        threadId: thread._id,
        details: { duration: duration || 'tomorrow' },
      });
    } else if (action === 'handled') {
      updates = {
        clientStatus: 'handled',
        isCompleted: true,
        clientDecisionNote: 'Marked handled by executive',
      };
      await store.addActivityLog({
        orgId: req.user.orgId,
        actorId: req.user._id,
        actorName: req.user.name || 'Priya Sharma',
        actorRole: 'client',
        action: 'THREAD_MARKED_HANDLED',
        threadId: thread._id,
        details: { handled: true },
      });
    }

    const updated = await store.updateThread(thread._id, updates);

    // Trigger agents on client decision
    try {
      await runAgentsForThread(updated, 'client_action');
    } catch (agentErr) {
      logger.warn({ err: agentErr.message }, '[ClientDecision] Agent run warning on client action');
    }

    return res.status(200).json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/assistant/today
 * Cross-client command view for Assistant Maya: prioritized "Needs you now", client cards, meetings, overnight runs
 */
export async function getTodaySummary(req, res, next) {
  try {
    const orgId = req.user?.orgId || 'org_vortex_001';
    const summary = await store.getTodaySummary(orgId);
    return res.status(200).json({
      ok: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/threads/compose
 * Composes a brand-new outbound email thread (send, draft, or submit for executive approval).
 * Respects SEND_ENABLED safety gate and strictly avoids logging raw email bodies.
 */
export async function composeEmail(req, res, next) {
  try {
    const {
      to,
      toName,
      cc,
      subject,
      bodyText,
      clientId: requestedClientId,
      mode: requestedMode = 'send',
    } = req.body;

    const orgId = req.user.orgId || 'org_vortex_001';
    const isClient = req.user.role === 'client';
    const mode = isClient && requestedMode === 'request_approval' ? 'send' : requestedMode;

    // Resolve target executive client strictly within caller's org & role boundary
    let targetClient = null;
    if (isClient) {
      targetClient = req.user.clientId
        ? await store.getClientByOrgAndId(orgId, req.user.clientId)
        : await store.getClientByOrgId(orgId);
    } else if (requestedClientId) {
      targetClient = await store.getClientByOrgAndId(orgId, requestedClientId);
    } else {
      targetClient = await store.getClientByOrgId(orgId);
    }

    const resolvedClientId = targetClient?._id || req.user.clientId || 'client_priya_001';
    const now = new Date();
    const cleanTo = to.trim().toLowerCase();
    const recipientName = (toName && toName.trim()) || cleanTo.split('@')[0];
    const ccList = cc
      ? cc
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    const fromIdentity = isClient
      ? { name: req.user.name || targetClient?.name || 'Executive', email: req.user.email }
      : {
          name: `${req.user.name || 'Assistant'} (for ${targetClient?.name || 'Executive'})`,
          email: req.user.email,
        };

    const isApprovalFlow = mode === 'request_approval';
    const isSendFlow = mode === 'send';
    const simulated = isSendFlow ? !env.SEND_ENABLED : false;

    const newThread = await store.createThread({
      orgId,
      clientId: resolvedClientId,
      subject: subject.trim(),
      snippet: bodyText.trim().slice(0, 140),
      participants: [
        { name: recipientName, email: cleanTo },
        {
          name: targetClient?.name || req.user.name || 'Executive',
          email: targetClient?.email || req.user.email,
          isClient: true,
        },
      ],
      lastMessageAt: now,
      lastDirection: 'OUTBOUND',
      currentLabel: isApprovalFlow
        ? 'CLIENT_TO_REPLY'
        : isSendFlow
        ? 'NO_REPLY_NEEDED'
        : isClient
        ? 'CLIENT_TO_REPLY'
        : 'ASSISTANT_TO_REPLY',
      aiLabel: isApprovalFlow ? 'CLIENT_TO_REPLY' : 'NO_REPLY_NEEDED',
      manualOverride: true,
      confidence: 1,
      isActionRequired: isApprovalFlow,
      isWaiting: isSendFlow,
      isArchived: false,
      isRead: true,
      clientVisible: isClient || isApprovalFlow,
      clientStatus: isSendFlow ? 'handled' : 'pending',
      aiReason: isApprovalFlow
        ? {
            provider: 'human',
            model: 'assistant-compose',
            reason: `New outbound email drafted by ${req.user.name || 'Assistant'} to ${recipientName} awaiting executive approval.`,
            summary: `Approve outbound email to ${cleanTo}: "${subject.trim()}"`,
            decision: {
              question: `Approve and send this new email to ${recipientName} (${cleanTo})?`,
              options: ['Approve & Send Draft', 'Edit & Reply Myself', 'Hand back to Assistant'],
            },
          }
        : undefined,
    });

    let createdMessage = null;
    if (isSendFlow) {
      createdMessage = await store.addMessage({
        orgId,
        threadId: newThread._id,
        clientId: resolvedClientId,
        from: fromIdentity,
        to: [{ name: recipientName, email: cleanTo }],
        cc: ccList.map((email) => ({ email })),
        subject: subject.trim(),
        snippet: bodyText.trim().slice(0, 140),
        bodyText: bodyText.trim(),
        direction: 'OUTBOUND',
        date: now,
        receivedAt: now,
      });
    }

    const draft = await store.saveDraft({
      orgId,
      threadId: newThread._id,
      clientId: resolvedClientId,
      to: [cleanTo],
      cc: ccList,
      subject: subject.trim(),
      bodyText: bodyText.trim(),
      status: isSendFlow ? 'sent' : isApprovalFlow ? 'pending_client' : 'draft',
      createdBy: req.user._id,
      sentAt: isSendFlow ? now : undefined,
      simulated,
    });

    await store.addActivityLog({
      orgId,
      actorId: req.user._id,
      actorName: req.user.name || 'User',
      actorRole: req.user.role,
      action: isSendFlow
        ? simulated
          ? 'EMAIL_COMPOSED_SIMULATED_SEND'
          : 'EMAIL_COMPOSED_SENT'
        : isApprovalFlow
        ? 'EMAIL_COMPOSED_PENDING_APPROVAL'
        : 'EMAIL_COMPOSED_DRAFT',
      threadId: newThread._id,
      details: {
        clientId: resolvedClientId,
        recipientDomain: cleanTo.split('@')[1] || 'unknown',
        mode,
        simulated,
      },
    });

    logger.info(
      {
        threadId: newThread._id,
        messageId: createdMessage?._id || null,
        role: req.user.role,
        mode,
        simulated,
      },
      '[Threads] New outbound email composed'
    );

    return res.status(201).json({
      ok: true,
      data: {
        thread: newThread,
        draft,
        message: createdMessage,
        simulated,
        mode,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/threads/:id/draft
 * Save a thread reply draft or submit it for Executive Client approval.
 */
export async function saveThreadDraft(req, res, next) {
  try {
    const { id } = req.params;
    const { subject, bodyText, status = 'draft' } = req.body;

    const thread = await store.getThreadById(id);
    if (!thread || (thread.orgId && req.user?.orgId && thread.orgId !== req.user.orgId)) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    const previousState = {
      currentLabel: thread.currentLabel,
      clientVisible: Boolean(thread.clientVisible),
      clientStatus: thread.clientStatus || 'pending',
      isActionRequired: Boolean(thread.isActionRequired),
      isWaiting: Boolean(thread.isWaiting),
      isArchived: Boolean(thread.isArchived),
      isCompleted: Boolean(thread.isCompleted),
    };

    const existingDrafts = await store.getDraftsByThreadId(thread._id);
    const existing = existingDrafts?.[0];
    const recipient = thread.participants?.find((p) => !p.isClient) || thread.participants?.[0];

    const draft = await store.saveDraft({
      ...(existing?._id ? { _id: existing._id } : {}),
      orgId: req.user.orgId,
      threadId: thread._id,
      clientId: thread.clientId,
      to: recipient?.email ? [recipient.email] : [],
      subject: subject || `RE: ${thread.subject}`,
      bodyText: bodyText || '',
      status,
      authorId: req.user._id,
    });

    let updatedThread = thread;
    if (status === 'pending_client') {
      updatedThread = await store.updateThread(thread._id, {
        currentLabel: 'CLIENT_TO_REPLY',
        clientVisible: true,
        clientStatus: 'pending',
        isActionRequired: true,
        isCompleted: false,
      });

      await store.addActivityLog({
        orgId: req.user.orgId,
        actorId: req.user._id,
        actorName: req.user.name || 'Assistant',
        actorRole: 'assistant',
        action: 'DRAFT_SUBMITTED_FOR_APPROVAL',
        threadId: thread._id,
        details: { draftId: draft._id, clientId: thread.clientId },
      });
    }

    logger.info(
      { threadId: thread._id, draftId: draft._id, status },
      '[Threads] Thread draft saved'
    );

    return res.status(200).json({
      ok: true,
      data: {
        draft,
        thread: updatedThread,
        previousState,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/threads/:id/send
 * Dispatches an assistant-authorized reply (simulated when SEND_ENABLED=false),
 * appends the outbound message, and moves the thread to Waiting on Others / Quiet Folder.
 */
export async function sendThreadReply(req, res, next) {
  try {
    const { id } = req.params;
    const { subject, bodyText } = req.body;

    const thread = await store.getThreadById(id);
    if (!thread || (thread.orgId && req.user?.orgId && thread.orgId !== req.user.orgId)) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    const previousState = {
      currentLabel: thread.currentLabel,
      clientVisible: Boolean(thread.clientVisible),
      clientStatus: thread.clientStatus || 'pending',
      isActionRequired: Boolean(thread.isActionRequired),
      isWaiting: Boolean(thread.isWaiting),
      isArchived: Boolean(thread.isArchived),
      isCompleted: Boolean(thread.isCompleted),
    };

    const now = new Date();
    const simulated = !env.SEND_ENABLED;
    const cleanBody = (bodyText || '').trim();
    const cleanSubject = (subject || `RE: ${thread.subject}`).trim();
    const recipient = thread.participants?.find((p) => !p.isClient) || thread.participants?.[0] || {
      name: 'Recipient',
      email: 'recipient@example.com',
    };

    const existingDrafts = await store.getDraftsByThreadId(thread._id);
    const existing = existingDrafts?.[0];

    const draft = await store.saveDraft({
      ...(existing?._id ? { _id: existing._id } : {}),
      orgId: req.user.orgId,
      threadId: thread._id,
      clientId: thread.clientId,
      to: [recipient.email],
      subject: cleanSubject,
      bodyText: cleanBody,
      status: 'sent',
      sentAt: now,
      isSimulatedSend: simulated,
      authorId: req.user._id,
    });

    const message = await store.addMessage({
      orgId: req.user.orgId,
      threadId: thread._id,
      clientId: thread.clientId,
      from: { name: req.user.name || 'Assistant', email: req.user.email },
      to: [{ name: recipient.name || recipient.email, email: recipient.email }],
      subject: cleanSubject,
      snippet: cleanBody.slice(0, 140),
      bodyText: cleanBody,
      direction: 'OUTBOUND',
      date: now,
      receivedAt: now,
    });

    const updatedThread = await store.updateThread(thread._id, {
      currentLabel: 'NO_REPLY_NEEDED',
      lastDirection: 'OUTBOUND',
      lastMessageAt: now,
      lastMessageId: message._id,
      isWaiting: true,
      isActionRequired: false,
      isCompleted: true,
      clientStatus: 'handled',
      snippet: cleanBody.slice(0, 140),
    });

    await store.addActivityLog({
      orgId: req.user.orgId,
      actorId: req.user._id,
      actorName: req.user.name || 'Assistant',
      actorRole: 'assistant',
      action: simulated ? 'EMAIL_SENT_SIMULATED' : 'EMAIL_SENT',
      threadId: thread._id,
      details: { draftId: draft._id, messageId: message._id, simulated },
    });

    logger.info(
      { threadId: thread._id, messageId: message._id, simulated },
      '[Threads] Thread reply dispatched'
    );

    return res.status(200).json({
      ok: true,
      data: {
        thread: updatedThread,
        draft,
        message,
        simulated,
        previousState,
      },
    });
  } catch (err) {
    next(err);
  }
}
