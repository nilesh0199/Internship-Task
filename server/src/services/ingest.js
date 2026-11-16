import { store } from './store.js';
import { runClassificationPipeline } from '../ai/pipeline.js';
import { logger } from '../utils/logger.js';

/**
 * Concurrency helper: processes items in chunks of given size
 */
async function processInChunks(items, chunkSize, asyncFn) {
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(chunk.map((item) => asyncFn(item)));
    results.push(...chunkResults);
  }
  return results;
}

/**
 * Shared ingestion service for external email providers (Gmail, Outlook, Demo)
 * Idempotently upserts Threads and Messages, determines direction & waiting states,
 * and passes new or changed conversations through the 7-stage AI triage pipeline.
 *
 * @param {Object} options
 * @param {Object} options.account - The connected account record
 * @param {Array<Object>} options.rawThreads - Normalized thread objects from provider adapter
 * @param {string} options.orgId - Organization scope ID
 * @param {string} options.clientId - Associated client profile ID
 * @returns {Promise<{ syncedAt: Date, threadsCount: number, messagesCount: number, newClassificationsCount: number }>}
 */
export async function ingestProviderThreads({ account, rawThreads = [], orgId, clientId }) {
  const targetOrgId = orgId || account.orgId;
  let targetClientId = clientId || account.clientId;

  // Verify or auto-create Client profile for this org if missing
  let client = await store.getClientByOrgId(targetOrgId);
  if (!client) {
    const emailParts = (account.emailAddress || '').split('@');
    const domain = emailParts[1] ? emailParts[1].split('.')[0] : 'workspace';
    const company = domain.charAt(0).toUpperCase() + domain.slice(1);

    client = await store.createClient({
      _id: 'client_' + Date.now(),
      orgId: targetOrgId,
      name: account.displayName || account.emailAddress.split('@')[0],
      email: account.emailAddress,
      title: 'Executive Client',
      company,
      avatarUrl: null,
      playbook: {
        vipSenders: [],
        vipDomains: [emailParts[1] || 'example.com'],
        topicRules: [
          { topic: 'Financial Approvals & Contracts', disposition: 'ALWAYS_CLIENT', description: 'Expenditures and agreements' },
          { topic: 'Calendar & Scheduling', disposition: 'ASSISTANT_CAN_HANDLE', description: 'Routine scheduling coordination' },
          { topic: 'Cold Marketing Solicitations', disposition: 'NEVER_BOTHER_CLIENT', description: 'Unsolicited sales pitches' },
        ],
        financialThresholds: { maxAssistantApprovalUsd: 1000 },
        customInstructions: '',
        updatedAt: new Date(),
      },
    });
    targetClientId = client._id;
  }

  let totalMessagesCount = 0;
  let newClassificationsCount = 0;
  const processedThreads = [];

  // Process raw threads in parallel with concurrency limit of 3
  await processInChunks(rawThreads, 3, async (rawThread) => {
    try {
      const providerThreadId = rawThread.providerThreadId || rawThread.id;
      const accountId = account._id || account.id || 'demo_account';

      // 1. Look up existing thread in store
      let thread = await store.findThreadByProviderId(providerThreadId, accountId);

      // Sort messages chronologically
      const messages = (rawThread.messages || []).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      totalMessagesCount += messages.length;

      const latestMsg = messages[messages.length - 1] || {};
      const lastMessageAt = latestMsg.date ? new Date(latestMsg.date) : new Date(rawThread.lastMessageAt || Date.now());
      const lastMessageId = latestMsg.providerMessageId || latestMsg.id || 'msg_init';

      // 2. Waiting & Direction calculation:
      // If latest message was sent by the connected user, it is an OUTBOUND message and assistant/client is waiting for a reply
      const accountEmail = (account.emailAddress || '').toLowerCase().trim();
      const senderEmail = (latestMsg.from?.email || '').toLowerCase().trim();
      const isOutbound = latestMsg.direction === 'OUTBOUND' || (accountEmail && senderEmail === accountEmail);

      const lastDirection = isOutbound ? 'OUTBOUND' : 'INBOUND';
      const isWaiting = isOutbound;
      const waitingSince = isOutbound ? lastMessageAt : null;

      // 3. Thread doc data
      const threadData = {
        orgId: targetOrgId,
        clientId: targetClientId,
        connectedAccountId: accountId,
        accountId, // backwards compatibility
        provider: account.provider || 'demo',
        providerThreadId,
        subject: rawThread.subject || '(No Subject)',
        snippet: rawThread.snippet || latestMsg.snippet || '',
        participants: rawThread.participants || [],
        messageCount: messages.length,
        lastMessageAt,
        lastMessageId,
        lastDirection,
        isWaiting,
        waitingSince,
        isArchived: false,
        isRead: rawThread.isRead !== undefined ? rawThread.isRead : true,
      };

      if (!thread) {
        // Default initial label before classification
        threadData.currentLabel = 'ASSISTANT_TO_REPLY';
        threadData.aiLabel = 'ASSISTANT_TO_REPLY';
        thread = await store.createThread(threadData);
      } else {
        thread = await store.updateThread(thread._id, threadData);
      }

      // 4. Upsert Messages
      for (const msg of messages) {
        const providerMessageId = msg.providerMessageId || msg.id;
        const existingMsg = await store.findMessageByProviderId(providerMessageId);

        const msgData = {
          threadId: thread._id,
          providerMessageId,
          from: msg.from || { name: 'Unknown', email: 'unknown@example.com' },
          to: msg.to || [],
          cc: msg.cc || [],
          bcc: msg.bcc || [],
          replyTo: msg.replyTo || null,
          subject: msg.subject || thread.subject,
          date: msg.date ? new Date(msg.date) : new Date(),
          snippet: msg.snippet || '',
          bodyText: (msg.bodyText || '').substring(0, 4000), // Max 4000 chars for AI token budget
          bodyHtml: msg.bodyHtml || '',
          headers: msg.headers || {},
          direction: msg.direction || (isOutbound ? 'OUTBOUND' : 'INBOUND'),
          hasAttachments: !!msg.hasAttachments,
          attachments: msg.attachments || [],
        };

        if (existingMsg) {
          await store.updateMessage(existingMsg._id, msgData);
        } else {
          await store.addMessage(msgData);
        }
      }

      // 5. Run AI Pipeline with cache check
      // Only classify if thread has not been classified for this latestMessageId, or if it has no reason
      const needsClassification =
        !thread.aiReason?.reason ||
        thread.lastMessageId !== lastMessageId ||
        thread.currentLabel === 'NEEDS_REVIEW';

      if (needsClassification) {
        try {
          const storedMessages = await store.getMessagesByThreadId(thread._id);
          const aiResult = await runClassificationPipeline(thread, storedMessages, false);
          newClassificationsCount++;
          thread = aiResult.thread || thread;
        } catch (aiErr) {
          logger.warn(
            { threadId: thread._id, err: aiErr.message },
            '[Ingest] AI classification warning, kept existing label'
          );
        }
      }

      processedThreads.push(thread);
    } catch (threadErr) {
      logger.error(
        { threadId: rawThread.providerThreadId || rawThread.id, err: threadErr.message },
        '[Ingest] Failed to ingest thread'
      );
    }
  });

  return {
    syncedAt: new Date(),
    threadsCount: processedThreads.length,
    messagesCount: totalMessagesCount,
    newClassificationsCount,
  };
}
