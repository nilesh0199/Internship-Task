import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { isRealDBConnected } from '../config/db.js';
import {
  User,
  Client,
  ConnectedAccount,
  Thread,
  Message,
  Classification,
  ClassificationEvent,
  Correction,
  Draft,
  ActivityLog,
  Invite,
} from '../models/index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-Memory store tables for resilient execution without external MongoDB
let memoryUsers = [];
let memoryClients = [];
let memoryConnectedAccounts = [];
let memoryThreads = [];
let memoryMessages = [];
let memoryClassifications = [];
let memoryClassificationEvents = [];
let memoryCorrections = [];
let memoryDrafts = [];
let memoryActivityLogs = [];
let memoryInvites = [];

/**
 * Initializes in-memory seed dataset for demo/offline execution
 */
export async function initSeedData() {
  try {
    const seedPath = path.resolve(__dirname, '../seed/threads.json');
    if (!fs.existsSync(seedPath)) {
      logger.warn('[Store] Seed file not found at: ' + seedPath);
      return;
    }

    const raw = fs.readFileSync(seedPath, 'utf8');
    const threadsData = JSON.parse(raw);

    const passwordHash = await bcrypt.hash('password123', 10);

    // Initial demo users
    memoryUsers = [
      {
        _id: 'user_maya',
        email: 'maya@vortexdynamics.com',
        passwordHash,
        name: 'Maya Lin',
        role: 'assistant',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        preferences: { notificationsEnabled: true, theme: 'editorial', keyboardShortcutsEnabled: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: 'user_priya',
        email: 'priya@vortexdynamics.com',
        passwordHash,
        name: 'Priya Sharma',
        role: 'client',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        preferences: { notificationsEnabled: true, theme: 'editorial', keyboardShortcutsEnabled: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Initial client profile & playbook
    memoryClients = [
      {
        _id: 'client_priya_001',
        orgId: 'org_vortex_001',
        name: 'Priya Sharma',
        email: 'priya@vortexdynamics.com',
        title: 'Founder & CEO',
        company: 'Vortex Dynamics',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        playbook: {
          vipSenders: ['mark.suster@upfront.com', 'anjali.sharma@gmail.com', 's.jenkins@fenwick.com'],
          vipDomains: ['upfront.com', 'fenwick.com', 'vortexdynamics.com'],
          topicRules: [
            {
              topic: 'Term Sheets & Equity Financing',
              disposition: 'ALWAYS_CLIENT',
              description: 'All venture capital negotiations and signatures',
            },
            {
              topic: 'Executive Hiring Offers',
              disposition: 'ALWAYS_CLIENT',
              description: 'Offers with salary > $200k or equity > 0.5%',
            },
            {
              topic: 'Meeting Scheduling & Travel',
              disposition: 'ASSISTANT_CAN_HANDLE',
              description: 'Coordination, flights, calendar rescheduling',
            },
            {
              topic: 'Cold Sales Pitches',
              disposition: 'NEVER_BOTHER_CLIENT',
              description: 'Unsolicited marketing solicitations',
            },
          ],
          financialThresholds: { maxAssistantApprovalUsd: 1000 },
          customInstructions: 'If an email is from my sister Anjali Sharma, always route to Client to Reply.',
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Initial connected accounts
    memoryConnectedAccounts = [
      {
        _id: 'acc_demo_01',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        provider: 'demo',
        emailAddress: 'priya@vortexdynamics.com',
        status: 'idle',
        lastSyncedAt: new Date(),
        scopes: ['mail.read', 'mail.send'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Hydrate threads and messages
    memoryThreads = [];
    memoryMessages = [];
    memoryClassificationEvents = [];

    for (const t of threadsData) {
      const threadDoc = {
        _id: t.id,
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        connectedAccountId: 'acc_demo_01',
        provider: 'demo',
        providerThreadId: t.providerThreadId || t.id,
        subject: t.subject,
        snippet: t.snippet,
        participants: t.participants || [],
        messageCount: t.messages?.length || 1,
        lastMessageAt: new Date(t.lastMessageAt),
        lastMessageId: t.lastMessageId || (t.messages?.[t.messages.length - 1]?.id || 'msg_1'),
        lastDirection: t.lastDirection || 'INBOUND',
        currentLabel: t.currentLabel,
        aiLabel: t.aiLabel,
        manualOverride: t.manualOverride || false,
        confidence: t.confidence ?? 0.9,
        reviewState: t.reviewState || 'AUTO_APPLIED',
        isActionRequired: !!t.isActionRequired,
        isWaiting: !!t.isWaiting,
        waitingSince: t.waitingSince ? new Date(t.waitingSince) : null,
        isImportant: !!t.isImportant,
        isGeneral: t.isGeneral ?? true,
        isArchived: !!t.isArchived,
        isRead: !!t.isRead,
        isCompleted: !!t.isCompleted,
        clientVisible: !!t.clientVisible,
        clientStatus: t.clientStatus || 'pending',
        snoozedUntil: t.snoozedUntil ? new Date(t.snoozedUntil) : null,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        meetings: t.meetings || [],
        aiReason: t.aiReason || {},
        followUpScenario: t.followUpScenario || null,
        createdAt: new Date(t.lastMessageAt),
        updatedAt: new Date(),
      };

      memoryThreads.push(threadDoc);

      if (t.messages) {
        for (const m of t.messages) {
          memoryMessages.push({
            _id: m.id,
            threadId: t.id,
            providerMessageId: m.id,
            from: m.from,
            to: m.to,
            cc: m.cc || [],
            bcc: m.bcc || [],
            subject: m.subject || t.subject,
            date: new Date(m.date),
            snippet: m.snippet || '',
            bodyText: m.bodyText || '',
            bodyHtml: m.bodyHtml || `<p>${m.bodyText || ''}</p>`,
            headers: m.headers || {},
            direction: m.from?.email?.includes('vortexdynamics.com') ? 'OUTBOUND' : 'INBOUND',
            createdAt: new Date(m.date),
          });
        }
      }

      // Initial timeline event
      memoryClassificationEvents.push({
        _id: 'evt_' + t.id + '_init',
        threadId: t.id,
        previousLabel: null,
        newLabel: t.currentLabel,
        triggerType: 'INITIAL_SYNC',
        triggerMessageId: threadDoc.lastMessageId,
        actorName: 'ReplyRight AI (Gemini 2.0)',
        reason: t.aiReason?.reason || 'Initial AI ingestion and playbook classification',
        createdAt: new Date(t.lastMessageAt),
      });
    }

    // Initial corrections
    memoryCorrections = [
      {
        _id: 'corr_001',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_13',
        userId: 'user_maya',
        previousLabel: 'CLIENT_TO_REPLY',
        correctedLabel: 'ASSISTANT_TO_REPLY',
        assistantNote: 'Facilities parking allocations should always go to Maya',
        threadContext: {
          subject: 'FW: Office Lease Escalation Clause - Parking Space Allocation',
          senderEmail: 'david.kim@vortexdynamics.com',
          snippet: 'Maya, please advise on which parking spots to keep',
        },
        promotedToPlaybookRule: true,
        createdAt: new Date(Date.now() - 3600 * 1000 * 24),
      },
    ];

    // Initial drafts
    memoryDrafts = [
      {
        _id: 'draft_001',
        threadId: 'th_10',
        orgId: 'org_vortex_001',
        authorId: 'user_maya',
        to: ['alex.wilhelm@techcrunch.com'],
        cc: ['priya@vortexdynamics.com'],
        subject: 'RE: Speaker Agreement - TechCrunch Disrupt Mainstage',
        bodyText: 'Hi Alex, Priya and I have confirmed the keynote terms with Fenwick. We look forward to the fireside chat!',
        bodyHtml: '<p>Hi Alex,</p><p>Priya and I have confirmed the keynote terms with Fenwick. We look forward to the fireside chat!</p>',
        status: 'pending_client',
        createdAt: new Date(Date.now() - 3600 * 1000 * 2),
      },
    ];

    // Initial activity logs
    memoryActivityLogs = [
      {
        _id: 'act_001',
        orgId: 'org_vortex_001',
        actorId: 'user_maya',
        actorName: 'Maya Lin',
        actorRole: 'assistant',
        action: 'ACCOUNT_SYNCED',
        details: { provider: 'demo', threadsSynced: memoryThreads.length },
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
      },
      {
        _id: 'act_002',
        orgId: 'org_vortex_001',
        actorId: 'user_maya',
        actorName: 'Maya Lin',
        actorRole: 'assistant',
        action: 'DRAFT_SUBMITTED_FOR_APPROVAL',
        threadId: 'th_10',
        details: { subject: 'Speaker Agreement - TechCrunch Disrupt' },
        createdAt: new Date(Date.now() - 1000 * 60 * 10),
      },
    ];

    logger.info(`[Store] Seed data successfully loaded (${memoryThreads.length} threads, ${memoryUsers.length} users)`);
  } catch (err) {
    logger.error({ err: err.message }, '[Store] Error hydrating seed data');
  }
}

// Automatically initialize in-memory seed on import
initSeedData();

// ============================================================================
// Repository Operations Layer (Works with both Mongoose and In-Memory Fallback)
// ============================================================================

export const store = {
  // Users
  async findUserByEmail(email) {
    if (isRealDBConnected()) {
      return await User.findOne({ email: email.toLowerCase() });
    }
    return memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id) {
    if (isRealDBConnected()) {
      return await User.findById(id);
    }
    return memoryUsers.find((u) => u._id === id || String(u._id) === String(id)) || null;
  },

  async createUser(userData) {
    const id = 'user_' + Date.now();
    const userDoc = { _id: id, ...userData, createdAt: new Date(), updatedAt: new Date() };
    if (isRealDBConnected()) {
      return await User.create(userDoc);
    }
    memoryUsers.push(userDoc);
    return userDoc;
  },

  // Clients
  async getClientByOrgId(orgId) {
    if (isRealDBConnected()) {
      return await Client.findOne({ orgId });
    }
    return memoryClients.find((c) => c.orgId === orgId) || memoryClients[0] || null;
  },

  async getClientById(id) {
    if (isRealDBConnected()) {
      return await Client.findById(id);
    }
    return memoryClients.find((c) => c._id === id) || memoryClients[0] || null;
  },

  async updatePlaybook(clientId, playbookUpdates) {
    if (isRealDBConnected()) {
      return await Client.findByIdAndUpdate(
        clientId,
        { $set: { playbook: playbookUpdates } },
        { new: true }
      );
    }
    const client = memoryClients.find((c) => c._id === clientId) || memoryClients[0];
    if (client) {
      client.playbook = { ...client.playbook, ...playbookUpdates, updatedAt: new Date() };
      return client;
    }
    return null;
  },

  async addPlaybookRule(clientId, rule) {
    const client = await this.getClientById(clientId);
    if (!client) return null;
    const rules = client.playbook?.topicRules || [];
    rules.push(rule);
    return await this.updatePlaybook(clientId, { topicRules: rules });
  },

  // Threads
  async getThreads(filters = {}) {
    let threads = [];
    if (isRealDBConnected()) {
      threads = await Thread.find(filters).sort({ lastMessageAt: -1 }).lean();
    } else {
      threads = [...memoryThreads];
      if (filters.currentLabel) {
        threads = threads.filter((t) => t.currentLabel === filters.currentLabel);
      }
      if (typeof filters.isArchived === 'boolean') {
        threads = threads.filter((t) => t.isArchived === filters.isArchived);
      }
      if (typeof filters.clientVisible === 'boolean') {
        threads = threads.filter((t) => t.clientVisible === filters.clientVisible);
      }
      if (filters.clientStatus) {
        threads = threads.filter((t) => t.clientStatus === filters.clientStatus);
      }
      if (typeof filters.isWaiting === 'boolean') {
        threads = threads.filter((t) => t.isWaiting === filters.isWaiting);
      }
      if (typeof filters.isActionRequired === 'boolean') {
        threads = threads.filter((t) => t.isActionRequired === filters.isActionRequired);
      }
      if (typeof filters.isImportant === 'boolean') {
        threads = threads.filter((t) => t.isImportant === filters.isImportant);
      }
      threads.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    }
    return threads;
  },

  async getThreadById(id) {
    if (isRealDBConnected()) {
      return await Thread.findById(id).lean();
    }
    return memoryThreads.find((t) => t._id === id || t.providerThreadId === id) || null;
  },

  async updateThread(id, updates) {
    if (isRealDBConnected()) {
      return await Thread.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    }
    const idx = memoryThreads.findIndex((t) => t._id === id || t.providerThreadId === id);
    if (idx !== -1) {
      memoryThreads[idx] = { ...memoryThreads[idx], ...updates, updatedAt: new Date() };
      return memoryThreads[idx];
    }
    return null;
  },

  async createThread(threadData) {
    const id = threadData._id || 'th_' + Date.now();
    const doc = { _id: id, ...threadData, createdAt: new Date(), updatedAt: new Date() };
    if (isRealDBConnected()) {
      return await Thread.create(doc);
    }
    memoryThreads.unshift(doc);
    return doc;
  },

  // Messages
  async getMessagesByThreadId(threadId) {
    if (isRealDBConnected()) {
      return await Message.find({ threadId }).sort({ date: 1 }).lean();
    }
    return memoryMessages
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async addMessage(messageData) {
    const id = messageData._id || 'msg_' + Date.now();
    const doc = { _id: id, ...messageData, createdAt: new Date() };
    if (isRealDBConnected()) {
      return await Message.create(doc);
    }
    memoryMessages.push(doc);
    return doc;
  },

  // Corrections
  async getCorrections(clientId, limit = 10) {
    if (isRealDBConnected()) {
      return await Correction.find({ clientId }).sort({ createdAt: -1 }).limit(limit).lean();
    }
    return memoryCorrections
      .filter((c) => !clientId || c.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  },

  async addCorrection(data) {
    const id = 'corr_' + Date.now();
    const doc = { _id: id, ...data, createdAt: new Date() };
    if (isRealDBConnected()) {
      return await Correction.create(doc);
    }
    memoryCorrections.unshift(doc);
    return doc;
  },

  // Classification Events (Timeline)
  async getClassificationEvents(threadId) {
    if (isRealDBConnected()) {
      return await ClassificationEvent.find({ threadId }).sort({ createdAt: -1 }).lean();
    }
    return memoryClassificationEvents
      .filter((e) => e.threadId === threadId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async addClassificationEvent(eventData) {
    const id = 'evt_' + Date.now();
    const doc = { _id: id, ...eventData, createdAt: new Date() };
    if (isRealDBConnected()) {
      return await ClassificationEvent.create(doc);
    }
    memoryClassificationEvents.unshift(doc);
    return doc;
  },

  // Drafts
  async getDraftsByThreadId(threadId) {
    if (isRealDBConnected()) {
      return await Draft.find({ threadId }).sort({ createdAt: -1 }).lean();
    }
    return memoryDrafts
      .filter((d) => d.threadId === threadId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async saveDraft(draftData) {
    if (draftData._id) {
      if (isRealDBConnected()) {
        return await Draft.findByIdAndUpdate(draftData._id, { $set: draftData }, { new: true }).lean();
      }
      const idx = memoryDrafts.findIndex((d) => d._id === draftData._id);
      if (idx !== -1) {
        memoryDrafts[idx] = { ...memoryDrafts[idx], ...draftData, updatedAt: new Date() };
        return memoryDrafts[idx];
      }
    }
    const id = 'draft_' + Date.now();
    const doc = { _id: id, ...draftData, createdAt: new Date(), updatedAt: new Date() };
    if (isRealDBConnected()) {
      return await Draft.create(doc);
    }
    memoryDrafts.unshift(doc);
    return doc;
  },

  // Activity Logs
  async getActivityLogs(orgId, limit = 20) {
    if (isRealDBConnected()) {
      return await ActivityLog.find({ orgId }).sort({ createdAt: -1 }).limit(limit).lean();
    }
    return memoryActivityLogs
      .filter((a) => !orgId || a.orgId === orgId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  },

  async addActivityLog(logData) {
    const id = 'act_' + Date.now();
    const doc = { _id: id, ...logData, createdAt: new Date() };
    if (isRealDBConnected()) {
      return await ActivityLog.create(doc);
    }
    memoryActivityLogs.unshift(doc);
    return doc;
  },

  // Connected Accounts
  async getConnectedAccounts(orgId) {
    if (isRealDBConnected()) {
      return await ConnectedAccount.find({ orgId }).lean();
    }
    return memoryConnectedAccounts.filter((a) => !orgId || a.orgId === orgId);
  },

  async updateConnectedAccount(id, updates) {
    if (isRealDBConnected()) {
      return await ConnectedAccount.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    }
    const idx = memoryConnectedAccounts.findIndex((a) => a._id === id);
    if (idx !== -1) {
      memoryConnectedAccounts[idx] = { ...memoryConnectedAccounts[idx], ...updates, updatedAt: new Date() };
      return memoryConnectedAccounts[idx];
    }
    return null;
  },

  async addConnectedAccount(accData) {
    const id = 'acc_' + Date.now();
    const doc = { _id: id, ...accData, createdAt: new Date(), updatedAt: new Date() };
    if (isRealDBConnected()) {
      return await ConnectedAccount.create(doc);
    }
    memoryConnectedAccounts.push(doc);
    return doc;
  },

  async removeConnectedAccount(id) {
    if (isRealDBConnected()) {
      return await ConnectedAccount.findByIdAndDelete(id);
    }
    memoryConnectedAccounts = memoryConnectedAccounts.filter((a) => a._id !== id);
    return true;
  },

  // Invites
  async createInvite(inviteData) {
    const id = 'inv_' + Date.now();
    const doc = { _id: id, ...inviteData, createdAt: new Date() };
    if (isRealDBConnected()) {
      return await Invite.create(doc);
    }
    memoryInvites.push(doc);
    return doc;
  },

  async findInvite(tokenOrCode) {
    if (isRealDBConnected()) {
      return await Invite.findOne({
        $or: [{ token: tokenOrCode }, { code: tokenOrCode }],
        status: 'pending',
      });
    }
    return (
      memoryInvites.find(
        (i) => (i.token === tokenOrCode || i.code === tokenOrCode) && i.status === 'pending'
      ) || null
    );
  },

  initSeedData,
};
