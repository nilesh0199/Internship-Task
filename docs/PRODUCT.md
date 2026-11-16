# PRODUCT SPECIFICATION — Daybook Mail (A daybook for your inbox)

> **Vision**: An intelligent email orchestration workspace built specifically for Executive Assistants (EAs/PAs) and their busy Executive Clients. Daybook Mail eliminates inbox paralysis by answering the single most critical question in delegated email: **"Who needs to reply to this, and what is the exact decision required?"**

---

## 1. The Core Problem

Executive Assistants and Chiefs of Staff face a compounding operational challenge:
1. **Inbox Deluge**: High-profile executives receive 150–400 emails daily spanning investments, vendor contracts, logistics, press, team escalations, and automated noise.
2. **Ambiguity of Ownership**: Traditional email tools (Gmail, Outlook) are designed for single-player use. When an assistant is granted delegate access, threads fall through the cracks because:
   - It is unclear whether an email requires the executive's personal authority or can be handled autonomously by the assistant.
   - Executives frequently glance at messages on mobile without replying or clarifying intent, leaving the assistant uncertain whether to draft, follow up, or wait.
3. **High Context Switching Cost**: Forcing an executive to read through long email threads creates severe executive friction. Executives do not want an email client; they want a **Decision Queue**.

---

## 2. Key Insight: Responsibility is Client-Specific

Reply responsibility is **never content-universal**—it is strictly **client-specific**:
- A \$5,000 contractor invoice is routine administration for one executive (Assistant handles), but requires explicit personal review for an early-stage founder (Client to reply).
- A board member's casual note might be delegated for an established CEO, but must be personally acknowledged by a newly appointed executive.
- Therefore, generic AI categorization fails. Effective delegation requires a tailored **Client Playbook** that encodes the executive’s specific rules, thresholds, VIP networks, and delegation preferences directly into the AI classification loop.

---

## 3. User Personas

| Persona | Role | Key Goals & Behavior | Pain Points |
| :--- | :--- | :--- | :--- |
| **Maya** | Personal Assistant / EA | Power user. Operates on desktop with dual monitors. Manages inbox organization, scheduling, follow-ups, and drafts. Demands keyboard shortcuts, batch triage, auditability, and speed. | Anxious about missing VIP emails or misinterpreting client intentions; constantly chases Priya for replies. |
| **Priya Sharma** | Founder & CEO (Client) | Mobile-first executive. Wants near-zero time spent in raw email. Needs distilled decisions, clear choices, and one-tap approvals. | Overwhelmed by long email chains; dreads opening her inbox; misses critical contract deadlines. |

---

## 4. Two Connected Experiences

### A. The Assistant Workspace (Power Desktop Dashboard)
- **3-Pane Layout**:
  1. *Left Pane*: Segments, Playbook status, Connected Mailbox health, Sync status.
  2. *Center Pane*: Rich thread list with real-time badges, confidence meters, sender avatar, snippet, aging indicators, and meeting badges.
  3. *Right Pane*: Full conversational thread view, expandable **AI Reason Panel**, "Make this a rule" quick trigger, reclassification timeline, and the draft-for-approval composer.

### B. The Client Decision Queue (Minimal Mobile-First View)
- Stripped of email chrome, signatures, and tedious chains.
- Formatted as clean **Decision Cards**:
  - The single question Priya must answer.
  - 2 to 4 bullet points of essential context.
  - Recommended options (e.g., "Approve \$12k wire", "Decline", "Counteroffer").
  - Deadline and consequence of non-response.
  - Fast actions: *Approve Maya's Draft*, *Reply Myself*, *Hand to Maya (with note)*, *Snooze*, *Mark Handled*.

---

## 5. Inbox Segments (Virtual Filters Over a Unified Thread Store)

> [!IMPORTANT]
> All segments are real-time dynamic query filters over a single, unified `threads` collection. Threads are never duplicated across separate tables.

1. **Assistant to Reply** (`ASSISTANT_TO_REPLY`): Threads requiring scheduling, vendor inquiries, invoice processing, travel bookings, or general logistics.
2. **Client to Reply** (`CLIENT_TO_REPLY`): High-stakes threads requiring Priya's personal input, sign-off, or strategic response.
3. **No Reply Needed** (`NO_REPLY_NEEDED`): Informational newsletters, receipts, bulk updates, automated delivery notices, or resolved threads.
4. **Action Required**: Threads tagged with concrete deliverables or pending tasks.
5. **Waiting for Response**: Outbound messages sent by Maya or Priya where a reply from an external party is anticipated, with days-waiting counter.
6. **Meetings & Appointments**: Threads containing calendar invites, proposed time slots, or detected scheduling conflicts.
7. **Important**: VIP senders or threads tagged with urgency flags.
8. **General**: Standard correspondence not requiring immediate triage.
9. **Needs Review** (`NEEDS_REVIEW`): Low-confidence AI classifications (<0.55) or threads flagged by safety guardrails.
10. **Archived**: Threads marked completed or archived by the user.

---

## 6. Differentiating Features (The Creative Core)

### 6.1. Client Playbook
A living delegation profile configured per client containing:
- **VIP Directory**: Senders and domains that must never be missed (e.g., `@sequoia.com`, Board members, key investors).
- **Topic Rules Matrix**:
  - *Always Client*: Term sheets, legal agreements, executive hiring, media requests, wire transfers > \$1,000.
  - *Assistant Can Handle*: Calendar invites, flight bookings, office management, vendor check-ins.
  - *Never Bother Client*: Marketing solicitations, cold outbound, unsolicited pitches.
- **Financial & Operational Thresholds**: Maximum spend approval Maya can authorize autonomously (\$1,000).
- **Free-Text Delegation Notes**: Custom nuances (e.g., *"If an email comes from my sister Anjali, always mark Client to Reply even if it's just photos"*).

