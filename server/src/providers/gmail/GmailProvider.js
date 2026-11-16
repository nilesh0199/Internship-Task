import { google } from 'googleapis';
import { EmailProviderAdapter } from '../EmailProviderAdapter.js';
import { env } from '../../config/env.js';
import { encryptToken, decryptToken } from '../../utils/crypto.js';
import { store } from '../../services/store.js';
import { logger } from '../../utils/logger.js';

/**
 * URL-safe base64 decoder for Gmail message payloads
 */
function decodeBase64(str = '') {
  if (!str) return '';
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Extracts plain text and HTML bodies from single or multipart Gmail payloads
 */
function extractMessageBodies(payload) {
  let bodyText = '';
  let bodyHtml = '';

  function traverse(part) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText = decodeBase64(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml = decodeBase64(part.body.data);
    }

    if (part.parts && Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        traverse(subPart);
      }
    }
  }

  if (payload.body?.data) {
    if (payload.mimeType === 'text/html') {
      bodyHtml = decodeBase64(payload.body.data);
    } else {
      bodyText = decodeBase64(payload.body.data);
    }
  }

  if (payload.parts) {
    for (const p of payload.parts) {
      traverse(p);
    }
  }

  if (!bodyText && bodyHtml) {
    bodyText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return {
    bodyText: (bodyText || '').substring(0, 4000),
    bodyHtml: bodyHtml || `<p>${bodyText}</p>`,
  };
}

/**
 * Parses header string like "Name <email@domain.com>" into { name, email }
 */
function parseAddress(raw = '') {
  if (!raw) return { name: '', email: '' };
  const match = raw.match(/(.*?)\s*<([^>]+)>/);
  if (match) {
    return {
      name: match[1].replace(/["']/g, '').trim(),
      email: match[2].trim().toLowerCase(),
    };
  }
  return {
    name: raw.split('@')[0].replace(/["']/g, '').trim(),
    email: raw.trim().toLowerCase(),
  };
}

function parseAddressList(raw = '') {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => parseAddress(item.trim()))
    .filter((a) => a.email);
}

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
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state,
    });
  }

  /**
   * Exchanges authorization code for tokens and fetches user profile
   */
  async exchangeCode(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || 'user@gmail.com';
    const displayName = userInfo.data.name || '';

    return { tokens, email, displayName };
  }

  /**
   * Prepares authenticated Gmail API instance from stored refresh token
   */
  _getGmailClient() {
    if (!this.account?.auth?.refreshTokenCipher) {
      throw new Error('Account does not have stored refresh token');
    }

    const refreshToken = decryptToken({
      cipherText: this.account.auth.refreshTokenCipher,
      iv: this.account.auth.iv,
      authTag: this.account.auth.authTag,
    });

    if (!refreshToken) {
      throw new Error('Failed to decrypt stored OAuth refresh token');
    }

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Synchronizes latest 30 threads with max 5 messages each
   */
  async sync({ limit = 30 } = {}) {
    let gmail;
    try {
      gmail = this._getGmailClient();
    } catch (clientErr) {
      logger.error({ err: clientErr.message }, '[GmailProvider] Auth error');
      throw clientErr;
    }

    let listRes;
    try {
      listRes = await gmail.users.threads.list({
        userId: 'me',
        maxResults: Math.min(limit, 30),
      });
    } catch (apiErr) {
      // Check for token expired/revoked
      if (
        apiErr.status === 401 ||
        apiErr.status === 400 ||
        apiErr.code === 401 ||
        apiErr.message?.includes('invalid_grant')
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
      throw apiErr;
    }

    const threadSummaries = listRes.data.threads || [];
    const normalizedThreads = [];

    for (const item of threadSummaries) {
      try {
        const fullThread = await gmail.users.threads.get({
          userId: 'me',
          id: item.id,
          format: 'full',
        });

        const rawMessages = fullThread.data.messages || [];
        if (!rawMessages.length) continue;

        // Cap to latest 5 messages per thread
        const cappedMessages = rawMessages.slice(-5);
        const normalized = this._normalizeThread(fullThread.data, cappedMessages);
        normalizedThreads.push(normalized);
      } catch (err) {
        logger.warn(
          { threadId: item.id, err: err.message },
          '[GmailProvider] Failed to fetch thread details'
        );
      }
    }

    return {
      threads: normalizedThreads,
      messagesCount: normalizedThreads.reduce((sum, t) => sum + t.messages.length, 0),
    };
  }

  _normalizeThread(threadData, messages) {
    const latestMsg = messages[messages.length - 1];
    const latestHeaders = latestMsg.payload?.headers || [];

    const getHdr = (hdrs, name) =>
      hdrs.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHdr(latestHeaders, 'Subject') || '(No Subject)';
    const connectedEmail = (this.account?.emailAddress || '').toLowerCase();

    const normalizedMessages = messages.map((m) => {
      const hdrs = m.payload?.headers || [];
      const fromRaw = getHdr(hdrs, 'From');
      const fromObj = parseAddress(fromRaw);
      const toList = parseAddressList(getHdr(hdrs, 'To'));
      const ccList = parseAddressList(getHdr(hdrs, 'Cc'));
      const msgSubj = getHdr(hdrs, 'Subject') || subject;
      const listUnsubscribe = getHdr(hdrs, 'List-Unsubscribe') || null;
      const precedence = getHdr(hdrs, 'Precedence') || null;
      const autoSubmitted = getHdr(hdrs, 'Auto-Submitted') || null;
      const messageIdHeader = getHdr(hdrs, 'Message-ID') || null;

      const isOutbound =
        connectedEmail && fromObj.email.toLowerCase() === connectedEmail;

      const { bodyText, bodyHtml } = extractMessageBodies(m.payload);

      return {
        providerMessageId: m.id,
        from: fromObj,
        to: toList,
        cc: ccList,
        subject: msgSubj,
        date: new Date(parseInt(m.internalDate, 10)),
        snippet: m.snippet || '',
        bodyText,
        bodyHtml,
        headers: {
          listUnsubscribe,
          precedence,
          autoSubmitted,
          messageIdHeader,
        },
        direction: isOutbound ? 'OUTBOUND' : 'INBOUND',
        hasAttachments: !!(m.payload?.parts || []).some((p) => p.filename && p.filename.length > 0),
      };
    });

    // Deduplicate participants across messages
    const participantsMap = new Map();
    for (const msg of normalizedMessages) {
      if (msg.from?.email) {
        participantsMap.set(msg.from.email.toLowerCase(), {
          name: msg.from.name || '',
          email: msg.from.email.toLowerCase(),
          isClient: msg.from.email.toLowerCase() === connectedEmail,
          isAssistant: false,
          isVip: false,
        });
      }
    }

    const participants = Array.from(participantsMap.values());
    const lastMsg = normalizedMessages[normalizedMessages.length - 1];

    return {
      providerThreadId: threadData.id,
      subject,
      snippet: threadData.snippet || lastMsg?.snippet || '',
      participants,
      lastMessageAt: lastMsg?.date || new Date(),
      lastMessageId: lastMsg?.providerMessageId || 'msg_1',
      messages: normalizedMessages,
    };
  }

  async sendReply(draft) {
    if (!env.SEND_ENABLED) {
      logger.info(
        { threadId: draft.threadId },
        '[GmailProvider] SEND_ENABLED=false. Simulating email dispatch.'
      );

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
