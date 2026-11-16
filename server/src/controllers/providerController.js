import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { store } from '../services/store.js';
import { GmailProvider } from '../providers/gmail/GmailProvider.js';
import { OutlookProvider } from '../providers/outlook/OutlookProvider.js';
import { DemoProvider } from '../providers/demo/DemoProvider.js';
import { ingestProviderThreads } from '../services/ingest.js';
import { encryptToken } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

/**
 * Initiates Google OAuth2 handshake
 */
export async function connectGoogle(req, res, next) {
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({
          ok: false,
          error: {
            message: 'Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured on this server.',
            code: 'OAUTH_NOT_CONFIGURED',
          },
        });
      }
      return res.redirect(`${env.CLIENT_URL}/settings/accounts?error=google_oauth_not_configured`);
    }

    const statePayload = {
      userId: req.user._id,
      orgId: req.user.orgId,
      clientId: req.user.clientId,
      provider: 'gmail',
      ts: Date.now(),
    };
    const state = jwt.sign(statePayload, env.JWT_SECRET, { expiresIn: '15m' });
    const authUrl = GmailProvider.getAuthUrl(state);

    if (req.headers.accept?.includes('application/json')) {
      return res.status(200).json({ ok: true, data: { authUrl } });
    }
    return res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles Google OAuth2 callback
 */
