# IMPLEMENTATION ROADMAP & TASKS — Daybook Mail

> **Protocol for AI Agents**: Execute strictly phase-by-phase. Do not skip forward. After finishing each phase, tick completed tasks, note any simulated behavior in [`/docs/SIMULATED.md`](SIMULATED.md), and commit with a clean descriptive message.
> 
> Legend: `[M]` = Must-Have for Live Prototype Review | `[I]` = If-Time Enhancement

---

## Phase 0: Scaffolding, Documentation & "Brain" Setup `[M]`
- [x] **0.1**: Initialize monorepo directory layout (`/client`, `/server`, `/docs`, `/.agent/rules`). `[M]`
- [x] **0.2**: Configure root `package.json` with npm workspaces and concurrently scripts (`dev`, `build`, `start`, `seed`). `[M]`
- [x] **0.3**: Configure server dependencies (`express`, `mongoose`, `zod`, `googleapis`, `@google/genai`, `groq-sdk`, etc.). `[M]`
- [x] **0.4**: Configure client dependencies (`vite`, `react 18`, `react-router`, `tailwind`, `@tanstack/react-query`, `lucide`, `sonner`, `cmdk`). `[M]`
- [x] **0.5**: Write complete master specification documents in `/docs/` and root `AGENTS.md`. `[M]`
- [x] **0.6**: Mirror core operational rules in `/.agent/rules/*.md`. `[M]`
- [x] **0.7**: Generate 40 realistic seed threads in `/server/src/seed/threads.json` with all traps and follow-up payloads. `[M]`
- [x] **0.8**: Verify `npm install` across workspaces and confirm clean health-check response. `[M]`

---

## Phase 1: Authentication, Roles & Data Models `[M]`
- [x] **1.1**: Implement MongoDB connection with graceful connection pooling in `/server/src/config/db.js`. `[M]`
- [x] **1.2**: Define Mongoose schemas in `/server/src/models/` (`User`, `Client`, `ConnectedAccount`, `Thread`, `Message`, `Classification`, `ClassificationEvent`, `Correction`, `Draft`, `ActivityLog`). `[M]`
- [x] **1.3**: Implement AES-256-GCM token encryption and decryption utilities in `/server/src/utils/crypto.js`. `[M]`
- [x] **1.4**: Implement JWT authentication middleware and `HttpOnly` cookie session management. `[M]`
- [x] **1.5**: Implement Seed Runner script (`npm run seed`) to load Priya, Maya, and the 40 demo threads into MongoDB Atlas. `[M]`
- [x] **1.6**: Add basic role-switching utility / demo login endpoints (`POST /api/auth/demo-login?role=assistant|client`). `[M]`

---

## Phase 2: Provider Adapters & Email Sync Pipeline `[M]`
- [x] **2.1**: Implement base `EmailProviderAdapter` interface in `/server/src/providers/`. `[M]`
- [x] **2.2**: Implement `DemoProvider` serving the seeded threads and handling `POST /api/demo/simulate-message`. `[M]`
- [x] **2.3**: Implement `GmailProvider` with Google OAuth2 handshake and thread normalization. `[M]`
- [x] **2.4**: Implement `OutlookProvider` with Microsoft Graph OAuth2 flow and conversation grouping. `[M]`
- [x] **2.5**: Implement Sync Controller (`POST /api/sync/trigger`) with status transitions (`idle` -> `syncing` -> `idle|error`). `[M]`
- [x] **2.6**: Implement Account Management & Disconnect endpoints (Revoke + Purge options). `[M]`
- [x] **2.7**: Build initial sync limit guardrail (max 30 threads per sync). `[M]`

---

