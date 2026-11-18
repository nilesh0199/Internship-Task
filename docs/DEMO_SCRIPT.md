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
0:25 - 0:45  | Scene 2: Multi-Client "Today" Command Dashboard
0:45 - 1:10  | Scene 3: Client Inboxes & "Why" Reasoning Panel
1:10 - 1:35  | Scene 4: Per-Client Agent Notes & Side-by-Side Dry Run
1:35 - 2:00  | Scene 5: Live Message Injection & Reclassification
2:00 - 2:30  | Scene 6: Client Decision Queue (Mobile Simulation)
2:30 - 2:50  | Scene 7: Agent Control Room & Zero-Trust Safety
2:50 - 3:05  | Scene 8: Dual-Window Reflection & Draft Dispatch
3:05 - 3:15  | Scene 9: Command Palette (Cmd+K) & Quiet Folder
```

---

### Scene 1: Introduction & Connected Accounts (0:00 – 0:25)
- **Visual**: Open browser at `http://localhost:5173/`. Show the clean, editorial landing page. Click **"Settings & Accounts"**.
- **Action**: Highlight the Connected Accounts card showing Google Gmail, Microsoft Outlook, and the Demo Mailbox. Point to the green sync pill (`"Synced 1m ago"`).
- **Voice-Over**:
  > *"Executive Assistants don't just manage one inbox—they manage multiple executive clients. But today, assistants drown in 200+ emails a day with paralyzing ambiguity: who needs to reply, and under which client's specific delegation rules? Welcome to Daybook Mail."*

---

### Scene 2: Multi-Client "Today" Command Dashboard (0:25 – 0:45)
- **Visual**: Switch to `/assistant/today`. Highlight the top-bar client tabs: `[Today]`, `[Priya Sharma (12)]`, `[Rohan Kapoor (8)]`, `[+ Add Client]`, and the agent running status pill.
- **Action**: Point out the executive client summary cards (Priya: founder/investor focus vs Rohan: freight/logistics delegator), Today's Scheduled Meetings strip with conflict warnings, and the prioritized "Needs You Now" stack.
- **Voice-Over**:
  > *"Maya starts her morning on the Today command dashboard. In one unified view across all her clients, she sees Priya Sharma and Rohan Kapoor side-by-side: who needs Maya, what is waiting on the client, and schedule conflicts. The 'Needs You Now' stack ranks highest-priority items first, letting Maya jump directly into any client's inbox."*

---

### Scene 3: Client Inboxes & The "Why" Panel (0:45 – 1:10)
- **Visual**: Click the `Priya Sharma` tab (`/assistant/c/client_priya_001/inbox`). Show the 3-pane desktop layout: Segments on the left, Thread list in center, Thread reader and AI panel on the right.
- **Action**: Click on Thread #1: `Series A Expansion Term Sheet - Final Execution Deadline`.
- **Action**: Highlight the right-hand **AI Reason Panel**. Point out:
  - Label: `CLIENT_TO_REPLY` (Terracotta badge)
  - Confidence: `● ● ●` (*High confidence*)
  - The quoted evidence callout box.
  - The structured decision question.
- **Voice-Over**:
  > *"Clicking Priya's tab brings up her dedicated 3-pane inbox. On this Series A term sheet, the AI classified it as Client to Reply. Why? Look at the AI Reason Panel: our hard guardrail detected legal signature terms and a 5 PM deadline from VIP board member Mark Suster. Notice the confidence dots—we never confuse users with raw percentages, only high, medium, or low trust indicators."*

---

### Scene 4: Per-Client Agent Notes & Side-by-Side Dry Run (1:10 – 1:35)
- **Visual**: In Priya's tab, click the **"Agents"** subnav item (`/assistant/c/client_priya_001/agents`).
- **Action**: Highlight the 6 specialized agent cards, standing instructions, and active memories (user vs learned).
- **Action**: Click **"Preview Notes"** on the Drafting Agent to open the Side-by-Side Dry Run modal comparing *"Without Notes"* vs *"With Notes"*.
- **Voice-Over**:
  > *"Every executive is different. In the Agents tab, Maya configures client-specific Agent Notes. For Drafting, Priya prefers short, decisive bullets signed 'Maya for Priya', while Rohan's notes demand crisp executive prose signed 'Rohan's Office' without exclamation points. Maya can click 'Preview Notes' to see a side-by-side dry run on real threads before saving, verifying how the agent adapts without changing a line of code."*

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

### Scene 5: Client Editorial Decision Desk in Dual Window (1:45 – 2:15)
- **Visual**: Open a second browser window (e.g. Incognito or Chrome profile B) at `http://localhost:5173/login`. Show the centered Role Chooser modal: *"How are you signing in?"* Select **"I'm a client"** and sign in as Priya Sharma (`priya@vortexdynamics.com` / `password123`).
- **Visual**: Priya lands on `/client`—the full-width Editorial Decision Desk:
  - **Left Rail (~280px)**: Greeting (*"Good morning, Priya"*), summary sentence (*"3 decisions need you today. Maya and the agents handled 12 more."*), vertical navigator (*Today / This week / Later / Waiting on others / Handled*), Next Deadline countdown, and quick keyboard hint pills (`j`/`k`, `Enter`, `a`, `h`, `s`, `d`).
  - **Middle Column (~440px)**: Scannable urgency rows with sender avatar, 1-line executive question, relative age, deadline chips, and draft-ready badges.
  - **Right Decision Sheet**: Selected item rendered in warm editorial Fraunces serif headline, honest byline (*"Prepared by Maya with Daybook agents."*), concise *"What's being asked"* overview, 2–4 key context bullets, quiet blockquote evidence from the message thread, and consequence of delay.
