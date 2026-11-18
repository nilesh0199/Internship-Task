import { getProviderMeta, redactSecrets, validateModelIdFormat } from './byokCatalog.js';

/**
 * Structured error returned when a user-supplied (BYOK) LLM call fails
 */
export class ByokError extends Error {
  /**
   * @param {Object} opts
   * @param {string} opts.code - Machine-readable error code
   * @param {string} opts.message - Safe, human-readable message
   * @param {string} [opts.hint] - Actionable remediation tip
   * @param {number} [opts.status=502] - Upstream or mapped HTTP status
   * @param {string} [opts.provider]
   * @param {string} [opts.model]
   * @param {string} [opts.recommendedModel]
   */
  constructor({ code, message, hint = '', status = 502, provider = '', model = '', recommendedModel = '' }) {
    super(redactSecrets(message));
    this.name = 'ByokError';
    this.code = code;
    this.userMessage = redactSecrets(message);
    this.hint = redactSecrets(hint);
    this.status = status;
    this.provider = provider;
    this.model = model;
    this.recommendedModel = recommendedModel || getProviderMeta(provider)?.defaultModel || '';
  }

  toPublicJSON() {
    return {
      code: this.code,
      message: this.userMessage,
      hint: this.hint,
      provider: this.provider,
      model: this.model,
      ...(this.recommendedModel ? { recommendedModel: this.recommendedModel } : {}),
    };
  }
}

/**
 * Maps an upstream HTTP status + raw error text into an actionable ByokError
 * @param {{ provider: string, model: string, status: number, rawBody: string }} params
 * @returns {ByokError}
 */
export function classifyProviderHttpError({ provider, model, status, rawBody = '' }) {
  const providerName = getProviderMeta(provider)?.name || provider;
  const safeBody = redactSecrets(rawBody);
  const lower = safeBody.toLowerCase();

  if (
    status === 401 ||
    lower.includes('invalid api key') ||
    lower.includes('api_key_invalid') ||
    lower.includes('incorrect api key') ||
    lower.includes('authentication_error') ||
    lower.includes('invalid x-api-key') ||
    lower.includes('api key not valid')
  ) {
    return new ByokError({
      code: 'INVALID_API_KEY',
      status: 401,
      provider,
      model,
      message: `Authentication failed for ${providerName}. Your API key appears invalid, revoked, or malformed.`,
      hint: `Verify the key in your ${providerName} console and make sure no extra spaces were copied.`,
    });
  }

  if (
    status === 402 ||
    lower.includes('insufficient_quota') ||
    lower.includes('credit balance is too low') ||
    lower.includes('billing') ||
    lower.includes('exceeded your current quota')
  ) {
    return new ByokError({
      code: 'INSUFFICIENT_QUOTA',
      status: 402,
      provider,
      model,
      message: `${providerName} reported insufficient credits or an exceeded billing quota.`,
      hint: `Add billing credits in your ${providerName} dashboard or switch to a free-tier provider such as Gemini or Groq.`,
    });
  }

  if (status === 429 || lower.includes('rate_limit') || lower.includes('too many requests')) {
    return new ByokError({
      code: 'RATE_LIMITED',
      status: 429,
      provider,
      model,
      message: `${providerName} rate limit reached for model "${model}".`,
      hint: 'Wait a few seconds and retry, or select a faster / higher-limit model.',
    });
  }

  if (
    status === 404 ||
    lower.includes('model_not_found') ||
    lower.includes('model_decommissioned') ||
    lower.includes('not found for api version') ||
    lower.includes('not supported for generatecontent') ||
    lower.includes('unexpected model name') ||
    lower.includes('not a valid model') ||
    lower.includes('no endpoints found') ||
    lower.includes('does not exist') ||
    lower.includes('invalid model') ||
    (lower.includes('not_found_error') && lower.includes('model')) ||
    (status === 400 && lower.includes('model') && (lower.includes('invalid') || lower.includes('unknown') || lower.includes('unsupported')))
  ) {
    const recommended = getProviderMeta(provider)?.defaultModel || '';
    return new ByokError({
      code: 'MODEL_NOT_FOUND',
      status: 404,
      provider,
      model,
      recommendedModel: recommended,
      message: `Model ID "${model}" was not recognized or is unavailable for your ${providerName} API key.`,
      hint: recommended
        ? `Check spelling (lowercase, no spaces) or click the ? guide beside Model to see valid ${providerName} IDs — try "${recommended}".`
        : `Choose a supported model from the ${providerName} dropdown or verify model access on your account.`,
    });
  }

  if (status === 403 || lower.includes('permission') || lower.includes('forbidden')) {
    return new ByokError({
      code: 'PERMISSION_DENIED',
      status: 403,
      provider,
      model,
      message: `Access denied by ${providerName} for model "${model}".`,
      hint: `Check API key permissions, organization restrictions, or regional availability in ${providerName}.`,
    });
  }

  if (status >= 500) {
    return new ByokError({
      code: 'PROVIDER_OUTAGE',
      status,
      provider,
      model,
      message: `${providerName} returned a temporary server error (HTTP ${status}).`,
      hint: 'This is an upstream outage. Daybook automatically fell back to safe rules; try again shortly.',
    });
  }

  return new ByokError({
    code: 'PROVIDER_REQUEST_FAILED',
    status: status || 400,
    provider,
    model,
    message: `${providerName} rejected the request (HTTP ${status || 'error'}).`,
    hint: 'Verify the selected provider, model ID, and API key are compatible.',
  });
}

