# SIMULATED FEATURES & MOCK ARCHITECTURE REGISTRY — Daybook Mail

> **Protocol**: This document serves as the living, authoritative record of all simulated features, mock adapters, and safety gates within the Daybook Mail prototype. Whenever a new feature is stubbed or simulated during development, it must be logged here immediately.

---

## 1. Registry of Simulated Components

| Component / Feature | Current State | Simulated Mechanics | Live Production Path |
| :--- | :--- | :--- | :--- |
| **Demo Mailbox Data** | **Simulated** | 40 realistic pre-seeded threads loaded from `/server/src/seed/threads.json` representing Priya Sharma and Maya Lin. Avoids rate limits during evaluation. | Connect real Google Gmail or Microsoft Graph accounts via `/server/src/providers/` OAuth adapters. |
| **New Message Ingestion** | **Simulated & Real** | Demo view includes a simulated message injector (`POST /api/demo/simulate-message`) to trigger live reclassifications without needing to send real external emails. | Real webhooks / push notifications via Gmail Pub/Sub or Microsoft Graph Change Notifications. |
| **Email Dispatch Gate** | **Gated / Simulated** | Gated by `SEND_ENABLED=false` environment variable. When false, clicking "Send" logs a `EMAIL_SENT_SIMULATED` event in `activityLog` and transitions thread status without dispatching real SMTP/MIME packets. | Setting `SEND_ENABLED=true` enables real dispatch via Google Gmail API (`users.messages.send`) or Microsoft Graph (`/me/sendMail`). |
| **SMS / Mobile Push Nudges** | **Simulated UI** | Aging nudges (>24h/48h) trigger in-app toast alerts and amber aging badges in Maya's workspace. | Twilio SMS API or Apple APNs / Firebase Cloud Messaging (FCM). |
| **Calendar Scheduling** | **Extracted / Read-Only** | Meeting dates and conflicts are extracted and highlighted in the UI from email bodies; calendar conflict detection checks against other extracted thread events. | Full two-way read/write sync with Google Calendar API and Outlook Calendar API. |
| **Microsoft Outlook Connector** | **Implemented to Spec / Credential Pending** | Microsoft Graph OAuth2 authorization flow, refresh token exchange, and message normalization implemented in `OutlookProvider.js` and wired to `ingestProviderThreads`. Requires live Azure application registration (`MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`) to execute against live Office 365 tenants. | Live Azure Entra ID tenant registration with delegated `Mail.Read`, `Mail.Send`, `offline_access` permissions. |
| **Specialized Agent Collective** | **Autonomous / Zero-Send Gated** | 6 specialized agents (Triage, Scheduling, Follow-up, Drafting, Digest, Guardian) execute autonomously or propose drafts. Zero-send rule enforced: no agent ever sends emails. All actions logged in `agent_runs` with 1-click Undo. | Direct calendar event writes via Google Calendar / MS Graph APIs; automated delivery once trusted. |
| **Client Invite Email Delivery** | **Simulated / Copy Link** | When an assistant generates an invite link via `POST /api/auth/invite-client`, the cryptographic single-use link is returned in the API response and shown in a copyable modal. When `SEND_ENABLED=false`, zero outgoing emails are dispatched. | Outbound transactional invitation email dispatched via Resend, SendGrid, or AWS SES with localized branded HTML templates. |
| **Password Reset (`/forgot-password`)** | **Honest Prototype Notice** | The `/forgot-password` route renders an honest prototype notice explaining that self-serve reset is omitted in the prototype. Guides users to ask their assistant to resend their invite link or re-seed the demo database. | Cryptographic password reset token generation, expiring signed links delivered via transactional email, and reset confirmation flow. |
| **Rohan Kapoor Demo Client** | **Pre-Seeded Multi-Client Persona** | Seeded with 20 realistic threads (`th_r_01` to `th_r_20`) with precomputed classifications in `rohan_threads.json`. Has an active pending invite (`inv_rohan_001`) with no user account yet, demonstrating a pending onboarding state. Contrasts with Priya Sharma via distinct playbook thresholds ($15k vs $1k) and 3 contrasting email decision pairs. | Real client self-registration via accepted invite link, multi-tenant workspace partitioning, and enterprise identity federation (SAML/Okta). |
| **Background Live Feed (`DEMO_LIVE_FEED`)** | **Simulated Inbound Injector** | When `DEMO_LIVE_FEED !== 'false'` and running outside test mode, a background timer injects a simulated incoming message every 75s alternating between Priya and Rohan, demonstrating autonomous background agent execution. | Production webhook ingest from connected mailboxes (Google Cloud Pub/Sub, Microsoft Graph Change Notifications). |

---

## 2. Safety Gate Guidelines for Agents

- **Rule 1**: Never toggle `SEND_ENABLED=true` in testing or demonstration environments unless specifically instructed by the repository owner with designated sandbox test inboxes.
- **Rule 2**: When adding new features in later phases (e.g. multi-tenant invites, Slack webhooks), log the simulated behavior in this document before marking the phase task complete in [`/docs/TASKS.md`](TASKS.md).
