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

- **Two Connected Experiences**:
  - **Assistant Workspace**: High-throughput 3-pane desktop dashboard featuring full keyboard navigation (`j`/`k`, shortcuts), deep AI reasoning inspection, draft-for-approval composer, and timeline audit logs.
  - **Client Decision Queue**: Ultra-distilled, mobile-friendly single column presenting email as **Decision Cards** in elegant serif typography with one-tap choices (*Approve Maya's Draft*, *Reply Myself*, *Hand to Maya*).
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
  - Live Inbound Message Injector (`POST /api/demo/inject-message`).
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