## Phase 3: Multi-Tier AI Classification Pipeline `[M]`
- [x] **3.1**: Implement Zod validation schema for classification output in `/server/src/ai/schemas.js`. `[M]`
- [x] **3.2**: Implement Stage 1 Deterministic Prefilters (`List-Unsubscribe`, `Precedence: bulk`, system senders) in `/server/src/ai/prefilters.js`. `[M]`
- [x] **3.3**: Implement Stage 2 Playbook Context Assembler (VIPs, topic matrices, recent 10 corrections). `[M]`
- [x] **3.4**: Implement Stage 3 Primary LLM Invocation with Google Gemini 2.0 Flash (`@google/genai`). `[M]`
- [x] **3.5**: Implement Secondary LLM Fallback with Groq SDK (`llama-3.3-70b-versatile`). `[M]`
- [x] **3.6**: Implement Rule Heuristics Fallback Engine when LLMs are unavailable (`"AI unavailable, used rules"`). `[M]`
- [x] **3.7**: Implement Stage 5 In-Code Safety Guardrails (VIP immunity, legal/financial threshold overrides). `[M]`
- [x] **3.8**: Implement Confidence Threshold Routing (>=0.80 auto-apply, 0.55-0.79 flag, <0.55 needs review). `[M]`
- [x] **3.9**: Implement Classification Event logger and thread caching mechanism. `[M]`
- [x] **3.10**: Build manual override controller and "Make this a rule" Playbook synthesizer (`POST /api/playbook/add-rule`). `[M]`

---

## Phase 4: Assistant Workspace UI (Power 3-Pane Desktop) `[M]`
- [x] **4.1**: Set up React Router and Query Client providers in `/client/src/app/`. `[M]`
- [x] **4.2**: Build 3-pane layout shell (Sidebar | Center List | Detail Inspector). `[M]`
- [x] **4.3**: Implement Left Sidebar with Segment Tabs (Assistant, Client, No Reply, Waiting, Action, Meetings, Needs Review). `[M]`
- [x] **4.4**: Implement Sync Status Pill in sidebar header with live status indication. `[M]`
- [x] **4.5**: Implement Center Thread List with `<ThreadRow />`, `<LabelBadge />`, and `<ConfidenceDots />`. `[M]`
- [x] **4.6**: Implement Thread Reader pane with full email message chain. `[M]`
- [x] **4.7**: Implement Right-hand `<AIReasonPanel />` with quoted evidence and one-click override. `[M]`
- [x] **4.8**: Implement Reclassification Timeline component showing label history per thread. `[M]`
- [x] **4.9**: Implement Keyboard Shortcuts (`j`, `k`, `Enter`, `c`, `a`, `n`, `r`, `e`, `/`). `[M]`
- [x] **4.10**: Implement The Quiet Folder view with transparency audit banner. `[M]`

---

## Phase 5: Client Decision Queue UI (Minimal Executive View) `[M]`
- [x] **5.1**: Build dedicated mobile-first single-column layout for Client View (`/client`). `[M]`
- [x] **5.2**: Implement Client Morning Brief header banner ("3 decisions need you, 12 handled by Maya"). `[M]`
- [x] **5.3**: Build `<DecisionCard />` in Fraunces serif typography (Question, 3 bullets context, deadline, consequence). `[M]`
- [x] **5.4**: Implement Decision Action Bar:
  - `[Approve Maya's Draft]`
  - `[Reply Myself]`
  - `[Hand to Maya]` (with optional note dialog)
  - `[Snooze 24h]`
  - `[Mark Handled]` `[M]`
- [x] **5.5**: Add touch swipe gestures on mobile (Swipe Right = Hand to Maya, Swipe Left = Mark Handled). `[I]`
- [x] **5.6**: Build instant optimistic state updates reflecting client decisions. `[M]`

---

## Phase 6: AI Collaboration & Draft-for-Approval Lane `[M]`
- [x] **6.1**: Implement AI Draft Generator (`POST /api/ai/generate-draft`) referencing client persona and tone. `[M]`
- [x] **6.2**: Implement Assistant Draft Composer with "Send to Client for Approval" action. `[M]`
- [x] **6.3**: Connect draft approval state between Client Queue and Assistant Workspace. `[M]`
- [x] **6.4**: Implement simulated/safe email send controller gated by `SEND_ENABLED`. `[M]`
- [x] **6.5**: Implement Aging & Proactive Nudge banners (threads in client queue > 24h/48h). `[M]`
- [x] **6.6**: Implement Command Palette (Cmd+K) with LLM tool calling over MongoDB threads. `[M]`
- [x] **6.7**: Implement Meetings strip with calendar conflict badge detection. `[M]`

---

