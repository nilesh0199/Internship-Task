# Daybook Mail — A daybook for your inbox

> **An AI-powered email triage and executive decision desk for Personal Assistants managing high-stakes client inboxes — with closed-loop AI agents where judgment is needed, deterministic checks where safety matters, and Bring-Your-Own-Key (BYOK) multi-provider AI support.**

Daybook Mail separates high-volume inbox triage from executive decision-making. Instead of forcing busy founders to dig through long email threads or leaving assistants unsure who owns the next reply, Daybook Mail routes every thread into **`CLIENT_TO_REPLY`**, **`ASSISTANT_TO_REPLY`**, **`NO_REPLY_NEEDED`**, or **`NEEDS_REVIEW`** — with explicit reasoning, evidence quotes, hard code safety guardrails, and zero autonomous email dispatch.

---

## Evaluator Quick-Start (60-Second Walkthrough)

No account signup or API keys are required to test the full prototype — both locally and on the deployed Render URL (`DEMO_MODE=true` is enabled in `render.yaml` and automatically isolates the pre-seeded demo workspace even when MongoDB Atlas is connected):

1. **Assistant Workspace (Maya Lin)**:
   - Open `/` and click **`Try Demo as Assistant`** (or open `/login` → **`1-Click Assistant Demo`**).
   - Explore the **Today Command Center** (`/assistant/today`) managing two distinct executives (**Priya Sharma** · Vortex Dynamics & **Rohan Kapoor** · Apex Freight Logistics — 60 pre-seeded realistic threads total).
   - Press **`Ctrl + K`** (or click **`Ask AI`**) to run natural-language queries across threads (*"Show emails needing client's attention"*, *"emails from Mark Suster"*, *"Summarize this conversation"*, *"Upcoming deadlines and conflicts"*).
   - Open any ambiguous thread and expand the **Agent Trace** to inspect multi-step thought summaries, tool calls, observations, stop reasons, and **Re-run live**.
   - Open **Control Room** (`/agents`) to see clear **Agent** vs **Workflow** vs **Safety Check** boundaries and 1-click **Undo** on autonomous actions.
