# AI & DECISION ENGINE SPECIFICATION — ReplyRight

> **Core Purpose**: Transform unstructured email communications into deterministic, actionable classifications and decision objects. The AI engine powers the primary value proposition: answering *who* must reply, *why*, and *by when*, while guaranteeing safety and zero system crashes.

---

## 1. Classification Philosophy & Scope

1. **Thread-Level Context**:
   - Isolated messages lack conversational context. An email stating *"Approved, go ahead"* cannot be classified without knowing what was approved.
   - The engine analyzes the **latest 1 to 3 messages** verbatim, paired with a compressed summary of older messages in the thread.
2. **Deterministic Schemas**:
   - Every classification generates a strictly validated JSON structure.
   - Raw free-form markdown responses are prohibited in the core classification pipeline.
3. **Resilience & Offline Guarantee**:
   - Seed and demo mailboxes ship with precomputed classifications.
   - Live demos will **never fail or stall** due to third-party API outages or quota limits.
   - However, clicking **"Re-run AI"** on any thread executes the live LLM pipeline.

---

## 2. Classification Schema (Zod Definition)

```javascript
import { z } from 'zod';

export const MeetingExtractionSchema = z.object({
  title: z.string().describe('Proposed title or subject of the meeting'),
  startTime: z.string().nullable().describe('ISO-8601 string or date expression'),
  endTime: z.string().nullable().describe('ISO-8601 string or date expression'),
  locationOrLink: z.string().nullable().describe('Physical room or Zoom/Meet link'),
  attendees: z.array(z.string()).default([]),
  isConflict: z.boolean().default(false),
});

export const DecisionSchema = z.object({
  question: z.string().describe('The single core question the executive must resolve'),
  options: z.array(z.string()).min(1).describe('Concise actionable choices (e.g. "Approve $10k", "Decline")'),
  deadline: z.string().nullable().describe('Explicit deadline or inferred timeframe'),
  consequence: z.string().nullable().describe('Risk or consequence if no decision is made'),
});

export const ClassificationResultSchema = z.object({
  label: z.enum([
    'ASSISTANT_TO_REPLY',
    'CLIENT_TO_REPLY',
    'NO_REPLY_NEEDED',
    'NEEDS_REVIEW'
  ]),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0.0 and 1.0'),
  reason: z.string().describe('Clear, 1-2 sentence explanation of why this label was assigned'),
  evidence: z.string().describe('Exact short quote or excerpt from the email supporting the decision'),
  summary: z.string().describe('Single-line crisp summary of the thread state'),
  decision: DecisionSchema.nullable().describe('Structured decision card data (required for CLIENT_TO_REPLY)'),
  action_required: z.boolean().describe('True if any participant must take a concrete action'),
  due_date: z.string().nullable().describe('ISO date string if a deadline exists'),
  meetings: z.array(MeetingExtractionSchema).default([]),
  needs_review: z.boolean().describe('True if flagged for human assistant review'),
  signals_used: z.array(z.string()).describe('Signals utilized: e.g. "VIP_MATCH", "PLAYBOOK_RULE", "BULK_HEADER"'),
});
```

---

## 3. Seven-Stage Ingestion & Classification Pipeline

```
[Inbound Thread] ──► 1. Deterministic Prefilters (Headers & Senders)
                                │ (No match)
                                ▼
                     2. Client Playbook Matcher (VIP & Keyword Rules)
                                │
                                ▼
                     3. LLM Pipeline (Gemini 2.0 Flash / Groq)
                                │ + Few-shot recent corrections
                                ▼
                     4. Zod Schema Validation & Retry
                                │ (Retry once on syntax/schema error)
                                ▼
                     5. Risk-Aware Guardrails (Hard In-Code Safety)
                                │
                                ▼
                     6. Confidence Threshold Routing
                                │
                                ▼
                     7. Persistence, Event Log & Cache Update
```

### Stage 1: Deterministic Prefilters (Zero-Token Bypass)
Before spending LLM quota, deterministic rules check message headers:
- `List-Unsubscribe` or `Precedence: bulk / list` headers.
- System senders: `noreply@`, `no-reply@`, `mailer-daemon@`, `notifications@github.com`, `billing@stripe.com` (routine receipts).
- Pure calendar invites without accompanying personal notes.
- *Outcome*: Label set to `NO_REPLY_NEEDED`, reason recorded as *"Automated system notification or bulk newsletter"*, bypassing the LLM.

### Stage 2: Client Playbook Context Assembly
- Resolves the client's Playbook:
  - VIP senders and domains (e.g., `@sequoia.com`, `board@acme.com`).
  - Strict topic assignments (*"Always Priya"* vs *"Maya can handle"*).
  - Spend limits and free-text preferences.
- Retrieves the **10 most recent corrections** for this client to inject as few-shot training examples.

### Stage 3: LLM Invocation
- Prompt combines:
  1. Base Persona instructions.
  2. Directional criteria (Client vs Assistant vs No Reply).
  3. Client Playbook rules.
  4. Recent manual correction examples.
  5. Thread context (subject, participants, recent messages).