export async function googleCallback(req, res, next) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      logger.warn({ error }, '[GoogleOAuth] User declined consent');
      return res.redirect(`${env.CLIENT_URL}/settings/accounts?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${env.CLIENT_URL}/settings/accounts?error=missing_code_or_state`);
    }

    const decoded = jwt.verify(state, env.JWT_SECRET);
    const provider = new GmailProvider();
    const { tokens, email, displayName } = await provider.exchangeCode(code);

    const refreshCipher = encryptToken(tokens.refresh_token || '');

    const account = await store.addConnectedAccount({
      orgId: decoded.orgId,
      clientId: decoded.clientId,
      provider: 'gmail',
      emailAddress: email,
      displayName: displayName || email.split('@')[0],
      status: 'idle',
      lastSyncedAt: new Date(),
      scopes: ['gmail.readonly', 'gmail.send'],
      auth: {
        refreshTokenCipher: refreshCipher.cipherText,
        iv: refreshCipher.iv,
        authTag: refreshCipher.authTag,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    // Run initial ingestion of latest 30 threads
    provider.account = account;
    try {
      const syncRes = await provider.sync({ limit: 30 });
      await ingestProviderThreads({
        account,
        rawThreads: syncRes.threads,
        orgId: decoded.orgId,
        clientId: decoded.clientId,
      });
    } catch (syncErr) {
      logger.warn({ syncErr: syncErr.message }, '[GoogleOAuth] Initial ingestion completed with warning');
    }

    return res.redirect(`${env.CLIENT_URL}/settings/accounts?success=google_connected`);
  } catch (err) {
    logger.error({ err: err.message }, '[GoogleOAuth] Callback error');
    return res.redirect(`${env.CLIENT_URL}/settings/accounts?error=${encodeURIComponent(err.message)}`);
  }
}

/**
 * Initiates Microsoft Graph OAuth2 handshake
 */
export async function connectMicrosoft(req, res, next) {
  try {
    if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({
          ok: false,
          error: {
            message: 'Microsoft Graph OAuth credentials (MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET) are not configured on this server.',
            code: 'OAUTH_NOT_CONFIGURED',
          },
        });
      }
      return res.redirect(`${env.CLIENT_URL}/settings/accounts?error=microsoft_oauth_not_configured`);
    }

    const statePayload = {
      userId: req.user._id,
      orgId: req.user.orgId,
      clientId: req.user.clientId,
      provider: 'outlook',
      ts: Date.now(),
    };
    const state = jwt.sign(statePayload, env.JWT_SECRET, { expiresIn: '15m' });
    const authUrl = OutlookProvider.getAuthUrl(state);

    if (req.headers.accept?.includes('application/json')) {
      return res.status(200).json({ ok: true, data: { authUrl } });
    }
    return res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles Microsoft Graph OAuth2 callback
 */
export async function microsoftCallback(req, res, next) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${env.CLIENT_URL}/settings/accounts?error=${encodeURIComponent(error)}`);
    }

    const decoded = jwt.verify(state, env.JWT_SECRET);
    const provider = new OutlookProvider();
    const { tokens, email, displayName } = await provider.exchangeCode(code);

    const refreshCipher = encryptToken(tokens.refresh_token || '');

    const account = await store.addConnectedAccount({
      orgId: decoded.orgId,
      clientId: decoded.clientId,
      provider: 'outlook',
      emailAddress: email,
      displayName: displayName || email.split('@')[0],
      status: 'idle',
      lastSyncedAt: new Date(),
      scopes: ['Mail.Read', 'Mail.Send', 'offline_access'],
      auth: {
        refreshTokenCipher: refreshCipher.cipherText,
        iv: refreshCipher.iv,
        authTag: refreshCipher.authTag,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      },
    });

    // Run initial ingestion of latest 30 threads
    provider.account = account;
    try {
      const syncRes = await provider.sync({ limit: 30 });
      await ingestProviderThreads({
        account,
        rawThreads: syncRes.threads,
        orgId: decoded.orgId,
        clientId: decoded.clientId,
      });
    } catch (syncErr) {
      logger.warn({ syncErr: syncErr.message }, '[MicrosoftOAuth] Initial ingestion completed with warning');
    }

    return res.redirect(`${env.CLIENT_URL}/settings/accounts?success=microsoft_connected`);
  } catch (err) {
    return res.redirect(`${env.CLIENT_URL}/settings/accounts?error=${encodeURIComponent(err.message)}`);
  }
}

/**
 * Lists connected accounts for user's organization
 */
export async function listAccounts(req, res, next) {
  try {
    const accounts = await store.getConnectedAccounts(req.user.orgId);
    // Never expose encrypted auth tokens or ciphers in API responses
    const sanitized = accounts.map((a) => ({
      _id: a._id,
      provider: a.provider,
      emailAddress: a.emailAddress,
      status: a.status,
      lastSyncedAt: a.lastSyncedAt,
      error: a.error || null,
      createdAt: a.createdAt,
    }));
    return res.status(200).json({
      ok: true,
      data: sanitized,
      config: {
        googleConfigured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        microsoftConfigured: !!(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Triggers manual email synchronization
 */
export async function syncAccount(req, res, next) {
  try {
    const { id } = req.params;
    const accounts = await store.getConnectedAccounts(req.user.orgId);
    const account = accounts.find((a) => a._id === id || String(a._id) === String(id));

    if (!account) {
      return res.status(404).json({ ok: false, error: { message: 'Account not found', code: 'ACCOUNT_NOT_FOUND' } });
    }

    // Set state to syncing
    await store.updateConnectedAccount(account._id, { status: 'syncing' });

    let provider;
    if (account.provider === 'gmail') {
      provider = new GmailProvider(account);
    } else if (account.provider === 'outlook') {
      provider = new OutlookProvider(account);
    } else {
      provider = new DemoProvider(account);
    }

    let result = { threads: [], messagesCount: 0 };
    try {
      result = await provider.sync({ limit: 30 });

      // Run ingestion for real external accounts (Gmail, Outlook)
      if (account.provider === 'gmail' || account.provider === 'outlook') {
        const ingestRes = await ingestProviderThreads({
          account,
          rawThreads: result.threads,
          orgId: req.user.orgId,
          clientId: req.user.clientId,
        });
        result.threads = new Array(ingestRes.threadsCount);
        result.messagesCount = ingestRes.messagesCount;
      }

      await store.updateConnectedAccount(account._id, {
        status: 'idle',
        lastSyncedAt: new Date(),
        error: null,
      });

      await store.addActivityLog({
        orgId: req.user.orgId,
        actorRole: 'assistant',
        action: 'ACCOUNT_SYNCED',
        details: { provider: account.provider, count: result.threads.length },
      });
    } catch (syncErr) {
      logger.error({ err: syncErr.message }, '[Sync] Sync operation failed');
      await store.updateConnectedAccount(account._id, {
        status: 'error',
        error: { message: syncErr.message, occurredAt: new Date() },
      });
      return res.status(500).json({
        ok: false,
        error: { message: `Sync failed: ${syncErr.message}`, code: 'SYNC_ERROR' },
      });
    }

    return res.status(200).json({
      ok: true,
      data: {
        syncedAt: new Date(),
        threadsCount: result.threads.length,
        messagesCount: result.messagesCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Disconnects an account
 */
export async function disconnectAccount(req, res, next) {
  try {
    const { id } = req.params;
    const purge = req.query.purge === 'true' || req.body?.purge === true;

    // Verify account exists and belongs to user's organization
    const accounts = await store.getConnectedAccounts(req.user.orgId);
    const account = accounts.find((a) => a._id === id || String(a._id) === String(id));
    if (!account) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Account not found', code: 'ACCOUNT_NOT_FOUND' },
      });
    }

    if (purge) {
      const purgeResult = await store.purgeAccountData(id, req.user.orgId);
      await store.addActivityLog({
        orgId: req.user.orgId,
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: 'assistant',
        action: 'ACCOUNT_PURGED',
        details: { provider: account.provider, email: account.emailAddress, purgedThreads: purgeResult.purgedThreadsCount },
      });
      return res.status(200).json({
        ok: true,
        message: 'Account disconnected and all associated data purged successfully',
        data: purgeResult,
      });
    }

    await store.removeConnectedAccount(id);
    await store.addActivityLog({
      orgId: req.user.orgId,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: 'assistant',
      action: 'ACCOUNT_DISCONNECTED',
      details: { provider: account.provider, email: account.emailAddress },
    });
    return res.status(200).json({ ok: true, message: 'Account disconnected successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * Live demonstration message simulation injection
 */
export async function simulateInboundMessage(req, res, next) {
  try {
    const { threadId = 'th_38' } = req.body;
    const demo = new DemoProvider();
    const result = await demo.simulateMessage({ threadId });

    return res.status(200).json({
      ok: true,
      message: 'Simulated follow-up message injected and reclassified successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
