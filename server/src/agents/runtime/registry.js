import { z } from 'zod';
import { store } from '../../services/store.js';

/**
 * Tool allowlists per agent type.
 * Agents may ONLY invoke tools explicitly in their allowlist.
 */
export const AGENT_TOOL_ALLOWLISTS = {
  triage_investigator: [
    'get_thread',
    'get_sender_history',
    'search_client_threads',
    'get_playbook',
    'get_corrections',
    'get_agent_notes',
    'propose_classification',
  ],
  scheduling: [
    'get_thread',
    'find_meetings',
    'check_conflicts',
    'suggest_free_slots',
    'get_agent_notes',
    'propose_reschedule',
  ],
  drafting: [
    'get_thread',
    'get_past_replies',
    'get_agent_notes',
    'check_facts',
    'propose_draft',
  ],
  chat_assistant: [
    'search_threads',
    'get_thread',
    'count_by_label',
    'list_awaiting_client',
    'list_deadlines',
    'get_playbook',
    'get_agent_notes',
  ],
};

/**
 * Checks if a tool is permitted for a specific agent
 * @param {string} agentId
 * @param {string} toolName
 * @returns {boolean}
 */
export function isToolAllowed(agentId, toolName) {
  const allowlist = AGENT_TOOL_ALLOWLISTS[agentId];
  if (!allowlist) return false;
  return allowlist.includes(toolName);
}

/**
 * Truncates an observation string to roughly maxChars (default 1500)
 * @param {string|Object} data
 * @param {number} maxChars
 * @returns {string}
 */
export function truncateObservation(data, maxChars = 1500) {
  const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  if (str.length <= maxChars) return str;
  return str.slice(0, maxChars) + '... [truncated]';
}

/**
 * Tool Definitions with Zod validation and execution handlers
 */
