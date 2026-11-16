# DATA MODEL SPECIFICATION — Daybook Mail

> **Architecture Note**: Data is stored in MongoDB Atlas and modeled with Mongoose. All inbox segments are dynamic query views over a single `threads` collection. Tokens and sensitive secrets are encrypted at rest using AES-256-GCM.

---

## 1. Entity Relationship Overview

```
 ┌──────────────┐          1:N         ┌──────────────┐
 │     User     ├─────────────────────►│ ActivityLog  │
 └──────┬───────┘                      └──────────────┘
        │ 1:1
        ▼
 ┌──────────────┐          1:N         ┌──────────────────┐
 │    Client    ├─────────────────────►│ ConnectedAccount │
 └──────┬───────┘                      └──────────────────┘
        │ 1:N
        ▼
 ┌──────────────┐          1:N         ┌──────────────┐
 │    Thread    ├─────────────────────►│   Message    │
 └──────┬───────┘                      └──────────────┘
        │
        ├── 1:N ──► Classification
        ├── 1:N ──► ClassificationEvent
        ├── 1:N ──► Correction
        └── 1:N ──► Draft
```

---

## 2. Detailed Schemas & Index Definitions

### 2.1. User Schema (`users`)
Represents users logging into the system (either Maya as Assistant or Priya as Client).

```javascript
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['assistant', 'client', 'admin'], required: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null }, // Linked client profile
  avatarUrl: { type: String, default: null },
  preferences: {
    notificationsEnabled: { type: Boolean, default: true },
    theme: { type: String, enum: ['editorial', 'light', 'dark'], default: 'editorial' },
    keyboardShortcutsEnabled: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UserSchema.index({ orgId: 1, role: 1 });
```

### 2.2. Client Profile & Playbook Schema (`clients`)
Represents the executive boss whose inbox is being managed. Holds the living Playbook rules.

```javascript
const ClientSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true }, // e.g. "Priya Sharma"
  email: { type: String, required: true, unique: true, lowercase: true },
  title: { type: String, default: 'Founder & CEO' },
  company: { type: String, default: 'Vortex Dynamics' },
  avatarUrl: { type: String, default: null },

  // Living Delegation Playbook
  playbook: {
    vipSenders: [{ type: String, lowercase: true, trim: true }], // e.g. ["mark.suster@upfront.com"]
    vipDomains: [{ type: String, lowercase: true, trim: true }], // e.g. ["sequoia.com", "vortexdynamics.com"]
    topicRules: [
      {
        topic: { type: String, required: true }, // e.g. "Legal Contracts & Term Sheets"
        disposition: { 
          type: String, 
          enum: ['ALWAYS_CLIENT', 'ASSISTANT_CAN_HANDLE', 'NEVER_BOTHER_CLIENT'], 
          required: true 
        },
        description: { type: String },
      }
    ],
    financialThresholds: {
      maxAssistantApprovalUsd: { type: Number, default: 1000 }, // Spend > $1k escalates to Priya
    },
    customInstructions: { type: String, default: '' }, // Free-text guidance for LLM
    updatedAt: { type: Date, default: Date.now },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ClientSchema.index({ orgId: 1 });
```

### 2.3. Connected Account Schema (`connectedAccounts`)
Tracks mailboxes connected via OAuth2 or demo injector.

```javascript
const ConnectedAccountSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  provider: { type: String, enum: ['demo', 'gmail', 'outlook'], required: true },
  emailAddress: { type: String, required: true },
  status: { type: String, enum: ['idle', 'syncing', 'error', 'disconnected'], default: 'idle' },
  lastSyncedAt: { type: Date, default: null },
  scopes: [{ type: String }],
  
  // AES-256-GCM Encrypted Token Storage
  auth: {
    accessTokenCipher: { type: String, default: null },
    refreshTokenCipher: { type: String, default: null },
    iv: { type: String, default: null },
    authTag: { type: String, default: null },
    expiresAt: { type: Date, default: null },
  },

  error: {
    code: { type: String, default: null },
    message: { type: String, default: null },
    occurredAt: { type: Date, default: null },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ConnectedAccountSchema.index({ orgId: 1, provider: 1, emailAddress: 1 }, { unique: true });
```

### 2.4. Thread Schema (`threads`)
The primary unified entity representing an email conversation.