- **Action**: Tap or select the Acme Corp item:
  - Headline: *"Approve 20% enterprise discount amendment for Acme Corp?"*
  - Review Maya's pre-drafted response in the editable preview pane.
  - Sticky Action Bar: Tap **"Approve Maya's Draft"** (or press shortcut key `a`). An optimistic update animates the item out with a 5-second Sonner undo toast.
- **Voice-Over**:
  > *"Now, let's step into Priya's shoes in a second window. As a CEO, Priya has her own separate account. She doesn't open a confusing email client on her phone—she opens her Editorial Decision Desk. No long chains, no noise. Just clean executive decision sheets with Fraunces headlines, distilled context bullets, and Maya's pre-drafted replies. With a single tap or keyboard shortcut 'a', Priya approves Maya's draft, triggering an instant optimistic update."*

---

### Scene 5B: The Agent Control Room & Closed-Loop Agent Traces (2:15 – 3:00)
- **Visual**: In Maya's workspace (Window A), click **"Agent Control Room"** (`/agents`).
- **Visual**: Show the top funnel strip: *"40 emails in · 24 handled by agents · 9 need Maya · 7 need Priya"*.
- **Action**: Highlight the honest badges on each card:
  - **Agent** (Emerald badge: closed-loop reason $\to$ act $\to$ observe $\to$ decide loop with tools and stop conditions): *Triage Investigator*, *Scheduling Agent*, *Drafting Agent*.
  - **Workflow** (Slate badge: fixed deterministic sequence): *Follow-up Workflow*, *Digest Workflow*.
  - **Safety Check** (Violet badge: 100% deterministic code guardrail): *Guardian Safety Check*.
- **Action**: Click the **"What's the difference?"** popover button to explain the architectural distinction: an agent reasons, calls tools in a loop, and stops on limits; a workflow follows predefined linear steps.
- **Action (45s Spotlight on Ambiguous Thread & Agent Trace)**:
  1. Scroll down to the Live Activity Feed or open an ambiguous thread (`th_13` or `th_34`).
  2. Click **"Agent Trace (3 steps)"** to expand the multi-step execution.
  3. Show the sequential turns:
     - *Turn 1*: Thought summary: *"Evaluating routing ambiguity; checking sender history and VIP status"* $\to$ Tool: `get_sender_history(sender: "mvance@enterprisecloud.com")` $\to$ Observation: *"Sender has 2 previous threads regarding enterprise contract terms."*
     - *Turn 2*: Thought summary: *"Checking client playbook delegation thresholds and risk keywords"* $\to$ Tool: `check_risk_keywords(text: "discount amendment, $600k")` $\to$ Observation: *"Detected $600k contract value exceeding $1k assistant delegation limit."*
     - *Turn 3*: Thought summary: *"Confidence 0.58 below 0.70 threshold; escalating to human review"* $\to$ Final: `outcome: "escalated"` $\to$ Stop reason: `goal_reached` $\to$ Usage: `3 steps · 2 tools · 142ms`.
  4. Point out the honest badge: `Recorded Sample Run` (or click **"Re-run live"** to demonstrate live execution or graceful fallback to workflow if offline).
  5. Point out a Guardian reversal entry: *"Guardian reversed: Auto-file blocked (Detected $14,500 wire routing change)"*.
  6. Click **"Undo"** on any auto-handled action to demonstrate instant 1-click reversibility.
- **Voice-Over**:
  > *"Behind the scenes, inbox management isn't an opaque black box. We distinguish where AI judgment is useful from where hard safety code is required. Triage Investigator, Scheduling, and Drafting are true closed-loop agents: they run iterative reason-act-observe loops with bounded tools and stop limits. When we expand an Agent Trace, Maya sees every step: what the agent considered, which tool it called, the observation it received, and why it decided to escalate when confidence dropped below 70%. Meanwhile, Guardian is deliberately not an LLM—it is a deterministic code auditor that cannot be tricked by prompt injection. If an email mentions altered wire routing or unvetted contract terms, Guardian immediately reverses the auto-file and escalates it to Maya. Autonomy with absolute transparency and 1-click undo."*

---

### Scene 6: Dual-Window Live Reflection & Draft Dispatch (2:45 – 3:05)
- **Visual**: Look at Window A (Maya's desktop workspace). Notice that without pressing reload, Maya's dashboard polled in the background (~8-10s) and automatically updated!
- **Action**: Show that the Acme Corp thread now displays the green status badge: `Draft Approved by Priya`.
- **Action**: Maya clicks **"Send Approved Email"**. The toast confirms simulated transmission (`SEND_ENABLED=false` safety gate) and records an immutable audit entry in the Activity Log.
- **Voice-Over**:
  > *"Now look back at Maya's dashboard in Window A. Without any manual page reload, the two real accounts synced live! The draft reflects Priya's approval. Maya can review the final timestamp and click Send with full confidence. The approval trail is completely audited, and our safety guardrail prevents accidental dispatches."*

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
