import { store } from '../services/store.js';

export const CHAT_TOOLS = [
  {
    name: 'search_threads',
    description: 'Searches email threads by keyword, label, or participant',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords' },
        label: { type: 'string', description: 'ASSISTANT_TO_REPLY, CLIENT_TO_REPLY, etc.' },
        limit: { type: 'number', description: 'Maximum results to return' },
      },
    },
  },
  {
    name: 'get_thread',
    description: 'Fetches complete messages and AI reasoning for a specific thread ID',
    parameters: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Thread identifier (e.g. th_01)' },
      },
      required: ['threadId'],
    },
  },
  {
    name: 'count_by_label',
    description: 'Returns the count of active threads across all segments',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_awaiting_client',
    description: "Returns all high-priority threads currently in the client's decision queue",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_deadlines',
    description: 'Returns threads with explicit deadlines and calendar conflicts',
    parameters: { type: 'object', properties: {} },
  },
];

/**
 * Executes tool functions against the repository
 */
export async function executeChatTool(toolName, args = {}) {
  const threads = await store.getThreads();

  if (toolName === 'search_threads') {
    const q = (args.query || '').toLowerCase();
    let results = threads;
    if (args.label) {
      results = results.filter((t) => t.currentLabel === args.label);
    }
    if (q) {
      results = results.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.snippet.toLowerCase().includes(q) ||
          t.participants?.some((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
      );
    }
    return results.slice(0, args.limit || 5).map((t) => ({
      id: t._id,
      subject: t.subject,
      sender: t.participants?.[0]?.name || t.participants?.[0]?.email,
      label: t.currentLabel,
      link: `[${t.subject}](/assistant?threadId=${t._id})`,
    }));
  }

  if (toolName === 'get_thread') {
    const thread = await store.getThreadById(args.threadId);
    if (!thread) return { error: 'Thread not found' };
    const messages = await store.getMessagesByThreadId(thread._id);
    return {
      id: thread._id,
      subject: thread.subject,
      label: thread.currentLabel,
      reason: thread.aiReason?.reason,
      evidence: thread.aiReason?.evidence,
      summary: thread.aiReason?.summary,
      decision: thread.aiReason?.decision,
      messages: messages.map((m) => ({ from: m.from, date: m.date, snippet: m.snippet })),
    };
  }

  if (toolName === 'count_by_label') {
    const counts = {
      TOTAL: threads.length,
      ASSISTANT_TO_REPLY: threads.filter((t) => t.currentLabel === 'ASSISTANT_TO_REPLY' && !t.isArchived).length,
      CLIENT_TO_REPLY: threads.filter((t) => t.currentLabel === 'CLIENT_TO_REPLY' && !t.isArchived).length,
      NO_REPLY_NEEDED: threads.filter((t) => t.currentLabel === 'NO_REPLY_NEEDED').length,
      NEEDS_REVIEW: threads.filter((t) => t.currentLabel === 'NEEDS_REVIEW' && !t.isArchived).length,
      WAITING: threads.filter((t) => t.isWaiting && !t.isArchived).length,
    };
    return counts;
  }

  if (toolName === 'list_awaiting_client') {
    const pending = threads
      .filter((t) => t.currentLabel === 'CLIENT_TO_REPLY' && !t.isArchived)
      .slice(0, 5)
      .map((t) => ({
        id: t._id,
        subject: t.subject,
        decisionQuestion: t.aiReason?.decision?.question || 'Review required',
        deadline: t.aiReason?.decision?.deadline || 'None stated',
        link: `[${t.subject}](/assistant?threadId=${t._id})`,
      }));
    return pending;
  }

  if (toolName === 'list_deadlines') {
    const withDeadlines = threads
      .filter((t) => t.dueDate || t.aiReason?.decision?.deadline || t.meetings?.some((m) => m.isConflict))
      .map((t) => ({
        id: t._id,
        subject: t.subject,
        deadline: t.aiReason?.decision?.deadline || t.dueDate,
        conflicts: t.meetings?.filter((m) => m.isConflict) || [],
        link: `[${t.subject}](/assistant?threadId=${t._id})`,
      }));
    return withDeadlines;
  }

  return { error: 'Unknown tool: ' + toolName };
}