```javascript
const ThreadSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  connectedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConnectedAccount', required: true },
  
  // Provider IDs
  provider: { type: String, enum: ['demo', 'gmail', 'outlook'], required: true },
  providerThreadId: { type: String, required: true }, // e.g. Gmail threadId or Outlook conversationId

  subject: { type: String, required: true, trim: true },
  snippet: { type: String, default: '' },
  participants: [
    {
      name: { type: String, default: '' },
      email: { type: String, required: true, lowercase: true, trim: true },
      isClient: { type: Boolean, default: false },
      isAssistant: { type: Boolean, default: false },
      isVip: { type: Boolean, default: false },
    }
  ],

  messageCount: { type: Number, default: 1 },
  lastMessageAt: { type: Date, required: true, index: true },
  lastMessageId: { type: String, required: true },
  lastDirection: { type: String, enum: ['INBOUND', 'OUTBOUND'], default: 'INBOUND' },

  // Active Classification & Status
  currentLabel: {
    type: String,
    enum: ['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'],
    required: true,
    index: true,
  },
  aiLabel: {
    type: String,
    enum: ['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'],
    required: true,
  },
  manualOverride: { type: Boolean, default: false },
  confidence: { type: Number, min: 0, max: 1, default: 0.9 },
  reviewState: { 
    type: String, 
    enum: ['AUTO_APPLIED', 'FLAGGED_REVIEW', 'HUMAN_CONFIRMED', 'OVERRIDDEN'],
    default: 'AUTO_APPLIED',
  },

  // Segment Flags
  isActionRequired: { type: Boolean, default: false, index: true },
  isWaiting: { type: Boolean, default: false, index: true },
  waitingSince: { type: Date, default: null },
  isImportant: { type: Boolean, default: false, index: true },
  isGeneral: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false, index: true },
  isRead: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },

  // Client Decision Queue State
  clientVisible: { type: Boolean, default: false, index: true },
  clientStatus: { 
    type: String, 
    enum: ['pending', 'handled', 'delegated', 'snoozed'], 
    default: 'pending',
    index: true,
  },
  snoozedUntil: { type: Date, default: null },
  clientDecisionNote: { type: String, default: null },

  // Extracted Metadata
  dueDate: { type: Date, default: null },
  meetings: [
    {
      title: String,
      startTime: Date,
      endTime: Date,
      locationOrLink: String,
      attendees: [String],
      isConflict: { type: Boolean, default: false },
    }
  ],

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Composite Indexes for High-Performance Segment Filtering
ThreadSchema.index({ orgId: 1, currentLabel: 1, isArchived: 1, lastMessageAt: -1 });
ThreadSchema.index({ orgId: 1, clientVisible: 1, clientStatus: 1, lastMessageAt: -1 });
ThreadSchema.index({ orgId: 1, isWaiting: 1, isArchived: 1, lastMessageAt: -1 });
ThreadSchema.index({ orgId: 1, isActionRequired: 1, isArchived: 1 });
ThreadSchema.index({ provider: 1, providerThreadId: 1 }, { unique: true });
```

### 2.5. Message Schema (`messages`)
Individual emails comprising a thread.

```javascript
const MessageSchema = new mongoose.Schema({
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
  providerMessageId: { type: String, required: true },
  from: {
    name: { type: String, default: '' },
    email: { type: String, required: true, lowercase: true },
  },
  to: [{ name: String, email: String }],
  cc: [{ name: String, email: String }],
  bcc: [{ name: String, email: String }],
  replyTo: { type: String, default: null },
  subject: { type: String, required: true },
  date: { type: Date, required: true, index: true },
  snippet: { type: String, default: '' },
  bodyHtml: { type: String, default: '' },
  bodyText: { type: String, default: '' },
  
  headers: {
    listUnsubscribe: { type: String, default: null },
    precedence: { type: String, default: null },
    messageIdHeader: { type: String, default: null },
  },
  
  direction: { type: String, enum: ['INBOUND', 'OUTBOUND'], required: true },
  hasAttachments: { type: Boolean, default: false },
  attachments: [
    {
      filename: String,
      mimeType: String,
      sizeBytes: Number,
      attachmentId: String,
    }
  ],

  createdAt: { type: Date, default: Date.now },
});

MessageSchema.index({ threadId: 1, date: 1 });
MessageSchema.index({ providerMessageId: 1 }, { unique: true });
```

### 2.6. Classification Schema (`classifications`)
Audit record of AI evaluation runs.

```javascript
const ClassificationSchema = new mongoose.Schema({
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
  latestMessageId: { type: String, required: true },
  provider: { type: String, enum: ['gemini', 'groq', 'rules_engine', 'seed'], required: true },
  model: { type: String, required: true }, // e.g. "gemini-2.0-flash"
  promptVersion: { type: String, default: 'v1.0' },
  latencyMs: { type: Number, default: 0 },
  
  label: { 
    type: String, 
    enum: ['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'], 
    required: true 
  },
  confidence: { type: Number, min: 0, max: 1, required: true },
  reason: { type: String, required: true },
  evidence: { type: String, default: '' },
  summary: { type: String, default: '' },
  
  decision: {
    question: String,
    options: [String],
    deadline: String,
    consequence: String,
  },
  
  signalsUsed: [{ type: String }],
  guardrailTriggered: { type: Boolean, default: false },
  guardrailRule: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
});

ClassificationSchema.index({ threadId: 1, createdAt: -1 });
```