## Phase 7: UI Polish, State Completeness & Responsive Testing `[M]`
- [x] **7.1**: Implement custom Shimmer Skeletons for Thread List, Thread Detail, and Decision Cards. `[M]`
- [x] **7.2**: Implement clean Empty States for all segments (Inbox Zero graphic and reassuring copy). `[M]`
- [x] **7.3**: Implement inline Error States with retry actions for network and AI timeouts. `[M]`
- [x] **7.4**: Implement Sonner toasts with 5-second undo support on label changes and archiving. `[M]`
- [x] **7.5**: Verify full responsiveness: Desktop (3-pane), Tablet (2-pane collapsible), Mobile (single pane + bottom action bar). `[M]`

---

## Phase 8: Deployment, Demo Script Verification & Final Delivery `[M]`
- [x] **8.1**: Configure `render.yaml` for backend deployment to Render. `[M]`
- [x] **8.2**: Configure Vercel build settings for client deployment (`/client`). `[M]`
- [x] **8.3**: Rehearse 3-minute demo script against `/docs/DEMO_SCRIPT.md` with simulated message injector. `[M]`
- [x] **8.4**: Update root `README.md` with complete setup instructions, env var checklist, and demo instructions. `[M]`

---

## Phase 9: Daybook Mail Upgrade, Connectors, Security & Landing Page `[M]`
- [x] **9.1**: Rebrand entire repo from ReplyRight to Daybook Mail ("A daybook for your inbox"), add SVG book favicon, replace hotlinked images with local initials Avatar component, and convert absolute file links to relative. `[M]`
- [x] **9.2**: Fix deployment architecture: configure client API base with Vercel edge proxy rewrite (`/api/:path*`), implement `COOKIE_SAMESITE` (lax/none), implement storage-aware `/api/health` and lightweight `/healthz`, and enforce production secret check. `[M]`
- [x] **9.3**: Security & Multi-tenant isolation: enforce `roleRequired` guards across all routes (assistant vs client vs shared), scope all queries/mutations by `req.user.orgId`, block registration with demo emails, implement `purgeAccountData`, and audit zero email body/token logging. `[M]`
- [x] **9.4**: Provider connectors & Shared ingestion: build `server/src/services/ingest.js` with batch concurrency, simplify token encryption to refresh tokens, implement robust Gmail (base64/multipart, auto-client) and Outlook (Graph `/me/messages`) normalization, add account source chips & filters, and handle missing credentials gracefully in UI. `[M]`
- [x] **9.5**: Pinterest-inspired editorial landing page: build warm, minimal landing page with floating drifting email cards, interactive triage reasoning playground, feature showcase, and suppress floating role controls on `/`. `[M]`
- [x] **9.6**: Reliability, polish & verification: add startup active-features banner, rehearse demo flows, update documentation, and verify local execution. `[M]`

---

## Phase 10: Specialized Autonomous Agent Collective `[M]`
- [x] **10.1**: Build BaseAgent interface, policy manager (`getAgentAutonomy`, kill switch `AGENTS_ENABLED`), and orchestrator pipeline with concurrency limits & per-agent timeouts. `[M]`
- [x] **10.2**: Create `AgentRun` model and persistence layer in Mongoose & in-memory store with `addAgentRun`, `getAgentRuns`, `getAgentStats`, and `undoAgentRun`. `[M]`
- [x] **10.3**: Implement the 6 specialized agents: `TriageAgent` (routes & auto-files noise), `SchedulingAgent` (conflict detection & reschedule drafts), `FollowUpAgent` (stale waiting & client decision nudges), `DraftingAgent` (context-aware reply proposals), `DigestAgent` (daily metrics & morning brief), and `GuardianAgent` (zero-trust safety audit & automatic reversal). `[M]`
- [x] **10.4**: Wire agents into ingestion pipeline (`ingestProviderThreads`), live message simulator (`simulateInboundMessage`), and client decisions (`clientDecision`). `[M]`
- [x] **10.5**: Build REST endpoints: `GET /api/agents`, `PUT /api/agents/:id`, `GET /api/agents/runs`, `POST /api/agents/run`, `POST /api/agents/runs/:id/undo`, `GET /api/agents/summary`, `GET /api/agents/digest`, and `GET /api/agents/stream`. `[M]`
- [x] **10.6**: Build UI: Agent Control Room page (`/agents`), sidebar "Agent Proposals" segment, thread detail "Handled by agents" merged timeline with 1-click Undo, At-A-Glance strip agent count, client Morning Brief live integration, and landing page collective section. `[M]`
- [x] **10.7**: Seed demo runs and write comprehensive test suite in `server/test/agents.test.js` covering safety, zero-send autonomy, guardian reversals, and undo capabilities. `[M]`

