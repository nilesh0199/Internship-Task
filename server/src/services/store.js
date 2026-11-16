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
  AgentRun,
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
let memoryAgentRuns = [];

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
        avatarUrl: null,
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
        avatarUrl: null,
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
        avatarUrl: null,
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
        actorName: 'Daybook AI (Gemini 2.0)',
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

    // Initial specialized agent runs for demonstration & auditability
    const now = Date.now();
    memoryAgentRuns = [
      {
        _id: 'run_seed_001',
        agentId: 'guardian',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_26',
        trigger: 'ingest',
        action: 'guardian_reversed',
        outcome: 'reversed',
        summary: 'Guardian reversed: Auto-file blocked (Sender newsletter references VIP advisory terms). Restored to Needs Review.',
        details: { violationReasons: ['Contains legal/contract terms', 'Contains advisory outreach'] },
        confidence: 1.0,
        requiresHuman: true,
        undo: null,
        usedLLM: false,
        fallbackUsed: false,
        durationMs: 12,
        startedAt: new Date(now - 1000 * 60 * 3),
        createdAt: new Date(now - 1000 * 60 * 3),
      },
      {
        _id: 'run_seed_002',
        agentId: 'scheduling',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_11',
        trigger: 'ingest',
        action: 'propose_reschedule',
        outcome: 'proposed',
        summary: 'Detected conflict with "Executive Partnership Discussion". Proposed reschedule draft with 3 alternative slots.',
        details: { conflictingMeeting: 'Executive Partnership Discussion', draftId: 'draft_seed_sched_01' },
        confidence: 0.96,
        requiresHuman: true,
        undo: { type: 'discard_draft', payload: { draftId: 'draft_seed_sched_01' } },
        usedLLM: false,
        fallbackUsed: false,
        durationMs: 18,
        startedAt: new Date(now - 1000 * 60 * 8),
        createdAt: new Date(now - 1000 * 60 * 8),
      },
      {
        _id: 'run_seed_003',
        agentId: 'followup',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_18',
        trigger: 'schedule_tick',
        action: 'draft_stale_followup',
        outcome: 'proposed',
        summary: 'Thread waiting for 4 days (threshold: 3d). Drafted polite check-in for assistant approval.',
        details: { daysWaiting: 4, followupDays: 3, draftId: 'draft_seed_follow_01' },
        confidence: 0.95,
        requiresHuman: true,
        undo: { type: 'discard_draft', payload: { draftId: 'draft_seed_follow_01' } },
        usedLLM: false,
        fallbackUsed: false,
        durationMs: 14,
        startedAt: new Date(now - 1000 * 60 * 14),
        createdAt: new Date(now - 1000 * 60 * 14),
      },
      {
        _id: 'run_seed_004',
        agentId: 'followup',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_03',
        trigger: 'schedule_tick',
        action: 'nudge_client_decision',
        outcome: 'proposed',
        summary: "Pending in Priya's queue for 48 hours. Recommended Maya ping Priya during afternoon sync.",
        details: { pendingHours: 48, subject: 'Updated Commercial Lease Agreement' },
        confidence: 0.92,
        requiresHuman: true,
        undo: null,
        usedLLM: false,
        fallbackUsed: false,
        durationMs: 9,
        startedAt: new Date(now - 1000 * 60 * 25),
        createdAt: new Date(now - 1000 * 60 * 25),
      },
      {
        _id: 'run_seed_005',
        agentId: 'drafting',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_01',
        trigger: 'ingest',
        action: 'pre_draft_reply',
        outcome: 'proposed',
        summary: "Pre-drafted executive response for Priya Sharma's one-tap approval.",
        details: { draftId: 'draft_seed_01', recipient: 'mark.suster@upfront.com', isClientDecision: true },
        confidence: 0.94,
        requiresHuman: true,
        undo: { type: 'discard_draft', payload: { draftId: 'draft_seed_01' } },
        usedLLM: false,
        fallbackUsed: false,
        durationMs: 22,
        startedAt: new Date(now - 1000 * 60 * 35),
        createdAt: new Date(now - 1000 * 60 * 35),
      },
      {
        _id: 'run_seed_006',
        agentId: 'triage',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_25',
        trigger: 'ingest',
        action: 'auto_file_quiet_folder',
        outcome: 'auto_handled',
        summary: 'Auto-filed to Quiet Folder: AWS Cloud Billing Statement (automated receipt requiring no reply).',
        details: { label: 'NO_REPLY_NEEDED', confidence: 0.99, archived: true },
        confidence: 0.99,
        requiresHuman: false,
        undo: { type: 'unarchive_thread', payload: { previousLabel: 'ASSISTANT_TO_REPLY', isArchived: false } },
        usedLLM: false,
        fallbackUsed: false,
        durationMs: 15,
        startedAt: new Date(now - 1000 * 60 * 42),
        createdAt: new Date(now - 1000 * 60 * 42),
      },
      {
        _id: 'run_seed_007',
        agentId: 'triage',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_29',
        trigger: 'ingest',
        action: 'auto_file_quiet_folder',
        outcome: 'auto_handled',
        summary: 'Auto-filed to Quiet Folder: Uber Receipt: $38.42 (automated receipt requiring no reply).',
        details: { label: 'NO_REPLY_NEEDED', confidence: 0.98, archived: true },
        confidence: 0.98,
        requiresHuman: false,
        undo: { type: 'unarchive_thread', payload: { previousLabel: 'ASSISTANT_TO_REPLY', isArchived: false } },
        usedLLM: false,
        fallbackUsed: false,
        durationMs: 11,
        startedAt: new Date(now - 1000 * 60 * 50),
        createdAt: new Date(now - 1000 * 60 * 50),
      },
      {
        _id: 'run_seed_008',
        agentId: 'triage',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_17',
        trigger: 'ingest',
        action: 'route_assistant_queue',
        outcome: 'auto_handled',
        summary: 'Routed to Assistant Workspace: DHL customs documentation needed for prototype shipment.',
        details: { label: 'ASSISTANT_TO_REPLY', confidence: 0.97 },
        confidence: 0.97,
        requiresHuman: false,
        undo: null,
        usedLLM: false,
        fallbackUsed: false,
        durationMs: 13,
        startedAt: new Date(now - 1000 * 60 * 55),
        createdAt: new Date(now - 1000 * 60 * 55),
      },
      {
        _id: 'run_seed_009',
        agentId: 'digest',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: null,
        trigger: 'schedule_tick',
        action: 'generate_morning_brief',
        outcome: 'auto_handled',
        summary: 'Generated Daily Morning Briefing: 7 decisions pending, 24 handled by agents.',
        details: { decisionsCount: 7, handledCount: 24, waitingCount: 5 },
        confidence: 0.99,
        requiresHuman: false,
        undo: null,
        usedLLM: false,
        fallbackUsed: false,
        durationMs: 16,
        startedAt: new Date(now - 1000 * 60 * 60),
        createdAt: new Date(now - 1000 * 60 * 60),
      },
    ];

    // Seed agent proposal drafts
    memoryDrafts.push(
      {
        _id: 'draft_seed_sched_01',
        threadId: 'th_11',
        orgId: 'org_vortex_001',
        authorId: 'agent_scheduling',
        to: ['colleague@example.com'],
        subject: 'Re: Executive Partnership Discussion - Reschedule Alternatives',
        bodyText: 'Hi, Priya has a scheduling conflict during the proposed window. Could tomorrow 11:00 AM PST or 3:30 PM PST work instead?',
        bodyHtml: '<p>Hi, Priya has a scheduling conflict during the proposed window. Could tomorrow 11:00 AM PST or 3:30 PM PST work instead?</p>',
        status: 'agent_proposal',
        agentProposalType: 'reschedule_meeting',
        createdAt: new Date(now - 1000 * 60 * 8),
      },
      {
        _id: 'draft_seed_follow_01',
        threadId: 'th_18',
        orgId: 'org_vortex_001',
        authorId: 'agent_followup',
        to: ['partner@venturefund.com'],
        subject: 'Following up: Q3 Portfolio Review',
        bodyText: 'Hi, I wanted to quickly circle back on the note below. Please let us know if you need any additional details from our end.',
        bodyHtml: '<p>Hi, I wanted to quickly circle back on the note below. Please let us know if you need any additional details from our end.</p>',
        status: 'agent_proposal',
        agentProposalType: 'stale_followup',
        createdAt: new Date(now - 1000 * 60 * 14),
      }
    );

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

  async createClient(clientData) {
    const id = clientData._id || 'client_' + Date.now();
    const doc = { _id: id, ...clientData, createdAt: new Date(), updatedAt: new Date() };
    if (isRealDBConnected()) {
      return await Client.create(doc);
    }
    memoryClients.push(doc);
    return doc;
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

  async findThreadByProviderId(providerThreadId, connectedAccountId) {
    if (isRealDBConnected()) {
      return await Thread.findOne({
        providerThreadId,
        $or: [{ connectedAccountId }, { accountId: connectedAccountId }],
      }).lean();
    }
    return (
      memoryThreads.find(
        (t) =>
          t.providerThreadId === providerThreadId &&
          (t.connectedAccountId === connectedAccountId || t.accountId === connectedAccountId)
      ) || null
    );
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

  async findMessageByProviderId(providerMessageId) {
    if (isRealDBConnected()) {
      return await Message.findOne({ providerMessageId }).lean();
    }
    return memoryMessages.find((m) => m.providerMessageId === providerMessageId) || null;
  },

  async updateMessage(id, updates) {
    if (isRealDBConnected()) {
      return await Message.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    }
    const idx = memoryMessages.findIndex((m) => m._id === id || m.id === id);
    if (idx !== -1) {
      memoryMessages[idx] = { ...memoryMessages[idx], ...updates, updatedAt: new Date() };
      return memoryMessages[idx];
    }
    return null;
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

  async getAgentProposals(orgId) {
    if (isRealDBConnected()) {
      return await Draft.find({
        ...(orgId ? { orgId } : {}),
        status: { $in: ['agent_proposal', 'draft'] },
        authorId: { $regex: /^agent_/ },
      }).lean();
    }
    return memoryDrafts.filter(
      (d) =>
        (!orgId || d.orgId === orgId) &&
        (d.status === 'agent_proposal' || d.status === 'draft') &&
        (d.authorId || '').startsWith('agent_')
    );
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
    memoryConnectedAccounts = memoryConnectedAccounts.filter((a) => a._id !== id && String(a._id) !== String(id));
    return true;
  },

  async purgeAccountData(accountId, orgId) {
    if (isRealDBConnected()) {
      const threads = await Thread.find({ accountId, orgId });
      const threadIds = threads.map((t) => t._id);

      await Message.deleteMany({ threadId: { $in: threadIds } });
      await ClassificationEvent.deleteMany({ threadId: { $in: threadIds } });
      await Classification.deleteMany({ threadId: { $in: threadIds } });
      await Draft.deleteMany({ threadId: { $in: threadIds } });
      await Thread.deleteMany({ _id: { $in: threadIds } });
      await ConnectedAccount.findByIdAndDelete(accountId);
      return { purgedThreadsCount: threadIds.length };
    }

    const threadsToRemove = memoryThreads.filter(
      (t) => (t.accountId === accountId || String(t.accountId) === String(accountId)) && (!orgId || t.orgId === orgId)
    );
    const threadIds = threadsToRemove.map((t) => t._id || t.id);

    memoryThreads = memoryThreads.filter((t) => !threadIds.includes(t._id || t.id));
    memoryMessages = memoryMessages.filter((m) => !threadIds.includes(m.threadId));
    memoryClassificationEvents = memoryClassificationEvents.filter((e) => !threadIds.includes(e.threadId));
    memoryClassifications = memoryClassifications.filter((c) => !threadIds.includes(c.threadId));
    memoryDrafts = memoryDrafts.filter((d) => !threadIds.includes(d.threadId));
    memoryConnectedAccounts = memoryConnectedAccounts.filter(
      (a) => a._id !== accountId && String(a._id) !== String(accountId)
    );

    return { purgedThreadsCount: threadIds.length };
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

  // Agent Runs & Autonomous Audit Logs
  async addAgentRun(runData) {
    const id = 'run_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const doc = {
      _id: id,
      ...runData,
      createdAt: new Date(),
    };
    if (isRealDBConnected()) {
      return await AgentRun.create(doc);
    }
    memoryAgentRuns.unshift(doc);
    // Keep max 500 recent runs in memory
    if (memoryAgentRuns.length > 500) memoryAgentRuns.length = 500;
    return doc;
  },

  async getAgentRuns({ orgId, threadId, agentId, outcome, limit = 50 }) {
    if (isRealDBConnected()) {
      const q = {};
      if (orgId) q.orgId = orgId;
      if (threadId) q.threadId = threadId;
      if (agentId) q.agentId = agentId;
      if (outcome) q.outcome = outcome;
      return await AgentRun.find(q).sort({ createdAt: -1 }).limit(parseInt(limit, 10));
    }
    let list = memoryAgentRuns;
    if (orgId) list = list.filter((r) => r.orgId === orgId);
    if (threadId) list = list.filter((r) => r.threadId === threadId);
    if (agentId) list = list.filter((r) => r.agentId === agentId);
    if (outcome) list = list.filter((r) => r.outcome === outcome);
    return list.slice(0, parseInt(limit, 10));
  },

  async getAgentRunById(id) {
    if (isRealDBConnected()) {
      return await AgentRun.findById(id);
    }
    return memoryAgentRuns.find((r) => r._id === id || String(r._id) === String(id)) || null;
  },

  async updateAgentRun(id, updates) {
    if (isRealDBConnected()) {
      return await AgentRun.findByIdAndUpdate(id, { $set: updates }, { new: true });
    }
    const idx = memoryAgentRuns.findIndex((r) => r._id === id || String(r._id) === String(id));
    if (idx !== -1) {
      memoryAgentRuns[idx] = { ...memoryAgentRuns[idx], ...updates, updatedAt: new Date() };
      return memoryAgentRuns[idx];
    }
    return null;
  },

  async getAgentStats(orgId, hours = 24) {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000);
    let runs = [];
    if (isRealDBConnected()) {
      runs = await AgentRun.find({ orgId, createdAt: { $gte: cutoff } });
    } else {
      runs = memoryAgentRuns.filter(
        (r) => (!orgId || r.orgId === orgId) && new Date(r.createdAt) >= cutoff
      );
    }

    const stats = {
      total: runs.length,
      autoHandled: 0,
      proposed: 0,
      escalated: 0,
      reversed: 0,
      skipped: 0,
      byAgent: {
        triage: { total: 0, handled: 0, proposed: 0, escalated: 0, reversed: 0 },
        scheduling: { total: 0, handled: 0, proposed: 0, escalated: 0, reversed: 0 },
        followup: { total: 0, handled: 0, proposed: 0, escalated: 0, reversed: 0 },
        drafting: { total: 0, handled: 0, proposed: 0, escalated: 0, reversed: 0 },
        digest: { total: 0, handled: 0, proposed: 0, escalated: 0, reversed: 0 },
        guardian: { total: 0, handled: 0, proposed: 0, escalated: 0, reversed: 0 },
      },
      hoursSavedEstimateHours: '0.0',
    };

    for (const r of runs) {
      if (r.outcome === 'auto_handled') stats.autoHandled++;
      else if (r.outcome === 'proposed') stats.proposed++;
      else if (r.outcome === 'escalated') stats.escalated++;
      else if (r.outcome === 'reversed') stats.reversed++;
      else if (r.outcome === 'skipped') stats.skipped++;

      if (stats.byAgent[r.agentId]) {
        stats.byAgent[r.agentId].total++;
        if (r.outcome === 'auto_handled') stats.byAgent[r.agentId].handled++;
        else if (r.outcome === 'proposed') stats.byAgent[r.agentId].proposed++;
        else if (r.outcome === 'escalated') stats.byAgent[r.agentId].escalated++;
        else if (r.outcome === 'reversed') stats.byAgent[r.agentId].reversed++;
      }
    }

    // Formula: 40 seconds estimated saved per auto-handled routine email
    const secondsSaved = stats.autoHandled * 40;
    stats.hoursSavedEstimateHours = (secondsSaved / 3600).toFixed(1);

    return stats;
  },

  async undoAgentRun(id, userId, actorName = 'User') {
    const run = await this.getAgentRunById(id);
    if (!run) {
      throw new Error('Agent run not found');
    }
    if (run.undoneAt) {
      return { run, alreadyUndone: true };
    }

    // Execute undo payload
    if (run.undo && run.undo.type) {
      if (run.undo.type === 'unarchive_thread' || run.undo.type === 'restore_label') {
        const { previousLabel, isArchived } = run.undo.payload || {};
        if (run.threadId) {
          await this.updateThread(run.threadId, {
            currentLabel: previousLabel || 'ASSISTANT_TO_REPLY',
            isArchived: typeof isArchived === 'boolean' ? isArchived : false,
          });
        }
      } else if (run.undo.type === 'discard_draft') {
        const { draftId } = run.undo.payload || {};
        if (draftId) {
          await this.saveDraft({ _id: draftId, status: 'discarded' });
        }
      }
    }

    const updatedRun = await this.updateAgentRun(id, {
      undoneAt: new Date(),
    });

    await this.addActivityLog({
      orgId: run.orgId,
      actorId: userId,
      actorName: actorName || 'Assistant',
      actorRole: 'agent',
      action: 'AGENT_UNDO',
      threadId: run.threadId,
      details: {
        runId: id,
        agentId: run.agentId,
        action: run.action,
        undoType: run.undo?.type,
      },
    });

    return { run: updatedRun, undone: true };
  },

  initSeedData,
};
