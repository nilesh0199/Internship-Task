import { store } from '../services/store.js';
import { runClassificationPipeline } from '../ai/pipeline.js';
import { executeChatTool } from '../ai/chatTools.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Classifies or re-evaluates a thread using the full 7-stage pipeline
 */
export async function classifyThread(req, res, next) {
  try {
    const { threadId } = req.params;
    const { forceRerun = false } = req.body || {};

    const thread = await store.getThreadById(threadId);
    if (!thread || (thread.orgId && req.user?.orgId && thread.orgId !== req.user.orgId)) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    const messages = await store.getMessagesByThreadId(thread._id);
    const result = await runClassificationPipeline(thread, messages, forceRerun);

    return res.status(200).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Forces a live AI re-run, bypassing cache
 */
export async function rerunAI(req, res, next) {
  try {
    const { threadId } = req.params;
    const thread = await store.getThreadById(threadId);
    if (!thread || (thread.orgId && req.user?.orgId && thread.orgId !== req.user.orgId)) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    const messages = await store.getMessagesByThreadId(thread._id);
    const result = await runClassificationPipeline(thread, messages, true);

    return res.status(200).json({
      ok: true,
      message: 'AI pipeline re-executed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generates an executive summary of the conversation
 */
export async function summarizeThread(req, res, next) {
  try {
    const { threadId } = req.params;
    const thread = await store.getThreadById(threadId);
    if (!thread || (thread.orgId && req.user?.orgId && thread.orgId !== req.user.orgId)) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    const messages = await store.getMessagesByThreadId(thread._id);
    const existingSummary = thread.aiReason?.summary;

    const summary =
      existingSummary ||
      `Conversation between ${(thread.participants || []).map((p) => p.name || p.email).join(', ')} regarding "${thread.subject}". Active label: ${thread.currentLabel}.`;

    return res.status(200).json({
      ok: true,
      data: {
        summary,
        points: [
          `Subject: ${thread.subject}`,
          `Last contact: ${new Date(thread.lastMessageAt).toLocaleDateString()}`,
          `Assigned owner: ${thread.currentLabel.replace(/_/g, ' ')}`,
        ],
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generates an assistant draft response
 */
export async function generateDraft(req, res, next) {
  try {
    const { threadId } = req.params;
    const thread = await store.getThreadById(threadId);
    if (!thread || (thread.orgId && req.user?.orgId && thread.orgId !== req.user.orgId)) {
      return res.status(404).json({ ok: false, error: { message: 'Thread not found', code: 'NOT_FOUND' } });
    }

    const messages = await store.getMessagesByThreadId(thread._id);
    const lastMsg = messages[messages.length - 1];
    const client = await store.getClientByOrgId(thread.orgId);

    const recipient = lastMsg?.from?.name || lastMsg?.from?.email || 'there';
    const clientName = client?.name || 'Priya Sharma';

    let draftText = `Hi ${recipient},\n\nThank you for following up regarding "${thread.subject}".\n\n`;

    if (thread.currentLabel === 'CLIENT_TO_REPLY') {
      draftText += `I have reviewed the terms with ${clientName}. We are aligned and approving the proposal as outlined.\n\nPlease let us know if you need anything further from our side.\n\nBest regards,\n${clientName}`;
    } else {
      draftText += `On behalf of ${clientName}, I am reviewing the details and will have the confirmations over to you shortly.\n\nBest regards,\nMaya Lin\nExecutive Assistant to ${clientName}`;
    }

    const draft = await store.saveDraft({
      threadId: thread._id,
      orgId: thread.orgId,
      authorId: req.user._id,
      to: [lastMsg?.from?.email || thread.participants?.[0]?.email || 'recipient@example.com'],
      cc: [client?.email || 'priya@vortexdynamics.com'],
      subject: `RE: ${thread.subject.replace(/^RE:\s*/i, '')}`,
      bodyText: draftText,
      bodyHtml: `<p>${draftText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
      status: 'draft',
    });

    return res.status(200).json({
      ok: true,
      data: draft,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Natural language chat with LLM tool calling over MongoDB
 */
export async function chatAssistant(req, res, next) {
  try {
    const { query, threadId } = req.body;
    const lower = (query || '').toLowerCase();

    let answer = '';
    let toolResult = null;

    if (lower.includes('need') && lower.includes('client')) {
      toolResult = await executeChatTool('list_awaiting_client');
      answer = `Here are the top threads currently requiring Priya's personal decision:\n\n${toolResult
        .map((t) => `• **${t.link}**: ${t.decisionQuestion} (Deadline: ${t.deadline})`)
        .join('\n')}`;
    } else if (lower.includes('waiting')) {
      const threads = await store.getThreads({ isWaiting: true, isArchived: false });
      answer = threads.length
        ? `You have **${threads.length} conversations** currently waiting for external replies:\n\n${threads
            .slice(0, 5)
            .map((t) => `• [${t.subject}](/assistant?threadId=${t._id}) — sent by Maya, waiting for vendor`)
            .join('\n')}`
        : 'You have no threads currently marked as waiting on others.';
    } else if (lower.includes('why') && (lower.includes('assigned') || lower.includes('client'))) {
      const targetId = threadId || 'th_01';
      const thread = await store.getThreadById(targetId);
      if (thread) {
        answer = `**Why [${thread.subject}](/assistant?threadId=${thread._id}) was assigned to ${thread.currentLabel}:**\n\n${
          thread.aiReason?.reason || 'Evaluated based on client playbook rules.'
        }\n\n• **Evidence Quote:** _"${thread.aiReason?.evidence || 'VIP sender matched'}"_\n• **Signals:** ${(
          thread.aiReason?.signalsUsed || ['PLAYBOOK_RULE']
        ).join(', ')}`;
      } else {
        answer = 'Please select a thread to inspect its AI assignment reasoning.';
      }
    } else if (lower.includes('summarize')) {
      const targetId = threadId || 'th_01';
      const thread = await store.getThreadById(targetId);
      if (thread) {
        answer = `**Summary of [${thread.subject}](/assistant?threadId=${thread._id}):**\n\n${
          thread.aiReason?.summary || thread.snippet
        }\n\nCurrent label: **${thread.currentLabel}** (${Math.round((thread.confidence || 0.9) * 100)}% confidence).`;
      } else {
        answer = 'Please select a thread to summarize.';
      }
    } else if (lower.includes('deadline') || lower.includes('conflict') || lower.includes('meeting')) {
      toolResult = await executeChatTool('list_deadlines');
      answer = `**Upcoming Deadlines & Schedule Alerts:**\n\n${toolResult
        .map((d) => `• ${d.link} — ${d.deadline ? `Due: ${d.deadline}` : 'Conflict detected'}`)
        .join('\n')}`;
    } else {
      // General keyword search
      toolResult = await executeChatTool('search_threads', { query, limit: 4 });
      if (toolResult.length) {
        answer = `I found **${toolResult.length} conversations** matching "${query}":\n\n${toolResult
          .map((t) => `• ${t.link} (${t.label.replace(/_/g, ' ')})`)
          .join('\n')}`;
      } else {
        answer = `I couldn't find any email threads matching "${query}". You can ask about what needs the client's attention, what you're waiting on, or deadlines.`;
      }
    }

    return res.status(200).json({
      ok: true,
      data: {
        answer,
        toolResult,
      },
    });
  } catch (err) {
    next(err);
  }
}
