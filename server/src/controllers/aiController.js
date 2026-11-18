import { store } from '../services/store.js';
import { runClassificationPipeline } from '../ai/pipeline.js';
import { executeChatTool } from '../ai/chatTools.js';
import { getActiveByokConfig, callLLMCompletion } from '../ai/llmClient.js';
import { ByokError } from '../ai/byokClient.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { runAgentLoop, sanitizeUntrustedData } from '../agents/runtime/index.js';

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
    const client = thread.clientId
      ? (await store.getClientById(thread.clientId)) || (await store.getClientByOrgId(thread.orgId))
      : await store.getClientByOrgId(thread.orgId);

    const { tone = 'direct' } = req.body || {};
    const recipient = lastMsg?.from?.name || lastMsg?.from?.email || 'there';
    const clientName = client?.name || 'Priya Sharma';
    const orgId = thread.orgId || req.user?.orgId || 'org_vortex_001';

    let draftText = '';
    let providerUsed = 'template';
    let modelUsed = 'preset_v1';
    let byokError = null;

    // 1. Try user-configured BYOK LLM first when active
    const byok = await getActiveByokConfig(orgId);
    if (byok) {
      try {
        const recentContext = messages
          .slice(-3)
          .map((m) => `${m.from?.name || m.from?.email || 'Sender'}: ${(m.bodyText || m.snippet || '').slice(0, 400)}`)
          .join('\n---\n');

        const senderSignoff =
          thread.currentLabel === 'CLIENT_TO_REPLY'
            ? clientName
            : `Maya Lin\nExecutive Assistant to ${clientName}`;

        const completion = await callLLMCompletion({
          orgId,
          jsonMode: false,
          temperature: 0.35,
          maxTokens: 450,
          systemPrompt: `You write concise, polished executive email replies for ${clientName}.
Requested tone: "${tone}" (direct = crisp & decisive, warm = friendly & collaborative, formal = diplomatic & structured, decline = polite but firm pass).
Sign off as: ${senderSignoff}.
Output ONLY the plain-text email body (no subject line, no markdown fences, no commentary).`,
          prompt: `Subject: ${thread.subject}
Recipient: ${recipient}
Recent messages:
${recentContext || thread.snippet}`,
        });

        if (completion?.text?.trim()) {
          draftText = completion.text.trim();
          providerUsed = completion.provider;
          modelUsed = completion.model;
        }
      } catch (err) {
        if (err instanceof ByokError) {
          byokError = err.toPublicJSON();
        } else {
          byokError = {
            code: 'DRAFT_LLM_FAILED',
            message: 'Configured AI provider could not generate draft; used safe template fallback.',
            provider: byok.provider,
            model: byok.model,
          };
        }
        logger.warn({ orgId, provider: byok.provider, code: byokError.code }, '[AI] BYOK draft failed, using template');
      }
    }

    // 2. Deterministic template fallback if no BYOK or BYOK failed
    if (!draftText) {
      if (tone === 'decline') {
        draftText = `Hi ${recipient},\n\nThank you for reaching out regarding "${thread.subject}".\n\nAt this time, our priorities are fully committed to current operations, so we will politely pass on this opportunity. We appreciate your understanding.\n\nBest regards,\n${clientName}`;
      } else if (tone === 'warm') {
        draftText = `Hi ${recipient},\n\nThanks so much for reaching out! Great to hear from you.\n\nWe would love to connect regarding "${thread.subject}". I will coordinate with ${clientName}'s calendar and have some suitable times over to you shortly.\n\nWarm regards,\nMaya Lin\nExecutive Assistant to ${clientName}`;
      } else if (tone === 'formal') {
        draftText = `Dear ${recipient},\n\nThank you for your correspondence regarding "${thread.subject}".\n\nOn behalf of ${clientName}, we acknowledge receipt of your documentation. Our team is conducting a review and will furnish a formal response shortly.\n\nSincerely,\nMaya Lin\nExecutive Assistant to ${clientName}`;
      } else {
        if (thread.currentLabel === 'CLIENT_TO_REPLY') {
          draftText = `Hi ${recipient},\n\nThank you for following up regarding "${thread.subject}".\n\nI have reviewed the terms with ${clientName}. We are aligned and approving the proposal as outlined.\n\nPlease let us know if you need anything further from our side.\n\nBest regards,\n${clientName}`;
        } else {
          draftText = `Hi ${recipient},\n\nThank you for following up regarding "${thread.subject}".\n\nOn behalf of ${clientName}, I am reviewing the details and will have the confirmations over to you shortly.\n\nBest regards,\nMaya Lin\nExecutive Assistant to ${clientName}`;
        }
      }
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
      data: {
        ...draft,
        aiMeta: { provider: providerUsed, model: modelUsed, byokError },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Natural language chat with multi-step closed-loop Agent Runtime over store
 */
export async function chatAssistant(req, res, next) {
  try {
    const { query, threadId } = req.body;
    const orgId = req.user?.orgId || 'org_vortex_001';
    const rawLower = (query || '').toLowerCase();

    // Respect explicit client mention in query, otherwise active workspace clientId (or all clients on Today view)
    let clientId = req.query.clientId || req.body.clientId || req.user?.clientId || null;
    if (req.user?.role === 'assistant') {
      if (rawLower.includes('rohan')) clientId = 'client_rohan_002';
      else if (rawLower.includes('priya')) clientId = 'client_priya_001';
    }
    const clientLabel =
      clientId === 'client_rohan_002'
        ? 'Rohan Kapoor'
        : clientId === 'client_priya_001'
        ? 'Priya Sharma'
        : 'your clients';

    const toolCtx = { orgId, ...(clientId ? { clientId } : {}) };
    const activeByok = await getActiveByokConfig(orgId);
    let byokError = null;

    // If user configured a BYOK key OR server LLM env key is present, run live LLM
    if (env.ENABLE_LIVE_AGENT_LOOPS !== false && (activeByok || env.GEMINI_API_KEY || env.GROQ_API_KEY)) {
      try {
        const goal = `Answer the executive assistant query: "${sanitizeUntrustedData(query)}". Use tools to search threads, count labels, list items awaiting client, check deadlines, or inspect thread details. Answers must cite markdown thread links in format [Thread Subject](/assistant/c/${clientId || 'client_priya_001'}/inbox?threadId=id).`;
        const systemPrompt = `You are the Daybook Mail AI Assistant for assistant Maya Lin (${clientLabel}).
You help the assistant manage the inbox by searching threads, retrieving metrics, checking upcoming deadlines, and answering questions.
Always cite specific thread links like [Subject](/assistant/c/${clientId || 'client_priya_001'}/inbox?threadId=id) when referencing conversations.
Use available tools: search_threads, get_thread, count_by_label, list_awaiting_client, list_deadlines, get_playbook, get_agent_notes.
When you have the full answer, call action 'final' with { "answer": "markdown formatted answer" }.`;

        const loopResult = await runAgentLoop({
          agentId: 'chat_assistant',
          goal,
          systemPrompt,
          tools: [
            'search_threads',
            'get_thread',
            'count_by_label',
            'list_awaiting_client',
            'list_deadlines',
            'get_playbook',
            'get_agent_notes',
          ],
          limits: { maxSteps: 4, timeoutMs: 12000 },
          ctx: { orgId, clientId: clientId || 'client_priya_001', threadId },
        });

        if (loopResult.finalResult?.byokError) {
          byokError = loopResult.finalResult.byokError;
        }

        if (loopResult.finalResult?.answer && !byokError) {
          return res.status(200).json({
            ok: true,
            data: {
              answer: loopResult.finalResult.answer,
              steps: loopResult.steps,
              usedAgentRuntime: true,
              provider: activeByok?.provider || null,
              model: activeByok?.model || null,
            },
          });
        }

        // If BYOK was configured and loop simulated/failed, check latest saved error
        if (activeByok && !byokError && !loopResult.usedLLM) {
          const latestCfg = await store.getOrgAiConfig(orgId, { includeSecret: false });
          if (latestCfg?.lastTestStatus === 'failed' && latestCfg?.lastTestError) {
            byokError = {
              code: 'BYOK_FALLBACK',
              provider: activeByok.provider,
              model: activeByok.model,
              message: latestCfg.lastTestError,
              hint: 'Open Settings → AI Provider & API Key to test or update your key.',
            };
          }
        }
      } catch (agentErr) {
        if (agentErr instanceof ByokError) {
          byokError = agentErr.toPublicJSON();
        }
        logger.warn({ err: agentErr.message }, '[ChatAssistant] Agent runtime loop failed, falling back to heuristics');
      }
    }

    // Structured Tool + Heuristic Fallback (works reliably without external API keys)
    const lower = rawLower;
    let answer = '';
    let matchedThreads = [];

    const toToolResult = (list) => ({
      count: list.length,
      threads: list.map((t) => ({
        _id: t._id || t.id,
        clientId: t.clientId || clientId || 'client_priya_001',
        subject: t.subject,
        participants: t.participants || (t.sender ? [{ name: t.sender }] : []),
        currentLabel: t.currentLabel || t.label,
        deadline: t.deadline || null,
      })),
    });

    if (
      (lower.includes('need') && (lower.includes('client') || lower.includes('priya') || lower.includes('rohan') || lower.includes('attention'))) ||
      lower.includes('decision')
    ) {
      const pending = await executeChatTool('list_awaiting_client', {}, toolCtx);
      matchedThreads = pending;
      answer = pending.length
        ? `Here are the top **${pending.length} threads** currently requiring ${clientLabel}'s decision:\n\n${pending
            .map((t) => `• **${t.link}**: ${t.decisionQuestion} (Deadline: ${t.deadline})`)
            .join('\n')}`
        : `There are no pending threads awaiting ${clientLabel}'s reply right now.`;
    } else if (lower.includes('waiting')) {
      const waiting = await store.getThreads({
        orgId,
        ...(clientId ? { clientId } : {}),
        isWaiting: true,
        isArchived: false,
      });
      matchedThreads = waiting.slice(0, 6);
      answer = waiting.length
        ? `You have **${waiting.length} conversation${waiting.length === 1 ? '' : 's'}** currently waiting on external replies (${clientLabel}):\n\n${waiting
            .slice(0, 5)
            .map((t) => `• [${t.subject}](/assistant/c/${t.clientId || 'client_priya_001'}/inbox?threadId=${t._id}) — waiting on ${t.participants?.[0]?.name || 'recipient'}`)
            .join('\n')}`
        : `You have no threads currently marked as waiting on others for ${clientLabel}.`;
    } else if (lower.includes('why') && (lower.includes('assigned') || lower.includes('client') || lower.includes('label') || lower.includes('priya') || lower.includes('rohan'))) {
      let thread = threadId ? await store.getThreadById(threadId) : null;
      if (!thread) {
        const list = await store.getThreads({ ...toolCtx, isArchived: false });
        thread = list[0] || null;
      }
      if (thread) {
        matchedThreads = [thread];
        answer = `**Why [${thread.subject}](/assistant/c/${thread.clientId || 'client_priya_001'}/inbox?threadId=${thread._id}) is labeled ${thread.currentLabel.replace(/_/g, ' ')}:**\n\n${
          thread.aiReason?.reason || 'Evaluated based on client delegation playbook rules.'
        }\n\n• **Evidence:** _"${thread.aiReason?.evidence || thread.snippet}"_\n• **Signals:** ${(
          thread.aiReason?.signalsUsed || ['PLAYBOOK_RULE']
        ).join(', ')}`;
      } else {
        answer = 'Select any thread from the inbox to inspect its AI assignment reasoning.';
      }
    } else if (lower.includes('summarize') || lower.includes('summary')) {
      let thread = threadId ? await store.getThreadById(threadId) : null;
      if (!thread) {
        const list = await store.getThreads({ ...toolCtx, isArchived: false });
        thread = list[0] || null;
      }
      if (thread) {
        matchedThreads = [thread];
        answer = `**Summary of [${thread.subject}](/assistant/c/${thread.clientId || 'client_priya_001'}/inbox?threadId=${thread._id}):**\n\n${
          thread.aiReason?.summary || thread.snippet
        }\n\n• **Owner:** ${thread.currentLabel.replace(/_/g, ' ')} (${Math.round((thread.confidence || 0.9) * 100)}% confidence)${
          thread.aiReason?.decision?.deadline ? `\n• **Deadline:** ${thread.aiReason.decision.deadline}` : ''
        }`;
      } else {
        answer = 'Select a thread first so I can summarize that conversation.';
      }
    } else if (lower.includes('deadline') || lower.includes('conflict') || lower.includes('meeting') || lower.includes('schedule')) {
      const deadlines = await executeChatTool('list_deadlines', {}, toolCtx);
      matchedThreads = deadlines;
      answer = deadlines.length
        ? `**Upcoming Deadlines & Schedule Alerts (${clientLabel}):**\n\n${deadlines
            .map((d) => `• ${d.link} — ${d.deadline ? `Due: ${d.deadline}` : 'Scheduling conflict detected'}`)
            .join('\n')}`
        : `No urgent deadlines or scheduling conflicts found for ${clientLabel}.`;
    } else if (lower.includes('review') || lower.includes('escalat')) {
      const reviewThreads = await executeChatTool('search_threads', { label: 'NEEDS_REVIEW', limit: 6 }, toolCtx);
      matchedThreads = reviewThreads;
      answer = reviewThreads.length
        ? `**${reviewThreads.length} thread${reviewThreads.length === 1 ? '' : 's'} flagged for Needs Review (${clientLabel}):**\n\n${reviewThreads
            .map((t) => `• ${t.link} (${t.sender})`)
            .join('\n')}`
        : `All clear — no threads are currently escalated to Needs Review for ${clientLabel}.`;
    } else if (lower.includes('count') || lower.includes('stat') || lower.includes('overview') || lower.includes('how many')) {
      const counts = await executeChatTool('count_by_label', {}, toolCtx);
      answer = `**Inbox Overview (${clientLabel}):**\n\n• **Client to Reply:** ${counts.CLIENT_TO_REPLY}\n• **Assistant Queue:** ${counts.ASSISTANT_TO_REPLY}\n• **Needs Review:** ${counts.NEEDS_REVIEW}\n• **Waiting on Others:** ${counts.WAITING}\n• **Quiet Folder (No Reply):** ${counts.NO_REPLY_NEEDED}\n• **Total Active Threads:** ${counts.TOTAL}`;
    } else {
      // Smart keyword search across subject, snippet, sender, and AI summary
      const found = await executeChatTool('search_threads', { query, limit: 6 }, toolCtx);
      matchedThreads = found;
      if (found.length) {
        answer = `I found **${found.length} conversation${found.length === 1 ? '' : 's'}** matching "${query}":\n\n${found
          .map((t) => `• ${t.link} (${t.label.replace(/_/g, ' ')})`)
          .join('\n')}`;
      } else {
        answer = `I couldn't find any email threads matching "${query}" for ${clientLabel}. Try asking about what needs the client's attention, upcoming deadlines, waiting threads, or inbox stats.`;
      }
    }

    return res.status(200).json({
      ok: true,
      data: {
        answer,
        toolResult: matchedThreads.length > 0 ? toToolResult(matchedThreads) : null,
        usedAgentRuntime: false,
        ...(byokError ? { byokError } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
}
