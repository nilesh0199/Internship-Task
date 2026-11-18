/**
 * Curated BYOK AI Provider & Model Catalog + Secret Masking / Redaction Helpers
 */

export const AI_PROVIDER_CATALOG = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Free tier available',
    keyPrefix: 'AIza',
    keyPlaceholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    modelsDocsUrl: 'https://ai.google.dev/gemini-api/docs/models',
    whereToFindModel: 'Open Google AI Studio → API Docs → Models, and copy the lowercase code name under the model card.',
    badModelExample: 'Gemini 3.8 Flash',
    defaultModel: 'gemini-3.8-flash',
    models: [
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', note: 'Latest flagship Flash · Free tier (Recommended)' },
      { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', note: 'Stable Flash · Free tier' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', note: 'Ultra-lightweight & fast · Free tier' },
      { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', note: 'Preview Flash endpoint · Free tier' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', note: 'Previous generation stable Flash' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: 'Popular',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    modelsDocsUrl: 'https://platform.openai.com/docs/models',
    whereToFindModel: 'Open OpenAI Platform → Docs → Models, and copy the exact API slug from the Model ID column.',
    badModelExample: 'GPT 5 Mini',
    defaultModel: 'gpt-5-mini',
    models: [
      { id: 'gpt-5-mini', label: 'GPT-5 mini', note: 'Fast, structured & cost-efficient (Recommended)' },
      { id: 'gpt-5', label: 'GPT-5', note: 'Flagship reasoning & multi-step agents' },
      { id: 'gpt-5-nano', label: 'GPT-5 nano', note: 'Ultra-low-latency high-volume triage' },
      { id: 'gpt-4.1', label: 'GPT-4.1', note: '1M context workhorse for long threads' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', note: 'Compact high-adherence model' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    badge: 'Best writing tone',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    modelsDocsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models/overview',
    whereToFindModel: 'Open Anthropic Docs → Models Overview, and copy the exact Claude API ID (always hyphenated, no spaces).',
    badModelExample: 'Claude Sonnet 5.5',
    defaultModel: 'claude-sonnet-5-5',
    models: [
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Best balance of speed & executive writing (Recommended)' },
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'Ultra-fast triage & classification' },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Core enterprise & deep agentic work' },
      { id: 'claude-fable-5-2', label: 'Claude Fable 5.2', note: 'Long-horizon complex reasoning' },
    ],
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    badge: 'Ultra-fast · Free tier',
    keyPrefix: 'gsk_',
    keyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    modelsDocsUrl: 'https://console.groq.com/docs/models',
    whereToFindModel: 'Open Groq Console → Docs → Supported Models, and copy the exact Model ID column (some include a prefix like openai/).',
    badModelExample: 'Llama 3.3 70B',
    defaultModel: 'openai/gpt-oss-120b',
    models: [
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (Groq)', note: 'Flagship open-weight MoE ~500 tps (Recommended)' },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', note: 'Meta 70B production model (~280 tps)' },
      { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (Groq)', note: 'Ultra-fast open-weight (~1,000 tps)' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', note: 'Lowest latency triage (~560 tps)' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Multi-model gateway',
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    modelsDocsUrl: 'https://openrouter.ai/models',
    whereToFindModel: 'Open OpenRouter → Models, click any model, and copy the provider/model slug shown below its title.',
    badModelExample: 'gemini-3.8-flash (missing google/ prefix)',
    defaultModel: 'google/gemini-3.8-flash',
    models: [
      { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash (via OpenRouter)', note: 'Fast latest default (Recommended)' },
      { id: 'openai/gpt-5-mini', label: 'GPT-5 mini (via OpenRouter)', note: 'Balanced quality & speed' },
      { id: 'anthropic/claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (via OpenRouter)', note: 'Executive drafting quality' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (via OpenRouter)', note: 'Open-weights flagship' },
    ],
  },
];

export const VALID_PROVIDER_IDS = AI_PROVIDER_CATALOG.map((p) => p.id);

/**
 * Look up provider metadata by ID
 * @param {string} providerId
 */
export function getProviderMeta(providerId) {
  return AI_PROVIDER_CATALOG.find((p) => p.id === providerId) || null;
}

/**
 * Produces a non-sensitive masked hint for UI display (never leaks raw key)
 * @param {string} rawKey
 * @returns {string}
 */
export function maskApiKey(rawKey) {
  const clean = String(rawKey || '').trim();
  if (!clean) return '';
  if (clean.length <= 8) return '••••••••';
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  return `${start}••••••${end}`;
}

/**
 * Soft sanity check for common provider/key prefix mismatches
 * @param {string} provider
 * @param {string} rawKey
 * @returns {string | null}
 */
export function detectKeyPrefixMismatch(provider, rawKey) {
  const key = String(rawKey || '').trim();
  if (!key) return null;

  if (key.startsWith('sk-ant-') && provider !== 'anthropic') {
    return 'This key looks like an Anthropic Claude key (sk-ant-...). Switch provider to Anthropic Claude if intended.';
  }
  if (key.startsWith('sk-or-') && provider !== 'openrouter') {
    return 'This key looks like an OpenRouter key (sk-or-...). Switch provider to OpenRouter if intended.';
  }
  if (key.startsWith('gsk_') && provider !== 'groq') {
    return 'This key looks like a Groq key (gsk_...). Switch provider to Groq Cloud if intended.';
  }
  if (key.startsWith('AIza') && provider !== 'gemini') {
    return 'This key looks like a Google Gemini key (AIza...). Switch provider to Google Gemini if intended.';
  }
  if (key.startsWith('sk-') && !key.startsWith('sk-ant-') && !key.startsWith('sk-or-') && provider !== 'openai') {
    return 'This key looks like an OpenAI key (sk-...). Switch provider to OpenAI if intended.';
  }
  return null;
}

/**
 * Validates that a user-entered model ID has a valid API slug format before calling upstream
 * @param {string} provider
 * @param {string} rawModel
 * @returns {{ valid: boolean, code?: string, message?: string, hint?: string, recommendedModel?: string }}
 */
export function validateModelIdFormat(provider, rawModel) {
  const meta = getProviderMeta(provider);
  const recommendedModel = meta?.defaultModel || '';
  const model = String(rawModel || '').trim();

  if (!model) {
    return {
      valid: false,
      code: 'MISSING_MODEL_ID',
      message: 'Model ID cannot be empty.',
      hint: `Select a model or enter a valid ${meta?.name || provider} model ID such as "${recommendedModel}".`,
      recommendedModel,
    };
  }

  if (/\s/.test(model)) {
    return {
      valid: false,
      code: 'INVALID_MODEL_FORMAT',
      message: `"${model}" is not a valid Model ID — API model IDs cannot contain spaces.`,
      hint: `Use the lowercase hyphenated API slug instead of the display name (for example: "${recommendedModel}").`,
      recommendedModel,
    };
  }

  if (/^https?:\/\//i.test(model) || /^(sk-|AIza|gsk_)/.test(model)) {
    return {
      valid: false,
      code: 'INVALID_MODEL_FORMAT',
      message: 'It looks like a URL or API key was pasted into the Model ID field.',
      hint: `Enter only the model slug here (e.g. "${recommendedModel}"), and paste your API key in step 3 below.`,
      recommendedModel,
    };
  }

  if (!/^[a-zA-Z0-9._:/-]{2,120}$/.test(model)) {
    return {
      valid: false,
      code: 'INVALID_MODEL_FORMAT',
      message: `"${model}" contains unsupported characters for a Model ID.`,
      hint: `Model IDs only use letters, numbers, hyphens, dots, colons, or slashes (e.g. "${recommendedModel}").`,
      recommendedModel,
    };
  }

  if (provider === 'openrouter' && !model.includes('/')) {
    return {
      valid: false,
      code: 'INVALID_MODEL_FORMAT',
      message: `OpenRouter model IDs must include the provider prefix (e.g. "google/gemini-3.8-flash"), not "${model}".`,
      hint: `Format: provider/model-name — try "${recommendedModel}".`,
      recommendedModel,
    };
  }

  return { valid: true, recommendedModel };
}

/**
 * Redacts any API key-like tokens from error messages or logs
 * @param {string} message
 * @returns {string}
 */
export function redactSecrets(message) {
  return String(message || '')
    .replace(/sk-[a-zA-Z0-9_-]{12,}/g, '[REDACTED_KEY]')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_KEY]')
    .replace(/gsk_[a-zA-Z0-9_-]{12,}/g, '[REDACTED_KEY]')
    .replace(/key=[0-9A-Za-z_-]{12,}/gi, 'key=[REDACTED]');
}