- **Provider Order**:
  - Primary: Google Gemini (`gemini-2.0-flash` via `@google/genai`).
  - Fallback: Groq (`llama-3.3-70b-versatile` via `groq-sdk`) if Gemini times out (>8000ms) or returns 429/500.

### Stage 4: Validation & Retry
- Response string is parsed as JSON and validated against `ClassificationResultSchema`.
- If parsing fails, the error is fed back to the LLM for a single fast repair retry.
- If retry fails, the engine falls back to the deterministic Heuristic Rule Engine and marks `needs_review: true`.

### Stage 5: In-Code Risk Guardrails
Code-level safety policies override the LLM if any safety rule is violated:
- **VIP Sender Guardrail**: If sender is in Priya's VIP list, label *cannot* be `NO_REPLY_NEEDED`. If the LLM returned `NO_REPLY_NEEDED`, it is automatically escalated to `NEEDS_REVIEW` with signal `"GUARDRAIL_VIP_OVERRIDE"`.
- **Financial & Legal Guardrail**: If body contains terms like `term sheet`, `agreement`, `wire transfer`, `NDA`, or currency amounts > \$500, label *cannot* be `NO_REPLY_NEEDED`. Escalates to `CLIENT_TO_REPLY` or `NEEDS_REVIEW`.
- **Direct Question Guardrail**: If text contains a direct question directed at Priya (*"Priya, please confirm..."*), label *cannot* be `NO_REPLY_NEEDED`.

### Stage 6: Confidence Threshold Routing
- **Confidence >= 0.80**: Auto-applied cleanly.
- **Confidence 0.55 – 0.79**: Label applied, but marked with an amber `"Needs Verification"` indicator.
- **Confidence < 0.55**: Forced to `NEEDS_REVIEW` segment.

### Stage 7: Event Logging & Cache
- Cache key: `hash(threadId + latestMessageId)`.
- If the thread's label changed compared to its previous state, emit a `ClassificationEvent` documenting:
  - `previousLabel`, `newLabel`, `triggerMessageId`, `reason`, `modelUsed`, `timestamp`.

---

## 4. Directional Responsibility Rules

| Target Label | Qualified Topics & Scenarios |
| :--- | :--- |
| **`CLIENT_TO_REPLY`** | Strategic executive decisions; term sheets and investment terms; board communications; contract / NDA signatures; sensitive personnel / hiring offers; direct personal family notes; explicit requests for Priya's personal point of view. |
| **`ASSISTANT_TO_REPLY`** | Meeting scheduling & calendar coordination; travel and flight itineraries; expense receipt processing; vendor questions and logistics; routine acknowledgments; inquiries where Maya holds delegated authority (< \$1,000 spend). |
| **`NO_REPLY_NEEDED`** | Newsletters, marketing content, product updates; automated receipts and delivery notifications; FYI threads where Priya/Maya were CC'd without questions; threads where the final conclusion was already reached (*"Thanks, got it!"*). |
| **`NEEDS_REVIEW`** | Ambiguous tone, conflicting signals, low AI confidence, or guardrail-flagged safety overrides. |

---

## 5. Waiting for Response Detection

The system continuously scans the thread's `lastDirection` and closing sentiment:
- If `lastDirection === 'OUTBOUND'` (sent by Priya or Maya) and:
  - Contains a question, request, or proposal (*"Let me know if Tuesday works"*, *"Attached is the revised contract for your review"*),
  - AND no inbound reply has arrived since,
- The thread is flagged as `isWaiting: true` with a calculated `waitingSince` date and `daysWaiting` counter.

---

## 6. AI Draft Generation (Assistant Lane)

When Maya opens an unreplied email:
1. She can trigger **"Generate AI Draft"**.
2. Engine references:
   - Client style persona (tone: professional, concise, warm).
   - Assistant signature rules.
   - Core thread question and context.
3. Output is rendered inside the draft composer as an editable draft.
4. **Safety Rule**: AI drafts are *never* sent automatically. Maya must inspect, edit if necessary, and choose between **"Send Now"** or **"Send to Priya for Approval"**.

---

## 7. Natural Language AI Chat & Command Palette (Cmd+K)

The global command bar integrates an LLM agent with structured tool calling against MongoDB:

### Available Tools:
1. `search_threads({ query, label, limit })`: Keyword search across subjects, snippets, and participants.
2. `get_thread({ threadId })`: Retrieves complete conversation history and AI reasoning.
3. `count_by_label()`: Returns current counts across all active segments.
4. `list_awaiting_client()`: Returns threads in Priya's decision queue sorted by urgency.
5. `list_deadlines()`: Returns upcoming deadlines and extracted meeting conflicts.

### Citation Protocol:
Every tool output presented in the chat must format referenced threads as clickable Markdown links (e.g., `[Series A Term Sheet](/assistant/threads/thread_101)`).
