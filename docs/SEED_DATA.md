# SEED DATA SPECIFICATION — ReplyRight Demo Environment

> **Context**: The demo dataset provides 40 realistic, deeply contextualized email threads simulating the inbox of **Priya Sharma** (Founder & CEO of *Vortex Dynamics*, an AI robotics enterprise) managed by her Executive Assistant, **Maya Lin**.

---

## 1. Characters & Organizational Context

| Name | Role | Email | Notes |
| :--- | :--- | :--- | :--- |
| **Priya Sharma** | Founder & CEO | `priya@vortexdynamics.com` | High-growth executive; relies on Maya for inbox triage; VIPs include investors, board members, and legal counsel. |
| **Maya Lin** | Executive Assistant | `maya@vortexdynamics.com` | Power assistant; handles logistics, drafts, calendar, and vendor management. |
| **Mark Suster** | Lead Investor | `mark.suster@upfront.com` | Board member; VIP; requires immediate Priya attention. |
| **Sarah Jenkins** | External Legal Counsel | `s.jenkins@fenwick.com` | Manages term sheets, stock options, and NDAs. |
| **Elena Rostova** | Head of Product | `elena@vortexdynamics.com` | Internal leadership team. |
| **Marcus Vance** | Key Enterprise Customer | `marcus@acmecorp.com` | Fortune 500 VP evaluating enterprise expansion. |
| **Anjali Sharma** | Family (Priya's Sister) | `anjali.sharma@gmail.com` | Personal VIP; never to be auto-muted. |

---

## 2. Dataset Composition (40 Distinct Threads)

```
Total Threads: 40
├── 10 Clear CLIENT_TO_REPLY
├── 14 Clear ASSISTANT_TO_REPLY
├── 8 Clear NO_REPLY_NEEDED (Quiet Folder)
├── 5 Ambiguous / Flagged NEEDS_REVIEW
└── 3 Dynamic Threads with Follow-Up Injection (Live Reclassification Demo)

Cross-Cutting Features Included in Seed:
• 2 Meeting threads with an intentional calendar conflict (Thursday 3:00 PM)
• 3 Waiting-for-Response threads with aged counters (1 day, 3 days, 5 days)
• 1 Urgent deadline due today at 5:00 PM
• 5 Deliberate Trap Threads designed to stress-test AI and guardrails
```

---

## 3. The 5 Edge-Case & Trap Threads

1. **Trap 1: Client Only CC'd on Complex Argument**
   - *Subject*: `RE: Firmware Update Rollout Schedule`
   - *From*: VP of Engineering to Head of Hardware; Priya is only CC'd.
   - *Content*: Long back-and-forth debate. No direct question addressed to Priya.
   - *Expected Result*: `NO_REPLY_NEEDED` (FYI thread for Priya; Maya keeps watch).
2. **Trap 2: Forwarded Thread with "Please Advise" to Maya**
   - *Subject*: `FW: Office Lease Escalation Clause`
   - *From*: Landlord forwarded by Facilities Manager saying *"Maya, please advise on which parking spots we should keep"*.
   - *Expected Result*: `ASSISTANT_TO_REPLY` (Even though Priya was on the initial chain, the action was explicitly given to Maya).
3. **Trap 3: Marketing Newsletter with Casual Question Trap**
   - *Subject*: `The Future of Enterprise LLMs — let me know what you think!`
   - *From*: `newsletter@substacksyndicate.com`
   - *Content*: Contains `List-Unsubscribe` header and concludes with *"Hit reply and let me know your thoughts on GPT-5!"*.
   - *Expected Result*: `NO_REPLY_NEEDED` (Prefilter detects newsletter header; does NOT fall for conversational bait).
4. **Trap 4: Maya Already Replied; Client Sign-off Pending**
   - *Subject*: `Speaker Agreement: TechCrunch Disrupt Mainstage`
   - *Content*: Maya already sent draft terms to organizers; organizers agreed; final signature link waiting for Priya.
   - *Expected Result*: `CLIENT_TO_REPLY` (Draft-for-approval lane shows Maya's prepared response; Priya taps "Approve").
5. **Trap 5: Casual-Sounding Note from Board Member**
   - *Subject*: `quick coffee next week?`
   - *From*: `mark.suster@upfront.com` (VIP Board Member)
   - *Content*: *"Hey Priya, no rush at all, let's grab coffee whenever you're free next month."*
   - *Expected Result*: `CLIENT_TO_REPLY` or `NEEDS_REVIEW` (Guardrail VIP rule prevents it from ever dropping to `NO_REPLY_NEEDED`).

---

## 4. Reclassification & Simulated Injection Scenarios

Three threads include predefined follow-up messages stored in `/server/src/seed/threads.json`:

1. **Scenario A (Escalation to Client)**:
   - *Thread*: `Acme Corp Enterprise License Renewal`
   - *Initial State*: `ASSISTANT_TO_REPLY` (Maya was negotiating dates).
   - *Injected Message*: Marcus Vance writes: *"We need Priya to personally sign off on the 20% discount amendment before 4 PM today."*
   - *New State*: Reclassifies to `CLIENT_TO_REPLY`.
2. **Scenario B (Resolution to No Reply)**:
   - *Thread*: `Hotel Room Block for Offsite`
   - *Initial State*: `ASSISTANT_TO_REPLY` (Maya was resolving credit card authorization).
   - *Injected Message*: Hotel Manager: *"All set! Reservation #884920 is fully confirmed and billed to company card."*
   - *New State*: Reclassifies to `NO_REPLY_NEEDED`.
3. **Scenario C (Conflict Discovery)**:
   - *Thread*: `Board Prep Session with CFO`
   - *Initial State*: Tentative calendar proposal.
   - *Injected Message*: CFO: *"Can only do Thursday at 3:00 PM EST."*
   - *New State*: Reclassifies to `NEEDS_REVIEW` (Conflict detected with Investor Sync).

---

## 5. Storage Location

The complete JSON structure with all 40 full multi-message threads and follow-up payloads is maintained at:
[`/server/src/seed/threads.json`](file:///d:/Nilesh/internship%20task/server/src/seed/threads.json)