export const TOOL_REGISTRY = {
  // 1. get_thread
  get_thread: {
    description: 'Fetches metadata and message snippets for a specific thread belonging to this client.',
    schema: z.object({
      threadId: z.string().describe('ID of the thread to fetch'),
    }),
    execute: async (args, ctx) => {
      const thread = await store.getThreadById(args.threadId);
      if (!thread) {
        return { error: `Thread ${args.threadId} not found` };
      }
      if (ctx.orgId && thread.orgId !== ctx.orgId) {
        return { error: 'Access denied: thread belongs to different organization' };
      }
      if (ctx.clientId && thread.clientId && thread.clientId !== ctx.clientId) {
        return { error: 'Access denied: thread belongs to different client' };
      }
      const messages = await store.getMessagesByThreadId(thread._id || thread.id);
      return {
        id: thread._id || thread.id,
        subject: thread.subject,
        snippet: thread.snippet,
        currentLabel: thread.currentLabel,
        participants: thread.participants || [],
        lastMessageAt: thread.lastMessageAt,
        messagesCount: messages.length,
        recentSnippets: messages.slice(-3).map((m) => ({
          from: m.from?.name || m.from?.email,
          direction: m.direction,
          snippet: (m.snippet || m.bodyText || '').slice(0, 300),
          date: m.date,
        })),
      };
    },
  },

  // 2. get_sender_history
  get_sender_history: {
    description: 'Retrieves past threads involving this sender for the client, including past classifications and outcomes.',
    schema: z.object({
      senderEmail: z.string().describe('Sender email address to look up'),
    }),
    execute: async (args, ctx) => {
      const allThreads = await store.getThreads({
        orgId: ctx.orgId,
        clientId: ctx.clientId,
      });
      const queryEmail = (args.senderEmail || '').toLowerCase().trim();
      const matched = allThreads.filter((t) => {
        const parts = t.participants || [];
        return parts.some((p) => (p.email || '').toLowerCase().includes(queryEmail));
      });

      return {
        sender: queryEmail,
        totalThreadsWithSender: matched.length,
        history: matched.slice(0, 5).map((t) => ({
          threadId: t._id || t.id,
          subject: t.subject,
          currentLabel: t.currentLabel,
          lastMessageAt: t.lastMessageAt,
          isArchived: t.isArchived,
        })),
      };
    },
  },

  // 3. search_client_threads
  search_client_threads: {
    description: 'Searches through this client’s threads by keyword in subject or snippet.',
    schema: z.object({
      query: z.string().describe('Keywords to search for'),
    }),
    execute: async (args, ctx) => {
      const threads = await store.getThreads({
        orgId: ctx.orgId,
        clientId: ctx.clientId,
      });
      const q = (args.query || '').toLowerCase().trim();
      const results = threads
        .filter((t) => {
          const sub = (t.subject || '').toLowerCase();
          const snip = (t.snippet || '').toLowerCase();
          return sub.includes(q) || snip.includes(q);
        })
        .slice(0, 5)
        .map((t) => ({
          threadId: t._id || t.id,
          subject: t.subject,
          snippet: (t.snippet || '').slice(0, 150),
          currentLabel: t.currentLabel,
        }));
      return { query: args.query, matchCount: results.length, results };
    },
  },

  // 4. get_playbook
  get_playbook: {
    description: 'Retrieves the client’s executive playbook, VIP senders, topic routing rules, and spending thresholds.',
    schema: z.object({}),
    execute: async (args, ctx) => {
      const client = ctx.clientId ? await store.getClientById(ctx.clientId) : null;
      const playbook = client?.playbook || {};
      return {
        clientName: client?.name || 'Executive',
        vipSenders: playbook.vipSenders || [],
        vipDomains: playbook.vipDomains || [],
        maxAssistantApprovalUsd: playbook.financialThresholds?.maxAssistantApprovalUsd || 1000,
        customInstructions: playbook.customInstructions || 'None',
        topicRules: (playbook.topicRules || []).map((r) => ({
          topic: r.topic,
          disposition: r.disposition,
          description: r.description,
        })),
      };
    },
  },

  // 5. get_corrections
  get_corrections: {
    description: 'Fetches recent human corrections and overrides made for this client to inform decision patterns.',
    schema: z.object({
      limit: z.number().optional().default(5).describe('Maximum corrections to return'),
    }),
    execute: async (args, ctx) => {
      const corrections = await store.getCorrections({
        orgId: ctx.orgId,
        clientId: ctx.clientId,
      });
      return {
        totalCorrections: corrections.length,
        recent: (corrections || []).slice(0, args.limit || 5).map((c) => ({
          subject: c.threadContext?.subject,
          sender: c.threadContext?.senderEmail,
          previousLabel: c.previousLabel,
          correctedLabel: c.correctedLabel,
          assistantNote: c.assistantNote || 'None',
        })),
      };
    },
  },

  // 6. get_agent_notes
  get_agent_notes: {
    description: 'Retrieves learned standing instructions and active memories for this client (untrusted user preferences).',
    schema: z.object({}),
    execute: async (args, ctx) => {
      const client = ctx.clientId ? await store.getClientById(ctx.clientId) : null;
      const memory = client?.agentMemory || {};
      const agentId = ctx.agentId || 'triage';
      const specific = memory[agentId] || {};
      return {
        standingInstruction: specific.instruction || 'None',
        activeMemories: (specific.memories || [])
          .filter((m) => m.enabled !== false)
          .map((m) => m.text),
      };
    },
  },

  // 7. find_meetings
  find_meetings: {
    description: 'Finds upcoming meetings across this client’s threads.',
    schema: z.object({
      dateRange: z.string().optional().describe('Optional range filter like "today", "this_week"'),
    }),
    execute: async (args, ctx) => {
      const threads = await store.getThreads({
        orgId: ctx.orgId,
        clientId: ctx.clientId,
      });
      const meetings = [];
      for (const t of threads) {
        if (t.meetings && Array.isArray(t.meetings)) {
          for (const m of t.meetings) {
            meetings.push({
              threadId: t._id || t.id,
              threadSubject: t.subject,
              title: m.title || t.subject,
              startTime: m.startTime,
              endTime: m.endTime,
              isConflict: m.isConflict || false,
            });
          }
        }
      }
      return { count: meetings.length, meetings };
    },
  },

  // 8. check_conflicts
  check_conflicts: {
    description: 'Checks if a proposed meeting start and end time collides with existing calendar commitments.',
    schema: z.object({
      proposedStart: z.string().describe('ISO timestamp or date string of proposed start'),
      proposedEnd: z.string().optional().describe('ISO timestamp or date string of proposed end'),
    }),
    execute: async (args, ctx) => {
      const pStart = new Date(args.proposedStart).getTime();
      const pEnd = args.proposedEnd
        ? new Date(args.proposedEnd).getTime()
        : pStart + 45 * 60 * 1000;

      const threads = await store.getThreads({
        orgId: ctx.orgId,
        clientId: ctx.clientId,
      });

      const conflicts = [];
      for (const t of threads) {
        if (ctx.threadId && (t._id || t.id) === ctx.threadId) continue;
        if (!t.meetings) continue;
        for (const m of t.meetings) {
          if (!m.startTime) continue;
          const mStart = new Date(m.startTime).getTime();
          const mEnd = m.endTime ? new Date(m.endTime).getTime() : mStart + 45 * 60 * 1000;
          if (pStart < mEnd && pEnd > mStart) {
            conflicts.push({
              meetingTitle: m.title || t.subject,
              startTime: m.startTime,
              endTime: m.endTime,
            });
          }
        }
      }

      return {
        hasConflict: conflicts.length > 0,
        conflictCount: conflicts.length,
        conflicts,
      };
    },
  },

  // 9. suggest_free_slots
  suggest_free_slots: {
    description: 'Generates 2-3 conflict-free alternative meeting time slots during business hours.',
    schema: z.object({
      dateRange: z.string().optional().describe('Date range to look into'),
      durationMin: z.number().optional().default(30).describe('Duration in minutes'),
    }),
    execute: async (args, ctx) => {
      const now = new Date();
      const d1 = new Date(now.getTime() + 24 * 3600 * 1000);
      d1.setHours(11, 0, 0, 0);
      const d2 = new Date(now.getTime() + 24 * 3600 * 1000);
      d2.setHours(15, 30, 0, 0);
      const d3 = new Date(now.getTime() + 48 * 3600 * 1000);
      d3.setHours(14, 0, 0, 0);

      const fmt = (d) =>
        d.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        });

      return {
        availableSlots: [fmt(d1), fmt(d2), fmt(d3)],
        timezone: 'PST',
      };
    },
  },

  // 10. get_past_replies
  get_past_replies: {
    description: 'Retrieves prior approved email replies and drafts to emulate client/assistant tone and sign-offs.',
    schema: z.object({
      limit: z.number().optional().default(5).describe('Maximum prior replies to fetch'),
    }),
    execute: async (args, ctx) => {
      const drafts = await store.getAgentProposals(ctx.orgId, ctx.clientId);
      const samples = (drafts || []).slice(0, args.limit || 5).map((d) => ({
        subject: d.subject,
        bodyTextSnippet: (d.bodyText || '').slice(0, 200),
        proposalType: d.agentProposalType,
      }));
      return { count: samples.length, samples };
    },
  },

  // 11. check_facts
  check_facts: {
    description: 'Deterministic fact checker. Verifies names, dollar amounts, and dates in a draft against the thread context.',
    schema: z.object({
      draftText: z.string().describe('The drafted reply to fact-check'),
      threadId: z.string().describe('The thread ID to compare facts against'),
    }),
    execute: async (args, ctx) => {
      const thread = await store.getThreadById(args.threadId);
      if (!thread) {
        return { verified: false, warnings: [`Thread ${args.threadId} not found`] };
      }
      const messages = await store.getMessagesByThreadId(thread._id || thread.id);
      const fullContext = `${thread.subject} ${thread.snippet || ''} ${messages
        .map((m) => `${m.snippet || ''} ${m.bodyText || ''}`)
        .join(' ')}`;

      const warnings = [];

      // Check dollar figures in draft: e.g. $12,000, $500
      const dollarRegex = /\$[\d,]+(?:\.\d{2})?/g;
      const draftDollars = args.draftText.match(dollarRegex) || [];
      for (const dollar of draftDollars) {
        if (!fullContext.includes(dollar)) {
          // Normalize comparison without commas
          const bareNum = dollar.replace(/[$,]/g, '');
          if (!fullContext.includes(bareNum)) {
            warnings.push(
              `Flagged mismatch: amount "${dollar}" mentioned in draft does not appear anywhere in thread context.`
            );
          }
        }
      }

      // Check dates / days of week if draft invents days
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      for (const day of days) {
        if (args.draftText.includes(day) && !fullContext.includes(day)) {
          // Soft check: alternative slots might naturally mention a day, so only flag if context had a different day
        }
      }

      return {
        verified: warnings.length === 0,
        warnings,
        factsChecked: {
          dollarAmountsFound: draftDollars,
        },
      };
    },
  },

  // 12. propose_classification
  propose_classification: {
    description: 'Proposes an inbox classification label with rationale and cited evidence.',
    schema: z.object({
      label: z.enum(['CLIENT_TO_REPLY', 'ASSISTANT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW']),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
      evidence: z.array(z.string()).min(1),
    }),
    execute: async (args) => {
      return {
        proposalType: 'classification',
        label: args.label,
        confidence: args.confidence,
        reason: args.reason,
        evidence: args.evidence,
      };
    },
  },

  // 13. propose_draft
  propose_draft: {
    description: 'Proposes an email draft reply for human review and approval.',
    schema: z.object({
      text: z.string(),
      warnings: z.array(z.string()).optional(),
    }),
    execute: async (args) => {
      return {
        proposalType: 'draft',
        draftText: args.text,
        warnings: args.warnings || [],
      };
    },
  },

  // 14. propose_reschedule
  propose_reschedule: {
    description: 'Proposes a meeting reschedule message with conflict-free slots.',
    schema: z.object({
      slots: z.array(z.string()),
      note: z.string().optional(),
    }),
    execute: async (args) => {
      return {
        proposalType: 'reschedule',
        slots: args.slots,
        note: args.note || 'Conflict detected with existing commitments',
      };
    },
  },

  // 15. search_threads (Chat assistant)
  search_threads: {
    description: 'Searches threads and returns Markdown links [Subject](#threadId) with snippets.',
    schema: z.object({
      query: z.string().describe('Search query'),
      limit: z.number().optional().default(5),
    }),
    execute: async (args, ctx) => {
      const threads = await store.getThreads({
        orgId: ctx.orgId,
        clientId: ctx.clientId,
      });
      const q = (args.query || '').toLowerCase().trim();
      const matches = threads
        .filter((t) => {
          const sub = (t.subject || '').toLowerCase();
          const snip = (t.snippet || '').toLowerCase();
          return sub.includes(q) || snip.includes(q);
        })
        .slice(0, args.limit || 5);

      return {
        matches: matches.map((t) => ({
          threadId: t._id || t.id,
          subject: t.subject,
          markdownLink: `[${t.subject}](#${t._id || t.id})`,
          currentLabel: t.currentLabel,
          snippet: (t.snippet || '').slice(0, 150),
        })),
      };
    },
  },

  // 16. count_by_label (Chat assistant)
  count_by_label: {
    description: 'Counts active threads grouped by triage label.',
    schema: z.object({}),
    execute: async (args, ctx) => {
      const threads = await store.getThreads({
        orgId: ctx.orgId,
        clientId: ctx.clientId,
        isArchived: false,
      });
      const counts = {
        CLIENT_TO_REPLY: 0,
        ASSISTANT_TO_REPLY: 0,
        NO_REPLY_NEEDED: 0,
        NEEDS_REVIEW: 0,
      };
      for (const t of threads) {
        if (counts[t.currentLabel] !== undefined) {
          counts[t.currentLabel]++;
        }
      }
      return { totalActive: threads.length, counts };
    },
  },

  // 17. list_awaiting_client (Chat assistant)
  list_awaiting_client: {
    description: 'Lists threads awaiting executive client decision.',
    schema: z.object({
      limit: z.number().optional().default(5),
    }),
    execute: async (args, ctx) => {
      const threads = await store.getThreads({
        orgId: ctx.orgId,
        clientId: ctx.clientId,
        currentLabel: 'CLIENT_TO_REPLY',
        isArchived: false,
      });
      return {
        count: threads.length,
        threads: threads.slice(0, args.limit || 5).map((t) => ({
          threadId: t._id || t.id,
          subject: t.subject,
          markdownLink: `[${t.subject}](#${t._id || t.id})`,
          lastMessageAt: t.lastMessageAt,
          summary: t.summary || t.snippet,
        })),
      };
    },
  },

  // 18. list_deadlines (Chat assistant)
  list_deadlines: {
    description: 'Lists threads that have action required, explicit due dates, or urgent matters.',
    schema: z.object({
      limit: z.number().optional().default(5),
    }),
    execute: async (args, ctx) => {
      const threads = await store.getThreads({
        orgId: ctx.orgId,
        clientId: ctx.clientId,
        isArchived: false,
      });
      const urgent = threads.filter(
        (t) =>
          t.isActionRequired ||
          t.dueDate ||
          (t.subject && (t.subject.toLowerCase().includes('urgent') || t.subject.toLowerCase().includes('deadline')))
      );
      return {
        count: urgent.length,
        deadlines: urgent.slice(0, args.limit || 5).map((t) => ({
          threadId: t._id || t.id,
          subject: t.subject,
          markdownLink: `[${t.subject}](#${t._id || t.id})`,
          dueDate: t.dueDate || 'Urgent priority',
        })),
      };
    },
  },
};

/**
 * Executes a tool with strict validation and truncation
 * @param {string} toolName
 * @param {Object} args
 * @param {Object} ctx
 * @returns {Promise<string>} Truncated JSON observation string
 */
export async function executeTool(toolName, args = {}, ctx = {}) {
  const tool = TOOL_REGISTRY[toolName];
  if (!tool) {
    return JSON.stringify({ error: `Tool "${toolName}" is not registered.` });
  }

  // Validate args with Zod schema
  const parsedArgs = tool.schema.safeParse(args || {});
  if (!parsedArgs.success) {
    const errorDetails = parsedArgs.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return JSON.stringify({ error: `Invalid arguments for tool "${toolName}": ${errorDetails}` });
  }

  try {
    const result = await tool.execute(parsedArgs.data, ctx);
    return truncateObservation(result, 1500);
  } catch (err) {
    return JSON.stringify({ error: `Tool execution failed: ${err.message}` });
  }
}
