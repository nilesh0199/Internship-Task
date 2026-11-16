# Rule: Product & Workflow Principles

1. **Two Audiences**:
   - Maya (Assistant): Power desktop user. Wants speed, keyboard triage (`j`/`k`, shortcuts), deep control, and full auditability.
   - Priya (Client): Mobile-first executive. Wants near-zero email. Needs distilled decision cards, clear choices, and one-tap approvals.
2. **Unified Thread Store**:
   - All segments (Assistant, Client, No Reply, Waiting, Meetings, Needs Review) are dynamic query views over a single `threads` collection. Never create separate collections for folders.
3. **Email Sending Safety Gate**:
   - Real email dispatch is gated by `SEND_ENABLED=false` by default.
   - When false, simulating dispatch records an audit entry in `activityLog` without contacting third parties.
   - Never send an email automatically without explicit human authorization.
4. **Learning from Corrections**:
   - When an assistant manually overrides an AI label, record a `Correction`.
   - Inject the last 10 corrections into classification prompts.
   - Prompt the user: *"Make this a rule?"* to update the Client Playbook.
5. **Quiet Folder**:
   - Auditable archive of all `NO_REPLY_NEEDED` emails showing the exact rule or prefilter that muted them.
