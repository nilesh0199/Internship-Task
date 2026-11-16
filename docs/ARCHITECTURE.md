# ARCHITECTURE SPECIFICATION — ReplyRight

> **System Overview**: ReplyRight is designed as a modular, decoupled full-stack architecture built on Node 20 (ES Modules) and React 18. It separates high-throughput assistant triage from distilled executive decision-making while operating against a single authoritative MongoDB store and a multi-provider ingestion engine.

---

## 1. High-Level Architecture Diagram

```
                        ┌──────────────────────────────────────────────┐
                        │                CLIENT BROWSER                │
                        │                                              │
                        │   ┌───────────────────┐  ┌───────────────┐   │
                        │   │ Assistant 3-Pane  │  │ Client Mobile │   │
                        │   │  Workspace (Maya) │  │  Queue (Priya)│   │
                        │   └─────────┬─────────┘  └───────┬───────┘   │
                        │             │ React 18 + TanStack│           │
                        │             │ Query (Optimistic) │           │
                        └─────────────┼────────────────────┼───────────┘
                                      │ HTTP / REST / JSON │
                                      ▼                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            EXPRESS BACKEND (NODE 20)                         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Middlewares: Helmet, CORS, RateLimit, CookieJWT, ZodValidator, Logger   │  │
│  └────────────────────────────────────┬───────────────────────────────────┘  │
│                                       ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Controllers & Business Services                                        │  │
│  │  • ThreadService   • PlaybookEngine   • SyncCoordinator   • ChatEngine │  │
│  └──────────────┬─────────────────────┬──────────────────────┬────────────┘  │
│                 │                     │                      │               │
│                 ▼                     ▼                      ▼               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐  │
│  │ Provider Adapters    │  │ AI Pipeline          │  │ Security Subsystem │  │
│  │  • Demo Mailbox      │  │  1. Fast Prefilters  │  │  • AES-256-GCM     │  │
│  │  • Gmail (OAuth2)    │  │  2. Playbook Matrix  │  │    Token Encrypt   │  │
│  │  • Outlook (Graph)   │  │  3. Gemini 2.0 Flash │  │  • Zero-Body Logger│  │
│  │                      │  │  4. Groq Fallback    │  │  • SEND_ENABLED    │  │
│  │                      │  │  5. Hard Guardrails  │  │    Safety Gate     │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └────────────────────┘  │
└─────────────┼─────────────────────────┼──────────────────────────────────────┘
              ▼                         ▼
   ┌──────────────────────┐  ┌─────────────────────────────────────────────────┐
   │ EXTERNAL APIS        │  │ MONGODB ATLAS (Unified Store)                   │
   │  • Google Gmail API  │  │  • Users & Clients    • Threads (Segment Views) │
   │  • Microsoft Graph   │  │  • Messages & Drafts  • Corrections & Playbooks │
   │  • Gemini / Groq LLM │  │  • Activity Logs      • Classification Events   │
   └──────────────────────┘  └─────────────────────────────────────────────────┘
```

---

## 2. Component Layers & Responsibilities

### 2.1. Client Layer (`/client`)
- **Technology**: Vite 5, React 18, React Router v6, Tailwind CSS, TanStack Query v5.
- **Role Isolation**:
  - `/assistant/*`: 3-pane responsive desktop dashboard optimized for high-volume keyboard triage (`j`/`k`, shortcuts), deep AI reasoning inspection, and draft dispatch.
  - `/client/*`: Ultra-minimal, single-column card stack optimized for touch / swipe gestures (right = hand to Maya, left = mark handled), showing only decision-ready emails.
- **State Management & Caching**:
  - Server state managed entirely via TanStack Query with aggressive query invalidation and optimistic updates for label overrides, draft approvals, and snoozes.
  - UI state (active selection, search filters, modal toggles) managed via local React state and context.
  - Global feedback handled via `sonner` toasts with built-in 5-second undo actions.

### 2.2. Server Layer (`/server`)
- **Runtime**: Node 20+, native ES modules (`import`/`export`), plain JavaScript.
- **Express Framework**:
  - Strict input validation using Zod schemas at route entry points.
  - Centralized error handler ensuring uniform error envelopes (`{ ok: false, error: { message, code } }`).
  - Pino logger configured with strict body masking (zero email bodies recorded).