2. **Client Decision Desk (Priya Sharma)**:
   - Open `/` in a second/incognito window and click **`Try Demo as Client`** (or `/login` → **`1-Click Client Demo`**).
   - Review Priya's editorial **Decision Desk** (`/client`): edit and 1-tap **`Approve & Send Draft`** on prepared responses (Mark Suster's term sheet, Elena Rostova's VP Eng offer, TechCrunch keynote), click **Quick Decision Paths**, **`Reply Myself`**, **`Hand to Maya`**, or expand the full multi-message **Original Email Conversation**.
   - Open **Settings → VIP Contacts** to add or remove live VIP emails and domains (synced immediately with Maya's Playbook and hard safety guardrails).
3. **Optional Live AI via BYOK (Bring Your Own Key)**:
   - In the Assistant Workspace, click **Settings → AI Provider & API Key**.
   - Choose **Google Gemini** (`gemini-3.8-flash` free-tier default), **OpenAI** (`gpt-5-mini`), **Anthropic Claude** (`claude-sonnet-5-5`), **Groq Cloud** (`openai/gpt-oss-120b`), or **OpenRouter** — or type any custom Model ID (with an inline **`?`** Model ID guide).
   - Keys are encrypted server-side with **AES-256-GCM**, never sent back to the browser, and verified via **`Test Connection`**. Without a key, all features run reliably on deterministic workflows and structured inbox tools.
4. **Demo Reset & Live Inbound Simulation**:
   - In Assistant **Settings → Demo Tools & Reset**, trigger **`Simulate Inbound Email`** to watch live triage or **`Restore Pristine Demo Data`** to reset all 60 threads cleanly.

---

## 1. System Architecture

```text
                        ┌──────────────────────────────────────────────┐
                        │                CLIENT BROWSER                │
                        │                                              │
                        │   ┌───────────────────┐  ┌───────────────┐   │
                        │   │ Assistant 3-Pane  │  │ Client Desk   │   │
                        │   │  Workspace (Maya) │  │    (Priya)    │   │
                        │   └─────────┬─────────┘  └───────┬───────┘   │
                        │             │ React 18 + Vite 5  │           │
                        └─────────────┼────────────────────┼───────────┘
                                      │ Same-Origin REST / Cookie JWT
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     UNIFIED EXPRESS SERVER (NODE 20+)                        │
│      Serves /api/* + /healthz + Compiled SPA Static Assets (client/dist)     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Middleware: Helmet, CORS, RateLimiter, CookieJWT, Zod, Pino Logger     │  │
│  └────────────────────────────────────┬───────────────────────────────────┘  │
│                                       ▼                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐  │
│  │ Provider Adapters    │  │ AI & Agent Runtime   │  │ Security Guardrails│  │
│  │  • Demo Mailbox (60) │  │  • Closed-Loop Agents│  │  • AES-256-GCM     │  │
│  │  • Gmail (OAuth2)    │  │  • Deterministic     │  │    Keys & Tokens   │  │
│  │  • Outlook (Graph)   │  │    Workflows         │  │  • Zero-Body Logs  │  │
│  │                      │  │  • Guardian Code     │  │  • SEND_ENABLED    │  │
│  │                      │  │    Safety Check      │  │    Safety Gate     │  │
│  │                      │  │  • BYOK Multi-LLM    │  │  • Strict RBAC     │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └────────────────────┘  │
└─────────────┼─────────────────────────┼──────────────────────────────────────┘
              ▼                         ▼
   ┌──────────────────────┐  ┌─────────────────────────────────────────────────┐
   │ EXTERNAL APIS        │  │ STORAGE LAYER (MongoDB Atlas + Hybrid Demo)     │
   │  • Gmail / MS Graph  │  │  • Users, Clients, Playbooks, Agent Memory      │
   │  • Gemini 3.8 Flash  │  │  • Threads, Messages, Drafts, AgentRuns         │
   │  • OpenAI / Claude   │  │  • Encrypted BYOK AiProviderConfig              │
   │  • Groq / OpenRouter │  │  • Activity Logs & Classification Events        │
   └──────────────────────┘  └─────────────────────────────────────────────────┘
```

---

## 2. Key Features

- **Multi-Client Operations & "Today" Command Center (`/assistant/today`)**: Persistent top-bar client switcher (`Today`, `Priya`, `Rohan`, `+ Add Client`), per-client urgency cards, meeting conflict alerts, and a prioritized "Needs You Now" queue.
- **Honest Agent vs Workflow Architecture & Control Room (`/agents`)**:
  - **Closed-Loop Agents** (reason → act → observe → decide with bounded step limits, tool allowlists, and stop conditions): `TriageInvestigator`, `SchedulingAgent`, `DraftingAgent`, and the `Ctrl+K` Chat Assistant.
  - **Deterministic Workflows**: `FollowUpAgent`, `DigestAgent`, and fast `TriageAgent` prefilters.
  - **Zero-Trust Guardian Safety Check** (100% deterministic code, 0 LLM calls): prevents VIPs, legal terms, or amounts > \$500 from ever being muted, reverses unsafe auto-files automatically, and supports 1-click **Undo**.
- **Expandable Agent Trace Viewer**: Numbered reasoning steps (thought summary, tool call, observation, stop reason, usage metrics), clearly tagged as **Recorded sample** vs **Live**, with **Re-run live** and honest workflow fallback indicators.
- **Bring Your Own AI Key (BYOK) Settings**: Assistant-only Settings tab supporting **Google Gemini** (`gemini-3.8-flash` default), **OpenAI**, **Anthropic Claude**, **Groq Cloud**, and **OpenRouter**, plus manual custom Model ID entry with an inline `?` Model ID guide, live connection testing, actionable error taxonomy (`INVALID_API_KEY`, `INSUFFICIENT_QUOTA`, `RATE_LIMITED`, `MODEL_NOT_FOUND`, `INVALID_MODEL_FORMAT`, `NETWORK_TIMEOUT`), and **AES-256-GCM** encryption at rest.
- **Client Editorial Decision Desk (`/client`)**: Clean 3-pane desktop / 2-pane tablet / single-pane mobile workspace with a permanently pinned bottom Action Dock (**`Approve & Send Draft`**, **`Reply Myself`**, **`Hand to Maya`**, **`Snooze`**, **`Mark Handled`**), Quick Decision Paths, editable Maya drafts, full multi-message original threads, live **VIP Contacts** management, and auto-updating time-of-day greetings.
- **Global Command Palette (`Ctrl+K` / `⌘+K`)**: Works across Today View and every client inbox; supports natural-language search, thread-specific summaries & reasoning, segment counts, and clickable matched thread cards.
- **Real Auth & Role Separation**: Separate Assistant and Client sessions via `httpOnly` JWT cookies, role-mismatch handling, single-use SHA-256 client invite links (`/invite/:token`), and strict multi-tenant org/client scoping.
- **Honest Synthetic Evaluation Harness (`npm run eval`)**: Benchmarks static rules vs. closed-loop Investigator across 38 labeled synthetic threads with accuracy, escalation rate, steps, latency, and confusion matrices saved to [docs/EVAL_RESULTS.md](docs/EVAL_RESULTS.md).

---

## 3. Technology Stack

- **Runtime**: Node.js 20+ (Native ES Modules, Plain JavaScript)
- **Frontend (`/client`)**: React 18, Vite 5, React Router v6, Tailwind CSS, TanStack Query v5, Lucide React, Framer Motion, date-fns, Sonner
- **Backend (`/server`)**: Express 4, Mongoose 8 (MongoDB Atlas + resilient in-memory fallback), Zod, JWT, bcryptjs, cookie-parser, cors, helmet, express-rate-limit, pino
- **AI Providers**: Google Gemini (`gemini-3.8-flash` default), Groq (`llama-3.3-70b-versatile` / `openai/gpt-oss-120b`), plus BYOK support for OpenAI, Anthropic Claude, and OpenRouter
- **Mail Connectors**: Demo Mailbox Adapter (60 threads), Google Gmail API (`googleapis`), Microsoft Graph API (`OutlookProvider`)

---

## 4. Repository Structure

```text
├── client/                    # Vite + React 18 frontend
│   └── src/
│       ├── app/               # Routing & auth guards
│       ├── components/        # Reusable UI (SettingsModal, AiProviderSettingsTab, CommandPaletteModal, AgentTraceViewer, DraftEditor, etc.)
│       ├── features/          # AuthContext & domain helpers
│       ├── hooks/             # Custom React hooks
│       ├── lib/               # API fetch client
│       └── pages/             # Landing, Login, AssistantDashboard, AssistantTodayView, ClientQueue, AgentControlRoom, AccountsPage
├── server/                    # Express backend
│   ├── eval/                  # 38-thread synthetic benchmark dataset & runner (npm run eval)
│   ├── src/
│   │   ├── agents/            # Agents, workflows, Guardian, and closed-loop runtime/
│   │   ├── ai/                # Pipeline, guardrails, heuristicEngine, llmClient, byokCatalog, byokClient, chatTools
│   │   ├── config/            # Environment & MongoDB connection
│   │   ├── controllers/       # Route controllers (auth, threads, ai, aiSettings, agents, playbook, demo)
│   │   ├── middleware/        # Auth, RBAC, Zod validation, rate limiting, error handler
│   │   ├── models/            # Mongoose schemas (User, Client, Thread, Message, Draft, AgentRun, AiProviderConfig, etc.)
│   │   ├── providers/         # Gmail, Outlook, and Demo adapters
│   │   ├── routes/            # Express API routers
│   │   ├── seed/              # Pre-seeded demo datasets (Priya + Rohan, 60 threads)
│   │   ├── services/          # Hybrid MongoDB / Demo Store & live feed
│   │   └── utils/             # AES-256-GCM crypto & Pino logger
│   └── test/                  # Native Node test suites (50 tests across 5 suites)
├── docs/                      # Architecture, Agents Design, Eval Results, Demo Script, Simulated Registry, Product, Tasks
├── AGENTS.md                  # Engineering & safety operating directives
├── package.json               # Root workspace scripts (dev, build, start, test, eval)
└── render.yaml                # Single-service Render Blueprint descriptor
```

---

## 5. Local Setup & Commands

### Prerequisites
- Node.js 20+ and npm 10+
- MongoDB Atlas URI *(optional — runs out-of-the-box with the resilient in-memory store when omitted)*

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional for Local Demo)
```bash
cp .env.example server/.env
cp client/.env.example client/.env
```
*(Works immediately with zero external keys in demo mode; add `GEMINI_API_KEY`, `GROQ_API_KEY`, `MONGODB_URI`, or configure a key inside **Settings → AI Provider & API Key** at runtime.)*

