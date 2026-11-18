import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import app from '../src/index.js';
import { store } from '../src/services/store.js';
import {
  maskApiKey,
  detectKeyPrefixMismatch,
  redactSecrets,
  validateModelIdFormat,
  AI_PROVIDER_CATALOG,
} from '../src/ai/byokCatalog.js';
import {
  classifyProviderHttpError,
  invokeByokCompletion,
  testByokConnection,
  ByokError,
} from '../src/ai/byokClient.js';

describe('BYOK AI Provider Settings & Client Test Suite', () => {
  let server;
  let baseUrl;
  let assistantCookie = '';
  let clientCookie = '';

  before(async () => {
    await store.initSeedData();
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Sign in as assistant Maya
    const resA = await fetch(`${baseUrl}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'assistant' }),
    });
    assistantCookie = resA.headers.get('set-cookie')?.split(';')[0] || '';

    // Sign in as client Priya
    const resC = await fetch(`${baseUrl}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'client' }),
    });
    clientCookie = resC.headers.get('set-cookie')?.split(';')[0] || '';
  });

  after(async () => {
    await store.deleteOrgAiConfig('org_vortex_001');
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. Secret masking, prefix mismatch detection, and error redaction work safely', () => {
    assert.equal(maskApiKey('sk-proj-1234567890abcdef9876'), 'sk-p••••••9876');
    assert.equal(maskApiKey('short'), '••••••••');

    assert.ok(detectKeyPrefixMismatch('openai', 'sk-ant-api03-abcdef123456')?.includes('Anthropic'));
    assert.ok(detectKeyPrefixMismatch('anthropic', 'AIzaSyD12345678901234567890')?.includes('Gemini'));
    assert.equal(detectKeyPrefixMismatch('openai', 'sk-proj-1234567890abcdef'), null);

    const leaked = 'Upstream failed for sk-proj-1234567890abcdef and AIzaSyD12345678901234567890123';
    const safe = redactSecrets(leaked);
    assert.ok(!safe.includes('sk-proj-1234567890abcdef'));
    assert.ok(!safe.includes('AIzaSyD12345678901234567890123'));
  });

  it('2. Provider HTTP error classifier maps 401, 402, 429, 404, 503 to actionable ByokErrors', () => {
    const e401 = classifyProviderHttpError({ provider: 'openai', model: 'gpt-4o-mini', status: 401, rawBody: 'Incorrect API key' });
    assert.equal(e401.code, 'INVALID_API_KEY');

    const e402 = classifyProviderHttpError({ provider: 'anthropic', model: 'claude-3-5-sonnet-latest', status: 402, rawBody: 'credit balance is too low' });
    assert.equal(e402.code, 'INSUFFICIENT_QUOTA');

    const e429 = classifyProviderHttpError({ provider: 'groq', model: 'llama-3.3-70b-versatile', status: 429, rawBody: 'rate_limit_exceeded' });
    assert.equal(e429.code, 'RATE_LIMITED');

    const e404 = classifyProviderHttpError({ provider: 'gemini', model: 'gemini-bad', status: 404, rawBody: 'not found for api version' });
    assert.equal(e404.code, 'MODEL_NOT_FOUND');

    const e503 = classifyProviderHttpError({ provider: 'openrouter', model: 'openai/gpt-4o-mini', status: 503, rawBody: 'unavailable' });
    assert.equal(e503.code, 'PROVIDER_OUTAGE');
  });

  it('3. invokeByokCompletion formats requests and parses responses for Gemini, OpenAI, and Anthropic', async () => {
    // Gemini
    const gemRes = await invokeByokCompletion({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: 'AIzaSyFakeKeyForUnitTest123456789',
      prompt: 'Say OK',
      fetchImpl: async (url, opts) => {
        assert.ok(url.includes('gemini-2.0-flash:generateContent'));
        assert.equal(opts.headers['x-goog-api-key'], 'AIzaSyFakeKeyForUnitTest123456789');
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }) };
      },
    });
    assert.equal(gemRes.text, 'OK');

    // OpenAI
    const oaiRes = await invokeByokCompletion({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'sk-proj-FakeKeyForUnitTest123456',
      prompt: 'Say OK',
      fetchImpl: async (url, opts) => {
        assert.equal(url, 'https://api.openai.com/v1/chat/completions');
        assert.equal(opts.headers.Authorization, 'Bearer sk-proj-FakeKeyForUnitTest123456');
        return { ok: true, json: async () => ({ choices: [{ message: { content: 'OK' } }] }) };
      },
    });
    assert.equal(oaiRes.text, 'OK');

    // Anthropic Claude
    const antRes = await testByokConnection({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-latest',
      apiKey: 'sk-ant-FakeKeyForUnitTest123456',
      fetchImpl: async (url, opts) => {
        assert.equal(url, 'https://api.anthropic.com/v1/messages');
        assert.equal(opts.headers['x-api-key'], 'sk-ant-FakeKeyForUnitTest123456');
        assert.equal(opts.headers['anthropic-version'], '2023-06-01');
        return { ok: true, json: async () => ({ content: [{ text: 'OK' }] }) };
      },
    });
    assert.equal(antRes.verified, true);
  });

  it('4. Timeout errors map cleanly to ByokError(NETWORK_TIMEOUT)', async () => {
    await assert.rejects(
      () =>
        invokeByokCompletion({
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: 'sk-proj-FakeKeyForUnitTest123456',
          prompt: 'hi',
          timeoutMs: 25,
          fetchImpl: (_url, opts) =>
            new Promise((_resolve, reject) => {
              opts.signal.addEventListener('abort', () => {
                const err = new Error('Aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }),
        }),
      (err) => err instanceof ByokError && err.code === 'NETWORK_TIMEOUT'
    );
  });

  it('5. Client role receives 403 Forbidden on BYOK settings endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/ai/settings`, {
      headers: { Cookie: clientCookie },
    });
    assert.equal(res.status, 403);
  });

  it('6. Assistant can save encrypted key, never receive raw key back, update model, and remove key', async () => {
    const rawSecret = 'sk-proj-SuperSecretTestKey9876543210';

    // Save without live network verification
    const putRes = await fetch(`${baseUrl}/api/ai/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: assistantCookie },
      body: JSON.stringify({
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: rawSecret,
        enabled: true,
        verifyBeforeSave: false,
      }),
    });
    assert.equal(putRes.status, 200);
    const putJson = await putRes.json();
    assert.equal(putJson.ok, true);
    assert.equal(putJson.data.config.keyConfigured, true);
    assert.equal(putJson.data.config.keyHint, 'sk-p••••••3210');
    assert.ok(!JSON.stringify(putJson).includes(rawSecret), 'Raw API key must never appear in response');

    // Read settings back
    const getRes = await fetch(`${baseUrl}/api/ai/settings`, {
      headers: { Cookie: assistantCookie },
    });
    assert.equal(getRes.status, 200);
    const getJson = await getRes.json();
    assert.equal(getJson.data.catalog.length, AI_PROVIDER_CATALOG.length);
    assert.equal(getJson.data.config.provider, 'openai');
    assert.equal(getJson.data.config.model, 'gpt-4o-mini');
    assert.ok(!JSON.stringify(getJson).includes(rawSecret), 'Raw API key must never appear in GET /api/ai/settings');

    // Verify server-side decryption works internally
    const internal = await store.getOrgAiConfig('org_vortex_001', { includeSecret: true });
    assert.equal(internal.apiKey, rawSecret);

    // Update model without re-entering key
    const updateRes = await fetch(`${baseUrl}/api/ai/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: assistantCookie },
      body: JSON.stringify({
        provider: 'openai',
        model: 'gpt-4o',
        enabled: true,
        verifyBeforeSave: false,
      }),
    });
    assert.equal(updateRes.status, 200);
    const updateJson = await updateRes.json();
    assert.equal(updateJson.data.config.model, 'gpt-4o');
    assert.equal(updateJson.data.config.keyConfigured, true);

    // Delete key
    const delRes = await fetch(`${baseUrl}/api/ai/settings/key`, {
      method: 'DELETE',
      headers: { Cookie: assistantCookie },
    });
    assert.equal(delRes.status, 200);

    const afterDel = await store.getOrgAiConfig('org_vortex_001', { includeSecret: true });
    assert.equal(afterDel, null);
  });

  it('7. Invalid or unrecognized Model IDs return clear INVALID_MODEL_FORMAT / MODEL_NOT_FOUND with recommendedModel', async () => {
    // Format check: spaces in display name
    const spaceCheck = validateModelIdFormat('gemini', 'Gemini 3.8 Flash');
    assert.equal(spaceCheck.valid, false);
    assert.equal(spaceCheck.code, 'INVALID_MODEL_FORMAT');
    assert.equal(spaceCheck.recommendedModel, 'gemini-3.8-flash');

    // Format check: OpenRouter missing provider/ prefix
    const orCheck = validateModelIdFormat('openrouter', 'gemini-3.8-flash');
    assert.equal(orCheck.valid, false);
    assert.equal(orCheck.code, 'INVALID_MODEL_FORMAT');

    // Upstream 400/404 model not supported / decommissioned
    const gem400 = classifyProviderHttpError({
      provider: 'gemini',
      model: 'gemini-99-fake',
      status: 400,
      rawBody: 'models/gemini-99-fake is not supported for generateContent',
    });
    assert.equal(gem400.code, 'MODEL_NOT_FOUND');
    assert.equal(gem400.recommendedModel, 'gemini-3.8-flash');

    // Endpoint rejects malformed model ID before network call
    const testRes = await fetch(`${baseUrl}/api/ai/settings/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: assistantCookie },
      body: JSON.stringify({
        provider: 'gemini',
        model: 'Gemini 3.8 Flash',
        apiKey: 'AIzaSyFakeKeyForFormatTest123456',
      }),
    });
    assert.equal(testRes.status, 200);
    const testJson = await testRes.json();
    assert.equal(testJson.ok, false);
    assert.equal(testJson.error.code, 'INVALID_MODEL_FORMAT');
    assert.equal(testJson.error.recommendedModel, 'gemini-3.8-flash');
  });
});
