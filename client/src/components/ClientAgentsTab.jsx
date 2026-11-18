import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { AgentVsWorkflowPopover } from './AgentVsWorkflowPopover.jsx';
import {
  Layers,
  Calendar,
  Clock,
  FileEdit,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Bot,
  Save,
  Plus,
  Trash2,
  Pin,
  Eye,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';

const AGENT_ICONS = {
  triage: Layers,
  scheduling: Calendar,
  followup: Clock,
  drafting: FileEdit,
  digest: Newspaper,
  guardian: ShieldCheck,
};

export function ClientAgentsTab({ clientId, clientName = 'Executive' }) {
  const [agents, setAgents] = useState([]);
  const [memoriesMap, setMemoriesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingAgentId, setSavingAgentId] = useState(null);
  const [newMemoryText, setNewMemoryText] = useState({});
  const [dryRunResult, setDryRunResult] = useState(null);
  const [runningDryRunAgentId, setRunningDryRunAgentId] = useState(null);

  useEffect(() => {
    loadAgentData();
  }, [clientId]);

  async function loadAgentData() {
    setLoading(true);
    try {
      const res = await api.get(`/agents?clientId=${clientId}`);
      if (res.ok && res.data) {
        setAgents(res.data);
      }

      // Load memories for each agent
      const agentIds = ['triage', 'scheduling', 'followup', 'drafting', 'digest', 'guardian'];
      const mems = {};
      await Promise.all(
        agentIds.map(async (id) => {
          try {
            const mRes = await api.get(`/agents/${id}/memory?clientId=${clientId}`);
            if (mRes.ok && mRes.data) {
              mems[id] = mRes.data;
            }
          } catch {}
        })
      );
      setMemoriesMap(mems);
    } catch (err) {
      toast.error('Failed to load agents: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateAutonomy(agentId, nextAutonomy) {
    try {
      await api.put(`/agents/${agentId}`, {
        autonomy: nextAutonomy,
        clientId,
      });
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId
            ? { ...a, autonomy: nextAutonomy, enabled: nextAutonomy !== 'off' }
            : a
        )
      );
      toast.success(`Updated ${agentId} autonomy to ${nextAutonomy}`);
    } catch (err) {
      toast.error('Failed to update policy: ' + err.message);
    }
  }

  async function handleSaveInstruction(agentId) {
    setSavingAgentId(agentId);
    try {
      const instructionText = memoriesMap[agentId]?.instruction || '';
      await api.put(`/agents/${agentId}/memory?clientId=${clientId}`, {
        instruction: instructionText,
      });
      toast.success(`Standing instruction saved for ${agentId}`);
    } catch (err) {
      toast.error('Failed to save instruction: ' + err.message);
    } finally {
      setSavingAgentId(null);
    }
  }

  async function handleAddMemory(agentId) {
    const text = newMemoryText[agentId]?.trim();
    if (!text) return;

    try {
      const res = await api.post(`/agents/${agentId}/memories?clientId=${clientId}`, {
        text,
        source: 'manual',
      });
      if (res.ok && res.data) {
        setMemoriesMap((prev) => {
          const current = prev[agentId] || { instruction: '', memories: [] };
          return {
            ...prev,
            [agentId]: {
              ...current,
              memories: [res.data, ...(current.memories || [])],
            },
          };
        });
        setNewMemoryText((prev) => ({ ...prev, [agentId]: '' }));
        toast.success('Agent memory added');
      }
    } catch (err) {
      toast.error('Failed to add memory: ' + err.message);
    }
  }

  async function handleDeleteMemory(agentId, memoryId) {
    try {
      await api.delete(`/agents/${agentId}/memories/${memoryId}?clientId=${clientId}`);
      setMemoriesMap((prev) => {
        const current = prev[agentId] || { instruction: '', memories: [] };
        return {
          ...prev,
          [agentId]: {
            ...current,
            memories: (current.memories || []).filter((m) => m.id !== memoryId),
          },
        };
      });
      toast.success('Memory deleted');
    } catch (err) {
      toast.error('Failed to delete memory: ' + err.message);
    }
  }

  async function handleToggleMemoryPin(agentId, memoryId, currentPin) {
    try {
      await api.patch(`/agents/${agentId}/memories/${memoryId}?clientId=${clientId}`, {
        pinned: !currentPin,
      });
      setMemoriesMap((prev) => {
        const current = prev[agentId] || { instruction: '', memories: [] };
        return {
          ...prev,
          [agentId]: {
            ...current,
            memories: (current.memories || []).map((m) =>
              m.id === memoryId ? { ...m, pinned: !currentPin } : m
            ),
          },
        };
      });
      toast.success(currentPin ? 'Unpinned' : 'Pinned to memory');
    } catch (err) {
      toast.error('Failed to update pin: ' + err.message);
    }
  }

  async function handleToggleMemoryEnabled(agentId, memoryId, currentEnabled) {
    try {
      const nextState = currentEnabled === false ? true : false;
      await api.patch(`/agents/${agentId}/memories/${memoryId}?clientId=${clientId}`, {
        enabled: nextState,
      });
      setMemoriesMap((prev) => {
        const current = prev[agentId] || { instruction: '', memories: [] };
        return {
          ...prev,
          [agentId]: {
            ...current,
            memories: (current.memories || []).map((m) =>
              m.id === memoryId ? { ...m, enabled: nextState } : m
            ),
          },
        };
      });
    } catch (err) {
      toast.error('Failed to toggle memory: ' + err.message);
    }
  }

  async function handleRunDryRun(agentId) {
    setRunningDryRunAgentId(agentId);
    try {
      const res = await api.post(`/agents/${agentId}/dry-run`, {
        clientId,
      });
      if (res.ok && res.data) {
        setDryRunResult(res.data);
      }
    } catch (err) {
      toast.error('Dry-run preview failed: ' + err.message);
    } finally {
      setRunningDryRunAgentId(null);
    }
  }

  if (loading && agents.length === 0) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="h-6 w-48 bg-black/5 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-96 bg-black/5 animate-pulse rounded-2xl" />
          <div className="h-96 bg-black/5 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="border-b border-black/[0.06] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-accent uppercase tracking-wider">
            <Bot className="h-3.5 w-3.5" />
            <span>Agent Memory & Autonomy Controls</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink-900">
              Agents & Workflows for {clientName}
            </h2>
            <AgentVsWorkflowPopover />
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            Configure autonomy, execution limits, and learned memory for this specific executive.
          </p>
        </div>
      </div>

      {/* Grid of Agent Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agents.map((agent) => {
          const Icon = AGENT_ICONS[agent.id] || Bot;
          const memory = memoriesMap[agent.id] || { instruction: '', memories: [] };
          const instruction = memory.instruction || '';
          const memories = memory.memories || [];
          const isSaving = savingAgentId === agent.id;
          const isRunningPreview = runningDryRunAgentId === agent.id;

          return (
            <div
              key={agent.id}
              className="p-5 rounded-2xl bg-white border border-black/[0.08] shadow-card space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Agent Header & Autonomy Switcher */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-ink-50 text-ink-800 flex-shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif font-bold text-base text-ink-900">
                          {agent.name}
                        </h3>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                            agent.id === 'guardian'
                              ? 'bg-violet-50 text-violet-800 border-violet-200'
                              : agent.kind === 'agent'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-ink-100 text-ink-700 border-ink-200'
                          }`}
                        >
                          {agent.id === 'guardian'
                            ? 'Safety Check'
                            : agent.kind === 'agent'
                            ? 'Agent'
                            : 'Workflow'}
                        </span>
                      </div>
                      <p className="text-xs text-ink-500 line-clamp-1">{agent.description}</p>
                    </div>
                  </div>

                  {/* Autonomy Selector: Off / Propose / Auto */}
                  <div className="flex items-center p-0.5 rounded-lg bg-ink-100 text-[11px] font-mono font-semibold">
                    {['off', 'propose', 'auto'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleUpdateAutonomy(agent.id, level)}
                        className={`px-2 py-1 rounded-md capitalize transition cursor-pointer ${
                          agent.autonomy === level
                            ? 'bg-white text-ink-900 shadow-xs font-bold'
                            : 'text-ink-500 hover:text-ink-800'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Execution Limits & Never Sends Guarantee */}
                <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-black/[0.04] space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-ink-600">
                    <span className="font-medium text-ink-400">Step Limit:</span>
                    <span className="font-mono text-ink-800 font-semibold">
                      {agent.limits?.maxSteps ? `${agent.limits.maxSteps} max steps` : '1 step (deterministic)'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2 text-ink-600">
                    <span className="font-medium text-ink-400 flex-shrink-0">Permitted Tools:</span>
                    <span
                      className="font-mono text-right text-ink-700 text-[10px] truncate max-w-[200px]"
                      title={agent.limits?.tools?.join(', ') || 'None (fixed rules)'}
                    >
                      {agent.limits?.tools?.length
                        ? `${agent.limits.tools.length} tools (${agent.limits.tools.slice(0, 2).join(', ')}...)`
                        : 'None (fixed rules)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-black/[0.04]">
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <Check className="h-2.5 w-2.5" /> Never sends email
                    </span>
                    <span className="font-mono text-[10px] text-ink-500 font-semibold">
                      {agent.stats?.total || 0} runs · {agent.stats?.escalated || 0} escalations
                    </span>
                  </div>
                </div>

                {/* 24h Stats Strip */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs py-2 px-3 rounded-xl bg-[#FAF8F5] border border-black/[0.04]">
                  <div>
                    <span className="font-mono font-bold text-ink-900">{agent.stats?.handled || 0}</span>
                    <p className="text-[10px] text-ink-400">Handled</p>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-blue-700">{agent.stats?.proposed || 0}</span>
                    <p className="text-[10px] text-ink-400">Proposed</p>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-amber-700">{agent.stats?.escalated || 0}</span>
                    <p className="text-[10px] text-ink-400">Escalated</p>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-rose-700">{agent.stats?.reversed || 0}</span>
                    <p className="text-[10px] text-ink-400">Reversed</p>
                  </div>
                </div>

                {/* Standing Instruction Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-ink-700">Standing Instruction</label>
                    <span className="font-mono text-[10px] text-ink-400">
                      {instruction.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={instruction}
                    placeholder={
                      agent.id === 'triage'
                        ? 'e.g. VIP investors and legal terms go to Priya. Routine vendors to Maya.'
                        : agent.id === 'drafting'
                        ? 'e.g. Short, direct, no exclamation marks. Sign off as Rohan\'s office.'
                        : 'Custom instructions for this client...'
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setMemoriesMap((prev) => ({
                        ...prev,
                        [agent.id]: { ...(prev[agent.id] || {}), instruction: val },
                      }));
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-accent focus:ring-1 focus:ring-accent outline-none font-sans resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveInstruction(agent.id)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-ink-900 text-white text-[11px] font-semibold hover:bg-ink-800 transition active:scale-95 disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" />
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                </div>

                {/* Memories List */}
                <div className="space-y-2 pt-2 border-t border-black/[0.06]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-700">Learned & Pinned Memories ({memories.length})</span>
                    <span className="text-[10px] text-ink-400">Max 200 chars each</span>
                  </div>

                  {/* Add memory input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={200}
                      value={newMemoryText[agent.id] || ''}
                      onChange={(e) =>
                        setNewMemoryText((prev) => ({ ...prev, [agent.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMemory(agent.id);
                        }
                      }}
                      placeholder="Add a new preference or rule (e.g. never nudge board members)..."
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-black/10 outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddMemory(agent.id)}
                      className="p-1.5 rounded-lg bg-ink-100 hover:bg-ink-200 text-ink-700 transition"
                      title="Add memory"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Existing Memories */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                    {memories.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition ${
                          m.enabled === false
                            ? 'bg-ink-50/50 border-black/5 opacity-60 text-ink-400 line-through'
                            : 'bg-[#FAF8F5] border-black/[0.06] text-ink-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                              m.source === 'learned'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-ink-200 text-ink-700'
                            }`}
                          >
                            {m.source === 'learned' ? 'Learned' : 'You'}
                          </span>
                          <span className="truncate">{m.text}</span>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Pin Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleMemoryPin(agent.id, m.id, m.pinned)}
                            className={`p-1 rounded hover:bg-black/5 ${
                              m.pinned ? 'text-amber-600 font-bold' : 'text-ink-400'
                            }`}
                            title={m.pinned ? 'Pinned' : 'Pin'}
                          >
                            <Pin className="h-3 w-3" />
                          </button>

                          {/* Enable/Disable Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleMemoryEnabled(agent.id, m.id, m.enabled)}
                            className="p-1 rounded hover:bg-black/5 text-ink-400"
                            title={m.enabled === false ? 'Enable memory' : 'Disable memory'}
                          >
                            {m.enabled === false ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(agent.id, m.id)}
                            className="p-1 rounded hover:bg-black/5 text-red-500"
                            title="Delete memory"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dry-run Preview Button */}
              <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between">
                <span className="text-[11px] text-ink-400 font-mono">
                  {agent.stats?.reversed > 0 ? 'Guardian audited' : 'Zero send autonomy'}
                </span>

                <button
                  type="button"
                  disabled={isRunningPreview}
                  onClick={() => handleRunDryRun(agent.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 hover:border-black/25 bg-white text-ink-800 text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  <Eye className="h-3.5 w-3.5 text-accent" />
                  <span>{isRunningPreview ? 'Simulating...' : 'Preview Notes'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dry-Run Comparison Modal */}
      {dryRunResult && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-black/10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono uppercase text-accent font-bold">
                  Simulated Dry-Run Preview
                </span>
                <h3 className="font-serif font-bold text-lg text-ink-900">
                  Sample Thread: "{dryRunResult.thread?.subject}"
                </h3>
              </div>
              <button
                onClick={() => setDryRunResult(null)}
                className="p-1 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-ink-50 text-xs text-ink-600 line-clamp-2">
              <span className="font-bold text-ink-900">Snippet: </span>
              {dryRunResult.thread?.snippet}
            </div>

            {/* Side by side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-black/10 bg-[#FAF8F5] space-y-2 text-xs">
                <div className="font-mono text-[10px] uppercase font-bold text-ink-500">
                  Without Notes (Clean Agent Default)
                </div>
                <div className="font-semibold text-ink-900">
                  Action: <span className="font-mono">{dryRunResult.withoutNotes?.action}</span>
                </div>
                <p className="text-ink-600 leading-relaxed">
                  {dryRunResult.withoutNotes?.summary}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-accent/30 bg-amber-50/30 space-y-2 text-xs">
                <div className="font-mono text-[10px] uppercase font-bold text-accent">
                  With Client Notes Applied
                </div>
                <div className="font-semibold text-ink-900">
                  Action: <span className="font-mono">{dryRunResult.withNotes?.action}</span>
                </div>
                <p className="text-ink-600 leading-relaxed">
                  {dryRunResult.withNotes?.summary}
                </p>
                <div className="pt-2 border-t border-accent/20 text-[11px] text-accent font-mono font-medium">
                  {dryRunResult.withNotes?.notesApplied}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDryRunResult(null)}
                className="px-4 py-2 rounded-xl bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
