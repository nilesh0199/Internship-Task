import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api.js';
import {
  KeyRound,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  ShieldCheck,
  ExternalLink,
  Zap,
  Sparkles,
  HelpCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const FALLBACK_CATALOG = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Free tier available',
    keyPlaceholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
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
    keyPlaceholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
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
    keyPlaceholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
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
    keyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
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
    keyPlaceholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    defaultModel: 'google/gemini-3.8-flash',
    models: [
      { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash (via OpenRouter)', note: 'Fast latest default (Recommended)' },
      { id: 'openai/gpt-5-mini', label: 'GPT-5 mini (via OpenRouter)', note: 'Balanced quality & speed' },
      { id: 'anthropic/claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (via OpenRouter)', note: 'Executive drafting quality' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (via OpenRouter)', note: 'Open-weights flagship' },
    ],
  },
];

function detectClientPrefixHint(provider, rawKey) {
  const k = (rawKey || '').trim();
  if (!k) return null;
  if (k.startsWith('sk-ant-') && provider !== 'anthropic') {
    return 'Heads up: keys starting with "sk-ant-" are usually Anthropic Claude keys.';
  }
  if (k.startsWith('sk-or-') && provider !== 'openrouter') {
    return 'Heads up: keys starting with "sk-or-" are usually OpenRouter keys.';
  }
  if (k.startsWith('gsk_') && provider !== 'groq') {
    return 'Heads up: keys starting with "gsk_" are usually Groq Cloud keys.';
  }
  if (k.startsWith('AIza') && provider !== 'gemini') {
    return 'Heads up: keys starting with "AIza" are usually Google Gemini keys.';
  }
  if (k.startsWith('sk-') && !k.startsWith('sk-ant-') && !k.startsWith('sk-or-') && provider !== 'openai') {
    return 'Heads up: keys starting with "sk-" are usually OpenAI keys.';
  }
  return null;
}

function validateClientModelHint(provider, rawModel, meta) {
  const m = (rawModel || '').trim();
  if (!m) return null;
  if (/\s/.test(m)) {
    return {
      severity: 'error',
      text: `Model IDs cannot have spaces — use the lowercase API slug like "${meta?.defaultModel || 'gemini-3.8-flash'}" instead of the display name.`,
    };
  }
  if (/^https?:\/\//i.test(m) || /^(sk-|AIza|gsk_)/.test(m)) {
    return {
      severity: 'error',
      text: 'This looks like a URL or API key. Enter only the Model ID here and paste your API key in step 3.',
    };
  }
  if (provider === 'openrouter' && !m.includes('/')) {
    return {
      severity: 'error',
      text: `OpenRouter requires a "provider/model" format (e.g. "${meta?.defaultModel || 'google/gemini-3.8-flash'}").`,
    };
  }
  const lower = m.toLowerCase();
  if (lower.startsWith('gpt-') && provider !== 'openai' && provider !== 'openrouter') {
    return {
      severity: 'warn',
      text: `"${m}" looks like an OpenAI model ID, but ${meta?.name} is selected.`,
    };
  }
  if (lower.startsWith('claude-') && provider !== 'anthropic' && provider !== 'openrouter') {
    return {
      severity: 'warn',
      text: `"${m}" looks like an Anthropic Claude model ID, but ${meta?.name} is selected.`,
    };
  }
  if (lower.startsWith('gemini-') && provider !== 'gemini' && provider !== 'openrouter') {
    return {
      severity: 'warn',
      text: `"${m}" looks like a Google Gemini model ID, but ${meta?.name} is selected.`,
    };
  }
  return null;
}

export function AiProviderSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [catalog, setCatalog] = useState(FALLBACK_CATALOG);
  const [savedConfig, setSavedConfig] = useState(null);

  // Form state
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('gemini-3.8-flash');
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const [showModelGuide, setShowModelGuide] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [verifyBeforeSave, setVerifyBeforeSave] = useState(true);

  // Action states
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [testFeedback, setTestFeedback] = useState(null); // { ok, message, hint, code, latencyMs }

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('/ai/settings');
      if (res.ok && res.data) {
        const nextCatalog = res.data.catalog?.length ? res.data.catalog : FALLBACK_CATALOG;
        setCatalog(nextCatalog);
        const cfg = res.data.config;
        setSavedConfig(cfg);
        if (cfg?.provider) {
          setProvider(cfg.provider);
          const meta = nextCatalog.find((p) => p.id === cfg.provider);
          const isCurated = meta?.models?.some((m) => m.id === cfg.model);
          if (cfg.model && !isCurated) {
            setUseCustomModel(true);
            setCustomModel(cfg.model);
            setModel(meta?.defaultModel || cfg.model);
          } else {
            setUseCustomModel(false);
            setCustomModel('');
            setModel(cfg.model || meta?.defaultModel || '');
          }
          setEnabled(cfg.enabled !== false);
        }
      }
    } catch (err) {
      setLoadError(err.message || 'Could not load AI provider settings.');
    } finally {
      setLoading(false);
    }
  }

  const activeProviderMeta = useMemo(
    () => catalog.find((p) => p.id === provider) || catalog[0],
    [catalog, provider]
  );

  const effectiveModel = useCustomModel ? customModel.trim() : model;
  const prefixHint = useMemo(() => detectClientPrefixHint(provider, apiKeyInput), [provider, apiKeyInput]);
  const modelHint = useMemo(
    () => (useCustomModel ? validateClientModelHint(provider, customModel, activeProviderMeta) : null),
    [useCustomModel, provider, customModel, activeProviderMeta]
  );

  function handleSelectProvider(nextId) {
    setProvider(nextId);
    setTestFeedback(null);
    const meta = catalog.find((p) => p.id === nextId);
    if (meta) {
      setUseCustomModel(false);
      setCustomModel('');
      setModel(meta.defaultModel);
    }
  }

  async function handleTestConnection() {
    if (!effectiveModel) {
      setTestFeedback({
        ok: false,
        code: 'MISSING_MODEL',
        message: 'Please select or enter a model ID first.',
      });
      return;
    }
    if (!apiKeyInput.trim() && !savedConfig?.keyConfigured) {
      setTestFeedback({
        ok: false,
        code: 'MISSING_API_KEY',
        message: 'Enter an API key above before testing the connection.',
      });
      return;
    }

    setTesting(true);
    setTestFeedback(null);
    try {
      const res = await api.post('/ai/settings/test', {
        provider,
        model: effectiveModel,
        ...(apiKeyInput.trim() ? { apiKey: apiKeyInput.trim() } : {}),
      });
      if (res.ok && res.data) {
        setTestFeedback({
          ok: true,
          message: res.data.message || `Verified ${activeProviderMeta?.name} (${effectiveModel})`,
          latencyMs: res.data.latencyMs,
        });
        toast.success(`Connection verified in ${res.data.latencyMs}ms`);
        if (!apiKeyInput.trim()) loadSettings();
      } else {
        setTestFeedback({
          ok: false,
          code: res.error?.code || 'TEST_FAILED',
          message: res.error?.message || 'Connection test failed.',
          hint: res.error?.hint || '',
          recommendedModel: res.error?.recommendedModel || '',
        });
      }
    } catch (err) {
      setTestFeedback({
        ok: false,
        code: err.code || 'TEST_FAILED',
        message: err.message || 'Connection test failed.',
        hint: err.data?.error?.hint || 'Double-check your API key, selected provider, and model name.',
        recommendedModel: err.data?.error?.recommendedModel || '',
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!effectiveModel) {
      toast.error('Please select or enter a model ID.');
      return;
    }
    if (!apiKeyInput.trim() && !savedConfig?.keyConfigured) {
      setTestFeedback({
        ok: false,
        code: 'MISSING_API_KEY',
        message: 'Please paste your API key to save and activate.',
      });
      return;
    }

    setSaving(true);
    setTestFeedback(null);
    try {
      const res = await api.put('/ai/settings', {
        provider,
        model: effectiveModel,
        ...(apiKeyInput.trim() ? { apiKey: apiKeyInput.trim() } : {}),
        enabled,
        verifyBeforeSave,
      });

      if (res.ok && res.data?.config) {
        setSavedConfig(res.data.config);
        setApiKeyInput('');
        setShowKey(false);
        setTestFeedback({
          ok: true,
          message: verifyBeforeSave
            ? `Verified & activated ${activeProviderMeta?.name} (${effectiveModel})${res.data.latencyMs ? ` in ${res.data.latencyMs}ms` : ''}.`
            : `Saved & encrypted ${activeProviderMeta?.name} (${effectiveModel}).`,
        });
        toast.success(res.message || 'AI provider configuration saved!');
      }
    } catch (err) {
      setTestFeedback({
        ok: false,
        code: err.code || 'SAVE_FAILED',
        message: err.message || 'Could not save API key.',
        hint: err.data?.error?.hint || 'Uncheck "Verify before saving" only if you want to store the key offline.',
        recommendedModel: err.data?.error?.recommendedModel || '',
      });
      toast.error(err.message || 'Verification failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveKey() {
    if (!window.confirm('Remove your saved API key and revert to built-in rules & fallback mode?')) {
      return;
    }
    setRemoving(true);
    setTestFeedback(null);
    try {
      const res = await api.delete('/ai/settings/key');
      if (res.ok) {
        setApiKeyInput('');
        toast.success('API key securely removed.');
        await loadSettings();
      }
    } catch (err) {
      toast.error('Failed to remove key: ' + err.message);
    } finally {
      setRemoving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-14 rounded-2xl bg-black/[0.04]" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-16 rounded-2xl bg-black/[0.04]" />
          ))}
        </div>
        <div className="h-24 rounded-2xl bg-black/[0.04]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-5 rounded-2xl bg-red-50/70 border border-red-200 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-red-900">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span>Unable to load AI Provider Settings</span>
        </div>
        <p className="text-xs text-red-800">{loadError}</p>
        <button
          type="button"
          onClick={loadSettings}
          className="px-3.5 py-1.5 rounded-full bg-ink-900 text-white text-xs font-semibold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Header + Live Status Pill */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-serif font-bold text-sm text-ink-900">Bring Your Own AI Key (BYOK)</h3>
          <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">
            Connect Gemini, OpenAI, Claude, Groq, or OpenRouter to power live triage, Command Palette chat, and tailored drafts.
          </p>
        </div>

        {savedConfig?.keyConfigured ? (
          savedConfig.enabled ? (
            savedConfig.lastTestStatus === 'failed' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300/80 text-[11px] font-semibold text-amber-900">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                <span>Key Error · Fallback Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Active: {savedConfig.provider} · {savedConfig.model}</span>
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-100 text-[11px] font-semibold text-ink-600">
              <span>Paused (Key Saved)</span>
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-black/[0.08] text-[11px] font-semibold text-ink-600">
            <Sparkles className="h-3 w-3 text-accent" />
            <span>Built-in Rules Engine</span>
          </span>
        )}
      </div>

      {/* Saved Runtime Error Banner if a previously saved key failed */}
      {savedConfig?.keyConfigured && savedConfig.lastTestStatus === 'failed' && savedConfig.lastTestError && !testFeedback && (
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300/80 text-xs text-amber-950 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
            <span>Last API call returned an error (safe fallback active)</span>
          </div>
          <p className="text-[11px] text-amber-900 leading-relaxed">{savedConfig.lastTestError}</p>
        </div>
      )}

      {/* 1. Provider Selection Grid */}
      <div className="space-y-2">
        <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
          1. Choose AI Provider
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {catalog.map((p) => {
            const isSelected = provider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectProvider(p.id)}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-ink-900 text-white border-ink-900 shadow-soft'
                    : 'bg-[#FAF8F5] hover:bg-white border-black/[0.08] text-ink-900'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold truncate">{p.name}</span>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />}
                </div>
                <span
                  className={`inline-block mt-1 text-[10px] font-medium ${
                    isSelected ? 'text-white/75' : 'text-ink-500'
                  }`}
                >
                  {p.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Model Selection + "What is a Model ID?" Guide */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
              2. Model ({activeProviderMeta?.name})
            </label>
            <button
              type="button"
              onClick={() => setShowModelGuide((prev) => !prev)}
              className={`p-0.5 rounded-full transition cursor-pointer ${
                showModelGuide
                  ? 'bg-ink-900 text-white'
                  : 'text-ink-400 hover:text-ink-900 hover:bg-black/5'
              }`}
              title="What is a Model ID & where to find it?"
              aria-label="Model ID Guide"
              aria-expanded={showModelGuide}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setUseCustomModel((prev) => !prev)}
            className="text-[11px] font-semibold text-accent hover:underline cursor-pointer"
          >
            {useCustomModel ? 'Choose from curated list' : 'Use custom model ID'}
          </button>
        </div>

        {/* Inline Editorial "What is a Model ID?" Guide Popover Card */}
        {showModelGuide && (
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-black/[0.1] shadow-2xs text-[11px] text-ink-700 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-ink-900 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-accent" />
                <span>What is a Model ID?</span>
              </span>
              <button
                type="button"
                onClick={() => setShowModelGuide(false)}
                className="p-0.5 rounded-full text-ink-400 hover:text-ink-900 hover:bg-black/5 cursor-pointer"
                aria-label="Close guide"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="leading-relaxed text-ink-600">
              A <strong className="text-ink-900">Model ID</strong> is the exact lowercase code slug that the provider's API expects — never the spaced display name.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[10px]">
              <div className="px-2.5 py-1.5 rounded-lg bg-red-50/80 border border-red-200/70 text-red-900">
                <span className="font-bold">✗ Wrong:</span> {activeProviderMeta?.badModelExample || 'Gemini 3.8 Flash'}
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200/70 text-emerald-900">
                <span className="font-bold">✓ Right:</span> {activeProviderMeta?.defaultModel}
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-ink-800">Where to find it for {activeProviderMeta?.name}:</div>
              <p className="text-ink-600 leading-relaxed">
                {activeProviderMeta?.whereToFindModel ||
                  `Open your ${activeProviderMeta?.name} API console or Models documentation and copy the exact Model ID slug.`}
              </p>
              {activeProviderMeta?.modelsDocsUrl && (
                <a
                  href={activeProviderMeta.modelsDocsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline pt-0.5"
                >
                  <span>Open {activeProviderMeta.name} Models list</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="space-y-1 pt-0.5 border-t border-black/[0.06]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-500 font-bold">
                Valid examples (click to use):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(activeProviderMeta?.models || []).slice(0, 3).map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      if (useCustomModel) {
                        setCustomModel(ex.id);
                      } else {
                        setModel(ex.id);
                      }
                      setTestFeedback(null);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-ink-900 hover:text-white border border-black/[0.1] font-mono text-[10px] text-ink-800 transition cursor-pointer"
                  >
                    {ex.id}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!useCustomModel ? (
          <div className="relative">
            <Cpu className="h-3.5 w-3.5 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={model}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setUseCustomModel(true);
                  setCustomModel('');
                  setTestFeedback(null);
                  return;
                }
                setModel(e.target.value);
                setTestFeedback(null);
              }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-black/[0.12] text-xs font-medium text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20 cursor-pointer"
            >
              {(activeProviderMeta?.models || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.note}
                </option>
              ))}
              <option value="__custom__">+ Enter custom model ID manually...</option>
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <input
              type="text"
              autoFocus
              value={customModel}
              onChange={(e) => {
                setCustomModel(e.target.value);
                setTestFeedback(null);
              }}
              placeholder={`Enter any ${activeProviderMeta?.name} model ID (e.g. ${activeProviderMeta?.defaultModel})`}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs font-mono text-ink-900 focus:outline-none focus:ring-2 select-text ${
                modelHint?.severity === 'error'
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-black/[0.12] focus:ring-ink-900/20'
              }`}
            />
            {modelHint ? (
              <div
                className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-[11px] ${
                  modelHint.severity === 'error'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <AlertTriangle
                  className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${
                    modelHint.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                  }`}
                />
                <span>{modelHint.text}</span>
              </div>
            ) : (
              <p className="text-[11px] text-ink-500">
                Supports any newly released or fine-tuned model ID accepted by {activeProviderMeta?.name}. Click <strong className="text-ink-700">?</strong> above for examples.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 3. Encrypted API Key Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
            3. API Key
          </label>
          {activeProviderMeta?.docsUrl && (
            <a
              href={activeProviderMeta.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 hover:underline"
            >
              <span>Get {activeProviderMeta.name} key</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {savedConfig?.keyConfigured && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-50/60 border border-emerald-200/70 text-[11px]">
            <div className="flex items-center gap-2 text-emerald-900">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                Saved key: <code className="font-mono font-bold">{savedConfig.keyHint}</code>
              </span>
            </div>
            <span className="font-mono text-[10px] text-emerald-800">AES-256-GCM encrypted</span>
          </div>
        )}

        <div className="relative">
          <KeyRound className="h-3.5 w-3.5 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type={showKey ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            value={apiKeyInput}
            onChange={(e) => {
              setApiKeyInput(e.target.value);
              setTestFeedback(null);
            }}
            placeholder={
              savedConfig?.keyConfigured
                ? 'Leave blank to keep saved key, or paste a new key to replace...'
                : `Paste your ${activeProviderMeta?.name} key (${activeProviderMeta?.keyPlaceholder || 'sk-...'})`
            }
            className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white border border-black/[0.12] text-xs font-mono text-ink-900 placeholder:font-sans placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/20 select-text"
          />
          <button
            type="button"
            onClick={() => setShowKey((prev) => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition cursor-pointer"
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>

        {prefixHint && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>{prefixHint}</span>
          </div>
        )}
      </div>

      {/* Options Row: Active Toggle + Verify Before Save */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FAF8F5] border border-black/[0.06] text-xs">
        <label className="flex items-center gap-2 cursor-pointer text-ink-800 font-medium">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-black/20 accent-ink-900 h-3.5 w-3.5 cursor-pointer"
          />
          <span>Use my key for live AI tasks</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-ink-600">
          <input
            type="checkbox"
            checked={verifyBeforeSave}
            onChange={(e) => setVerifyBeforeSave(e.target.checked)}
            className="rounded border-black/20 accent-ink-900 h-3.5 w-3.5 cursor-pointer"
          />
          <span>Verify connection before saving</span>
        </label>
      </div>

      {/* Live Test / Save Feedback Card */}
      {testFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs space-y-1 animate-in fade-in ${
            testFeedback.ok
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
              : 'bg-red-50/90 border-red-200 text-red-950'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {testFeedback.ok ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            )}
            <span>{testFeedback.message}</span>
          </div>
          {testFeedback.hint && (
            <p className={`text-[11px] leading-relaxed pl-6 ${testFeedback.ok ? 'text-emerald-800' : 'text-red-800'}`}>
              {testFeedback.hint}
            </p>
          )}
          {!testFeedback.ok && testFeedback.code && (
            <div className="pl-6 pt-1 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-red-700/80">
                Error code: {testFeedback.code}
              </span>
              {(testFeedback.code === 'MODEL_NOT_FOUND' || testFeedback.code === 'INVALID_MODEL_FORMAT') &&
                (testFeedback.recommendedModel || activeProviderMeta?.defaultModel) && (
                  <button
                    type="button"
                    onClick={() => {
                      const rec = testFeedback.recommendedModel || activeProviderMeta.defaultModel;
                      setUseCustomModel(false);
                      setCustomModel('');
                      setModel(rec);
                      setTestFeedback(null);
                    }}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-ink-900 hover:text-white border border-red-200 text-[11px] font-semibold text-red-900 transition cursor-pointer"
                  >
                    Use recommended ({testFeedback.recommendedModel || activeProviderMeta.defaultModel})
                  </button>
                )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="submit"
            disabled={saving || testing}
            className="px-4 py-2 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-soft transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            <span>{saving ? 'Verifying & Saving...' : 'Save & Activate'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || saving}
            className="px-3.5 py-2 rounded-full bg-white hover:bg-ink-50 border border-black/[0.12] text-ink-800 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-accent" />}
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>
        </div>

        {savedConfig?.keyConfigured && (
          <button
            type="button"
            onClick={handleRemoveKey}
            disabled={removing}
            className="px-3 py-2 rounded-full text-xs font-medium text-red-700 hover:bg-red-50 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{removing ? 'Removing...' : 'Remove Key'}</span>
          </button>
        )}
      </div>

      {/* Security & Privacy Assurance Footer */}
      <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-black/[0.06] text-[11px] text-ink-500 leading-relaxed flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-teal-700 flex-shrink-0 mt-0.5" />
        <span>
          <strong className="text-ink-800 font-semibold">Zero-exposure key handling:</strong> Your API key is encrypted server-side using AES-256-GCM before storage, never sent back to the browser, and never written to logs. If your key hits a quota or network error, Daybook falls back automatically to deterministic safety rules without crashing.
        </span>
      </div>
    </form>
  );
}