### 2.7. Classification Event Schema (`classificationEvents`)
Reclassification history timeline tracking how and why labels mutated.

```javascript
const ClassificationEventSchema = new mongoose.Schema({
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
  previousLabel: { type: String, default: null },
  newLabel: { type: String, required: true },
  triggerType: { 
    type: String, 
    enum: ['INITIAL_SYNC', 'NEW_MESSAGE_INBOUND', 'NEW_MESSAGE_OUTBOUND', 'MANUAL_OVERRIDE', 'GUARDRAIL_OVERRIDE'], 
    required: true 
  },
  triggerMessageId: { type: String, default: null },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Null if automated AI
  actorName: { type: String, default: 'Daybook AI' },
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

ClassificationEventSchema.index({ threadId: 1, createdAt: -1 });
```

### 2.8. Correction Schema (`corrections`)
Stores assistant manual label corrections for few-shot prompt injection.

```javascript
const CorrectionSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  previousLabel: { type: String, required: true },
  correctedLabel: { type: String, required: true },
  assistantNote: { type: String, default: '' },
  
  threadContext: {
    subject: String,
    senderEmail: String,
    snippet: String,
  },
  
  promotedToPlaybookRule: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

CorrectionSchema.index({ clientId: 1, createdAt: -1 });
```

### 2.9. Draft Schema (`drafts`)
Drafts authored by assistant and routed to client for approval.

```javascript
const DraftSchema = new mongoose.Schema({
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Maya
  
  to: [{ type: String, required: true }],
  cc: [{ type: String }],
  bcc: [{ type: String }],
  subject: { type: String, required: true },
  bodyHtml: { type: String, required: true },
  bodyText: { type: String, required: true },
  
  status: { 
    type: String, 
    enum: ['draft', 'pending_client', 'approved', 'sent', 'discarded'], 
    default: 'draft',
    index: true,
  },
  
  clientApproval: {
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    clientFeedback: { type: String, default: null },
  },
  
  sentAt: { type: Date, default: null },
  isSimulatedSend: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

DraftSchema.index({ threadId: 1, status: 1 });
```

### 2.10. Activity Log Schema (`activityLog`)
Comprehensive immutable audit log of all human and AI actions.

```javascript
const ActivityLogSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorRole: { type: String, enum: ['assistant', 'client', 'system'], required: true },
  action: { 
    type: String, 
    enum: [
      'THREAD_CLASSIFIED', 
      'LABEL_OVERRIDDEN', 
      'DRAFT_CREATED', 
      'DRAFT_SUBMITTED_FOR_APPROVAL', 
      'DRAFT_APPROVED', 
      'EMAIL_SENT_SIMULATED', 
      'EMAIL_SENT_REAL', 
      'THREAD_SNOOZED', 
      'PLAYBOOK_UPDATED',
      'ACCOUNT_SYNCED'
    ], 
    required: true,
    index: true,
  },
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', default: null, index: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
});

ActivityLogSchema.index({ orgId: 1, createdAt: -1 });
```

### 2.11. Invite Schema (`invites`)
Assistant-to-Client team connection invitations.

```javascript
const InviteSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['assistant', 'client'], required: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

InviteSchema.index({ token: 1 });
```

### 2.12. AgentRun Schema (`agent_runs`)
Stores every execution, autonomous action, proposal, escalation, and safety reversal performed by the specialized inbox agents.

```javascript
const AgentRunSchema = new mongoose.Schema({
  agentId: {
    type: String,
    enum: ['triage', 'scheduling', 'followup', 'drafting', 'digest', 'guardian'],
    required: true,
    index: true,
  },
  orgId: { type: String, required: true, index: true },
  clientId: { type: String, required: true, index: true },
  threadId: { type: String, default: null, index: true },
  trigger: {
    type: String,
    enum: ['ingest', 'new_message', 'client_action', 'schedule_tick', 'manual'],
    required: true,
    index: true,
  },
  action: { type: String, required: true, index: true },
  outcome: {
    type: String,
    enum: ['auto_handled', 'proposed', 'escalated', 'skipped', 'error', 'reversed'],
    required: true,
    index: true,
  },
  summary: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  confidence: { type: Number, min: 0, max: 1, default: 0.95 },
  requiresHuman: { type: Boolean, default: false, index: true },
  undo: {
    type: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  undoneAt: { type: Date, default: null },
  usedLLM: { type: Boolean, default: false },
  fallbackUsed: { type: Boolean, default: false },
  durationMs: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, index: true },
});

AgentRunSchema.index({ orgId: 1, createdAt: -1 });
AgentRunSchema.index({ threadId: 1, createdAt: -1 });
AgentRunSchema.index({ orgId: 1, agentId: 1, createdAt: -1 });
```
