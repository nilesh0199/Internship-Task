# IMPLEMENTATION ROADMAP & TASKS — ReplyRight

> **Protocol for AI Agents**: Execute strictly phase-by-phase. Do not skip forward. After finishing each phase, tick completed tasks, note any simulated behavior in [`/docs/SIMULATED.md`](file:///d:/Nilesh/internship%20task/docs/SIMULATED.md), and commit with a clean descriptive message.
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
- [ ] **1.1**: Implement MongoDB connection with graceful connection pooling in `/server/src/config/db.js`. `[M]`
- [ ] **1.2**: Define Mongoose schemas in `/server/src/models/` (`User`, `Client`, `ConnectedAccount`, `Thread`, `Message`, `Classification`, `ClassificationEvent`, `Correction`, `Draft`, `ActivityLog`). `[M]`
- [ ] **1.3**: Implement AES-256-GCM token encryption and decryption utilities in `/server/src/utils/crypto.js`. `[M]`
- [ ] **1.4**: Implement JWT authentication middleware and `HttpOnly` cookie session management. `[M]`
- [ ] **1.5**: Implement Seed Runner script (`npm run seed`) to load Priya, Maya, and the 40 demo threads into MongoDB Atlas. `[M]`
- [ ] **1.6**: Add basic role-switching utility / demo login endpoints (`POST /api/auth/demo-login?role=assistant|client`). `[M]`

---

## Phase 2: Provider Adapters & Email Sync Pipeline `[M]`
- [ ] **2.1**: Implement base `EmailProviderAdapter` interface in `/server/src/providers/`. `[M]`
- [ ] **2.2**: Implement `DemoProvider` serving the seeded threads and handling `POST /api/demo/inject-message`. `[M]`
- [ ] **2.3**: Implement `GmailProvider` with Google OAuth2 handshake and thread normalization. `[M]`
- [ ] **2.4**: Implement `OutlookProvider` with Microsoft Graph OAuth2 flow and conversation grouping. `[M]`
- [ ] **2.5**: Implement Sync Controller (`POST /api/sync/trigger`) with status transitions (`idle` -> `syncing` -> `idle|error`). `[M]`
- [ ] **2.6**: Implement Account Management & Disconnect endpoints (Revoke + Purge options). `[M]`
- [ ] **2.7**: Build initial sync limit guardrail (max 30 threads per sync). `[M]`

---

## Phase 3: Multi-Tier AI Classification Pipeline `[M]`
- [ ] **3.1**: Implement Zod validation schema for classification output in `/server/src/ai/schemas.js`. `[M]`
- [ ] **3.2**: Implement Stage 1 Deterministic Prefilters (`List-Unsubscribe`, `Precedence: bulk`, system senders) in `/server/src/ai/prefilters.js`. `[M]`
- [ ] **3.3**: Implement Stage 2 Playbook Context Assembler (VIPs, topic matrices, recent 10 corrections). `[M]`
- [ ] **3.4**: Implement Stage 3 Primary LLM Invocation with Google Gemini 2.0 Flash (`@google/genai`). `[M]`
- [ ] **3.5**: Implement Secondary LLM Fallback with Groq SDK (`llama-3.3-70b-versatile`). `[M]`
- [ ] **3.6**: Implement Rule Heuristics Fallback Engine when LLMs are unavailable (`"AI unavailable, used rules"`). `[M]`
- [ ] **3.7**: Implement Stage 5 In-Code Safety Guardrails (VIP immunity, legal/financial threshold overrides). `[M]`
- [ ] **3.8**: Implement Confidence Threshold Routing (>=0.80 auto-apply, 0.55-0.79 flag, <0.55 needs review). `[M]`
- [ ] **3.9**: Implement Classification Event logger and thread caching mechanism. `[M]`
- [ ] **3.10**: Build manual override controller and "Make this a rule" Playbook synthesizer (`POST /api/playbook/add-rule`). `[M]`

---

## Phase 4: Assistant Workspace UI (Power 3-Pane Desktop) `[M]`
- [ ] **4.1**: Set up React Router and Query Client providers in `/client/src/app/`. `[M]`
- [ ] **4.2**: Build 3-pane layout shell (Sidebar | Center List | Detail Inspector). `[M]`
- [ ] **4.3**: Implement Left Sidebar with Segment Tabs (Assistant, Client, No Reply, Waiting, Action, Meetings, Needs Review). `[M]`
- [ ] **4.4**: Implement Sync Status Pill in sidebar header with live status indication. `[M]`
- [ ] **4.5**: Implement Center Thread List with `<ThreadRow />`, `<LabelBadge />`, and `<ConfidenceDots />`. `[M]`
- [ ] **4.6**: Implement Thread Reader pane with full email message chain. `[M]`
- [ ] **4.7**: Implement Right-hand `<AIReasonPanel />` with quoted evidence and one-click override. `[M]`
- [ ] **4.8**: Implement Reclassification Timeline component showing label history per thread. `[M]`
- [ ] **4.9**: Implement Keyboard Shortcuts (`j`, `k`, `Enter`, `c`, `a`, `n`, `r`, `e`, `/`). `[M]`
- [ ] **4.10**: Implement The Quiet Folder view with transparency audit banner. `[M]`

---

## Phase 5: Client Decision Queue UI (Minimal Executive View) `[M]`
- [ ] **5.1**: Build dedicated mobile-first single-column layout for Client View (`/client`). `[M]`
- [ ] **5.2**: Implement Client Morning Brief header banner ("3 decisions need you, 12 handled by Maya"). `[M]`
- [ ] **5.3**: Build `<DecisionCard />` in Fraunces serif typography (Question, 3 bullets context, deadline, consequence). `[M]`
- [ ] **5.4**: Implement Decision Action Bar:
  - `[Approve Maya's Draft]`
  - `[Reply Myself]`
  - `[Hand to Maya]` (with optional note dialog)
  - `[Snooze 24h]`
  - `[Mark Handled]` `[M]`
- [ ] **5.5**: Add touch swipe gestures on mobile (Swipe Right = Hand to Maya, Swipe Left = Mark Handled). `[I]`
- [ ] **5.6**: Build instant optimistic state updates reflecting client decisions. `[M]`

---

## Phase 6: AI Collaboration & Draft-for-Approval Lane `[M]`
- [ ] **6.1**: Implement AI Draft Generator (`POST /api/ai/generate-draft`) referencing client persona and tone. `[M]`
- [ ] **6.2**: Implement Assistant Draft Composer with "Send to Client for Approval" action. `[M]`
- [ ] **6.3**: Connect draft approval state between Client Queue and Assistant Workspace. `[M]`
- [ ] **6.4**: Implement simulated/safe email send controller gated by `SEND_ENABLED`. `[M]`
- [ ] **6.5**: Implement Aging & Proactive Nudge banners (threads in client queue > 24h/48h). `[M]`
- [ ] **6.6**: Implement Command Palette (Cmd+K) with LLM tool calling over MongoDB threads. `[M]`
- [ ] **6.7**: Implement Meetings strip with calendar conflict badge detection. `[M]`

---

## Phase 7: UI Polish, State Completeness & Responsive Testing `[M]`
- [ ] **7.1**: Implement custom Shimmer Skeletons for Thread List, Thread Detail, and Decision Cards. `[M]`
- [ ] **7.2**: Implement clean Empty States for all segments (Inbox Zero graphic and reassuring copy). `[M]`
- [ ] **7.3**: Implement inline Error States with retry actions for network and AI timeouts. `[M]`
- [ ] **7.4**: Implement Sonner toasts with 5-second undo support on label changes and archiving. `[M]`
- [ ] **7.5**: Verify full responsiveness: Desktop (3-pane), Tablet (2-pane collapsible), Mobile (single pane + bottom action bar). `[M]`

---

## Phase 8: Deployment, Demo Script Verification & Final Delivery `[M]`
- [ ] **8.1**: Configure `render.yaml` for backend deployment to Render. `[M]`
- [ ] **8.2**: Configure Vercel build settings for client deployment (`/client`). `[M]`
- [ ] **8.3**: Rehearse 3-minute demo script against `/docs/DEMO_SCRIPT.md` with simulated message injector. `[M]`
- [ ] **8.4**: Update root `README.md` with complete setup instructions, env var checklist, and demo instructions. `[M]`