### 2.3. Data Storage (`/server/src/models`)
- **Database**: MongoDB Atlas via Mongoose ODM.
- **Unified Thread Store Pattern**:
  - Rather than distributing emails into disparate folders or collections, all correspondence lives in the `threads` collection.
  - Segments (`ASSISTANT_TO_REPLY`, `CLIENT_TO_REPLY`, `NO_REPLY_NEEDED`, `WAITING`, etc.) are high-performance indexed queries over composite keys:
    - `{ orgId: 1, currentLabel: 1, lastMessageAt: -1 }`
    - `{ orgId: 1, clientVisible: 1, clientStatus: 1 }`
    - `{ orgId: 1, isWaiting: 1 }`

### 2.4. Provider Abstraction Layer (`/server/src/providers`)
- Implements a uniform `EmailProviderAdapter` interface:
  ```javascript
  class EmailProviderAdapter {
    async connect(credentials) {}
    async sync({ since, limit }) {}
    async getThread(providerThreadId) {}
    async sendReply({ threadId, inReplyTo, to, subject, bodyHtml }) {}
    async disconnect() {}
  }
  ```
- Concrete Implementations:
  - `DemoProvider`: Serves local pre-baked threads and provides simulated new-message injection for live demos.
  - `GmailProvider`: Connects via Google APIs client library using OAuth2 refresh tokens.
  - `OutlookProvider`: Connects to Microsoft Graph using MSAL / delegated access.

### 2.5. AI & Decision Pipeline (`/server/src/ai`)
- **Cascading Multi-Tier Architecture**:
  1. *Deterministic Prefilters*: Headers (`List-Unsubscribe`, `Precedence: bulk`), system senders (`noreply@`, `mailer-daemon@`), calendar automated acceptance notifications. Resolves immediately to `NO_REPLY_NEEDED` without consuming LLM tokens.
  2. *Playbook Rule Matching*: Scans VIP lists, domain patterns, and explicit client instructions.
  3. *Primary LLM Engine*: Google Gemini (`gemini-2.0-flash`) executing prompt with strict Zod JSON output.
  4. *Secondary LLM Fallback*: Groq SDK (`llama-3.3-70b-versatile`) if Gemini experiences timeouts (>8s) or rate limiting.
  5. *Heuristic Fallback Engine*: Rule-based fallback if all LLMs are unreachable.
  6. *Hard Guardrails*: In-code safety checks that prevent dangerous classifications (e.g., VIP senders or high-value contracts can never be marked `NO_REPLY_NEEDED`).

---

## 3. Data Flow: Thread Ingestion to Decision

```
[ Inbound Email / Sync Trigger ]
              │
              ▼
    Provider Adapter (Fetch & Normalize Headers)
              │
              ▼
    Cache Check (Hash of threadId + latestMessageId)
      ├── Cache Hit  ──> Return Existing Classification
      └── Cache Miss ──> Run Classification Pipeline:
                           │
                           ├── 1. Deterministic Prefilters (Bulk/Notification check)
                           ├── 2. Playbook VIP & Topic Evaluation
                           ├── 3. LLM Prompt (Gemini / Groq) + Few-Shot Corrections
                           ├── 4. Zod Schema Validation (Retry once on error)
                           ├── 5. Code Guardrail Enforcement (VIP/Money overrides)
                           └── 6. Confidence Tier Mapping:
                                    • >= 0.80 ──> Auto-Apply Label
                                    • 0.55-0.79 ──> Apply Label + Flag Needs Review
                                    • < 0.55 ──> Assign NEEDS_REVIEW
              │
              ▼
    Persist Thread & Classification Record + Emit ClassificationEvent
              │
              ▼
    Broadcast / Invalidate React Query Cache (Live UI Update)
```

---

## 4. Security & Compliance Architecture

1. **Token Protection**: OAuth access tokens and refresh tokens are encrypted at rest using AES-256-GCM. The initialization vector (IV) and authentication tag are stored alongside the ciphertext.
2. **Session Security**: Authentication relies on signed JWTs stored in secure, `HttpOnly`, `SameSite=Lax` cookies.
3. **Dispatch Guard**: Real email dispatch is blocked unless `SEND_ENABLED=true` is explicitly configured in the server environment. Prototype operations simulate email transmission with full activity logs.
4. **Privacy Shield**: Email content is sanitized in transit; bodies are never exposed to server log streams.