---

## Phase 11: Real Authentication & Role Separation `[M]`
- [x] **11.1**: Eliminate Persona Switcher (`RoleSwitcher.jsx`, client `switchRole`, server `POST /api/auth/switch-role`) and replace with standard `AccountMenu` (avatar initials, role badge, connected accounts navigation, and authoritative sign out that clears the `httpOnly` cookie). `[M]`
- [x] **11.2**: Role-protected routes: `<ProtectedRoute allowedRoles={['assistant']}>` (`/assistant`, `/agents`, `/accounts`, `/playbook`, `/onboarding`) and `<ProtectedRoute allowedRoles={['client']}>` (`/client`). Wrong-role attempts redirect to role home with toast alert (`"That area is for assistants/clients."`). Server enforces `roleRequired` across all endpoints. `[M]`
- [x] **11.3**: Real client invite flow: `POST /api/auth/invite-client` generates 32-byte crypto token, stores SHA-256 hash in DB, 7-day expiration, bound to `orgId + clientId + email`. Single-use acceptance page at `/invite/:token` enforces 10+ char password, hashes with bcrypt cost 12, marks invite accepted, sets auth cookie, and logs into `/client`. `[M]`
- [x] **11.4**: Login quality: show/hide password toggle, inline field validation, generic `"Incorrect email or password"` to prevent enumeration, `loginRateLimiter` (10 failed attempts / 15 min / IP+email combination), honest `/forgot-password` placeholder, and graceful 401 handling in `client/src/lib/api.js`. `[M]`
- [x] **11.5**: Demo mode governance & dual-window sync: `DEMO_MODE` env var, assistant-only 1-click demo login, collapsible demo accounts card with quick-fill and clipboard copy on `/login`, dual-window ~8s background polling sync in `AssistantDashboard.jsx`, and subtle Demo Workspace banner across app views. `[M]`
- [x] **11.6**: Comprehensive test suite in `server/test/auth.test.js` with 9 passing tests covering 404 on removed switch-role, 403 on assistant routes for client, 403 on client-decision for assistant, single-use invite token, expired invite rejection, SHA-256 hash storage verification, login rate limiting (HTTP 429), `DEMO_MODE=false` 404, and clientVisible org-scoped thread isolation. `[M]`

---

## Phase 12: Multi-Client PA Operations, Today Command View & Agent Memory `[M]`
- [x] **12.1**: Multi-Client Audit & Data Partitioning: audit all store queries, ingest pipelines, agents, playbook, and seed data to strictly scope by both `orgId` and `clientId`. Client isolation strictly enforced: client users requesting or acting on cross-client IDs receive HTTP 404. Seed second executive client (Rohan Kapoor, COO of Apex Freight Logistics) with 20 realistic precomputed threads, distinct playbook thresholds ($15k vs $1k), pending invite `inv_rohan_001`, and 3 contrasting decision pairs. `[M]`
- [x] **12.2**: Client Tabs & "Today" Command Dashboard: implement `AssistantTopBar.jsx` with persistent brand link, client switcher tabs (`[Today] [Priya Sharma (badge)] [Rohan Kapoor (badge)] [+ Add Client]`), agent running status pill, Control Room shortcut, and Account Menu. Build `AssistantTodayView.jsx` with greeting, executive cards (Needs Maya, Waiting on Client, Handled Today, Meetings, Conflicts), meetings conflict strip, prioritized "Needs You Now" stack jumping directly to client inbox threads, and overnight agent activity feed with 1-click Undo. `[M]`
- [x] **12.3**: Per-Client Agent Notes ("Agent Memory"): implement `ClientAgentsTab.jsx` for configuring per-client agent standing instructions (max 500 chars) and active memories (max 200 chars, pin, disable, delete, You/Learned chips). Implement side-by-side Dry Run preview (`POST /api/agents/:id/dry-run`) showing `withNotes` vs `withoutNotes` without modifying database state. Enforce strictness-only invariant on Guardian Agent so notes can never loosen safety guardrails. `[M]`
- [x] **12.4**: Background Agent Execution & Live Feed: implement 3-minute ticker in `server/src/agents/orchestrator.js` with per-client in-process concurrency locking (`clientRunLocks`) and randomized jitter (1–5s). Added `demoLiveFeed.js` injecting simulated inbound messages every 75s alternating between Priya and Rohan. Added top-bar agent status pill showing `"Agents running · last ran X min ago"` or amber indicator when paused. `[M]`
- [x] **12.5**: Automated Testing: comprehensive test suite in `server/test/multi_client.test.js` with 7 passing test cases covering client query separation, client isolation 404s, Today aggregation, Agent Memory CRUD, dry-run previews, and Guardian strictness enforcement (total 24/24 passing tests across repo). `[M]`

