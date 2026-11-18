import { store } from '../services/store.js';
import { runAgentsForThread } from '../agents/index.js';
import { logger } from '../utils/logger.js';
import { SCRIPTED_SIMULATED_EVENTS } from '../services/demoLiveFeed.js';

let demoSimulationIndex = 0;

/**
 * POST /api/demo/reset
 * Resets the in-memory database to pristine seed data (60 threads, 2 users, clean audit log)
 */
export async function resetDemoData(req, res, next) {
  try {
    await store.initSeedData();
    logger.info('[DemoController] Demo data reset to pristine seed state');

    return res.status(200).json({
      ok: true,
      message: 'Demo workspace reset to pristine initial state (60 threads, fresh unread counts, reset audit logs).',
      data: {
        threadsCount: 60,
        resetAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/demo/simulate-inbound
 * On-demand simulation of an incoming email thread with live agent collective triage
 */
export async function simulateInboundEmail(req, res, next) {
  try {
    const { scenarioIndex, clientId: targetClientId } = req.body || {};
    const orgId = req.user?.orgId || 'org_vortex_001';

    const index = typeof scenarioIndex === 'number'
      ? scenarioIndex % SCRIPTED_SIMULATED_EVENTS.length
      : demoSimulationIndex % SCRIPTED_SIMULATED_EVENTS.length;
    demoSimulationIndex++;

    const eventTemplate = SCRIPTED_SIMULATED_EVENTS[index];
    const clientId = targetClientId || eventTemplate.clientId || 'client_priya_001';
    const now = new Date();
    const threadId = `th_sim_${Date.now()}`;
    const messageId = `msg_sim_${Date.now()}`;

    const newThread = await store.createThread({
      _id: threadId,
      id: threadId,
      orgId,
      clientId,
      accountId: clientId === 'client_rohan_002' ? 'acc_demo_02' : 'acc_demo_01',
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
      clientId,
      from: eventTemplate.from,
      to: [{ email: clientId === 'client_rohan_002' ? 'rohan@apexlogistics.com' : 'priya@vortexdynamics.com' }],
      subject: eventTemplate.subject,
      snippet: eventTemplate.snippet,
      bodyText: eventTemplate.bodyText,
      direction: 'INBOUND',
      receivedAt: now,
    });

    // Run agents live
    const runs = await runAgentsForThread(newThread, 'new_message');

    logger.info(
      { threadId, subject: eventTemplate.subject, clientId, runsCount: runs.length },
      '[DemoController] Simulated inbound email triaged live by agent collective'
    );

    return res.status(200).json({
      ok: true,
      message: `Simulated inbound email "${eventTemplate.subject}" received and triaged live!`,
      data: {
        thread: newThread,
        runsCount: runs.length,
        runs,
      },
    });
  } catch (err) {
    next(err);
  }
}
