import { EmailProviderAdapter } from '../EmailProviderAdapter.js';
import { store } from '../../services/store.js';
import { logger } from '../../utils/logger.js';

export class DemoProvider extends EmailProviderAdapter {
  constructor(account = null) {
    super(account);
  }

  async connect(credentials = {}) {
    return true;
  }

  async sync({ since = null, limit = 30 } = {}) {
    const threads = await store.getThreads();
    logger.info({ count: threads.length }, '[DemoProvider] Sync complete');
    return {
      threads: threads.slice(0, limit),
      messagesCount: threads.reduce((acc, t) => acc + (t.messageCount || 1), 0),
    };
  }

  async getThread(providerThreadId) {
    const thread = await store.getThreadById(providerThreadId);
    if (!thread) {
      throw new Error(`Demo thread not found: ${providerThreadId}`);
    }
    const messages = await store.getMessagesByThreadId(thread._id);
    return { thread, messages };
  }

  async sendReply(draft) {
    // Record simulated reply
    await store.addActivityLog({
      orgId: draft.orgId || 'org_vortex_001',
      actorRole: 'assistant',
      action: 'EMAIL_SENT_SIMULATED',
      threadId: draft.threadId,
      details: {
        to: draft.to,
        subject: draft.subject,
        simulated: true,
      },
    });

    // Update draft status
    await store.saveDraft({
      ...draft,
      status: 'sent',
      sentAt: new Date(),
      isSimulatedSend: true,
    });

    return {
      success: true,
      messageId: 'sim_msg_' + Date.now(),
      isSimulated: true,
    };
  }

  async disconnect() {
    return true;
  }

  /**
   * Injects a dynamic scripted follow-up message into a seed thread for live demo reclassification
   * @param {Object} params
   * @param {string} [params.threadId='th_38']
   * @returns {Promise<{ thread: Object, injectedMessage: Object, previousLabel: string, newLabel: string }>}
   */
  async simulateMessage({ threadId = 'th_38' } = {}) {
    const thread = await store.getThreadById(threadId);
    if (!thread) {
      throw new Error(`Target thread for simulation not found: ${threadId}`);
    }

    if (!thread.followUpScenario) {
      throw new Error(`Thread ${threadId} does not have a configured demo follow-up scenario`);
    }

    const scenario = thread.followUpScenario;
    const previousLabel = thread.currentLabel;
    const newLabel = scenario.newLabel;
    const injectedMsg = scenario.injectedMessage;

    // 1. Store the new inbound message
    await store.addMessage({
      ...injectedMsg,
      threadId: thread._id,
      date: new Date(),
      createdAt: new Date(),
    });

    // 2. Mutate thread classification state
    const updates = {
      currentLabel: newLabel,
      aiLabel: newLabel,
      lastMessageAt: new Date(),
      lastMessageId: injectedMsg.id,
      lastDirection: 'INBOUND',
      snippet: injectedMsg.snippet,
      messageCount: (thread.messageCount || 1) + 1,
      isRead: false,
      aiReason: {
        ...thread.aiReason,
        reason: scenario.newReason,
        decision: scenario.decision || thread.aiReason?.decision || null,
      },
    };

    if (scenario.decision) {
      updates.clientVisible = true;
      updates.clientStatus = 'pending';
    }

    if (scenario.meetings) {
      updates.meetings = scenario.meetings;
    }

    const updatedThread = await store.updateThread(thread._id, updates);

    // 3. Emit ClassificationEvent timeline entry
    await store.addClassificationEvent({
      threadId: thread._id,
      previousLabel,
      newLabel,
      triggerType: 'DEMO_INJECTION',
      triggerMessageId: injectedMsg.id,
      actorName: 'Daybook Demo Live Injector',
      reason: scenario.newReason,
    });

    // 4. Log to immutable ActivityLog
    await store.addActivityLog({
      orgId: thread.orgId,
      actorRole: 'system',
      action: 'DEMO_MESSAGE_INJECTED',
      threadId: thread._id,
      details: {
        scenarioTrigger: scenario.triggerLabel,
        previousLabel,
        newLabel,
        inboundSnippet: injectedMsg.snippet,
      },
    });

    logger.info(
      { threadId: thread._id, previousLabel, newLabel },
      '[DemoProvider] Simulated message injected and thread reclassified'
    );

    return {
      thread: updatedThread,
      injectedMessage: injectedMsg,
      previousLabel,
      newLabel,
      reason: scenario.newReason,
    };
  }
}