### 3. Start Local Development
```bash
npm run dev
```
- Frontend (Vite): `http://localhost:5173`
- Backend API: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health` and `http://localhost:5000/healthz`

### 4. Run Automated Tests & Evaluation Harness
```bash
npm test --prefix server     # Runs 50 tests across 5 suites (agent_runtime, agents, auth, multi_client, byok)
npm run eval --prefix server # Runs 38-thread synthetic benchmark (writes docs/EVAL_RESULTS.md)
```

### 5. Production Build & Local Production Test
```bash
npm run build
npm run start
```
Builds `client/dist` and serves both the SPA and `/api/*` from `http://localhost:5000`.

---

## 6. Production Deployment (Single Render Web Service)

Daybook Mail deploys as **one unified Render web service**: Express binds to `0.0.0.0:$PORT`, sets `trust proxy = 1`, serves `/api/*` and `/healthz`, and serves `client/dist` from the same origin (1-year cache on hashed assets, `no-cache` on `index.html`, SPA fallback for browser routes, JSON 404 for unknown `/api/*` routes).

### Deploy with Render Blueprint (`render.yaml`)
1. Push this repository to GitHub.
2. In [Render](https://render.com), click **New + → Blueprint** and select your repository.
3. Render automatically reads `render.yaml` (`buildCommand: npm run build`, `startCommand: npm run start`, `healthCheckPath: /healthz`, `DEMO_MODE: "true"`, `SEND_ENABLED: "false"`).
4. Set required production secrets marked `sync: false`:
   - `TOKEN_ENCRYPTION_KEY` (64 hex chars — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `JWT_SECRET` (auto-generated by Render Blueprint)
   - `MONGODB_URI` *(optional — recommended for persisting real signups and encrypted BYOK keys; demo workspace remains fully functional for evaluators either way when `DEMO_MODE=true`)*
5. Click **Apply**.

### Keep Demo Warm 24/7 (Optional Free UptimeRobot Monitor)
Render free web services spin down after 15 minutes of inactivity. Point a free [UptimeRobot](https://uptimerobot.com) HTTP monitor at `https://<your-render-app>.onrender.com/healthz` every **5 minutes**.

---

## 7. Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `development` | `development`, `production`, or `test`. |
| `PORT` | No | `5000` | Server port (Render injects automatically). |
| `CLIENT_URL` | No | `RENDER_EXTERNAL_URL` or `http://localhost:5173` | Allowed CORS origin(s). |
| `COOKIE_SAMESITE` | No | `lax` | SameSite cookie policy (`lax` for same-origin Render deploy). |
| `JWT_SECRET` | Prod | Demo default | Signing secret for JWT cookies (min 32 chars). |
| `TOKEN_ENCRYPTION_KEY` | Prod | Demo hex | 64-char hex key (32 bytes) for AES-256-GCM OAuth & BYOK API key encryption. |
| `MONGODB_URI` | Optional | `""` | MongoDB Atlas URI. Falls back to in-memory store with warning if omitted. |
| `DEMO_MODE` | No | `true` (dev & `render.yaml`) | Enables 1-click Assistant & Client demo workspaces and 60 pre-seeded threads. |
| `SEND_ENABLED` | No | `false` | Safety gate. When `false`, outbound sends are simulated and audit-logged. |
| `GEMINI_API_KEY` | Optional | `""` | Server-level Gemini key (or configure per-workspace in Settings BYOK). |
| `GEMINI_MODEL` | No | `gemini-3.8-flash` | Default Gemini model (free-tier compatible). |
| `GROQ_API_KEY` | Optional | `""` | Server-level Groq fallback key. |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Default Groq fallback model. |
| `GOOGLE_CLIENT_ID` / `SECRET` | Optional | `""` | Gmail OAuth2 credentials (redirect URI defaults to `${RENDER_EXTERNAL_URL}/api/auth/google/callback`). |
| `MICROSOFT_CLIENT_ID` / `SECRET` | Optional | `""` | Outlook Graph OAuth2 credentials (redirect URI defaults to `${RENDER_EXTERNAL_URL}/api/auth/microsoft/callback`). |

---

## 8. Simulated vs. Live Features

Full transparency registry is maintained in [docs/SIMULATED.md](docs/SIMULATED.md):
- **Simulated by default for safe evaluation**: 60 pre-seeded demo threads (Priya + Rohan), outbound email dispatch (`SEND_ENABLED=false`), background demo inbound feed, and 6 pre-recorded Agent Trace samples.
- **Live & Production-Ready**: Real JWT auth & single-use SHA-256 invites, real RBAC & multi-tenant scoping, AES-256-GCM encryption for OAuth tokens and BYOK API keys, live multi-provider LLM calls when an API key is configured, real Gmail/Outlook OAuth2 adapters, live VIP Contact guardrails, and MongoDB Atlas persistence.

---

## 9. Documentation Index

- [docs/PRODUCT.md](docs/PRODUCT.md) — Product vision, personas, and feature design
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture and security boundaries
- [docs/AGENTS_DESIGN.md](docs/AGENTS_DESIGN.md) — Agent vs. Workflow design, tool allowlists, budgets, and safety invariants
- [docs/EVAL_RESULTS.md](docs/EVAL_RESULTS.md) — Latest 38-thread synthetic benchmark results
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — Timed evaluator walkthrough script
- [docs/SIMULATED.md](docs/SIMULATED.md) — Living registry of simulated vs. live components
- [docs/TASKS.md](docs/TASKS.md) — Implementation checklist
