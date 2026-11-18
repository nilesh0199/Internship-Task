import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
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
  AiProviderConfig,
} from '../models/index.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';
import { maskApiKey } from '../ai/byokCatalog.js';
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
const memoryAiConfigs = new Map();

/**
 * Initializes in-memory seed dataset for demo/offline execution
 */
export async function initSeedData() {
  try {
    if (!env.DEMO_MODE) {
      logger.info('[Store] DEMO_MODE is disabled; skipping demo data seeding.');
      return;
    }

    const seedPath = path.resolve(__dirname, '../seed/threads.json');
    if (!fs.existsSync(seedPath)) {
      logger.warn('[Store] Seed file not found at: ' + seedPath);
      return;
    }

    const raw = fs.readFileSync(seedPath, 'utf8');
    const threadsData = JSON.parse(raw);

    const passwordHash = await bcrypt.hash('password123', 12);

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

    // Initial client profiles & playbooks (Priya Sharma + Rohan Kapoor)
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
          agentAutonomy: {
            triage: 'auto',
            scheduling: 'propose',
            followup: 'propose',
            drafting: 'propose',
            digest: 'auto',
            guardian: 'auto',
          },
          updatedAt: new Date(),
        },
        agentMemory: {
          triage: {
            instruction: 'Investors, lawyers and anything with money > $1,000 or deadlines go to Priya. Routine vendors and scheduling go to Maya.',
            memories: [
              { id: 'mem_p_t1', text: 'Mark Suster and Anjali Sharma are VIPs; always route to Priya.', source: 'manual', pinned: true, enabled: true, createdAt: new Date(), createdBy: 'Maya Lin' },
              { id: 'mem_p_t2', text: 'Fenwick & West legal communications must always be reviewed by Priya.', source: 'manual', pinned: false, enabled: true, createdAt: new Date(), createdBy: 'Maya Lin' },
            ],
          },
          drafting: {
            instruction: 'Concise, visionary founder tone. Sign off as Priya.',
            memories: [
              { id: 'mem_p_d1', text: 'Always acknowledge investor introductions within 24 hours.', source: 'manual', pinned: true, enabled: true, createdAt: new Date(), createdBy: 'Maya Lin' },
            ],
          },
          followup: {
            instruction: 'Follow up with investors after 3 days if no reply.',
            memories: [],
          },
          scheduling: {
            instruction: 'Buffer 15 minutes between external investor meetings.',
            memories: [],
          },
          digest: {
            instruction: 'Show investor decision drafts and high-priority legal approvals first.',
            memories: [],
          },
          guardian: {
            instruction: 'Flag any term sheets, SAFE agreements, or founder equity discussions.',
            memories: [
              { id: 'mem_p_g1', text: 'Never auto-file threads mentioning equity dilution or option grants.', source: 'manual', pinned: true, enabled: true, createdAt: new Date(), createdBy: 'Maya Lin' },
            ],
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: 'client_rohan_002',
        orgId: 'org_vortex_001',
        name: 'Rohan Kapoor',
        email: 'rohan@apexlogistics.com',
        title: 'Chief Operating Officer',
        company: 'Apex Freight Logistics',
        avatarUrl: null,
        playbook: {
          vipSenders: [
            'marcus.vance@apexlogistics.com',
            'elena.rostova@vanguardcap.com',
            'arthur.pendelton@summitlogistics.com',
            'mira.kapoor@gmail.com',
          ],
          vipDomains: ['vanguardcap.com', 'summitlogistics.com', 'apexlogistics.com'],
          topicRules: [
            {
              topic: 'Board Resolutions & Shareholder Voting',
              disposition: 'ALWAYS_CLIENT',
              description: 'All board-level governance, equity and quarterly shareholder votes',
            },
            {
              topic: 'Regulatory & Maritime Legal Proceedings',
              disposition: 'ALWAYS_CLIENT',
              description: 'DOT, maritime commission, customs audits, and litigation matters',
            },
            {
              topic: 'Personal & Family Communications',
              disposition: 'ALWAYS_CLIENT',
              description: 'Emails from sister Mira Kapoor and immediate family',
            },
            {
              topic: 'Fleet Fuel, Maintenance & Warehouse Vendors',
              disposition: 'ASSISTANT_CAN_HANDLE',
              description: 'Maya approves quotes, vendor inquiries, and routine bills under $15,000',
            },
            {
              topic: 'Executive Calendar & Flight Dispatch',
              disposition: 'ASSISTANT_CAN_HANDLE',
              description: 'Coordination of site visits, pilot schedules, and hotel blocks',
            },
            {
              topic: 'Cold Freight Solicitations',
              disposition: 'NEVER_BOTHER_CLIENT',
              description: 'Unsolicited logistics brokers and SaaS demos',
            },
          ],
          financialThresholds: { maxAssistantApprovalUsd: 15000 },
          customInstructions:
            'Rohan delegates all vendor bills, maintenance escalations, and scheduling to Maya Lin. Only bother Rohan for board matters, legal actions, or emails from Marcus Vance and Mira Kapoor.',
          agentAutonomy: {
            triage: 'auto',
            scheduling: 'auto',
            followup: 'auto',
            drafting: 'propose',
            digest: 'auto',
            guardian: 'auto',
          },
          updatedAt: new Date(),
        },
        agentMemory: {
          triage: {
            instruction:
              'Vendors, warehouse invoices and logistics operations go to Maya. Only board matters, lawsuits, and emails from Marcus Vance or Mira go to Rohan.',
            memories: [
              { id: 'mem_r_t1', text: 'Marcus Vance is the CEO; his emails must always reach Rohan.', source: 'manual', pinned: true, enabled: true, createdAt: new Date(), createdBy: 'Maya Lin' },
              { id: 'mem_r_t2', text: 'Freight vendor pricing updates under $15,000 should be handled by Maya.', source: 'manual', pinned: false, enabled: true, createdAt: new Date(), createdBy: 'Maya Lin' },
            ],
          },
          drafting: {
            instruction: "Short, warm, no exclamation marks. Sign off as Rohan's office.",
            memories: [
              { id: 'mem_r_d1', text: 'Never use exclamation marks in external vendor correspondence.', source: 'manual', pinned: true, enabled: true, createdAt: new Date(), createdBy: 'Maya Lin' },
            ],
          },
          followup: {
            instruction: 'Nudge freight vendors after 2 days, never nudge board members.',
            memories: [
              { id: 'mem_r_f1', text: 'Elena Rostova and Arthur Pendelton should never receive automated nudges.', source: 'manual', pinned: true, enabled: true, createdAt: new Date(), createdBy: 'Maya Lin' },
            ],
          },
          scheduling: {
            instruction: 'Keep mornings open for warehouse site inspections; schedule meetings after 1:00 PM.',
            memories: [],
          },
          digest: {
            instruction: 'Highlight pending board votes and any legal risk items at the top of the morning brief.',
            memories: [],
          },
          guardian: {
            instruction: 'Watch for maritime demurrage fines, union grievances, and board resolutions.',
            memories: [
              { id: 'mem_r_g1', text: 'Escalate any thread mentioning port labor strikes or union negotiations.', source: 'manual', pinned: true, enabled: true, createdAt: new Date(), createdBy: 'Maya Lin' },
            ],
          },
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
      {
        _id: 'acc_demo_02',
        orgId: 'org_vortex_001',
        clientId: 'client_rohan_002',
        provider: 'demo',
        emailAddress: 'rohan@apexlogistics.com',
        status: 'idle',
        lastSyncedAt: new Date(),
        scopes: ['mail.read', 'mail.send'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Seed Rohan's pending invite (has no user account)
    const rawRohanToken = 'rohan_invite_token_demo_32chars_test';
    const rohanTokenHash = crypto.createHash('sha256').update(rawRohanToken).digest('hex');
    memoryInvites = [
      {
        _id: 'inv_rohan_001',
        orgId: 'org_vortex_001',
        clientId: 'client_rohan_002',
        email: 'rohan@apexlogistics.com',
        role: 'client',
        tokenHash: rohanTokenHash,
        status: 'pending',
        invitedBy: 'user_maya',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
      },
    ];

    // Load Rohan's threads and combine
    let rohanThreadsData = [];
    const rohanSeedPath = path.resolve(__dirname, '../seed/rohan_threads.json');
    if (fs.existsSync(rohanSeedPath)) {
      try {
        rohanThreadsData = JSON.parse(fs.readFileSync(rohanSeedPath, 'utf8'));
      } catch (err) {
        logger.warn('[Store] Could not parse rohan_threads.json: ' + err.message);
      }
    }
    const combinedThreadsData = [...threadsData, ...rohanThreadsData];

    // Hydrate threads and messages
    memoryThreads = [];
    memoryMessages = [];
    memoryClassificationEvents = [];

    for (const t of combinedThreadsData) {
      const threadDoc = {
        _id: t.id,
        orgId: t.orgId || 'org_vortex_001',
        clientId: t.clientId || 'client_priya_001',
        connectedAccountId: t.connectedAccountId || (t.clientId === 'client_rohan_002' ? 'acc_demo_02' : 'acc_demo_01'),
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

    // Initial drafts prepared by Maya awaiting executive approval
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
      {
        _id: 'draft_002',
        threadId: 'th_01',
        orgId: 'org_vortex_001',
        authorId: 'user_maya',
        to: ['mark.suster@upfront.com'],
        cc: ['s.jenkins@fenwick.com', 'priya@vortexdynamics.com'],
        subject: 'RE: Series A Expansion Term Sheet - Final Execution Deadline',
        bodyText: 'Hi Mark, thank you for finalizing the $18M cap terms with Fenwick. I have reviewed the clean execution copy and am countersigning the DocuSign envelope now so we lock in the syndicate allocation well ahead of 5 PM.',
        bodyHtml: '<p>Hi Mark,</p><p>Thank you for finalizing the $18M cap terms with Fenwick. I have reviewed the clean execution copy and am countersigning the DocuSign envelope now so we lock in the syndicate allocation well ahead of 5 PM.</p>',
        status: 'pending_client',
        createdAt: new Date(Date.now() - 3600 * 1000 * 1),
      },
      {
        _id: 'draft_003',
        threadId: 'th_02',
        orgId: 'org_vortex_001',
        authorId: 'user_maya',
        to: ['elena@vortexdynamics.com'],
        cc: ['priya@vortexdynamics.com'],
        subject: 'RE: VP of Engineering Offer Package - Approval for Dan Miller',
        bodyText: 'Hi Elena, approved — please go ahead and issue the formal Carta grant and offer letter for Dan at $320k base and 1.2% equity today so we stay ahead of his competing deadline.',
        bodyHtml: '<p>Hi Elena,</p><p>Approved — please go ahead and issue the formal Carta grant and offer letter for Dan at $320k base and 1.2% equity today so we stay ahead of his competing deadline.</p>',
        status: 'pending_client',
        createdAt: new Date(Date.now() - 3600 * 1000 * 1.5),
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
      // Pre-recorded sample trace 1: Triage Investigator resolving ambiguous forwarded parking space thread (th_13)
      {
        _id: 'run_sample_triage_th13',
        agentId: 'triage_investigator',
        kind: 'agent',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_13',
        trigger: 'ingest',
        action: 'investigation_resolved_classification',
        outcome: 'auto_handled',
        summary: 'Triage Investigator resolved forwarded email via correction history: Routed to ASSISTANT_TO_REPLY (95%).',
        details: {
          previousLabel: 'NEEDS_REVIEW',
          resolvedLabel: 'ASSISTANT_TO_REPLY',
          confidence: 0.95,
          evidence: ['David Kim forwarded asking for advice', 'Correction corr_001 notes parking allocations go to Maya'],
          reason: 'Correction history establishes parking spot management is delegated to Maya Lin.',
          stepsCount: 3,
        },
        confidence: 0.95,
        requiresHuman: false,
        undo: null,
        usedLLM: true,
        fallbackUsed: false,
        recordedSample: true,
        stopReason: 'goal_reached',
        steps: [
          {
            i: 1,
            thoughtSummary: 'Forwarded email contains "please advise" trap. Need to check sender history and corrections.',
            action: 'tool',
            tool: 'get_sender_history',
            args: { senderEmail: 'david.kim@vortexdynamics.com' },
            observationSummary: 'Found 4 past threads with David Kim. Most operational queries routed to assistant.',
            durationMs: 220,
          },
          {
            i: 2,
            thoughtSummary: 'Checking recent assistant corrections for parking or lease topics.',
            action: 'tool',
            tool: 'get_corrections',
            args: { limit: 5 },
            observationSummary: 'Correction corr_001 found: "Facilities parking allocations should always go to Maya".',
            durationMs: 180,
          },
          {
            i: 3,
            thoughtSummary: 'Clear precedence established by human correction. Proposing ASSISTANT_TO_REPLY.',
            action: 'tool',
            tool: 'propose_classification',
            args: {
              label: 'ASSISTANT_TO_REPLY',
              confidence: 0.95,
              reason: 'Prior human correction corr_001 specifies parking space allocations belong to assistant.',
              evidence: ['Facilities parking allocations should always go to Maya'],
            },
            observationSummary: 'Proposal accepted: classification staged.',
            durationMs: 140,
          },
        ],
        usage: { stepsCount: 3, durationMs: 540, estimatedTokens: 1050 },
        durationMs: 540,
        startedAt: new Date(now - 1000 * 60 * 2),
        createdAt: new Date(now - 1000 * 60 * 2),
      },

      // Pre-recorded sample trace 2: Triage Investigator evaluating ambiguous coffee chat (th_33)
      {
        _id: 'run_sample_triage_th33',
        agentId: 'triage_investigator',
        kind: 'agent',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_33',
        trigger: 'ingest',
        action: 'investigation_escalated',
        outcome: 'escalated',
        summary: 'Triage Investigator escalated casual coffee request to NEEDS_REVIEW: ambiguous personal vs business intent.',
        details: {
          tentativeLabel: 'NEEDS_REVIEW',
          confidence: 0.65,
          reason: 'Sender not on VIP list and message is ambiguous casual outreach without clear agenda.',
          evidence: ['quick coffee next week?'],
          stepsCount: 3,
        },
        confidence: 0.65,
        requiresHuman: true,
        undo: null,
        usedLLM: true,
        fallbackUsed: false,
        recordedSample: true,
        stopReason: 'goal_reached',
        steps: [
          {
            i: 1,
            thoughtSummary: 'Casual coffee request from unknown sender. Inspecting VIP senders in playbook.',
            action: 'tool',
            tool: 'get_playbook',
            args: {},
            observationSummary: 'VIP senders list does not contain sender. Topic rules classify casual meetings as needs review.',
            durationMs: 190,
          },
          {
            i: 2,
            thoughtSummary: 'Searching client threads for previous meetings with this person.',
            action: 'tool',
            tool: 'search_client_threads',
            args: { query: 'coffee' },
            observationSummary: 'No prior interactions found for this sender.',
            durationMs: 240,
          },
          {
            i: 3,
            thoughtSummary: 'Insufficient evidence to auto-file or route to assistant. Escalating to human review.',
            action: 'final',
            tool: null,
            args: {},
            observationSummary: 'Agent finalized: escalated to NEEDS_REVIEW.',
            durationMs: 130,
          },
        ],
        usage: { stepsCount: 3, durationMs: 560, estimatedTokens: 980 },
        durationMs: 560,
        startedAt: new Date(now - 1000 * 60 * 5),
        createdAt: new Date(now - 1000 * 60 * 5),
      },

      // Pre-recorded sample trace 3: Triage Investigator evaluating advisory inquiry (th_34)
      {
        _id: 'run_sample_triage_th34',
        agentId: 'triage_investigator',
        kind: 'agent',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_34',
        trigger: 'ingest',
        action: 'investigation_resolved_classification',
        outcome: 'auto_handled',
        summary: 'Triage Investigator resolved advisory inquiry: Routed to CLIENT_TO_REPLY (92%) per executive playbook.',
        details: {
          previousLabel: 'NEEDS_REVIEW',
          resolvedLabel: 'CLIENT_TO_REPLY',
          confidence: 0.92,
          evidence: ['Former Stripe VP exploring advisory', 'Executive playbook: founder handles high-profile advisory inquiries'],
          reason: 'Playbook explicitly reserves VP-level advisory intros for Priya Sharma.',
          stepsCount: 2,
        },
        confidence: 0.92,
        requiresHuman: true,
        undo: null,
        usedLLM: true,
        fallbackUsed: false,
        recordedSample: true,
        stopReason: 'goal_reached',
        steps: [
          {
            i: 1,
            thoughtSummary: 'Advisory inquiry from former Stripe VP. Inspecting playbook topic rules.',
            action: 'tool',
            tool: 'get_playbook',
            args: {},
            observationSummary: 'Playbook topic rules: Strategic advisory and C-level intros have disposition ALWAYS_CLIENT.',
            durationMs: 210,
          },
          {
            i: 2,
            thoughtSummary: 'Playbook directly applies. Proposing CLIENT_TO_REPLY.',
            action: 'tool',
            tool: 'propose_classification',
            args: {
              label: 'CLIENT_TO_REPLY',
              confidence: 0.92,
              reason: 'Strategic advisory matches ALWAYS_CLIENT playbook rule.',
              evidence: ['Former Stripe VP of Product exploring advisory'],
            },
            observationSummary: 'Proposal staged.',
            durationMs: 150,
          },
        ],
        usage: { stepsCount: 2, durationMs: 360, estimatedTokens: 750 },
        durationMs: 360,
        startedAt: new Date(now - 1000 * 60 * 7),
        createdAt: new Date(now - 1000 * 60 * 7),
      },

      // Pre-recorded sample trace 4: Scheduling Agent resolving double-booking conflict (th_11)
      {
        _id: 'run_sample_sched_th11',
        agentId: 'scheduling',
        kind: 'agent',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_11',
        trigger: 'ingest',
        action: 'propose_reschedule',
        outcome: 'proposed',
        summary: 'Detected conflict with "Executive Partnership Discussion". Proposed reschedule draft with 3 alternative slots.',
        details: {
          isConflict: true,
          slots: ['Thu, Oct 24, 11:00 AM PST', 'Thu, Oct 24, 3:30 PM PST', 'Fri, Oct 25, 2:00 PM PST'],
          draftId: 'draft_seed_sched_01',
          stepsCount: 3,
        },
        confidence: 0.96,
        requiresHuman: true,
        undo: { type: 'discard_draft', payload: { draftId: 'draft_seed_sched_01' } },
        usedLLM: true,
        fallbackUsed: false,
        recordedSample: true,
        stopReason: 'goal_reached',
        steps: [
          {
            i: 1,
            thoughtSummary: 'Incoming sync request for Thursday 2:00 PM. Checking calendar for conflicts.',
            action: 'tool',
            tool: 'check_conflicts',
            args: { proposedStart: new Date(now + 24 * 3600 * 1000).toISOString() },
            observationSummary: 'Conflict detected: Collides with "Executive Partnership Discussion" at 2:00 PM.',
            durationMs: 230,
          },
          {
            i: 2,
            thoughtSummary: 'Conflict confirmed. Generating 3 alternative slots during business hours.',
            action: 'tool',
            tool: 'suggest_free_slots',
            args: { durationMin: 45 },
            observationSummary: 'Available non-conflicting slots found: 11:00 AM, 3:30 PM, and Friday 2:00 PM.',
            durationMs: 190,
          },
          {
            i: 3,
            thoughtSummary: 'Drafting reschedule proposal with alternative slots for human approval.',
            action: 'tool',
            tool: 'propose_reschedule',
            args: {
              slots: ['Thu, Oct 24, 11:00 AM PST', 'Thu, Oct 24, 3:30 PM PST', 'Fri, Oct 25, 2:00 PM PST'],
              note: 'Collides with Executive Partnership Discussion',
            },
            observationSummary: 'Reschedule proposal generated successfully.',
            durationMs: 160,
          },
        ],
        usage: { stepsCount: 3, durationMs: 580, estimatedTokens: 1120 },
        durationMs: 580,
        startedAt: new Date(now - 1000 * 60 * 8),
        createdAt: new Date(now - 1000 * 60 * 8),
      },

      // Pre-recorded sample trace 5: Drafting Agent with check_facts self-review (th_01)
      {
        _id: 'run_sample_draft_th01',
        agentId: 'drafting',
        kind: 'agent',
        orgId: 'org_vortex_001',
        clientId: 'client_priya_001',
        threadId: 'th_01',
        trigger: 'ingest',
        action: 'pre_draft_reply',
        outcome: 'proposed',
        summary: "Pre-drafted fact-checked reply in Priya Sharma's voice for one-tap approval.",
        details: {
          draftId: 'draft_seed_01',
          recipient: 'mark.suster@upfront.com',
          isClientDecision: true,
          warnings: [],
          stepsCount: 3,
        },
        confidence: 0.95,
        requiresHuman: true,
        undo: { type: 'discard_draft', payload: { draftId: 'draft_seed_01' } },
        usedLLM: true,
        fallbackUsed: false,
        recordedSample: true,
        stopReason: 'goal_reached',
        steps: [
          {
            i: 1,
            thoughtSummary: 'Reviewing investor tone preferences and past replies for Benchmark term sheet.',
            action: 'tool',
            tool: 'get_past_replies',
            args: { limit: 3 },
            observationSummary: 'Found 3 prior investor responses: concise, decisive, professional signoff.',
            durationMs: 200,
          },
          {
            i: 2,
            thoughtSummary: 'Composing draft and running check_facts to verify valuation and legal terms.',
            action: 'tool',
            tool: 'check_facts',
            args: {
              draftText: 'Hi Mark, Thank you for sending over the updated term sheet. I have reviewed the details and we are in agreement to proceed as outlined.',
              threadId: 'th_01',
            },
            observationSummary: 'Verified: 0 factual mismatches or ungrounded claims detected.',
            durationMs: 210,
          },
          {
            i: 3,
            thoughtSummary: 'Fact-check passed cleanly. Proposing draft for Priya Sharma 1-tap signoff.',
            action: 'tool',
            tool: 'propose_draft',
            args: {
              text: 'Hi Mark, Thank you for sending over the updated term sheet. I have reviewed the details and we are in agreement to proceed as outlined.',
              warnings: [],
            },
            observationSummary: 'Draft proposed successfully.',
            durationMs: 140,
          },
        ],
        usage: { stepsCount: 3, durationMs: 550, estimatedTokens: 990 },
        durationMs: 550,
        startedAt: new Date(now - 1000 * 60 * 12),
        createdAt: new Date(now - 1000 * 60 * 12),
      },

      // Pre-recorded sample trace 6: Triage Investigator evaluating Rohan demurrage invoice exceeding limit (th_r_19)
      {
        _id: 'run_sample_triage_thr19',
        agentId: 'triage_investigator',
        kind: 'agent',
        orgId: 'org_vortex_001',
        clientId: 'client_rohan_002',
        threadId: 'th_r_19',
        trigger: 'ingest',
        action: 'investigation_resolved_classification',
        outcome: 'auto_handled',
        summary: "Triage Investigator checked playbook threshold ($15k): $16,500 demurrage charge exceeds limit -> CLIENT_TO_REPLY (96%).",
        details: {
          previousLabel: 'NEEDS_REVIEW',
          resolvedLabel: 'CLIENT_TO_REPLY',
          confidence: 0.96,
          evidence: ['Demurrage charge of $16,500 on Cargo Vessel 412', 'Playbook max assistant spend: $15,000'],
          reason: 'Amount exceeds Maya Lin approval limit ($15,000), escalating to Rohan Kapoor.',
          stepsCount: 2,
        },
        confidence: 0.96,
        requiresHuman: true,
        undo: null,
        usedLLM: true,
        fallbackUsed: false,
        recordedSample: true,
        stopReason: 'goal_reached',
        steps: [
          {
            i: 1,
            thoughtSummary: 'Evaluating $16,500 demurrage charge against client financial thresholds.',
            action: 'tool',
            tool: 'get_playbook',
            args: {},
            observationSummary: 'Client maxAssistantApprovalUsd is $15,000. Invoices > $15,000 require executive signoff.',
            durationMs: 200,
          },
          {
            i: 2,
            thoughtSummary: '$16,500 strictly exceeds $15,000 threshold. Proposing CLIENT_TO_REPLY.',
            action: 'tool',
            tool: 'propose_classification',
            args: {
              label: 'CLIENT_TO_REPLY',
              confidence: 0.96,
              reason: 'Demurrage invoice of $16,500 exceeds $15,000 assistant delegation limit.',
              evidence: ['Demurrage charge: $16,500', 'Max assistant spend: $15,000'],
            },
            observationSummary: 'Proposal staged.',
            durationMs: 160,
          },
        ],
        usage: { stepsCount: 2, durationMs: 360, estimatedTokens: 720 },
        durationMs: 360,
        startedAt: new Date(now - 1000 * 60 * 15),
        createdAt: new Date(now - 1000 * 60 * 15),
      },

      // Existing deterministic workflow runs
      {
        _id: 'run_seed_001',
        agentId: 'guardian',
        kind: 'workflow',
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
        startedAt: new Date(now - 1000 * 60 * 20),
        createdAt: new Date(now - 1000 * 60 * 20),
      },
      {
        _id: 'run_seed_003',
        agentId: 'followup',
        kind: 'workflow',
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
        startedAt: new Date(now - 1000 * 60 * 25),
        createdAt: new Date(now - 1000 * 60 * 25),
      },
      {
        _id: 'run_seed_006',
        agentId: 'triage',
        kind: 'workflow',
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
        _id: 'run_seed_009',
        agentId: 'digest',
        kind: 'workflow',
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
      {
        _id: 'run_seed_rohan_001',
        agentId: 'guardian',
        kind: 'workflow',
        orgId: 'org_vortex_001',
        clientId: 'client_rohan_002',
        threadId: 'th_r_18',
        trigger: 'ingest',
        action: 'guardian_escalated',
        outcome: 'escalated',
        summary: 'Guardian escalated: Teamsters collective bargaining contract grievance detected. Flagged for review.',
        details: { violationReasons: ['Contains union/legal grievance terms', 'Teamsters contract notice'] },
        confidence: 0.96,
        requiresHuman: true,
        undo: null,
        usedLLM: false,
        fallbackUsed: false,
        durationMs: 10,
        startedAt: new Date(now - 1000 * 60 * 18),
        createdAt: new Date(now - 1000 * 60 * 18),
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

/**
 * Checks whether an identifier belongs to the pre-seeded Vortex Dynamics demo workspace.
 * When DEMO_MODE=true and MongoDB Atlas is connected, demo-org operations stay routed to the
 * pre-seeded demo store so evaluators always get all 60 demo threads, 2 clients, drafts, and traces
 * while real user signups persist cleanly to MongoDB Atlas.
 * @param {any} val
 * @returns {boolean}
 */
function isDemoIdentifier(val) {
  if (!env.DEMO_MODE || val === undefined || val === null) return false;
  const s = String(val).toLowerCase().trim();
  if (!s) return false;
  return (
    s === 'org_vortex_001' ||
    s === 'user_maya' ||
    s === 'user_priya' ||
    s === 'maya@vortexdynamics.com' ||
    s === 'priya@vortexdynamics.com' ||
    s === 'client_priya_001' ||
    s === 'client_rohan_002' ||
    s.startsWith('client_') ||
    s.startsWith('th_') ||
    s.startsWith('msg_') ||
    s.startsWith('draft_') ||
    s.startsWith('run_') ||
    s.startsWith('acc_demo_') ||
    s.startsWith('act_') ||
    s.startsWith('evt_') ||
    s.startsWith('corr_')
  );
}

/**
 * Returns true only when MongoDB is connected AND none of the identifiers belong to the demo org
 * @param {...any} identifiers
 * @returns {boolean}
 */
function useMongoFor(...identifiers) {
  if (!isRealDBConnected()) return false;
  if (identifiers.some(isDemoIdentifier)) return false;
  return true;
}

// ============================================================================
// Repository Operations Layer (Works with both Mongoose and In-Memory Fallback)
// ============================================================================

export const store = {
  // Users
  async findUserByEmail(email) {
    if (useMongoFor(email)) {
      return await User.findOne({ email: email.toLowerCase() });
    }
    return memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id) {
    if (useMongoFor(id)) {
      return await User.findById(id);
    }
    return memoryUsers.find((u) => u._id === id || String(u._id) === String(id)) || null;
  },

  async createUser(userData) {
    const id = 'user_' + Date.now();
    const userDoc = { _id: id, ...userData, createdAt: new Date(), updatedAt: new Date() };
    if (useMongoFor(userData?.orgId, userData?.email)) {
      const { _id, ...mongoData } = userDoc;
      return await User.create(mongoData);
    }
    memoryUsers.push(userDoc);
    return userDoc;
  },

  async updateUser(userId, updateData) {
    if (useMongoFor(userId, updateData?.orgId)) {
      return await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
    }
    const idx = memoryUsers.findIndex((u) => u._id === userId || String(u._id) === String(userId));
    if (idx !== -1) {
      memoryUsers[idx] = { ...memoryUsers[idx], ...updateData, updatedAt: new Date() };
      return memoryUsers[idx];
    }
    return null;
  },

  async findUserByClientId(clientId) {
    if (useMongoFor(clientId)) {
      return await User.findOne({ clientId });
    }
    return memoryUsers.find((u) => u.clientId === clientId) || null;
  },

  // Clients
  async getClientsByOrgId(orgId) {
    if (useMongoFor(orgId)) {
      return await Client.find({ orgId }).lean();
    }
    return memoryClients.filter((c) => c.orgId === orgId);
  },

  async getClientByOrgId(orgId) {
    if (useMongoFor(orgId)) {
      return await Client.findOne({ orgId }).lean();
    }
    return memoryClients.find((c) => c.orgId === orgId) || null;
  },

  async getClientById(id) {
    if (useMongoFor(id)) {
      return await Client.findById(id).lean();
    }
    return memoryClients.find((c) => c._id === id || String(c._id) === String(id)) || null;
  },

  async getClientByOrgAndId(orgId, clientId) {
    if (useMongoFor(orgId, clientId)) {
      return await Client.findOne({ _id: clientId, orgId }).lean();
    }
    return (
      memoryClients.find(
        (c) => (c._id === clientId || String(c._id) === String(clientId)) && c.orgId === orgId
      ) || null
    );
  },

  async createClient(clientData) {
    const id = clientData._id || 'client_' + Date.now();
    const doc = { _id: id, ...clientData, createdAt: new Date(), updatedAt: new Date() };
    if (useMongoFor(clientData?.orgId, clientData?._id)) {
      const { _id, ...mongoData } = doc;
      return await Client.create(mongoData);
    }
    memoryClients.push(doc);
    return doc;
  },

  async updateClient(clientId, updateData) {
    if (useMongoFor(clientId, updateData?.orgId)) {
      return await Client.findByIdAndUpdate(clientId, { $set: updateData }, { new: true });
    }
    const idx = memoryClients.findIndex((c) => c._id === clientId || String(c._id) === String(clientId));
    if (idx !== -1) {
      memoryClients[idx] = { ...memoryClients[idx], ...updateData, updatedAt: new Date() };
      return memoryClients[idx];
    }
    return null;
  },

  async updatePlaybook(clientId, playbookUpdates) {
    if (useMongoFor(clientId)) {
      const existing = await Client.findById(clientId).lean();
      return await Client.findByIdAndUpdate(
        clientId,
        { $set: { playbook: { ...(existing?.playbook || {}), ...playbookUpdates, updatedAt: new Date() } } },
        { new: true }
      );
    }
    const client = memoryClients.find((c) => c._id === clientId || String(c._id) === String(clientId));
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

  // Agent Memory ("Agent Notes" per client)
  async getAgentMemory(clientId, agentId) {
    const client = await this.getClientById(clientId);
    if (!client) return { instruction: '', memories: [] };
    const memory = client.agentMemory?.[agentId] || { instruction: '', memories: [] };
    return memory;
  },

  async updateAgentMemory(clientId, agentId, data) {
    const client = await this.getClientById(clientId);
    if (!client) return null;
    const currentMemories = client.agentMemory || {};
    const updatedAgentMemory = {
      ...currentMemories,
      [agentId]: {
        instruction:
          typeof data.instruction === 'string'
            ? data.instruction.slice(0, 500)
            : currentMemories[agentId]?.instruction || '',
        memories: Array.isArray(data.memories)
          ? data.memories
          : currentMemories[agentId]?.memories || [],
      },
    };
    return await this.updateClient(clientId, { agentMemory: updatedAgentMemory });
  },

  async addAgentMemoryEntry(clientId, agentId, entry) {
    const client = await this.getClientById(clientId);
    if (!client) return null;
    const currentMemories = client.agentMemory || {};
    const agentConfig = currentMemories[agentId] || { instruction: '', memories: [] };
    const newEntry = {
      id: entry.id || 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      text: (entry.text || '').slice(0, 200),
      source: entry.source || 'manual',
      pinned: !!entry.pinned,
      enabled: entry.enabled !== false,
      createdAt: new Date(),
      createdBy: entry.createdBy || 'Maya Lin',
    };
    const updatedList = [newEntry, ...(agentConfig.memories || [])];
    await this.updateAgentMemory(clientId, agentId, {
      instruction: agentConfig.instruction,
      memories: updatedList,
    });
    return newEntry;
  },

  async removeAgentMemoryEntry(clientId, agentId, memoryId) {
    const client = await this.getClientById(clientId);
    if (!client) return null;
    const currentMemories = client.agentMemory || {};
    const agentConfig = currentMemories[agentId] || { instruction: '', memories: [] };
    const updatedList = (agentConfig.memories || []).filter((m) => m.id !== memoryId);
    return await this.updateAgentMemory(clientId, agentId, {
      instruction: agentConfig.instruction,
      memories: updatedList,
    });
  },

  async toggleAgentMemoryEntry(clientId, agentId, memoryId, updates) {
    const client = await this.getClientById(clientId);
    if (!client) return null;
    const currentMemories = client.agentMemory || {};
    const agentConfig = currentMemories[agentId] || { instruction: '', memories: [] };
    let updatedItem = null;
    const updatedList = (agentConfig.memories || []).map((m) => {
      if (m.id === memoryId) {
        updatedItem = { ...m, ...updates };
        return updatedItem;
      }
      return m;
    });
    await this.updateAgentMemory(clientId, agentId, {
      instruction: agentConfig.instruction,
      memories: updatedList,
    });
    return updatedItem;
  },

  // Today Cross-Client Aggregated Command Dashboard Summary
  async getTodaySummary(orgId) {
    const clients = await this.getClientsByOrgId(orgId);
    const threads = await this.getThreads({ orgId, isArchived: false });
    const runs = await this.getAgentRuns({ orgId, limit: 100 });

    const clientSummaries = [];
    let totalNeedsMaya = 0;
    let totalWaitingOnClients = 0;
    let totalHandledToday = 0;
    let totalMeetingsToday = 0;
    let totalConflicts = 0;

    for (const c of clients) {
      const cThreads = threads.filter((t) => t.clientId === c._id);
      const needsMaya = cThreads.filter(
        (t) =>
          (t.currentLabel === 'ASSISTANT_TO_REPLY' ||
            t.currentLabel === 'NEEDS_REVIEW' ||
            t.reviewState === 'FLAGGED') &&
          !t.isArchived
      ).length;
      const waitingOnClient = cThreads.filter(
        (t) =>
          (t.currentLabel === 'CLIENT_TO_REPLY' || t.clientVisible) &&
          !t.isArchived &&
          t.clientStatus !== 'handled'
      ).length;
      const meetings = cThreads.flatMap((t) => t.meetings || []);
      const conflicts = meetings.filter((m) => m.isConflict).length;

      const cRuns = runs.filter((r) => r.clientId === c._id);
      const handledToday = cRuns.filter(
        (r) => r.outcome === 'auto_handled' || r.outcome === 'reversed'
      ).length;

      totalNeedsMaya += needsMaya;
      totalWaitingOnClients += waitingOnClient;
      totalHandledToday += handledToday;
      totalMeetingsToday += meetings.length;
      totalConflicts += conflicts;

      clientSummaries.push({
        _id: c._id,
        id: c._id,
        clientId: c._id,
        name: c.name,
        email: c.email,
        title: c.title,
        company: c.company,
        inviteStatus: c.inviteStatus,
        needsMaya,
        waitingOnClient,
        handledToday,
        meetingsToday: meetings.length,
        conflicts,
        threadsCount: cThreads.length,
      });
    }

    // Prioritized "Needs You Now" stack:
    // Merges Needs Review, Agent Proposals, Handed back, Aging client items
    const priorityThreads = threads
      .filter((t) => {
        const isNeedsReview = t.currentLabel === 'NEEDS_REVIEW' || t.reviewState === 'FLAGGED';
        const isAssistantReply = t.currentLabel === 'ASSISTANT_TO_REPLY';
        const isHandedBack = t.clientStatus === 'handed_back';
        const isAging =
          t.isWaiting &&
          t.waitingSince &&
          Date.now() - new Date(t.waitingSince).getTime() > 2 * 24 * 60 * 60 * 1000;
        return (isNeedsReview || isAssistantReply || isHandedBack || isAging) && !t.isArchived;
      })
      .map((t) => {
        const client = clients.find((c) => c._id === t.clientId);
        let priorityScore = 1;
        let urgencyReason = 'Needs assistant reply';

        if (t.dueDate && new Date(t.dueDate).getTime() - Date.now() < 24 * 60 * 60 * 1000) {
          priorityScore = 10;
          urgencyReason = 'Upcoming deadline today';
        } else if (t.currentLabel === 'NEEDS_REVIEW' || t.reviewState === 'FLAGGED') {
          priorityScore = 9;
          urgencyReason = 'Guardian risk flag / Needs Review';
        } else if (t.clientStatus === 'handed_back') {
          priorityScore = 8;
          urgencyReason = 'Handed back by client';
        } else if (t.meetings?.some((m) => m.isConflict)) {
          priorityScore = 7;
          urgencyReason = 'Calendar meeting conflict';
        } else if (t.isImportant) {
          priorityScore = 6;
          urgencyReason = 'Marked important';
        }

        return {
          threadId: t._id,
          clientId: t.clientId,
          clientName: client?.name || 'Executive Client',
          clientCompany: client?.company || '',
          subject: t.subject,
          snippet: t.snippet,
          currentLabel: t.currentLabel,
          confidence: t.confidence,
          dueDate: t.dueDate,
          priorityScore,
          urgencyReason,
          meetings: t.meetings || [],
          lastMessageAt: t.lastMessageAt,
          aiReason: t.aiReason || null,
        };
      })
      .sort(
        (a, b) =>
          b.priorityScore - a.priorityScore ||
          new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
      );

    // Cross-client meetings
    const allMeetings = threads.flatMap((t) => {
      const client = clients.find((c) => c._id === t.clientId);
      return (t.meetings || []).map((m) => ({
        ...m,
        threadId: t._id,
        clientId: t.clientId,
        clientName: client?.name || 'Executive Client',
      }));
    });

    // Overnight / recent 8 agent runs
    const overnightRuns = runs.slice(0, 8).map((r) => {
      const client = clients.find((c) => c._id === r.clientId);
      return {
        ...r,
        clientName: client?.name || 'Client',
      };
    });

    return {
      summarySentence: `${totalNeedsMaya} things need you across ${clients.length} clients. ${totalHandledToday} were handled by agents.`,
      totalNeedsMaya,
      totalWaitingOnClients,
      totalHandledToday,
      totalMeetingsToday,
      totalConflicts,
      clients: clientSummaries,
      clientCards: clientSummaries,
      priorityThreads: priorityThreads.slice(0, 15),
      needsYouNow: priorityThreads.slice(0, 15),
      needsYouNowCount: priorityThreads.length,
      meetings: allMeetings,
      overnightRuns,
    };
  },

  // Threads
  async getThreads(filters = {}) {
    let threads = [];
    if (useMongoFor(filters.orgId, filters.clientId)) {
      threads = await Thread.find(filters).sort({ lastMessageAt: -1 }).lean();
    } else {
      threads = [...memoryThreads];
      if (filters.orgId) {
        threads = threads.filter((t) => t.orgId === filters.orgId);
      }
      if (filters.clientId) {
        threads = threads.filter((t) => t.clientId === filters.clientId);
      }
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
    if (useMongoFor(id)) {
      return await Thread.findById(id).lean();
    }
    return memoryThreads.find((t) => t._id === id || t.providerThreadId === id) || null;
  },

  async updateThread(id, updates) {
    if (useMongoFor(id, updates?.orgId)) {
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
    if (useMongoFor(threadData?.orgId, threadData?.clientId, threadData?._id)) {
      const { _id, ...mongoData } = doc;
      return await Thread.create(mongoData);
    }
    memoryThreads.unshift(doc);
    return doc;
  },

  async findThreadByProviderId(providerThreadId, connectedAccountId) {
    if (useMongoFor(providerThreadId, connectedAccountId)) {
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
    if (useMongoFor(threadId)) {
      return await Message.find({ threadId }).sort({ date: 1 }).lean();
    }
    return memoryMessages
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async findMessageByProviderId(providerMessageId) {
    if (useMongoFor(providerMessageId)) {
      return await Message.findOne({ providerMessageId }).lean();
    }
    return memoryMessages.find((m) => m.providerMessageId === providerMessageId) || null;
  },

  async updateMessage(id, updates) {
    if (useMongoFor(id)) {
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
    if (useMongoFor(messageData?.orgId, messageData?.threadId, messageData?._id)) {
      const { _id, ...mongoData } = doc;
      return await Message.create(mongoData);
    }
    memoryMessages.push(doc);
    return doc;
  },

  // Corrections
  async getCorrections(clientId, limit = 10) {
    if (useMongoFor(clientId)) {
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
    if (useMongoFor(data?.orgId, data?.clientId, data?.threadId)) {
      const { _id, ...mongoData } = doc;
      return await Correction.create(mongoData);
    }
    memoryCorrections.unshift(doc);
    return doc;
  },

  // Classification Events (Timeline)
  async getClassificationEvents(threadId) {
    if (useMongoFor(threadId)) {
      return await ClassificationEvent.find({ threadId }).sort({ createdAt: -1 }).lean();
    }
    return memoryClassificationEvents
      .filter((e) => e.threadId === threadId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async addClassificationEvent(eventData) {
    const id = 'evt_' + Date.now();
    const doc = { _id: id, ...eventData, createdAt: new Date() };
    if (useMongoFor(eventData?.orgId, eventData?.threadId)) {
      const { _id, ...mongoData } = doc;
      return await ClassificationEvent.create(mongoData);
    }
    memoryClassificationEvents.unshift(doc);
    return doc;
  },

  // Drafts
  async getDraftsByThreadId(threadId) {
    if (useMongoFor(threadId)) {
      return await Draft.find({ threadId }).sort({ createdAt: -1 }).lean();
    }
    return memoryDrafts
      .filter((d) => d.threadId === threadId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getDraftByThreadId(threadId) {
    const drafts = await this.getDraftsByThreadId(threadId);
    return drafts && drafts.length > 0 ? drafts[0] : null;
  },

  async getPendingDraftThreadIds(orgId) {
    if (useMongoFor(orgId)) {
      const rows = await Draft.find({
        ...(orgId ? { orgId } : {}),
        status: 'pending_client',
      })
        .select('threadId')
        .lean();
      return new Set(rows.map((r) => String(r.threadId)));
    }
    return new Set(
      memoryDrafts
        .filter((d) => (!orgId || d.orgId === orgId) && d.status === 'pending_client')
        .map((d) => String(d.threadId))
    );
  },

  async getAgentProposals(orgId) {
    if (useMongoFor(orgId)) {
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
      if (useMongoFor(draftData._id, draftData.orgId, draftData.threadId)) {
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
    if (useMongoFor(draftData.orgId, draftData.threadId)) {
      const { _id, ...mongoData } = doc;
      return await Draft.create(mongoData);
    }
    memoryDrafts.unshift(doc);
    return doc;
  },

  // Activity Logs
  async getActivityLogs(orgId, limit = 20) {
    if (useMongoFor(orgId)) {
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
    if (useMongoFor(logData?.orgId, logData?.threadId)) {
      const { _id, ...mongoData } = doc;
      return await ActivityLog.create(mongoData);
    }
    memoryActivityLogs.unshift(doc);
    return doc;
  },

  // Connected Accounts
  async getConnectedAccounts(orgId) {
    if (useMongoFor(orgId)) {
      return await ConnectedAccount.find({ orgId }).lean();
    }
    return memoryConnectedAccounts.filter((a) => !orgId || a.orgId === orgId);
  },

  async updateConnectedAccount(id, updates) {
    if (useMongoFor(id, updates?.orgId)) {
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
    if (useMongoFor(accData?.orgId)) {
      const { _id, ...mongoData } = doc;
      return await ConnectedAccount.create(mongoData);
    }
    memoryConnectedAccounts.push(doc);
    return doc;
  },

  async removeConnectedAccount(id) {
    if (useMongoFor(id)) {
      return await ConnectedAccount.findByIdAndDelete(id);
    }
    memoryConnectedAccounts = memoryConnectedAccounts.filter((a) => a._id !== id && String(a._id) !== String(id));
    return true;
  },

  async purgeAccountData(accountId, orgId) {
    if (useMongoFor(accountId, orgId)) {
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
    const doc = {
      _id: id,
      status: 'pending',
      ...inviteData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (useMongoFor(inviteData?.orgId, inviteData?.clientId)) {
      const { _id, ...mongoData } = doc;
      return await Invite.create(mongoData);
    }
    memoryInvites.push(doc);
    return doc;
  },

  async findInviteByTokenHash(tokenHash) {
    if (isRealDBConnected()) {
      const found = await Invite.findOne({ tokenHash });
      if (found) return found;
    }
    return memoryInvites.find((i) => i.tokenHash === tokenHash) || null;
  },

  async findLatestInviteByClient({ orgId, clientId }) {
    if (useMongoFor(orgId, clientId)) {
      return await Invite.findOne({ orgId, clientId }).sort({ createdAt: -1 });
    }
    const matches = memoryInvites
      .filter((i) => i.orgId === orgId && (i.clientId === clientId || !clientId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return matches[0] || null;
  },

  async updateInvite(idOrHash, updateData) {
    if (useMongoFor(idOrHash, updateData?.orgId) && !String(idOrHash).startsWith('inv_')) {
      return await Invite.findOneAndUpdate(
        { $or: [{ _id: idOrHash }, { tokenHash: idOrHash }] },
        { $set: { ...updateData, updatedAt: new Date() } },
        { new: true }
      );
    }
    const idx = memoryInvites.findIndex(
      (i) => i._id === idOrHash || i.tokenHash === idOrHash
    );
    if (idx !== -1) {
      memoryInvites[idx] = { ...memoryInvites[idx], ...updateData, updatedAt: new Date() };
      return memoryInvites[idx];
    }
    return null;
  },

  async revokePendingInvitesForClient({ orgId, clientId, email }) {
    if (useMongoFor(orgId, clientId, email)) {
      return await Invite.updateMany(
        {
          orgId,
          $or: [{ clientId }, { email: email?.toLowerCase() }],
          status: 'pending',
        },
        { $set: { status: 'revoked', updatedAt: new Date() } }
      );
    }
    memoryInvites.forEach((inv) => {
      if (
        inv.orgId === orgId &&
        (inv.clientId === clientId || (email && inv.email.toLowerCase() === email.toLowerCase())) &&
        inv.status === 'pending'
      ) {
        inv.status = 'revoked';
        inv.updatedAt = new Date();
      }
    });
  },

  // Agent Runs & Autonomous Audit Logs
  async addAgentRun(runData) {
    const id = 'run_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const doc = {
      _id: id,
      ...runData,
      createdAt: new Date(),
    };
    if (useMongoFor(runData?.orgId, runData?.threadId)) {
      const { _id, ...mongoData } = doc;
      return await AgentRun.create(mongoData);
    }
    memoryAgentRuns.unshift(doc);
    // Keep max 500 recent runs in memory
    if (memoryAgentRuns.length > 500) memoryAgentRuns.length = 500;
    return doc;
  },

  async getAgentRuns({ orgId, threadId, agentId, outcome, limit = 50 }) {
    if (useMongoFor(orgId, threadId)) {
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
    if (useMongoFor(id)) {
      return await AgentRun.findById(id);
    }
    return memoryAgentRuns.find((r) => r._id === id || String(r._id) === String(id)) || null;
  },

  async updateAgentRun(id, updates) {
    if (useMongoFor(id, updates?.orgId)) {
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
    if (useMongoFor(orgId)) {
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

  // ========================================================
  // BYOK AI Provider Configuration (AES-256-GCM Encrypted)
  // ========================================================
  async getOrgAiConfig(orgId, { includeSecret = false } = {}) {
    if (!orgId) return null;
    let doc = null;
    if (isRealDBConnected()) {
      doc = await AiProviderConfig.findOne({ orgId }).lean();
    } else {
      doc = memoryAiConfigs.get(orgId) || null;
    }
    if (!doc) return null;

    const hasEncryptedKey = Boolean(doc.encryptedApiKey?.cipherText && doc.encryptedApiKey?.iv && doc.encryptedApiKey?.authTag);
    const safeConfig = {
      orgId: doc.orgId,
      provider: doc.provider,
      model: doc.model,
      keyHint: doc.keyHint || '',
      keyConfigured: hasEncryptedKey,
      enabled: doc.enabled !== false,
      lastTestedAt: doc.lastTestedAt || null,
      lastTestStatus: doc.lastTestStatus || 'untested',
      lastTestError: doc.lastTestError || null,
      updatedAt: doc.updatedAt || null,
    };

    if (includeSecret && hasEncryptedKey) {
      try {
        safeConfig.apiKey = decryptToken(doc.encryptedApiKey);
      } catch (err) {
        logger.error({ orgId, err: err.message }, '[Store] Failed to decrypt BYOK API key');
        safeConfig.apiKey = '';
      }
    }

    return safeConfig;
  },

  async saveOrgAiConfig(orgId, { provider, model, apiKey, enabled = true, updatedBy = null, lastTestStatus, lastTestError, lastTestedAt }) {
    if (!orgId) throw new Error('orgId is required');
    const existing = isRealDBConnected()
      ? await AiProviderConfig.findOne({ orgId }).lean()
      : memoryAiConfigs.get(orgId) || null;

    let encryptedApiKey = existing?.encryptedApiKey || { cipherText: '', iv: '', authTag: '' };
    let keyHint = existing?.keyHint || '';
    let nextTestStatus = lastTestStatus || existing?.lastTestStatus || 'untested';
    let nextTestError = lastTestError !== undefined ? lastTestError : (existing?.lastTestError || null);
    let nextTestedAt = lastTestedAt !== undefined ? lastTestedAt : (existing?.lastTestedAt || null);

    if (typeof apiKey === 'string' && apiKey.trim()) {
      const cleanKey = apiKey.trim();
      encryptedApiKey = encryptToken(cleanKey);
      keyHint = maskApiKey(cleanKey);
      if (!lastTestStatus) {
        nextTestStatus = 'untested';
        nextTestError = null;
      }
    } else if (existing && (existing.provider !== provider || existing.model !== model) && !lastTestStatus) {
      nextTestStatus = 'untested';
      nextTestError = null;
    }

    const payload = {
      orgId,
      provider,
      model: String(model || '').trim(),
      encryptedApiKey,
      keyHint,
      enabled: Boolean(enabled),
      lastTestedAt: nextTestedAt,
      lastTestStatus: nextTestStatus,
      lastTestError: nextTestError,
      updatedBy,
      updatedAt: new Date(),
    };

    if (isRealDBConnected()) {
      await AiProviderConfig.findOneAndUpdate(
        { orgId },
        { $set: payload },
        { upsert: true, new: true }
      ).lean();
    } else {
      memoryAiConfigs.set(orgId, payload);
    }

    return this.getOrgAiConfig(orgId, { includeSecret: false });
  },

  async updateOrgAiTestStatus(orgId, { status, error = null }) {
    if (!orgId) return null;
    const updates = {
      lastTestedAt: new Date(),
      lastTestStatus: status,
      lastTestError: error,
      updatedAt: new Date(),
    };
    if (isRealDBConnected()) {
      await AiProviderConfig.findOneAndUpdate({ orgId }, { $set: updates }).lean();
    } else if (memoryAiConfigs.has(orgId)) {
      memoryAiConfigs.set(orgId, { ...memoryAiConfigs.get(orgId), ...updates });
    }
    return this.getOrgAiConfig(orgId, { includeSecret: false });
  },

  async deleteOrgAiConfig(orgId) {
    if (!orgId) return false;
    if (isRealDBConnected()) {
      await AiProviderConfig.deleteOne({ orgId });
    } else {
      memoryAiConfigs.delete(orgId);
    }
    return true;
  },

  initSeedData,
};
