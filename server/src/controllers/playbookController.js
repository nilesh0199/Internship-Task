import { store } from '../services/store.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { GmailProvider } from '../providers/gmail/GmailProvider.js';
import { OutlookProvider } from '../providers/outlook/OutlookProvider.js';

export async function getPlaybook(req, res, next) {
  try {
    const client = await store.getClientByOrgId(req.user.orgId);
    return res.status(200).json({ ok: true, data: client?.playbook || {} });
  } catch (err) {
    next(err);
  }
}

export async function updatePlaybook(req, res, next) {
  try {
    const client = await store.getClientByOrgId(req.user.orgId);
    if (!client) {
      return res.status(404).json({ ok: false, error: { message: 'Client profile not found', code: 'NOT_FOUND' } });
    }

    const updated = await store.updatePlaybook(client._id, req.body);
    await store.addActivityLog({
      orgId: req.user.orgId,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'PLAYBOOK_UPDATED',
      details: { rulesCount: req.body.topicRules?.length },
    });

    return res.status(200).json({ ok: true, data: updated.playbook });
  } catch (err) {
    next(err);
  }
}

export async function addPlaybookRule(req, res, next) {
  try {
    const { topic, disposition, description } = req.body;
    const client = await store.getClientByOrgId(req.user.orgId);
    if (!client) {
      return res.status(404).json({ ok: false, error: { message: 'Client not found', code: 'NOT_FOUND' } });
    }

    const updated = await store.addPlaybookRule(client._id, {
      topic,
      disposition,
      description: description || `Synthesized from manual override by ${req.user.name}`,
    });

    return res.status(201).json({
      ok: true,
      message: 'Rule appended to Client Playbook',
      data: updated.playbook,
    });
  } catch (err) {
    next(err);
  }
}

export async function saveDraft(req, res, next) {
  try {
    const draft = await store.saveDraft({
      ...req.body,
      orgId: req.user.orgId,
      authorId: req.user._id,
    });
    return res.status(200).json({ ok: true, data: draft });
  } catch (err) {
    next(err);
  }
}

export async function requestClientApproval(req, res, next) {
  try {
    const { id } = req.params;
    const draft = await store.saveDraft({
      _id: id,
      status: 'pending_client',
    });

    await store.addActivityLog({
      orgId: req.user.orgId,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: 'assistant',
      action: 'DRAFT_SUBMITTED_FOR_APPROVAL',
      threadId: draft.threadId,
      details: { subject: draft.subject },
    });

    return res.status(200).json({ ok: true, message: 'Draft submitted to Priya for approval', data: draft });
  } catch (err) {
    next(err);
  }
}

export async function sendDraft(req, res, next) {
  try {
    const { id } = req.params;
    const drafts = await store.getDraftsByThreadId(req.body.threadId || '');
    const draft = drafts.find((d) => d._id === id) || req.body;

    // Safety Gate Check: SEND_ENABLED
    if (!env.SEND_ENABLED) {
      logger.info({ draftId: id }, '[DraftSend] SEND_ENABLED=false. Simulating email transmission.');

      await store.saveDraft({
        ...draft,
        status: 'sent',
        sentAt: new Date(),
        isSimulatedSend: true,
      });

      await store.addActivityLog({
        orgId: req.user.orgId,
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: 'assistant',
        action: 'EMAIL_SENT_SIMULATED',
        threadId: draft.threadId,
        details: { to: draft.to, subject: draft.subject, simulated: true },
      });

      return res.status(200).json({
        ok: true,
        message: 'Email transmission simulated (SEND_ENABLED=false)',
        isSimulated: true,
      });
    }

    // Real send when SEND_ENABLED=true
    const thread = await store.getThreadById(draft.threadId);
    const accounts = await store.getConnectedAccounts(req.user.orgId);
    const account = accounts.find(
      (a) => a._id === thread?.connectedAccountId || a._id === thread?.accountId
    );

    let sendResult = { success: true, messageId: 'real_' + Date.now(), isSimulated: false };
    if (account?.provider === 'gmail') {
      const provider = new GmailProvider(account);
      sendResult = await provider.sendReply(draft);
    } else if (account?.provider === 'outlook') {
      const provider = new OutlookProvider(account);
      sendResult = await provider.sendReply(draft);
    }

    await store.saveDraft({
      ...draft,
      status: 'sent',
      sentAt: new Date(),
      isSimulatedSend: false,
    });

    return res.status(200).json({
      ok: true,
      message: 'Email dispatched via provider API',
      isSimulated: false,
      data: sendResult,
    });
  } catch (err) {
    next(err);
  }
}

export async function getActivityLog(req, res, next) {
  try {
    const logs = await store.getActivityLogs(req.user.orgId, 30);
    return res.status(200).json({ ok: true, data: logs });
  } catch (err) {
    next(err);
  }
}
