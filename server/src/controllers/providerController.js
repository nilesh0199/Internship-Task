import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { store } from '../services/store.js';
import { GmailProvider } from '../providers/gmail/GmailProvider.js';
import { OutlookProvider } from '../providers/outlook/OutlookProvider.js';
import { DemoProvider } from '../providers/demo/DemoProvider.js';
import { encryptToken } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

/**
 * Initiates Google OAuth2 handshake
 */
export async function connectGoogle(req, res, next) {
  try {
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
    const { tokens, email } = await provider.exchangeCode(code);

    const refreshCipher = encryptToken(tokens.refresh_token || '');
    const accessCipher = encryptToken(tokens.access_token || '');

    const account = await store.addConnectedAccount({
      orgId: decoded.orgId,
      clientId: decoded.clientId,
      provider: 'gmail',
      emailAddress: email,
      status: 'idle',
      lastSyncedAt: new Date(),
      scopes: ['gmail.readonly', 'gmail.send'],
      auth: {
        accessTokenCipher: accessCipher.cipherText,
        refreshTokenCipher: refreshCipher.cipherText,
        iv: refreshCipher.iv,
        authTag: refreshCipher.authTag,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    // Run initial sync (limit 30)
    provider.account = account;
    try {
      await provider.sync({ limit: 30 });
    } catch (syncErr) {
      logger.warn({ syncErr: syncErr.message }, '[GoogleOAuth] Initial sync completed with warning');
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
    const { tokens, email } = await provider.exchangeCode(code);

    const refreshCipher = encryptToken(tokens.refresh_token || '');
    const accessCipher = encryptToken(tokens.access_token || '');

    await store.addConnectedAccount({
      orgId: decoded.orgId,
      clientId: decoded.clientId,
      provider: 'outlook',
      emailAddress: email,
      status: 'idle',
      lastSyncedAt: new Date(),
      scopes: ['Mail.Read', 'Mail.Send', 'offline_access'],
      auth: {
        accessTokenCipher: accessCipher.cipherText,
        refreshTokenCipher: refreshCipher.cipherText,
        iv: refreshCipher.iv,
        authTag: refreshCipher.authTag,
      },
    });

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
    return res.status(200).json({ ok: true, data: sanitized });
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
    await store.removeConnectedAccount(id);
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
