# INTEGRATIONS & EMAIL PROVIDERS — ReplyRight

> **Architecture Note**: ReplyRight abstracts external email services behind a uniform `EmailProviderAdapter` interface. Three implementations are supported: **Demo Mailbox** (local simulation & injection), **Gmail** (Google Workspace API), and **Outlook** (Microsoft Graph API).

---

## 1. Provider Adapter Interface

All providers implement this strict contract (`/server/src/providers/EmailProviderAdapter.js`):

```javascript
/**
 * @interface EmailProviderAdapter
 */
export class EmailProviderAdapter {
  /**
   * Initialize provider session with account credentials
   * @param {Object} credentials 
   * @returns {Promise<boolean>}
   */
  async connect(credentials) {
    throw new Error('Method connect() must be implemented.');
  }

  /**
   * Ingest threads modified since the given timestamp
   * @param {Object} options
   * @param {Date|null} options.since 
   * @param {number} [options.limit=30] 
   * @returns {Promise<{ threads: Array<Object>, newCursor: string|null }>}
   */
  async sync({ since = null, limit = 30 } = {}) {
    throw new Error('Method sync() must be implemented.');
  }

  /**
   * Retrieve full thread messages and headers by provider ID
   * @param {string} providerThreadId 
   * @returns {Promise<{ thread: Object, messages: Array<Object> }>}
   */
  async getThread(providerThreadId) {
    throw new Error('Method getThread() must be implemented.');
  }

  /**
   * Dispatch a reply draft or record simulated send
   * @param {Object} draft 
   * @returns {Promise<{ success: boolean, messageId: string, isSimulated: boolean }>}
   */
  async sendReply(draft) {
    throw new Error('Method sendReply() must be implemented.');
  }

  /**
   * Revoke tokens and purge or disconnect provider access
   * @returns {Promise<boolean>}
   */
  async disconnect() {
    throw new Error('Method disconnect() must be implemented.');
  }
}
```

---

## 2. Provider Implementations

### 2.1. Demo Provider (`/server/src/providers/demo/DemoProvider.js`)
- Primary vehicle for live demoing and automated evaluation.
- Serves 40 realistic pre-seeded threads from `/server/src/seed/threads.json`.
- **Simulated Message Injector**:
  - Exposes an API endpoint `POST /api/demo/inject-message` allowing the reviewer to trigger follow-up inbound messages.
  - Demonstrates real-time thread reclassification (e.g. moving a thread from `ASSISTANT_TO_REPLY` to `CLIENT_TO_REPLY`).
- Guaranteed zero quota exhaustion and 100% offline capability.

### 2.2. Gmail Provider (`/server/src/providers/gmail/GmailProvider.js`)
- **Library**: `googleapis` (`google.gmail('v1')`).
- **OAuth2 Flow**: Authorization Code flow with `access_type: 'offline'`, `prompt: 'consent'`.
- **Required Scopes**:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/userinfo.email`
- **Normalization**:
  - Ingests via `users.threads.list` and `users.threads.get(format: 'full')`.
  - Parses MIME parts for HTML and plain text bodies.
  - Normalizes headers: extracts `List-Unsubscribe`, `Precedence`, `Subject`, `From`, `To`, `Date`.
- **Token Refresh**: Automatically handles token expiry via `oauth2Client.on('tokens', ...)`.

### 2.3. Outlook Provider (`/server/src/providers/outlook/OutlookProvider.js`)
- **Target API**: Microsoft Graph API v1.0.
- **OAuth2 Flow**: Microsoft Identity Platform OAuth2 v2.0 endpoint (multi-tenant supporting personal & work accounts).
- **Required Delegated Scopes**:
  - `Mail.Read`
  - `Mail.Send`
  - `User.Read`
  - `offline_access`
- **Normalization**:
  - Groups messages by `conversationId`.
  - Normalizes Graph message schemas into canonical ReplyRight Thread and Message models.

---

## 3. OAuth2 Security & State Flow

```
1. Assistant clicks "Connect Gmail / Outlook"
   ├── Backend generates cryptographically secure state:
   │     state = sign({ orgId, clientId, provider, nonce }, JWT_SECRET, { expiresIn: '10m' })
   └── Redirects browser to Provider Consent Screen

2. User authorizes consent
   └── Provider redirects to: GET /api/auth/{provider}/callback?code=...&state=...

3. Backend validates state parameter signature & nonce
   ├── Exchanges authorization code for { access_token, refresh_token, expires_in }
   ├── Encrypts refresh_token & access_token with AES-256-GCM (TOKEN_ENCRYPTION_KEY)
   ├── Updates or creates ConnectedAccount record with status = 'idle'
   └── Initiates background initial sync (latest 30 threads)
```

### Disconnect Protocol:
When an account is disconnected:
1. Revocation request sent to Google (`https://oauth2.googleapis.com/revoke`) or Microsoft Graph revoke endpoint.
2. The user is offered two options:
   - *Disconnect & Retain History*: Marks account `disconnected`, preserves cached threads.
   - *Disconnect & Purge*: Revokes tokens and deletes all ingested threads, messages, and drafts for this account.

---

## 4. Sync Engine & Status Model

### Sync Lifecycle States:
- `idle`: Account is connected and ready.
- `syncing`: Active background ingestion job in progress.
- `error`: Failed sync with retry backoff timestamp and error message.
- `disconnected`: Account de-authenticated.

### Guardrails on Ingestion:
1. **Initial Sync Limitation**: Restrict initial sync to the **latest 30 threads** to prevent quota exhaustion and long cold-start latencies.
2. **Exponential Backoff**: In the event of 429 (Too Many Requests) or network dropouts, retry with exponential backoff (1s, 2s, 4s, 8s, max 3 retries).
3. **Optimistic Sync Status Pill**: UI displays a live badge:
   - Green dot: `"Synced 2m ago"`
   - Spinning blue dot: `"Syncing..."`
   - Red dot: `"Sync error — Retry"`

---

## 5. Developer Setup & Credentials Guide

### A. Google Cloud Console (Gmail Integration)
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/).
2. Create project: `ReplyRight-Prototype`.
3. Enable **Gmail API** in APIs & Services.
4. Configure **OAuth Consent Screen**:
   - User Type: **External**.
   - Publishing Status: **Testing** (no Google verification required).
   - Add Test Users: Add the developer and client email addresses.
   - Scopes: Add `.../auth/gmail.readonly`, `.../auth/gmail.send`, `.../auth/userinfo.email`.
5. Create Credentials:
   - Type: **OAuth 2.0 Client ID** -> Web application.
   - Authorized Redirect URIs: `http://localhost:5000/api/auth/google/callback`.
6. Copy `Client ID` and `Client Secret` into `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
   ```

### B. Microsoft Azure Portal (Outlook Integration)
1. Navigate to [Azure Portal - App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2. Click **New registration**:
   - Name: `ReplyRight`.
   - Supported account types: *Accounts in any organizational directory (Any Microsoft Entra ID / Multitenant) and personal Microsoft accounts*.
   - Redirect URI (Web): `http://localhost:5000/api/auth/microsoft/callback`.
3. Under **Certificates & secrets**, create a new Client Secret.
4. Under **API permissions**, add Delegated permissions for Microsoft Graph: `Mail.Read`, `Mail.Send`, `User.Read`, `offline_access`.
5. Copy Application (client) ID and Secret value into `.env`:
   ```bash
   MICROSOFT_CLIENT_ID=your_azure_client_id
   MICROSOFT_CLIENT_SECRET=your_azure_client_secret
   MICROSOFT_REDIRECT_URI=http://localhost:5000/api/auth/microsoft/callback
   ```
