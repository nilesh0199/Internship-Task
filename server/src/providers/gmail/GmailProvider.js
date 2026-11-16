import { google } from 'googleapis';
import { EmailProviderAdapter } from '../EmailProviderAdapter.js';
import { env } from '../../config/env.js';
import { encryptToken, decryptToken } from '../../utils/crypto.js';
import { store } from '../../services/store.js';
import { logger } from '../../utils/logger.js';

export class GmailProvider extends EmailProviderAdapter {
  constructor(account = null) {
    super(account);
    this.oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Generates Google OAuth2 authorization URL with state
   * @param {string} state - Cryptographically signed state token
   * @returns {string}
   */
  static getAuthUrl(state) {
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
    });
  }

  /**
   * Exchanges authorization code for tokens and initializes client
   * @param {string} code
   * @returns {Promise<{ tokens: Object, email: string }>}
   */
  async exchangeCode(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || 'user@gmail.com';

    return { tokens, email };
  }

  /**
   * Prepares authenticated Gmail API instance from stored account credentials
   */
  _getGmailClient() {
    if (!this.account?.auth?.refreshTokenCipher) {
      throw new Error('Account does not have valid stored refresh tokens');
    }

    const refreshToken = decryptToken({
      cipherText: this.account.auth.refreshTokenCipher,
      iv: this.account.auth.iv,
      authTag: this.account.auth.authTag,
    });

    const accessToken = this.account.auth.accessTokenCipher
      ? decryptToken({
          cipherText: this.account.auth.accessTokenCipher,
          iv: this.account.auth.iv,
          authTag: this.account.auth.authTag,
        })
      : null;

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async sync({ limit = 30 } = {}) {
    const gmail = this._getGmailClient();
    const listRes = await gmail.users.threads.list({
      userId: 'me',
      maxResults: Math.min(limit, 30),
    });

    const threadSummaries = listRes.data.threads || [];
    const ingestedThreads = [];

    for (const item of threadSummaries) {
      try {
        const fullThread = await gmail.users.threads.get({
          userId: 'me',
          id: item.id,
          format: 'full',
        });

        const messages = fullThread.data.messages || [];
        if (!messages.length) continue;

        const normalized = this._normalizeThread(fullThread.data, messages);
        ingestedThreads.push(normalized);
      } catch (err) {
        logger.warn({ threadId: item.id, err: err.message }, '[GmailProvider] Failed to fetch thread details');
      }
    }

    return {
      threads: ingestedThreads,
      messagesCount: ingestedThreads.reduce((sum, t) => sum + t.messages.length, 0),
    };
  }

  _normalizeThread(threadData, messages) {
    const lastMsg = messages[messages.length - 1];
    const headers = lastMsg.payload?.headers || [];

    const getHeader = (name) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('Subject') || '(No Subject)';
    const fromStr = getHeader('From');
    const toStr = getHeader('To');
    const ccStr = getHeader('Cc');
    const listUnsubscribe = getHeader('List-Unsubscribe');
    const precedence = getHeader('Precedence');

    const connectedEmail = this.account?.emailAddress?.toLowerCase() || '';
    const isOutbound = fromStr.toLowerCase().includes(connectedEmail);

    return {
      providerThreadId: threadData.id,
      subject,
      snippet: threadData.snippet || lastMsg.snippet || '',
      lastMessageAt: new Date(parseInt(lastMsg.internalDate, 10)),
      lastMessageId: lastMsg.id,
      lastDirection: isOutbound ? 'OUTBOUND' : 'INBOUND',
      headers: {
        listUnsubscribe,
        precedence,
        from: fromStr,
        to: toStr,
        cc: ccStr,
      },
      messages: messages.map((m) => ({
        id: m.id,
        snippet: m.snippet,
        date: new Date(parseInt(m.internalDate, 10)),
      })),
    };
  }

  async sendReply(draft) {
    // Safety gate enforcement
    if (!env.SEND_ENABLED) {
      logger.info({ threadId: draft.threadId }, '[GmailProvider] SEND_ENABLED=false. Simulating email dispatch.');

      await store.addActivityLog({
        orgId: draft.orgId,
        actorRole: 'assistant',
        action: 'EMAIL_SENT_SIMULATED',
        threadId: draft.threadId,
        details: {
          to: draft.to,
          subject: draft.subject,
          note: 'SEND_ENABLED=false; real dispatch simulated',
        },
      });

      return {
        success: true,
        messageId: 'sim_gmail_' + Date.now(),
        isSimulated: true,
      };
    }

    // Real send when SEND_ENABLED=true
    const gmail = this._getGmailClient();
    const rawMessage = [
      `To: ${draft.to.join(', ')}`,
      draft.cc?.length ? `Cc: ${draft.cc.join(', ')}` : '',
      `Subject: ${draft.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      draft.bodyHtml,
    ]
      .filter(Boolean)
      .join('\r\n');

    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: draft.providerThreadId,
      },
    });

    await store.addActivityLog({
      orgId: draft.orgId,
      actorRole: 'assistant',
      action: 'EMAIL_SENT_REAL',
      threadId: draft.threadId,
      details: {
        messageId: sendRes.data.id,
        to: draft.to,
      },
    });

    return {
      success: true,
      messageId: sendRes.data.id,
      isSimulated: false,
    };
  }

  async disconnect() {
    return true;
  }
}
