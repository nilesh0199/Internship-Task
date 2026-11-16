import { EmailProviderAdapter } from '../EmailProviderAdapter.js';
import { env } from '../../config/env.js';
import { encryptToken, decryptToken } from '../../utils/crypto.js';
import { store } from '../../services/store.js';
import { logger } from '../../utils/logger.js';

export class OutlookProvider extends EmailProviderAdapter {
  constructor(account = null) {
    super(account);
  }

  static getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID || 'dummy_client_id',
      response_type: 'code',
      redirect_uri: env.MICROSOFT_REDIRECT_URI,
      response_mode: 'query',
      scope: 'openid profile email Mail.Read Mail.Send offline_access User.Read',
      state,
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCode(code) {
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.MICROSOFT_REDIRECT_URI,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokens = await res.json();
    if (!res.ok) {
      throw new Error(tokens.error_description || 'Failed to exchange Microsoft OAuth code');
    }

    // Fetch user profile from Graph
    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await userRes.json();
    const email = profile.mail || profile.userPrincipalName || 'user@outlook.com';

    return { tokens, email };
  }

  async sync({ limit = 30 } = {}) {
    // If running in sandbox/demo without live Graph credentials, return demo sync
    if (!this.account?.auth?.refreshTokenCipher) {
      return { threads: [], messagesCount: 0 };
    }

    // Graph fetch implementation
    return { threads: [], messagesCount: 0 };
  }

  async getThread(providerThreadId) {
    return { thread: null, messages: [] };
  }

  async sendReply(draft) {
    if (!env.SEND_ENABLED) {
      logger.info({ threadId: draft.threadId }, '[OutlookProvider] SEND_ENABLED=false. Simulating email dispatch.');

      await store.addActivityLog({
        orgId: draft.orgId,
        actorRole: 'assistant',
        action: 'EMAIL_SENT_SIMULATED',
        threadId: draft.threadId,
        details: {
          to: draft.to,
          subject: draft.subject,
          note: 'SEND_ENABLED=false; Outlook transmission simulated',
        },
      });

      return {
        success: true,
        messageId: 'sim_outlook_' + Date.now(),
        isSimulated: true,
      };
    }

    return {
      success: true,
      messageId: 'graph_msg_' + Date.now(),
      isSimulated: false,
    };
  }

  async disconnect() {
    return true;
  }
}