### 6.2. Learning from Corrections & Rule Synthesis
- Whenever Maya manually overrides an AI label (e.g., switching `CLIENT_TO_REPLY` to `ASSISTANT_TO_REPLY`), the system records a `Correction` event.
- The latest 10 client-specific corrections are injected dynamically as few-shot examples into future classification prompts.
- UI displays a subtle badge: `"Learned from 4 recent corrections"`.
- When Maya overrides a thread, the UI provides an immediate inline prompt: **"Make this a rule?"**. Clicking it appends the learned rule directly to the Client Playbook.

### 6.3. Risk-Aware Guardrails (Hard Code Layer)
Prompt engineering alone cannot guarantee safety. Hardcoded heuristics evaluate every classification:
- **Rule 1 (VIP Immunity)**: Any message from a VIP sender or VIP domain can *never* resolve to `NO_REPLY_NEEDED`.
- **Rule 2 (Financial & Legal Scrutiny)**: Any email mentioning currency values above \$500, wire instructions, NDAs, contracts, or legal notice *must* escalate to `CLIENT_TO_REPLY` or `NEEDS_REVIEW`.
- **Rule 3 (Direct Interrogation)**: Direct questions addressing Priya by name (*"Priya, what do you think?"*) cannot be marked `NO_REPLY_NEEDED`.

### 6.4. The Quiet Folder
- Instead of hiding "No Reply Needed" emails in an opaque junk folder, the **Quiet Folder** offers total transparency.
- Every auto-archived message is displayed with the exact reason it was muted (e.g., *"List-Unsubscribe header found; bulk marketing newsletter"*).
- Displays a prominent daily assurance banner:
  > *"Quiet folder audited: 14 newsletters and receipts muted. Nothing critical slipped through today."*

### 6.5. Client Decision Cards
In Priya's view, lengthy threads are transformed into concise executive decision cards:
```
┌────────────────────────────────────────────────────────────────────────┐
│ DECISION NEEDED: Term Sheet Signature — Series A Expansion             │
│ From: Mark Suster (Upfront Ventures) • Deadline: Today, 5:00 PM EST    │
├────────────────────────────────────────────────────────────────────────┤
│ • Upfront accepted the revised \$18M valuation cap.                     │
│ • Requires Priya's electronic signature on DocuSign link.              │
│ • Consequence of delay: Deal terms expire at close of business.        │
├────────────────────────────────────────────────────────────────────────┤
│ [Approve Maya's Draft]   [Reply Myself]   [Hand to Maya]   [Snooze]    │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.6. Draft-for-Approval Lane
1. Maya drafts a reply inside the Assistant workspace.
2. She clicks **"Send to Client for Approval"**.
3. The draft appears highlighted in Priya's Decision Queue with a single **"Approve & Send"** button.
4. Upon Priya's approval, Maya receives an instant notification and can dispatch with one click (or auto-dispatch when enabled). Full audit history is preserved in `activityLog`.

### 6.7. Aging & Smart Nudges
- Items residing in Priya's queue for > 24 hours trigger an amber aging indicator.
- At > 48 hours, Maya's dashboard surfaces a proactive nudge banner:
  > *"Priya has had 'Board Deck Review' in her queue for 2 days. [Send Gentle Nudge]"*
- Threads awaiting external replies track days-waiting and recommend follow-up drafts.

### 6.8. Reclassification Timeline
Every thread includes an auditable history pane showing its complete lifecycle:
- *Today 9:15 AM* — Inbound email received from `acme.com`.
- *Today 9:15 AM* — AI classified as `ASSISTANT_TO_REPLY` (Confidence: 0.92, Model: Gemini 2.0 Flash).
- *Today 11:30 AM* — New reply from CEO demanding executive signoff.
- *Today 11:30 AM* — AI automatically reclassified to `CLIENT_TO_REPLY` (Escalation: Contract terms detected).
- *Today 2:00 PM* — Maya manually overrode to `ASSISTANT_TO_REPLY` (Note: *"Spoke with Priya on Slack; I will handle"*).

### 6.9. Command Palette & Natural-Language AI Assistant (Cmd+K)
- Integrated command bar supporting quick navigation, segment switching, and natural-language queries.
- Powered by LLM with structured tool calling querying MongoDB:
  - *"Show me emails that need the client's attention."*
  - *"Summarize this conversation."*
  - *"What am I waiting for a response on?"*
  - *"Why was this thread assigned to Priya?"*
  - *"Draft a polite decline to this meeting request."*
- Responses include clickable links pointing directly to the referenced thread IDs.

### 6.10. Meetings Strip & Conflict Detection
- Extracts meeting dates, times, and agendas from emails automatically.
- Detects scheduling overlaps with existing calendar events and alerts Maya:
  > *"Conflict Detected: Thursday 3:00 PM conflicts with 'Investor Sync'."*

### 6.11. Client Morning Brief
A distilled greeting at the top of Priya's decision queue:
> *"Good morning, Priya. Today: **3 decisions** require your signoff, **12 threads** were resolved autonomously by Maya, and **5 threads** are waiting on external replies."*

---

## 7. Product Roadmap (Future Phases — Post-Prototype)

1. **Autonomous Calendar Rescheduling**: Two-way Google Calendar / Outlook Calendar integration with automatic conflict resolution.
2. **Multi-Client Switching**: Seamless tenant switching for assistants who support multiple executives.
3. **Multi-Channel Support**: Ingestion of WhatsApp, Slack DMs, and SMS alerts into the unified decision queue.
4. **Custom Domain Delegation & DKIM**: Ability for assistants to send authenticated on-behalf-of emails directly from their own address with executive SPF/DKIM verification.
