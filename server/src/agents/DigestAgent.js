import { BaseAgent } from './BaseAgent.js';
import { store } from '../services/store.js';

// In-memory daily digest cache: hash(clientId + YYYY-MM-DD) -> digest
const digestCache = new Map();

export class DigestAgent extends BaseAgent {
  constructor() {
    super({
      id: 'digest',
      name: 'Digest Agent',
      description: 'Synthesizes daily morning briefings and executive operational summaries from live inbox metrics.',
      canDo: [
        'Calculates real-time inbox funnel metrics (handled, awaiting client, waiting on others)',
        'Generates Priya Sharma’s concise Morning Brief with prioritized decisions',
        'Produces Maya Lin’s Daybook briefing of overnight agent actions and meetings',
        'Surfaces calendar conflicts and high-priority deadlines',
        'Caches daily digests to prevent unnecessary recalculation',
      ],
      neverDoes: [
        'Never displays inaccurate or synthetic metrics when real data is available',
        'Never leaks confidential quiet folder contents into client morning briefings',
      ],
      triggers: ['schedule_tick', 'client_action', 'manual'],
      defaultAutonomy: 'auto',
      kind: 'workflow',
    });
  }

  getCacheKey(clientId) {
    const today = new Date().toISOString().slice(0, 10);
    return `${clientId || 'default'}_${today}`;
  }

  async run(thread, ctx) {
    const startTime = Date.now();
    const clientId = ctx.client?._id || thread?.clientId || 'client_priya_001';
    const orgId = ctx.client?.orgId || thread?.orgId || 'org_vortex_001';
    const cacheKey = this.getCacheKey(clientId);

    if (ctx.trigger !== 'manual' && digestCache.has(cacheKey)) {
      const cached = digestCache.get(cacheKey);
      return this.formatResult({
        action: 'generate_morning_brief',
        outcome: 'auto_handled',
        summary: `Served cached daily briefing for ${ctx.client?.name || 'Priya Sharma'}.`,
        details: cached,
        durationMs: Date.now() - startTime,
      });
    }

    // 1. Query real live counts across threads for this client
    const threads = await store.getThreads({ orgId, clientId });
    const stats = await store.getAgentStats(orgId, 24);

    let clientDecisionsCount = 0;
    let assistantTasksCount = 0;
    let waitingCount = 0;
    let meetingsCount = 0;
    let conflictsCount = 0;
    let quietFolderCount = 0;

    for (const t of threads) {
      if (t.currentLabel === 'CLIENT_TO_REPLY' && t.clientStatus !== 'handled') {
        clientDecisionsCount++;
      }
      if (t.currentLabel === 'ASSISTANT_TO_REPLY') {
        assistantTasksCount++;
      }
      if (t.isWaiting) {
        waitingCount++;
      }
      if (t.currentLabel === 'NO_REPLY_NEEDED' || t.isArchived) {
        quietFolderCount++;
      }
      if (t.meetings?.length > 0) {
        meetingsCount += t.meetings.length;
        if (t.meetings.some((m) => m.isConflict)) {
          conflictsCount++;
        }
      }
    }

    // 2. Synthesize editorial morning brief text
    const clientName = ctx.client?.name || 'Priya';
    let briefHeadline = `Good morning, ${clientName.split(' ')[0]}.`;
    let briefBody = '';

    if (clientDecisionsCount === 0) {
      briefBody = `Your inbox is serene today. Daybook agents handled ${stats.autoHandled} routine items, leaving 0 decisions requiring your input.`;
    } else if (clientDecisionsCount === 1) {
      briefBody = `You have 1 pending decision requiring your authorization today. Daybook agents handled ${stats.autoHandled} routine threads and prepared a pre-drafted response.`;
    } else {
      briefBody = `You have ${clientDecisionsCount} decisions in your queue this morning. Daybook agents handled ${stats.autoHandled} routine threads, leaving only high-priority items.`;
    }

    if (conflictsCount > 0) {
      briefBody += ` Note: ${conflictsCount} calendar conflict was detected and alternate proposals were drafted.`;
    }

    const digestData = {
      clientName,
      headline: briefHeadline,
      body: briefBody,
      counts: {
        totalThreads: threads.length,
        clientDecisionsCount,
        assistantTasksCount,
        waitingCount,
        meetingsCount,
        conflictsCount,
        quietFolderCount,
        agentHandledCount: stats.autoHandled,
        agentProposedCount: stats.proposed,
      },
      hoursSavedEstimate: stats.hoursSavedEstimateHours,
      generatedAt: new Date(),
    };

    digestCache.set(cacheKey, digestData);

    return this.formatResult({
      action: 'generate_morning_brief',
      outcome: 'auto_handled',
      summary: `Generated Daily Morning Briefing: ${clientDecisionsCount} decisions pending, ${stats.autoHandled} handled by agents.`,
      details: digestData,
      confidence: 0.99,
      durationMs: Date.now() - startTime,
    });
  }

  /**
   * Helper to fetch active digest data directly
   */
  async getLatestDigest(clientId, orgId) {
    const cacheKey = this.getCacheKey(clientId);
    if (digestCache.has(cacheKey)) {
      return digestCache.get(cacheKey);
    }
    const result = await this.run(null, { client: { _id: clientId, orgId }, trigger: 'manual' });
    return result.details;
  }
}
