# Daybook Mail — A daybook for your inbox

> **An AI-powered email management and decision orchestration dashboard for Personal Assistants managing their executive's inbox.**

Daybook Mail bridges the gap between high-volume administrative triage and executive decision-making. Instead of forcing busy executives to read long email chains or leaving assistants uncertain about who owns the next reply, Daybook Mail uses an intelligent, risk-aware AI pipeline to categorize every conversation into **`ASSISTANT_TO_REPLY`**, **`CLIENT_TO_REPLY`**, **`NO_REPLY_NEEDED`**, or **`NEEDS_REVIEW`**.

---

## 1. System Architecture

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

## 2. Key Features

- **Multi-Client Operations & "Today" Command Dashboard (`/assistant/today`)**: Purpose-built for Executive Assistants managing multiple high-profile clients. Features a persistent top-bar client switcher (`[Today] [Priya Sharma] [Rohan Kapoor] [+ Add Client]`), executive summary cards, scheduled meetings strip with conflict alerts, and a prioritized "Needs You Now" stack jumping directly into client-filtered inboxes.
- **Per-Client Agent Memory ("Agent Notes") & Side-by-Side Dry Run (`/assistant/c/:clientId/agents`)**: Independent agent memory per client with standing instructions (max 500 chars) and active memories (source: user/learned). Features a side-by-side Dry Run preview showing `withNotes` vs `withoutNotes` without modifying database state. Guardian Agent enforces a strictness-only invariant so notes can never loosen safety guardrails.
- **Specialized Autonomous Agent Collective & Control Room (`/agents`)**: Six isolated agents (`TriageAgent`, `SchedulingAgent`, `FollowUpAgent`, `DraftingAgent`, `DigestAgent`, `GuardianAgent`) handling routine triage, conflict detection, stale thread check-ins, pre-drafting, and morning briefs autonomously. Governed by a zero-trust **Guardian Agent** that detects VIP/compliance edge cases, reverses bad auto-file actions instantly, and guarantees 1-click Undo for all state mutations.
- **Real Authentication & Role Separation with Role Chooser Modal**: Zero persona switcher. Assistants and executive clients authenticate with separate credentials. Polished centered Role Chooser modal on "Log in" ("How are you signing in?") with "I'm an assistant" vs "I'm a client" cards, deep links (`/login?role=assistant|client`), and server-enforced role mismatch switching. Single-use client invite flow generates cryptographically secure 32-byte tokens stored as SHA-256 hashes with 7-day expiration.
- **Editorial Landing Page (`/`)**: High-polish visual presentation with drifting email cards, interactive collective agent showcase, triage reasoning playground, value propositions, and role-based redirecting for authenticated users.
- **Two Connected Experiences**:
  - **Assistant Workspace & Today Dashboard (`/assistant/today`)**: High-throughput 3-pane desktop dashboard featuring full keyboard navigation (`j`/`k`, shortcuts), persistent client switcher tabs, scheduled meetings strip with conflict alerts, prioritized "Needs You Now" stack, deep AI reasoning inspection, draft-for-approval composer, and timeline audit logs.
  - **Client Editorial Decision Desk (`/client`)**: Premium 3-zone executive desk (Desktop >=1024px max 1440px) featuring a left rail navigator (Today, This week, Later, Waiting on others, Handled) with countdown deadline, middle scannable urgency rows, and a right decision sheet in warm editorial Fraunces serif typography with concise "What's being asked" summaries, quiet blockquote evidence, and a sticky action bar (*Approve Maya's Draft*, *Reply Myself*, *Hand to Maya*, *Snooze*, *Mark Handled*). Automatically adapts to tablet drawer and mobile single-column layouts with full keyboard support (`j`/`k`, `Enter`, `a`, `h`, `s`, `d`).
- **Client Playbook**: Tailored delegation matrix encoding VIP senders, topic rules, spending approval limits, and custom client nuances into the AI classification prompt.
- **Learning from Corrections**: Manual label overrides are tracked as few-shot training examples, offering an instant **"Make this a rule?"** prompt to update the Playbook.
- **Risk-Aware Guardrails in Code**: Senders on VIP lists, contracts, and currency amounts > \$500 can *never* resolve to `NO_REPLY_NEEDED`.
- **The Quiet Folder**: Complete audit transparency for muted newsletters and receipts with a daily assurance banner.
- **Command Palette & AI Chat (Cmd+K)**: Natural language queries answered using LLM tool calling over MongoDB with clickable thread citations.
- **Simulated Message Injector**: Instant demonstration of live incoming messages and real-time thread reclassifications.

---

## 3. Technology Stack

- **Runtime**: Node.js 20+ (ES Modules, plain JavaScript)
- **Frontend (`/client`)**: React 18, Vite 5, React Router v6, Tailwind CSS, TanStack Query v5, Lucide React, Framer Motion, date-fns, Sonner, CMD-K
- **Backend (`/server`)**: Express, Mongoose (MongoDB Atlas), Zod, JSON Web Tokens, bcryptjs, cookie-parser, cors, helmet, express-rate-limit, pino
- **AI Engines**: Google Gemini (`gemini-2.0-flash` via `@google/genai`), Groq SDK (`llama-3.3-70b-versatile`)
- **Integrations**: Google APIs (`googleapis`), Microsoft Graph API, Demo Mailbox Adapter

---

## 4. Repository Structure

```
├── .agent/rules/              # Rule files loaded by AI agents
├── client/                    # Vite + React 18 frontend
│   ├── src/
│   │   ├── app/               # Routing and state providers
│   │   ├── components/        # Reusable UI components
│   │   ├── features/          # Feature slices (threads, decision cards, playbook)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Client utilities and API fetch wrapper
│   │   ├── pages/             # Page views (Assistant, Client, Settings)
│   │   └── styles/            # Tailwind CSS & design tokens
├── docs/                      # Master project documentation
│   ├── AI_DESIGN.md           # AI schemas, pipeline, guardrails, fallback order
│   ├── ARCHITECTURE.md        # Technical architecture, security, and data flow
│   ├── DATA_MODEL.md          # Mongoose schemas and composite index definitions
│   ├── DEMO_SCRIPT.md         # 3-minute timed live walkthrough script
│   ├── DESIGN_SYSTEM.md       # Color tokens, typography, component specs
│   ├── INTEGRATIONS.md        # Gmail, Outlook, Demo adapters & OAuth2 guide
│   ├── PRODUCT.md             # Vision, personas, segments, differentiator features
│   ├── SEED_DATA.md           # 40 seed thread specs, traps, and follow-ups
│   ├── SIMULATED.md           # Living registry of simulated vs live features
│   └── TASKS.md               # Phased implementation checklist
├── server/                    # Express backend
│   ├── src/
│   │   ├── ai/                # LLM orchestration and Zod schemas
│   │   ├── config/            # Database and environment configuration
│   │   ├── controllers/       # Route request handlers
│   │   ├── middleware/        # Auth, rate limiting, error handling
│   │   ├── models/            # Mongoose data models
│   │   ├── providers/         # Email provider adapters (Demo, Gmail, Outlook)
│   │   ├── routes/            # Express API route aggregation
│   │   ├── seed/              # Seed data runner and threads.json dataset
│   │   ├── services/          # Business logic engines
│   │   └── utils/             # AES-256-GCM crypto and date utilities
├── AGENTS.md                  # Master operating rules for all AI agents
├── package.json               # Monorepo root workspace configuration
└── render.yaml                # Render deployment descriptor
```

---

## 5. Local Setup & Quickstart

### Prerequisites
- Node.js 20+
- npm 10+
- MongoDB Atlas cluster URI (or local MongoDB)

### 1. Installation
Clone the repository and install all dependencies across workspaces:
```bash
npm install
```

### 2. Environment Configuration
Create environment files from templates:
```bash
cp .env.example server/.env
cp client/.env.example client/.env
```

Ensure `server/.env` contains your MongoDB connection string and API keys (see [Manual Steps](#6-manual-setup-steps-for-external-services) below).

### 3. Start Development Servers
Run backend and frontend simultaneously:
```bash
npm run dev
```
- Client runs on: `http://localhost:5173`
- Backend API runs on: `http://localhost:5000`
- Health check available at: `http://localhost:5000/api/health`

### 4. Seed Demo Data
To populate MongoDB with Priya Sharma and Maya Lin's 40 demo conversations:
```bash
npm run seed
```

### 5. Run Automated Tests
Execute the native Node test suite verifying the 6-agent collective, Guardian risk reversal, zero-send safety gate, 1-click Undo, real RBAC role isolation, single-use SHA-256 invite flow, and login rate limiting:
```bash
npm test
```
Runs `server/test/agents.test.js` and `server/test/auth.test.js` (17 tests total).

### 6. Dual-Window Testing (Assistant & Client Sync)
1. **Window A (Maya Lin - Assistant)**:
   - Navigate to `http://localhost:5173/login`.
   - Click **"Try Demo as Assistant"** (or sign in with `maya@vortexdynamics.com` / `password123`).
   - You land on `/assistant` (3-pane desktop workspace).
2. **Window B (Priya Sharma - Client)**:
   - Open an Incognito window or separate browser profile at `http://localhost:5173/login`.
   - Expand the **"Demo accounts"** card and sign in with `priya@vortexdynamics.com` / `password123`.
   - Priya lands on `/client` (Decision Queue in editorial typography).
3. **Live Sync in Action**:
   - In Window B, approve or defer any decision (e.g. approve Acme Corp discount).
   - In Window A, watch Maya's dashboard update live within ~8-10 seconds without a manual page reload!
4. **Client Invite Flow**:
   - In Window A, click the client card in the sidebar to open the Client Profile modal.
   - Click **"Invite client"** (or "Resend invite") to generate a single-use invite link.
   - Open that URL (`/invite/:token`) in an incognito window, enter a 10+ char password, and accept to immediately enter `/client`.

### 7. Production Deployment (Render & Vercel)
- **Backend (Render)**: Deploy using `render.yaml` or create a Node web service (`npm run start --workspace=server`). Set `CLIENT_URL` to your Vercel URL. Ensure `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` are configured with production-grade random values (the server rejects startup with default keys in production).
- **Frontend (Vercel)**: Deploy `client` folder. In `client/vercel.json`, replace `REPLACE_WITH_RENDER_URL` with your Render backend URL (e.g. `https://daybook-server.onrender.com`). This edge rewrite routes all `/api/*` calls through the client origin so session cookies are first-party and never blocked.
- **Cookie SameSite**: Set `COOKIE_SAMESITE=lax` when using the Vercel API rewrite proxy (recommended), or `COOKIE_SAMESITE=none` with secure HTTPS if directly addressing a cross-origin server.

---

## 6. Manual Setup Steps for External Services

| Service | Environment Variable | Purpose | Setup Instructions |
| :--- | :--- | :--- | :--- |
| **MongoDB Atlas** | `MONGODB_URI` | Database | Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/atlas). Under Network Access, allow your IP. Under Database Access, create an application user. Copy connection string. |
| **Google Gemini API** | `GEMINI_API_KEY`<br>`GEMINI_MODEL=gemini-2.0-flash` | Primary AI Engine | Obtain an API key from [Google AI Studio](https://aistudio.google.com/). Free tier allows generous RPM. |
| **Groq SDK** | `GROQ_API_KEY`<br>`GROQ_MODEL=llama-3.3-70b-versatile` | Fallback AI Engine | Obtain an API key from [Groq Console](https://console.groq.com/). Ultra-low latency fallback. |
| **Token Encryption** | `TOKEN_ENCRYPTION_KEY` | AES-256-GCM OAuth Token Storage | Generate a 32-byte (64 hex characters) key in terminal:<br>`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **Session Security** | `JWT_SECRET` | Authentication Tokens | Generate a secure secret string:<br>`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **Google Cloud (Gmail)** | `GOOGLE_CLIENT_ID`<br>`GOOGLE_CLIENT_SECRET`<br>`GOOGLE_REDIRECT_URI` | Live Gmail OAuth2 Sync | Create project in [Google Cloud Console](https://console.cloud.google.com/). Enable Gmail API. Configure OAuth Consent Screen in **Testing** mode and add test users. Create Web OAuth credentials with redirect URI: `http://localhost:5000/api/auth/google/callback`. |
| **Microsoft Azure (Outlook)** | `MICROSOFT_CLIENT_ID`<br>`MICROSOFT_CLIENT_SECRET`<br>`MICROSOFT_REDIRECT_URI` | Live Outlook Graph API Sync | Register an application in [Azure Portal - App Registrations](https://portal.azure.com/). Enable multitenant accounts. Add delegated permissions: `Mail.Read`, `Mail.Send`, `offline_access`. Create a client secret and configure redirect URI: `http://localhost:5000/api/auth/microsoft/callback`. |

---

## 7. Simulated vs Real Features

To guarantee flawless live demonstrations without third-party rate limits:
- **Simulated by Default**:
  - Demo Mailbox (40 realistic pre-seeded threads).
  - Live Inbound Message Injector (`POST /api/demo/simulate-message`).
  - Email Sending (`SEND_ENABLED=false` simulates email dispatch and updates audit log).
- **Live**:
  - Live Google OAuth and Microsoft Graph OAuth flows.
  - Live Gemini 2.0 Flash / Groq LLM pipelines on "Re-run AI" and Cmd+K Assistant.
  - Live MongoDB mutations and optimistic React Query updates.

---

## 8. Product Roadmap (Post-Prototype)

1. **Two-Way Calendar Auto-Rescheduling**: Autonomous conflict negotiation via Google Calendar & Outlook.
2. **Multi-Executive Support**: Single assistant supporting multiple executive clients with distinct playbooks.
3. **Omnichannel Ingestion**: Ingesting WhatsApp, Slack DMs, and SMS alerts into the unified decision queue.
4. **Custom Domain DKIM Delegation**: Authenticated on-behalf-of dispatch using custom domain mail servers.