---

## Phase 13: Login Role Chooser & Editorial Client Decision Desk `[M]`
- [x] **13.1**: Login Role Chooser Modal: centered modal first on "Log in" ("How are you signing in?") with two large choice cards: "I'm an assistant" and "I'm a client", animated entrance, ESC to close, keyboard accessible, deep links `/login?role=assistant|client` skipping chooser. `[M]`
- [x] **13.2**: Role-Specific Login Forms & Mismatch Handling: Assistant form has signup link, 1-click demo workspace button, and Maya Lin demo card; Client form has no signup link, invitation helper modal, and Priya Sharma demo card. Server validates credentials first, checks `expectedRole`, and returns friendly HTTP 400 (`ROLE_MISMATCH`) switching form automatically without leaking bad credentials (generic 401). Post-login routes by role (`/assistant/today` or `/client`). `[M]`
- [x] **13.3**: Editorial Client Decision Desk Redesign: full-width 3-zone layout (Desktop >=1024px, max 1440px). Left rail (~280px sticky) with greeting, plain-language summary, vertical navigator (Today, This week, Later, Waiting on others, Handled), Next deadline countdown, and keyboard hints (`j`/`k`, `Enter`, `a`, `h`, `s`, `d`). Middle column (~440px) with scannable urgency rows, avatars, 1-line question, sender + age, due chip, and draft ready badge. Right pane decision sheet with Fraunces headline, "Prepared by Maya with Daybook agents", "What's being asked" paragraph, context bullets, quiet blockquote evidence, consequence line, editable draft preview, and sticky action bar. `[M]`
- [x] **13.4**: Responsive Client View: Tablet (768px–1023px) 2-pane collapsible layout with slide-over drawer; Mobile (<768px) single column with full-width rows and sticky bottom action bar. `[M]`
- [x] **13.5**: Toast Placement & Polish: toasts moved to `bottom-right` on desktop and `bottom-center` on mobile, capped at 3 visible, short duration (3.5s), avoiding header and user account menu. `[M]`
- [x] **13.6**: Comprehensive Test Suite: 29 out of 29 automated tests passing across `agents.test.js`, `auth.test.js`, and `multi_client.test.js` covering memory injection sanitization, Guardian note invariance, disabled memory exclusion, background scheduler client locking, and login role mismatch handling. `[M]`

---

## Known Issues & Prototype Reviewer Guidance

1. **Email Sending Safety Flag**:
   - `SEND_ENABLED=false` is enforced by default. Outbound actions simulate transmission, log to the immutable Activity Log, and transition thread states cleanly.
2. **Offline Resilience**:
   - The server boots instantly with an in-memory repository if `MONGODB_URI` is unset. Providing a MongoDB Atlas URI automatically enables persistent Atlas collection syncing.
3. **Live Reclassification**:
   - Use the simulated message injector buttons on the Accounts page (`/settings/accounts`) or via API (`POST /api/demo/simulate-message`) to trigger real-time reclassification on Acme Corp (escalates to Client), Tahoe Hotel (resolves to No Reply), or Board Prep (detects calendar conflict).
