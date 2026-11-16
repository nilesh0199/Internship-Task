# DEMO SCRIPT & LIVE WALKTHROUGH — Daybook Mail

> **Target Duration**: 3 Minutes (180 Seconds)  
> **Audience**: Technical Reviewers, Executive Assistants, Product Leads  
> **Key Objective**: Prove product comprehension, UI/UX polish, AI usefulness, and working end-to-end synchronization between the Assistant Workspace and the Client Decision Queue.

---

## 1. What is Simulated (Disclosure & Integrity Statement)

Before beginning the walkthrough, here is the transparent breakdown of simulated vs real components:
- **Simulated**:
  1. *Demo Mailbox Data*: 40 realistic seeded conversations pre-loaded to ensure immediate responsiveness with zero third-party quota risk.
  2. *Live Inbound Message Injector*: Simulates new inbound emails at the touch of a button to demonstrate real-time reclassification.
  3. *Email Dispatch Gate*: Real outbound SMTP/API dispatch is safely gated behind `SEND_ENABLED=false`. All sends are recorded in the audit log and update thread states without emailing real third parties.
- **Real & Live**:
  1. *OAuth2 Handshake*: Real Google Cloud and Azure AD consent screen redirect flows.
  2. *AI Reasoning*: Live Gemini 2.0 Flash / Groq LLM pipelines execute on "Re-run AI" and "Cmd+K Natural Language Assistant".
  3. *Database & State*: Live MongoDB queries, optimistic React Query cache mutations, and full activity log persistence.

---

## 2. Timed Walkthrough & Voice-Over Script

```
0:00 - 0:25  | Scene 1: The Problem & Connected Accounts
0:25 - 0:50  | Scene 2: Assistant Workspace & AI "Why" Reasoning
0:50 - 1:20  | Scene 3: Manual Override & Playbook Synthesis
1:20 - 1:45  | Scene 4: Live Message Injection & Reclassification
1:45 - 2:15  | Scene 5: Client Decision Queue (Mobile Simulation)
2:15 - 2:35  | Scene 6: Live Reflection & Draft Dispatch
2:35 - 2:50  | Scene 7: Command Palette (Cmd+K) & Tool Calling
2:50 - 3:00  | Scene 8: Quiet Folder & Daily Assurance
```

---

### Scene 1: Introduction & Connected Accounts (0:00 – 0:25)
- **Visual**: Open browser at `http://localhost:5173/`. Show the clean, editorial landing page. Click **"Settings & Accounts"**.
- **Action**: Highlight the Connected Accounts card showing Google Gmail, Microsoft Outlook, and the Demo Mailbox. Point to the green sync pill (`"Synced 1m ago"`).
- **Voice-Over**:
  > *"Executive Assistants don't just manage an inbox—they manage their boss's professional life. But today, assistants drown in 200+ emails a day with one paralyzing ambiguity: who is supposed to reply to this? Welcome to Daybook Mail. We support live OAuth for Gmail and Outlook, but for this demo, let's explore our pre-loaded executive environment for founder Priya Sharma and her assistant Maya."*

---

### Scene 2: Assistant Workspace & The "Why" Panel (0:25 – 0:50)
- **Visual**: Switch to `/assistant`. Show the 3-pane desktop layout: Segments on the left, Thread list in center, Thread reader and AI panel on the right.
- **Action**: Click on Thread #1: `Series A Expansion Term Sheet - Final Execution Deadline`.
- **Action**: Highlight the right-hand **AI Reason Panel**. Point out:
  - Label: `CLIENT_TO_REPLY` (Terracotta badge)
  - Confidence: `● ● ●` (*High confidence*)
  - The quoted evidence callout box.
  - The structured decision question.
- **Voice-Over**:
  > *"Here in Maya's 3-pane dashboard, emails are automatically separated by who owns the next action. On this Series A term sheet, the AI classified it as Client to Reply. Why? Look at the AI Reason Panel: our hard guardrail detected legal signature terms and a 5 PM deadline from VIP board member Mark Suster. Notice the confidence dots—we never confuse users with raw percentages, only high, medium, or low trust indicators."*

---

### Scene 3: Manual Override & "Make This a Rule" (0:50 – 1:20)
- **Visual**: Navigate to Thread #13 (`FW: Office Lease Escalation Clause`).
- **Action**: Click **"Override Label"** and switch it from `CLIENT_TO_REPLY` to `ASSISTANT_TO_REPLY`.
- **Action**: Point out the prompt that appears immediately: *"Make this a rule for Priya's Playbook?"*. Click **"Add to Playbook"**.
- **Voice-Over**:
  > *"When an assistant knows better, human control is instant. Maya can override any label with a single click or keyboard shortcut. When she overrides, the system learns: it records a correction for few-shot prompt training, and immediately offers 'Make this a rule?'. One tap appends this delegation rule directly into Priya's living Playbook."*

---

