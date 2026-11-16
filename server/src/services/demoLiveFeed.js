import { store } from './store.js';
import { runAgentsForThread } from '../agents/orchestrator.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let liveFeedInterval = null;
let injectionCount = 0;
const MAX_DEMO_INJECTIONS = 12;

const SCRIPTED_SIMULATED_EVENTS = [
  {
    clientId: 'client_rohan_002',
    subject: 'Carrier Rate Revision — Q4 Intermodal Lanes',
    from: { name: 'Great Lakes Freight Exchange', email: 'rates@glfreight.com' },
    snippet: 'Updated fuel surcharge indices and revised line-haul tariffs for November shipments...',
    bodyText: 'Hi Rohan,\n\nAttached is the revised intermodal fuel surcharge rate table for Q4. Per our master agreement, these rates adjust with diesel futures.\n\nBest,\nGreat Lakes Freight Dispatch',
    category: 'vendor',
    targetLabel: 'ASSISTANT_TO_REPLY',
  },
  {
    clientId: 'client_priya_001',
    subject: 'Substack: Silicon Valley Tech Governance Brief',
    from: { name: 'Tech Governance Weekly', email: 'dispatch@techgovernance.substack.com' },
    snippet: 'Issue #184: How AI automation is transforming founder workflows and operational guardrails...',
    bodyText: 'This week in Tech Governance:\n- The evolution of autonomous agents in executive operations\n- Zero-send human-in-the-loop policies\n- Industry benchmarks for executive time reclamation',
    category: 'newsletter',
    targetLabel: 'NO_REPLY_NEEDED',
  },
  {
    clientId: 'client_rohan_002',
    subject: 'Apex Dispatch: Reefer Unit Maintenance Log',
    from: { name: 'Fleet Maintenance Bot', email: 'alerts@apexlogistics.internal' },
    snippet: 'Automated telematics report: 4 trailers serviced at Chicago terminal. All systems nominal.',
    bodyText: 'Automated Telematics Notice\nTrailer Units #1044, #1048, #1052 inspected and cleared for service.\nNo action required.',
    category: 'automated',
    targetLabel: 'NO_REPLY_NEEDED',
  },
  {
    clientId: 'client_priya_001',
    subject: 'Quarterly Audit Committee Prep',
    from: { name: 'Elena Rostova', email: 'elena@vanceholdings.com' },
    snippet: 'Priya, do you have 15 minutes before Thursday to review the revised governance charter?',
    bodyText: 'Hi Priya,\n\nFollowing up on our board discussion last week. Could you take a quick look at the revised governance charter before Thursday\'s committee call?\n\nWarm regards,\nElena',
    category: 'board',
    targetLabel: 'CLIENT_TO_REPLY',
  },
];

/**
 * Periodically injects realistic simulated inbound emails during demo mode
 * to visibly exhibit real-time agent autonomous processing.
 */
export function startDemoLiveFeed() {
  const isEnabled = env.DEMO_LIVE_FEED !== 'false' && env.NODE_ENV !== 'test';
  if (!isEnabled) {
    return;
  }
  if (liveFeedInterval) return;

  logger.info('[LiveFeed] Starting demo live message injection feed (every 75s)');

  liveFeedInterval = setInterval(async () => {
    if (injectionCount >= MAX_DEMO_INJECTIONS) {
      clearInterval(liveFeedInterval);
      liveFeedInterval = null;
      return;
    }

    const eventTemplate = SCRIPTED_SIMULATED_EVENTS[injectionCount % SCRIPTED_SIMULATED_EVENTS.length];
    injectionCount++;

    try {
      const orgId = 'org_vortex_001';
      const threadId = `th_sim_${Date.now()}_${injectionCount}`;
      const messageId = `msg_sim_${Date.now()}`;
      const now = new Date();

      const newThread = await store.createThread({
        _id: threadId,
        id: threadId,
        orgId,
        clientId: eventTemplate.clientId,
        accountId: eventTemplate.clientId === 'client_rohan_002' ? 'acc_demo_02' : 'acc_demo_01',
        subject: eventTemplate.subject,
        snippet: eventTemplate.snippet,
        participants: [eventTemplate.from],
        lastMessageAt: now,
        lastMessageId: messageId,
        lastDirection: 'INBOUND',
        currentLabel: eventTemplate.targetLabel,
        isArchived: eventTemplate.targetLabel === 'NO_REPLY_NEEDED',
        isActionRequired: eventTemplate.targetLabel !== 'NO_REPLY_NEEDED',
        clientVisible: eventTemplate.targetLabel === 'CLIENT_TO_REPLY',
        simulated: true,
      });

      await store.addMessage({
        _id: messageId,
        id: messageId,
        threadId,
        orgId,
        clientId: eventTemplate.clientId,
        from: eventTemplate.from,
        to: [{ email: eventTemplate.clientId === 'client_rohan_002' ? 'rohan@apexlogistics.com' : 'priya@vortexdynamics.com' }],
        subject: eventTemplate.subject,
        snippet: eventTemplate.snippet,
        bodyText: eventTemplate.bodyText,
        direction: 'INBOUND',
        receivedAt: now,
      });

      logger.info(
        { threadId, subject: eventTemplate.subject, clientId: eventTemplate.clientId },
        '[LiveFeed] Scripted message injected, executing agent collective'
      );

      // Autonomously run the agent pipeline
      await runAgentsForThread(newThread, 'new_message');
    } catch (err) {
      logger.warn({ err: err.message }, '[LiveFeed] Demo message injection error');
    }
  }, 75 * 1000);
}

export function stopDemoLiveFeed() {
  if (liveFeedInterval) {
    clearInterval(liveFeedInterval);
    liveFeedInterval = null;
  }
}
