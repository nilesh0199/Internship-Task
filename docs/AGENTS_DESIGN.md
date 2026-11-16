# AGENTS_DESIGN.md — Specialized Autonomous Inbox Agent Collective

> **Product**: Daybook Mail ("A daybook for your inbox")  
> **Architecture**: Specialized Autonomous Agent Collective  
> **Safety Rule**: **Zero-Send Autonomy** — No agent may ever transmit an email. Sending strictly requires explicit human authorization.

---

## 1. Architectural Philosophy

Rather than routing incoming traffic through a single monolithic prompt, Daybook Mail deploys a collective of **six specialized autonomous agents**. Each agent owns a distinct, single responsibility, runs with isolated context, enforces domain-specific safety boundaries, and writes immutable, explainable records to `AgentRun` and `ActivityLog`.

```
Inbound Email Ingestion / Event Trigger
                     │
                     ▼
         ┌─────────────────────────┐
         │      1. TriageAgent     │ ── Classifies thread, routes queue, auto-files newsletters
         └─────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │   2. SchedulingAgent    │ ── Detects double-bookings, proposes conflict-free slots
         └─────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │    3. FollowUpAgent     │ ── Monitors stale threads (>3d) & pending decisions (>24h)
         └─────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │    4. DraftingAgent     │ ── Pre-drafts replies in client/assistant tone (Never sends)
         └─────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │     5. DigestAgent      │ ── Synthesizes daily Morning Brief & Daybook summary
         └─────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │    6. GuardianAgent     │ ── Zero-trust auditor: Reverses auto-actions if VIP/risk found
         └─────────────────────────┘
```

---

## 2. Agent Collective Matrix

| Agent | Module | Default Autonomy | Triggers | Core Responsibility | Deterministic vs LLM |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Triage** | `TriageAgent.js` | `auto` | `ingest`, `new_message`, `manual` | Classifies thread, routes to assistant/client/quiet lanes | Prefilter rules first, Gemini 2.0 Flash / Groq fallback |
| **Scheduling** | `SchedulingAgent.js` | `propose` | `ingest`, `new_message`, `manual` | Detects calendar double-bookings, drafts reschedule slots | Rule-based window overlap + template synthesis |
| **Follow-up** | `FollowUpAgent.js` | `propose` | `schedule_tick`, `client_action`, `manual` | Nudges stale waiting threads (>3d) & pending decisions (>24h) | Deterministic timestamps & 24h rate-limit check |
| **Drafting** | `DraftingAgent.js` | `propose` | `ingest`, `new_message`, `manual` | Pre-drafts routine assistant coordination and client 1-tap signoffs | LLM draft generator with deterministic fallback |
| **Digest** | `DigestAgent.js` | `auto` | `schedule_tick`, `client_action`, `manual` | Synthesizes Priya's Morning Brief and Maya's Daybook metrics | Real-time MongoDB/store count aggregations |
| **Guardian** | `GuardianAgent.js` | `auto` | `ingest`, `new_message`, `schedule_tick`, `manual` | Zero-trust safety net: reverses auto-actions if risk detected | 100% deterministic hard regex/keyword/VIP rules |

---

## 3. Detailed Agent Specifications

### 1) TriageAgent
- **Purpose**: Evaluates conversation context across the latest 1–3 messages, sets semantic label (`ASSISTANT_TO_REPLY`, `CLIENT_TO_REPLY`, `NO_REPLY_NEEDED`, `NEEDS_REVIEW`), and routes accordingly.
- **Autonomous Filing**: Confident `NO_REPLY_NEEDED` ($\ge 0.85$ confidence, zero risk keywords) is auto-filed to the Quiet Folder (`isArchived: true`) with an immediate 1-click `Undo` payload.
- **Guardrails**: Never auto-files VIP contacts, financial numbers, or legal terms.
- **Output**: `AgentResult` with outcome `auto_handled`, `escalated`, or `proposed`.

### 2) SchedulingAgent
- **Purpose**: Extracts proposed meeting dates and locations, checks against all existing client meetings for temporal overlaps ($start_1 < end_2 \land end_1 > start_2$).
- **Conflict Handling**: When a collision is detected, flags the meeting as `isConflict: true` and pre-drafts a reschedule response offering 2–3 conflict-free alternatives in Pacific Time.
- **Confirmation Handling**: When calendar is clear, prepares a 1-tap confirmation draft.
- **Output**: Writes draft with `agentProposalType: 'reschedule_meeting'` or `'confirm_meeting'`.

### 3) FollowUpAgent
- **Purpose**: Prevents high-priority conversations from falling through the cracks without causing inbox spam.
- **Stale Waiting Detection**: Outbound threads where connected client sent the last message $> 3$ days ago trigger a polite follow-up draft for Maya Lin's review.
- **Client Nudges**: Items sitting in Priya's queue for $> 24$ hours create an assistant nudge item.
- **Strict Guardrail**: Enforces a strict 24-hour rate limit on every thread so no thread is nudged more than once per day.

### 4) DraftingAgent
- **Purpose**: Reduces cognitive overhead by drafting context-aware responses in the client’s voice.
- **Routine Tasks**: For `ASSISTANT_TO_REPLY` logistics and confirmations, drafts Maya Lin's standard response.
- **Executive Decisions**: For `CLIENT_TO_REPLY` transactions, drafts Priya Sharma's approval note ready for 1-tap mobile authorization.
- **Idempotency**: Skips execution if an active draft already exists for the thread.

### 5) DigestAgent
- **Purpose**: Prepares Priya's Morning Brief and Maya's operational Daybook from live database metrics.
- **Metrics Calculated**: Total inbox, handled by agents, actionable by Maya, decisions awaiting Priya, waiting on others, meetings today, and calendar conflicts.
- **Hours Saved Estimate**: Calculated as $\text{AutoHandled} \times 40\text{s} / 3600\text{s}$ and explicitly labeled as an estimate.
- **Caching**: Cached per day per client.

### 6) GuardianAgent (Zero-Trust Safety Auditor)
- **Purpose**: The safety backbone of the system. Runs after other agents act to independently verify that zero risky items were mistakenly auto-filed.
- **Violations Checked**:
  1. Sender or sender domain is on `vipSenders` / `vipDomains` list.
  2. Financial terms (`wire`, `transfer`, `invoice`, `term sheet`, `valuation`, `$`, `usd`, `equity`, `esop`).
  3. Legal/contract terms (`contract`, `agreement`, `nda`, `signature`, `docusign`, `counsel`, `subpoena`).
  4. Executive client personally addressed (`"Priya,"`, `"Hi Priya"`).
  5. Urgent deadline words (`"urgent"`, `"before 4 pm"`, `"today"`, `"deadline"`).
- **Enforcement & Reversal**: If an auto-filed or auto-handled thread violates any of these rules, Guardian **reverses the action**, restores the thread to the active inbox, escalates the label to `NEEDS_REVIEW`, logs `"Guardian reversed: <reason>"`, and records an immutable audit record.
- **Human Protection**: Guardian **never** reverses an intentional manual override performed by a human assistant or client.

---

## 4. Autonomy Policy & Control Room

Autonomy levels are configured per client in `Client.playbook.agentAutonomy`:
- `'auto'`: Agent executes the change directly in the database (always paired with an `undo` payload).
- `'propose'`: Agent prepares the draft or rescheduling proposal and queues it in the **"Agent Proposals"** lane for human confirmation.
- `'off'`: Agent is disabled.

A global kill switch (`AGENTS_ENABLED=false`) is available via environment variable.
Assistant users can toggle policies and run on-demand batch triage directly in the **Agent Control Room** (`/agents`).
