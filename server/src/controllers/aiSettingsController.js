import { z } from 'zod';
import { store } from '../services/store.js';
import { env } from '../config/env.js';
import {
  AI_PROVIDER_CATALOG,
  VALID_PROVIDER_IDS,
  getProviderMeta,
  detectKeyPrefixMismatch,
  validateModelIdFormat,
} from '../ai/byokCatalog.js';
import { testByokConnection, ByokError } from '../ai/byokClient.js';
import { logger } from '../utils/logger.js';

export const SaveAiSettingsSchema = z.object({
  provider: z.enum(VALID_PROVIDER_IDS),
  model: z.string().trim().min(1, 'Model name is required').max(120),
  apiKey: z.string().trim().max(400).optional(),
  enabled: z.boolean().optional().default(true),
  verifyBeforeSave: z.boolean().optional().default(false),
});

export const TestAiSettingsSchema = z.object({
  provider: z.enum(VALID_PROVIDER_IDS),
  model: z.string().trim().min(1, 'Model name is required').max(120),
  apiKey: z.string().trim().max(400).optional(),
});

/**
 * GET /api/ai/settings
 * Returns the curated provider/model catalog and the org's masked BYOK configuration.
 * NEVER returns raw API keys.
 */
export async function getAiSettings(req, res, next) {
  try {
    const orgId = req.user?.orgId || 'org_vortex_001';
    const config = await store.getOrgAiConfig(orgId, { includeSecret: false });

    return res.status(200).json({
      ok: true,
      data: {
        catalog: AI_PROVIDER_CATALOG,
        config: config || {
          orgId,
          provider: 'gemini',
          model: 'gemini-3.8-flash',
          keyHint: '',
          keyConfigured: false,
          enabled: true,
          lastTestedAt: null,
          lastTestStatus: 'untested',
          lastTestError: null,
          updatedAt: null,
        },
        serverDefaultAvailable: Boolean(env.GEMINI_API_KEY || env.GROQ_API_KEY),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/ai/settings
 * Encrypts (AES-256-GCM) and saves the org's BYOK AI provider, model, and key.
 */
export async function saveAiSettings(req, res, next) {
  try {
    const orgId = req.user?.orgId || 'org_vortex_001';
    const { provider, model, apiKey, enabled = true, verifyBeforeSave = false } = req.body;

    const modelCheck = validateModelIdFormat(provider, model);
    if (!modelCheck.valid) {
      return res.status(400).json({
        ok: false,
        error: {
          code: modelCheck.code,
          message: modelCheck.message,
          hint: modelCheck.hint,
          recommendedModel: modelCheck.recommendedModel,
        },
      });
    }

    const existing = await store.getOrgAiConfig(orgId, { includeSecret: true });
    const effectiveKey = apiKey && apiKey.trim() ? apiKey.trim() : existing?.apiKey || '';

    if (!effectiveKey) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'Please enter an API key before saving.',
          hint: `Paste your ${getProviderMeta(provider)?.name || provider} API key and try again.`,
        },
      });
    }

    let lastTestStatus;
    let lastTestError;
    let lastTestedAt;
    let latencyMs = null;

    if (verifyBeforeSave) {
      try {
        const testRes = await testByokConnection({ provider, model, apiKey: effectiveKey });
        lastTestStatus = 'verified';
        lastTestError = null;
        lastTestedAt = new Date();
        latencyMs = testRes.latencyMs;
      } catch (testErr) {
        const pub =
          testErr instanceof ByokError
            ? testErr.toPublicJSON()
            : {
                code: 'VERIFICATION_FAILED',
                message: 'Could not verify the API key with the selected provider.',
                hint: 'Check your key, model name, and billing status.',
              };
        return res.status(400).json({
          ok: false,
          error: pub,
        });
      }
    }

    const saved = await store.saveOrgAiConfig(orgId, {
      provider,
      model,
      apiKey: apiKey && apiKey.trim() ? apiKey.trim() : undefined,
      enabled,
      updatedBy: req.user?._id || null,
      lastTestStatus,
      lastTestError,
      lastTestedAt,
    });

    await store.addActivityLog({
      orgId,
      actorId: req.user?._id,
      actorName: req.user?.name || 'Assistant',
      actorRole: 'assistant',
      action: 'AI_PROVIDER_UPDATED',
      details: {
        provider: saved.provider,
        model: saved.model,
        enabled: saved.enabled,
        verified: saved.lastTestStatus === 'verified',
      },
    });

    logger.info(
      { orgId, provider: saved.provider, model: saved.model, enabled: saved.enabled },
      '[AISettings] Organization BYOK AI configuration updated'
    );

    const prefixWarning = apiKey ? detectKeyPrefixMismatch(provider, apiKey) : null;

    return res.status(200).json({
      ok: true,
      message: `${getProviderMeta(provider)?.name || provider} (${model}) saved and encrypted.`,
      data: {
        config: saved,
        latencyMs,
        prefixWarning,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/settings/test
 * Tests either a newly typed key or the org's saved encrypted key against the live provider API.
 */
export async function testAiSettings(req, res, next) {
  try {
    const orgId = req.user?.orgId || 'org_vortex_001';
    const { provider, model, apiKey } = req.body;

    const modelCheck = validateModelIdFormat(provider, model);
    if (!modelCheck.valid) {
      return res.status(200).json({
        ok: false,
        error: {
          code: modelCheck.code,
          message: modelCheck.message,
          hint: modelCheck.hint,
          recommendedModel: modelCheck.recommendedModel,
        },
      });
    }

    const existing = await store.getOrgAiConfig(orgId, { includeSecret: true });
    const usingSavedKey = !(apiKey && apiKey.trim());
    const effectiveKey = usingSavedKey ? existing?.apiKey || '' : apiKey.trim();

    if (!effectiveKey) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'Enter an API key first to run a connection test.',
          hint: `Paste your ${getProviderMeta(provider)?.name || provider} key above and click Test Connection.`,
        },
      });
    }

    const prefixWarning = detectKeyPrefixMismatch(provider, effectiveKey);

    try {
      const result = await testByokConnection({ provider, model, apiKey: effectiveKey });

      if (usingSavedKey && existing) {
        await store.updateOrgAiTestStatus(orgId, { status: 'verified', error: null });
      }

      logger.info(
        { orgId, provider, model, latencyMs: result.latencyMs },
        '[AISettings] BYOK connection verified'
      );

      return res.status(200).json({
        ok: true,
        data: {
          ...result,
          prefixWarning,
          message: `Connected to ${getProviderMeta(provider)?.name || provider} (${model}) in ${result.latencyMs}ms.`,
        },
      });
    } catch (testErr) {
      const pub =
        testErr instanceof ByokError
          ? testErr.toPublicJSON()
          : {
              code: 'CONNECTION_FAILED',
              message: 'Connection test failed.',
              hint: 'Double-check your API key and selected model.',
            };

      if (usingSavedKey && existing) {
        await store.updateOrgAiTestStatus(orgId, { status: 'failed', error: pub.message });
      }

      logger.warn({ orgId, provider, model, code: pub.code }, '[AISettings] BYOK connection test failed');

      return res.status(200).json({
        ok: false,
        error: {
          ...pub,
          prefixWarning,
        },
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/ai/settings/key
 * Permanently removes the org's encrypted BYOK key and returns to built-in rules/fallback.
 */
export async function deleteAiSettingsKey(req, res, next) {
  try {
    const orgId = req.user?.orgId || 'org_vortex_001';
    await store.deleteOrgAiConfig(orgId);

    await store.addActivityLog({
      orgId,
      actorId: req.user?._id,
      actorName: req.user?.name || 'Assistant',
      actorRole: 'assistant',
      action: 'AI_API_KEY_REMOVED',
      details: { revertedToFallback: true },
    });

    logger.info({ orgId }, '[AISettings] Organization BYOK API key removed');

    return res.status(200).json({
      ok: true,
      message: 'API key removed. Workspace reverted to built-in rules & fallback mode.',
    });
  } catch (err) {
    next(err);
  }
}