/**
 * Strips markdown ```json ... ``` wrappers or surrounding prose if returned by a model in JSON mode
 * @param {string} text
 * @returns {string}
 */
export function stripCodeFences(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }
  return trimmed;
}

/**
 * Executes a single completion against any supported BYOK provider
 * @param {Object} params
 * @param {'gemini'|'openai'|'anthropic'|'groq'|'openrouter'} params.provider
 * @param {string} params.model
 * @param {string} params.apiKey
 * @param {string} [params.systemPrompt]
 * @param {string} params.prompt
 * @param {number} [params.temperature=0.1]
 * @param {boolean} [params.jsonMode=false]
 * @param {number} [params.maxTokens=1024]
 * @param {number} [params.timeoutMs=12000]
 * @param {typeof fetch} [params.fetchImpl=fetch]
 * @returns {Promise<{ text: string, provider: string, model: string, latencyMs: number }>}
 */
export async function invokeByokCompletion({
  provider,
  model,
  apiKey,
  systemPrompt = '',
  prompt,
  temperature = 0.1,
  jsonMode = false,
  maxTokens = 1024,
  timeoutMs = 12000,
  fetchImpl = fetch,
}) {
  if (!apiKey || !String(apiKey).trim()) {
    throw new ByokError({
      code: 'MISSING_API_KEY',
      status: 400,
      provider,
      model,
      message: 'API key is missing.',
      hint: 'Enter a valid API key in Workspace Settings.',
    });
  }

  const cleanKey = String(apiKey).trim();
  const cleanModel = String(model || getProviderMeta(provider)?.defaultModel || '').trim();
  const modelCheck = validateModelIdFormat(provider, cleanModel);
  if (!modelCheck.valid) {
    throw new ByokError({
      code: modelCheck.code || 'INVALID_MODEL_FORMAT',
      status: 400,
      provider,
      model: cleanModel,
      recommendedModel: modelCheck.recommendedModel,
      message: modelCheck.message,
      hint: modelCheck.hint,
    });
  }

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let url = '';
    let headers = { 'Content-Type': 'application/json' };
    let body = {};

    if (provider === 'gemini') {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`;
      headers['x-goog-api-key'] = cleanKey;
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      body = {
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      };
    } else if (provider === 'anthropic') {
      url = 'https://api.anthropic.com/v1/messages';
      headers['x-api-key'] = cleanKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: cleanModel,
        max_tokens: maxTokens,
        temperature,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: 'user', content: prompt }],
      };
    } else if (provider === 'openai' || provider === 'groq' || provider === 'openrouter') {
      if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
      if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';
      if (provider === 'openrouter') {
        url = 'https://openrouter.ai/api/v1/chat/completions';
        headers['HTTP-Referer'] = 'https://daybookmail.app';
        headers['X-Title'] = 'Daybook Mail';
      }
      headers.Authorization = `Bearer ${cleanKey}`;

      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const usesMaxCompletionTokens = provider === 'openai' && /^(o\d|gpt-5|gpt-6)/i.test(cleanModel);
      const isReasoningOSeries = provider === 'openai' && /^o\d/i.test(cleanModel);
      body = {
        model: cleanModel,
        messages,
        ...(usesMaxCompletionTokens
          ? { max_completion_tokens: maxTokens, ...(isReasoningOSeries ? {} : { temperature }) }
          : { max_tokens: maxTokens, temperature }),
        ...(jsonMode && !isReasoningOSeries ? { response_format: { type: 'json_object' } } : {}),
      };
    } else {
      throw new ByokError({
        code: 'UNSUPPORTED_PROVIDER',
        status: 400,
        provider,
        model: cleanModel,
        message: `Unsupported AI provider "${provider}".`,
        hint: 'Select Gemini, OpenAI, Anthropic Claude, Groq, or OpenRouter.',
      });
    }

    const response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const rawBody = await response.text().catch(() => '');
      throw classifyProviderHttpError({
        provider,
        model: cleanModel,
        status: response.status,
        rawBody,
      });
    }

    const data = await response.json();
    let text = '';

    if (provider === 'gemini') {
      text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    } else if (provider === 'anthropic') {
      text = data?.content?.map((c) => c.text || '').join('') || '';
    } else {
      text = data?.choices?.[0]?.message?.content || '';
    }

    if (!text.trim()) {
      throw new ByokError({
        code: 'EMPTY_RESPONSE',
        status: 502,
        provider,
        model: cleanModel,
        message: `${getProviderMeta(provider)?.name || provider} returned an empty response.`,
        hint: 'Try a different model or retry the request.',
      });
    }

    return {
      text: jsonMode ? stripCodeFences(text) : text.trim(),
      provider,
      model: cleanModel,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    if (err instanceof ByokError) throw err;

    if (err?.name === 'AbortError') {
      throw new ByokError({
        code: 'NETWORK_TIMEOUT',
        status: 504,
        provider,
        model: cleanModel,
        message: `Request to ${getProviderMeta(provider)?.name || provider} timed out after ${Math.round(timeoutMs / 1000)}s.`,
        hint: 'Check your internet connection or try a faster model.',
      });
    }

    throw new ByokError({
      code: 'NETWORK_ERROR',
      status: 502,
      provider,
      model: cleanModel,
      message: `Could not reach ${getProviderMeta(provider)?.name || provider}: ${redactSecrets(err?.message || 'Network failure')}`,
      hint: 'Verify outbound HTTPS access and try again.',
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lightweight connectivity verification for Settings "Test Connection"
 * @param {{ provider: string, model: string, apiKey: string, fetchImpl?: typeof fetch }} params
 */
export async function testByokConnection({ provider, model, apiKey, fetchImpl = fetch }) {
  const res = await invokeByokCompletion({
    provider,
    model,
    apiKey,
    systemPrompt: 'You are a connectivity test endpoint.',
    prompt: 'Reply with exactly: OK',
    temperature: 0,
    jsonMode: false,
    maxTokens: 16,
    timeoutMs: 10000,
    fetchImpl,
  });

  return {
    verified: true,
    provider: res.provider,
    model: res.model,
    latencyMs: res.latencyMs,
  };
}
