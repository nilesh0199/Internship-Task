import { EmailProviderAdapter } from '../EmailProviderAdapter.js';
import { env } from '../../config/env.js';
import { decryptToken } from '../../utils/crypto.js';
import { store } from '../../services/store.js';
import { logger } from '../../utils/logger.js';

export class OutlookProvider extends EmailProviderAdapter {
  constructor(account = null) {
    super(account);
  }

  static getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID || '',
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
    const displayName = profile.displayName || '';

    return { tokens, email, displayName };
  }

  async _getAccessToken() {
    if (!this.account?.auth?.refreshTokenCipher) {
      throw new Error('No stored refresh token for this Outlook account');
    }
    const refreshToken = decryptToken({
      cipherText: this.account.auth.refreshTokenCipher,
      iv: this.account.auth.iv,
      authTag: this.account.auth.authTag,
    });

    if (!refreshToken) {
      throw new Error('Failed to decrypt stored Outlook refresh token');
    }

    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: env.MICROSOFT_REDIRECT_URI,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      if (
        res.status === 400 ||
        res.status === 401 ||
        data.error === 'invalid_grant' ||
        data.error_description?.includes('AADSTS')
      ) {
        if (this.account?._id) {
          await store.updateConnectedAccount(this.account._id, {
            status: 'error',
            error: {
              message: 'Token expired or revoked. Please reconnect.',
              code: 'RECONNECT_REQUIRED',
              occurredAt: new Date(),
            },
          });
        }
      }
      throw new Error(data.error_description || 'Failed to refresh Microsoft OAuth token');
    }

    return data.access_token;
  }

  async sync({ limit = 30 } = {}) {
    let accessToken;
    try {
      accessToken = await this._getAccessToken();
    } catch (authErr) {
      logger.error({ err: authErr.message }, '[OutlookProvider] Token refresh failed');
      throw authErr;
    }

    const url = `https://graph.microsoft.com/v1.0/me/messages?$top=${Math.min(
      limit,
      30
    )}&$orderby=receivedDateTime desc&$select=id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401) {
        if (this.account?._id) {
          await store.updateConnectedAccount(this.account._id, {
            status: 'error',
            error: {
              message: 'Token expired or revoked. Please reconnect.',
              code: 'RECONNECT_REQUIRED',
              occurredAt: new Date(),
            },
          });
        }
      }
      throw new Error(errData.error?.message || 'Graph API messages fetch failed');
    }

    const data = await res.json();
    const rawMessages = data.value || [];

    // Group messages by conversationId
    const conversations = {};
    for (const msg of rawMessages) {
      const convId = msg.conversationId || msg.id;
      if (!conversations[convId]) {
        conversations[convId] = [];
      }
      conversations[convId].push(msg);
    }

    const connectedEmail = (this.account?.emailAddress || '').toLowerCase();
    const normalizedThreads = [];

    for (const [convId, convMsgs] of Object.entries(conversations)) {
      const sorted = convMsgs.sort(
        (a, b) => new Date(a.receivedDateTime) - new Date(b.receivedDateTime)
      );
      const latest = sorted[sorted.length - 1];

      const participantsMap = new Map();
      const normalizedMessages = sorted.slice(-5).map((m) => {
        const fromAddr = m.from?.emailAddress?.address?.toLowerCase() || '';
        const fromName = m.from?.emailAddress?.name || '';

        if (fromAddr) {
          participantsMap.set(fromAddr, {
            name: fromName,
            email: fromAddr,
            isClient: fromAddr === connectedEmail,
            isAssistant: false,
            isVip: false,
          });
        }

        const isOutbound = connectedEmail && fromAddr === connectedEmail;
        const textContent = (m.body?.content || m.bodyPreview || '').replace(/<[^>]+>/g, ' ').trim();

        return {
          providerMessageId: m.id,
          from: { name: fromName, email: fromAddr },
          to: (m.toRecipients || []).map((r) => ({
            name: r.emailAddress?.name || '',
            email: r.emailAddress?.address?.toLowerCase() || '',
          })),
          cc: (m.ccRecipients || []).map((r) => ({
            name: r.emailAddress?.name || '',
            email: r.emailAddress?.address?.toLowerCase() || '',
          })),
          subject: m.subject || '(No Subject)',
          date: new Date(m.receivedDateTime),
          snippet: m.bodyPreview || '',
          bodyText: textContent.substring(0, 4000),
          bodyHtml: m.body?.contentType === 'html' ? m.body?.content : `<p>${textContent}</p>`,
          headers: {},
          direction: isOutbound ? 'OUTBOUND' : 'INBOUND',
          hasAttachments: !!m.hasAttachments,
        };
      });

      normalizedThreads.push({
        providerThreadId: convId,
        subject: latest.subject || '(No Subject)',
        snippet: latest.bodyPreview || '',
        participants: Array.from(participantsMap.values()),
        lastMessageAt: new Date(latest.receivedDateTime),
        lastMessageId: latest.id,
        messages: normalizedMessages,
      });
    }

    return {
      threads: normalizedThreads,
      messagesCount: rawMessages.length,
    };
  }

  async sendReply(draft) {
    if (!env.SEND_ENABLED) {
      logger.info(
        { threadId: draft.threadId },
        '[OutlookProvider] SEND_ENABLED=false. Simulating email dispatch.'
      );

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

    const accessToken = await this._getAccessToken();
    const sendMailPayload = {
      message: {
        subject: draft.subject,
        body: {
          contentType: 'HTML',
          content: draft.bodyHtml || draft.bodyText,
        },
        toRecipients: (draft.to || []).map((addr) => ({
          emailAddress: { address: addr },
        })),
        ccRecipients: (draft.cc || []).map((addr) => ({
          emailAddress: { address: addr },
        })),
      },
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendMailPayload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to dispatch email via Microsoft Graph');
    }

    await store.addActivityLog({
      orgId: draft.orgId,
      actorRole: 'assistant',
      action: 'EMAIL_SENT_REAL',
      threadId: draft.threadId,
      details: {
        to: draft.to,
        subject: draft.subject,
      },
    });

    return {
      success: true,
      messageId: 'graph_' + Date.now(),
      isSimulated: false,
    };
  }

  async disconnect() {
    return true;
  }
}
