# AGENTS.md — Master Directives & Operating Manual

> **Scope**: This document defines the non-negotiable operational principles, technical standards, security policies, and workflow protocols for any AI agent or engineer contributing to the **Daybook Mail** (Personal Assistant Inbox) repository.

---

## 1. Prime Directives & Workflow

1. **Documentation First**:
   - Always read [`/docs`](docs) before architecting, modifying, or creating code.
   - Execute strictly phase-by-phase according to [`/docs/TASKS.md`](docs/TASKS.md).
   - Never skip forward across phases. Upon completing all acceptance items in a task or phase:
     1. Tick off completed tasks in [`/docs/TASKS.md`](docs/TASKS.md).
     2. Document any mock data, stubbed integrations, or simulated features in [`/docs/SIMULATED.md`](docs/SIMULATED.md).
     3. Commit the change with a clear, conventional commit message (e.g., `feat(auth): add jwt middleware and session cookies`).

2. **Zero Assumptions & Communication**:
   - If user requirements or technical constraints are ambiguous, request clarification before implementation.
   - Prioritize free-tier services. Never add paid or external paid dependencies without explicit approval.

---

## 2. Technical & Coding Standards

1. **Stack Adherence**:
   - Runtime: **Node 20+**, native **ES Modules** (`"type": "module"`), **Plain JavaScript** only. No TypeScript compilation step.
   - Client: React 18, Vite, React Router v6, Tailwind CSS, TanStack Query v5, Lucide React, Framer Motion (restrained use), date-fns, Sonner, CMD-K.
   - Server: Express, Mongoose (MongoDB Atlas), Zod, JWT, bcryptjs, cookie-parser, cors, helmet, express-rate-limit, pino, googleapis, @google/genai, groq-sdk.

2. **Code Structure & Hygiene**:
   - Modular, single-responsibility files (target < 200 lines per module).
   - Clear, intention-revealing variable and function names.
   - Comprehensive **JSDoc** comments on all service methods, controller actions, and utility functions explaining parameters, return schemas, and thrown errors.
   - Strict input validation using **Zod** on every incoming HTTP body, query parameter, and route parameter.
   - Pure async/await syntax. No unhandled promise rejections.
   - Zero dead code, unused imports, or orphaned console statements in production code.

3. **Error Handling & Resilience**:
   - All errors must pass through the centralized Express error handler (`/server/src/middleware/errorHandler.js`).
   - The app must **never crash or blank-screen** due to external API failures, rate limits, or AI provider downtime.
   - Any external integration or AI prompt call must be wrapped in structured `try/catch` with automated rule-based fallbacks.

---

## 3. Security, Privacy & Safety Guardrails

1. **Zero Email Body Logging**:
   - **NEVER** print, log, or store raw email message bodies in application logs, console outputs, or error traces.
   - Pino logs must only track IDs (`threadId`, `messageId`), timestamps, classification labels, tokens used, and status codes.

2. **OAuth Token Encryption at Rest**:
   - Refresh tokens and access tokens for connected accounts (Gmail, Microsoft Graph) must be encrypted before writing to MongoDB.
   - Encryption standard: **AES-256-GCM** using a 32-byte key defined in `TOKEN_ENCRYPTION_KEY`.
   - Never expose raw tokens in client responses or API serialization.

3. **Email Dispatch Safety Gate**:
   - **Never** send an email automatically without human authorization.
   - Real email dispatch is gated by the `SEND_ENABLED` environment variable (default: `false`).
   - When `SEND_ENABLED=false`, executing a "Send" action simulates transmission, updates internal thread state, and writes an audit log in `activityLog` indicating simulated dispatch.

---

## 4. UI/UX & Responsive Principles

1. **Four States for Every Screen**:
   Every visual screen, list, drawer, and card must explicitly handle and render:
   - **Loading State**: Custom skeletons matching the target typography and layout (no raw spinners).
   - **Empty State**: Clear, context-aware graphic/icon, explanation, and clear primary action.
   - **Error State**: Non-blocking banner or inline card with retry button and clear troubleshooting text.
   - **Success State**: Optimistic UI transitions paired with undo-capable toasts via `sonner`.

2. **Responsive Hierarchy**:
   - **Desktop (>= 1280px)**: 3-pane layout (Navigation & Segments Sidebar | Thread List | Thread Detail & AI Panel).
   - **Tablet (768px – 1279px)**: 2-pane collapsible layout (Sidebar collapses into slide-over | Thread List & Detail).
   - **Mobile (< 768px)**: Single-pane stack with fluid transitions, back-navigation headers, and a sticky bottom action bar.

3. **Visual Tone & Typography**:
   - Editorial, calm, high-trust. Avoid generic bright purple gradients.
   - Background: Warm off-white (`#FAF8F5`). Body text: Deep ink (`#111827`).
   - Headings in Client View use serif (`Fraunces`), while Assistant Workspace uses clean sans (`Inter`).
   - Label Badges must pair meaningful text with colors:
     - `CLIENT_TO_REPLY`: Terracotta / Amber
     - `ASSISTANT_TO_REPLY`: Deep Teal
     - `NO_REPLY_NEEDED`: Neutral Slate Gray
     - `NEEDS_REVIEW`: Violet

---

## 5. AI Engine & Pipeline Directives

1. **Thread-Level Context**:
   - Classification operates on the entire thread context (latest 1-3 messages plus condensed older context), never isolated single messages.
2. **Schema Enforcement**:
   - Every LLM response is parsed and validated against a strict Zod JSON schema.
   - If parsing fails or the LLM output violates schema, retry once.
   - If the retry fails, gracefully fall back to heuristic rule-based classification and tag the record: `"AI unavailable, used rules"`.
3. **Hard Guardrails in Code**:
   - LLMs can hallucinate; rule guardrails override LLM output:
     - Senders on the VIP list, emails with financial/contract terms (> $500, "wire", "agreement"), or direct personal inquiries to the client can **never** be marked `NO_REPLY_NEEDED`. They must escalate to `NEEDS_REVIEW` at minimum.
4. **Provider Fallback Sequence**:
   - Primary: Google Gemini (`gemini-2.0-flash`)
   - Fallback: Groq SDK (`llama-3.3-70b-versatile`)
   - Last Resort: Deterministic Heuristic Engine

---

## 6. Commit & Task Discipline

- Before marking a task complete in [`/docs/TASKS.md`](docs/TASKS.md), verify locally:
  1. `npm run dev` boots cleanly without errors.
  2. All edge cases (loading, empty, error, fallback) are verified.
  3. Tests or manual verification steps pass.
