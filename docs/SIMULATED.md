# SIMULATED FEATURES & MOCK ARCHITECTURE REGISTRY — ReplyRight

> **Protocol**: This document serves as the living, authoritative record of all simulated features, mock adapters, and safety gates within the ReplyRight prototype. Whenever a new feature is stubbed or simulated during development, it must be logged here immediately.

---

## 1. Registry of Simulated Components

| Component / Feature | Current State | Simulated Mechanics | Live Production Path |
| :--- | :--- | :--- | :--- |
| **Demo Mailbox Data** | **Simulated** | 40 realistic pre-seeded threads loaded from `/server/src/seed/threads.json` representing Priya Sharma and Maya Lin. Avoids rate limits during evaluation. | Connect real Google Gmail or Microsoft Graph accounts via `/server/src/providers/` OAuth adapters. |
| **New Message Ingestion** | **Simulated & Real** | Demo view includes a simulated message injector (`POST /api/demo/inject-message`) to trigger live reclassifications without needing to send real external emails. | Real webhooks / push notifications via Gmail Pub/Sub or Microsoft Graph Change Notifications. |
| **Email Dispatch Gate** | **Gated / Simulated** | Gated by `SEND_ENABLED=false` environment variable. When false, clicking "Send" logs a `EMAIL_SENT_SIMULATED` event in `activityLog` and transitions thread status without dispatching real SMTP/MIME packets. | Setting `SEND_ENABLED=true` enables real dispatch via Google Gmail API (`users.messages.send`) or Microsoft Graph (`/me/sendMail`). |
| **SMS / Mobile Push Nudges** | **Simulated UI** | Aging nudges (>24h/48h) trigger in-app toast alerts and amber aging badges in Maya's workspace. | Twilio SMS API or Apple APNs / Firebase Cloud Messaging (FCM). |
| **Calendar Scheduling** | **Extracted / Read-Only** | Meeting dates and conflicts are extracted and highlighted in the UI from email bodies; calendar conflict detection checks against other extracted thread events. | Full two-way read/write sync with Google Calendar API and Outlook Calendar API. |

---

## 2. Safety Gate Guidelines for Agents

- **Rule 1**: Never toggle `SEND_ENABLED=true` in testing or demonstration environments unless specifically instructed by the repository owner with designated sandbox test inboxes.
- **Rule 2**: When adding new features in later phases (e.g. multi-tenant invites, Slack webhooks), log the simulated behavior in this document before marking the phase task complete in [`/docs/TASKS.md`](file:///d:/Nilesh/internship%20task/docs/TASKS.md).