### Scene 4: Live Message Injection & Reclassification (1:20 – 1:45)
- **Visual**: Open Thread #38 (`Acme Corp Enterprise License Renewal`), currently marked `ASSISTANT_TO_REPLY`.
- **Action**: Click the demo button: **"Simulate Inbound Message: Acme Corp Demands Discount"**.
- **Visual**: A toast appears (`"New message received on Acme Corp renewal"`). Watch the thread dynamically transition to `CLIENT_TO_REPLY` with a new `ClassificationEvent` added to the timeline.
- **Voice-Over**:
  > *"Email isn't static—conversations evolve. Watch this: Maya is negotiating an enterprise renewal. I'll click our live message injector to simulate an urgent inbound reply from the customer. Notice how the thread automatically reclassifies in real time to Client to Reply. The customer demanded a 20% discount before 4 PM, triggering Priya's financial threshold guardrail. The timeline shows every step of who changed what, and why."*

---

### Scene 5: Client Decision Queue on Mobile Width (1:45 – 2:15)
- **Visual**: Switch browser view to mobile width (390px, iPhone view) or navigate to `/client`.
- **Visual**: Show the warm serif headline: *"Good morning, Priya. 3 decisions need your attention today."*
- **Action**: Tap on the Acme Corp Decision Card:
  - Serif question: *"Approve 20% enterprise discount amendment for Acme Corp?"*
  - Context bullets.
  - Show the action bar: Tap **"Approve Maya's Draft"**.
- **Voice-Over**:
  > *"Now, let's step into Priya's shoes. As a CEO, Priya doesn't open an email client on her phone—she opens her Decision Queue. No long threads, no clutter. Just clean Decision Cards in editorial serif typography. She sees the question, the 4 PM deadline, the consequence of delay, and Maya's pre-drafted reply. With a single tap, Priya approves the draft and moves on."*

---

### Scene 5B: The Agent Control Room & Zero-Trust Safety (2:15 – 2:45)
- **Visual**: In Maya's workspace header or sidebar, click **"Agent Control Room"** (`/agents`).
- **Visual**: Show the top funnel strip: *"40 emails in. 24 handled by agents. 9 need you (Maya). 7 need Priya."*
- **Action**: Highlight the 6 specialized agent cards (Triage, Scheduling, Follow-up, Drafting, Digest, Guardian).
- **Action**: Toggle an agent's autonomy level between *Off*, *Propose*, and *Auto*.
- **Action**: Scroll to the Live Activity Feed and point out a Guardian reversal entry: *"Guardian reversed: Auto-file blocked (Sender on VIP list)"*. Click **"Undo"** on any auto-handled action to demonstrate 1-click reversibility.
- **Voice-Over**:
  > *"Behind the scenes, inbox management isn't handled by a black box—it's run by a collective of six specialized agents. Here in the Agent Control Room, Maya oversees the team: Triage auto-files noise, Scheduling flags calendar overlaps and proposes conflict-free slots, Follow-up drafts check-ins on stale waiting threads, and Drafting prepares context-aware replies. But the crown jewel is the Guardian Agent: a zero-trust safety net that independently audits every autonomous action. If an email mentions a VIP sender, wire terms, or contract signatures, Guardian immediately reverses the auto-file and escalates it for human review. Autonomy you can actually trust."*

---

### Scene 6: Live Reflection & Draft Dispatch (2:45 – 3:05)
- **Visual**: Switch back to desktop `/assistant`.
- **Action**: Show that the Acme Corp thread now displays a green status badge: `Draft Approved by Priya`.
- **Action**: Maya clicks **"Send Approved Email"**. The toast confirms simulated transmission and writes an entry into the immutable Activity Log.
- **Voice-Over**:
  > *"Instantly, back in Maya's workspace, the draft reflects Priya's approval. Maya can review the final timestamp and click Send with full confidence. The approval trail is completely audited, and our safety guardrail prevents accidental dispatches."*

---

### Scene 7: Command Palette (Cmd+K) & Natural Language Tools (2:35 – 2:50)
- **Visual**: Press `Cmd+K` (or `Ctrl+K`). The command palette opens.
- **Action**: Type: *"Show me emails that need the client's attention"*.
- **Visual**: The LLM queries MongoDB using structured tool calls and returns a markdown response citing thread subjects as clickable links.
- **Voice-Over**:
  > *"Maya can also navigate using natural language. Pressing Command+K opens our tool-calling AI assistant. We can ask 'What is Priya waiting to sign?' or 'Summarize our conflict with the board prep', and the assistant answers directly from our database with clickable thread links."*

---

### Scene 8: The Quiet Folder & Conclusion (2:50 – 3:00)
- **Visual**: Click on the **"Quiet Folder"** segment in the sidebar.
- **Visual**: Show the banner: *"Quiet folder audited: 8 newsletters and receipts muted. Nothing critical slipped through today."*
- **Voice-Over**:
  > *"Finally, the Quiet Folder: every automated newsletter and receipt is auditable with the exact reason it was muted, giving assistants total peace of mind. That is Daybook Mail—turning inbox chaos into clear, collaborative decisions."*
