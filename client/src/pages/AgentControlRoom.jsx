import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  FileEdit,
  Newspaper,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  Play,
  Sliders,
  Filter,
  Check,
  X,
  Layers,
  ArrowLeft,
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

const AGENT_COLORS = {
  triage: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  scheduling: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  followup: 'bg-amber-50 text-amber-700 border-amber-200',
  drafting: 'bg-blue-50 text-blue-700 border-blue-200',
  digest: 'bg-rose-50 text-rose-700 border-rose-200',
  guardian: 'bg-violet-50 text-violet-700 border-violet-200',
};

const OUTCOME_STYLES = {
  auto_handled: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  proposed: 'bg-blue-50 text-blue-700 border-blue-200/80',
  escalated: 'bg-amber-50 text-amber-800 border-amber-200/80',
  reversed: 'bg-rose-50 text-rose-700 border-rose-200/80 font-bold',
  skipped: 'bg-ink-100/70 text-ink-500 border-ink-200/60',
  error: 'bg-red-50 text-red-700 border-red-200/80',
};

export function AgentControlRoom() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningAgents, setRunningAgents] = useState(false);
  const [undoingRunId, setUndoingRunId] = useState(null);
  const [agentFilter, setAgentFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  useEffect(() => {
    loadData();
    // 5-second polling for live activity feed
    const interval = setInterval(loadLiveFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [agentsRes, summaryRes, runsRes] = await Promise.all([
        api.get('/agents'),
        api.get('/agents/summary'),
        api.get('/agents/runs?limit=40'),
      ]);

      if (agentsRes.ok) setAgents(agentsRes.data || []);
      if (summaryRes.ok) setSummary(summaryRes.data || null);
      if (runsRes.ok) setRuns(runsRes.data || []);
    } catch (err) {
      toast.error('Failed to load Agent Control Room: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadLiveFeed() {
    try {
      const runsRes = await api.get('/agents/runs?limit=40');
      if (runsRes.ok) setRuns(runsRes.data || []);
      const summaryRes = await api.get('/agents/summary');
      if (summaryRes.ok) setSummary(summaryRes.data || null);
    } catch {
      // Background poll silently fails
    }
  }

  async function handleTogglePolicy(agentId, updates) {
    try {
      const res = await api.put(`/agents/${agentId}`, updates);
      if (res.ok) {
        toast.success(`Updated ${agentId} autonomy policy`);
        // Optimistic UI update
        setAgents((prev) =>
          prev.map((a) => (a.id === agentId ? { ...a, ...res.data } : a))
        );
      }
    } catch (err) {
      toast.error('Failed to update agent policy: ' + err.message);
    }
  }

  async function handleRunAgentsNow() {
    if (runningAgents) return;
    setRunningAgents(true);
    try {
      const res = await api.post('/agents/run', {});
      if (res.ok) {
        toast.success(
          `Executed autonomous agents! Processed ${res.data?.threadsProcessed || 0} threads.`
        );
        loadData();
      }
    } catch (err) {
      toast.error('Agent execution failed: ' + err.message);
    } finally {
      setRunningAgents(false);
    }
  }

  async function handleUndo(runId) {
    setUndoingRunId(runId);
    try {
      const res = await api.post(`/agents/runs/${runId}/undo`, {});
      if (res.ok) {
        toast.success('Action successfully reversed!', {
          description: 'Restored previous thread state and updated audit log.',
        });
        loadData();
      }
    } catch (err) {
      toast.error('Undo failed: ' + err.message);
    } finally {
      setUndoingRunId(null);
    }
  }

  const filteredRuns = runs.filter((r) => {
    if (agentFilter !== 'all' && r.agentId !== agentFilter) return false;
    if (outcomeFilter !== 'all' && r.outcome !== outcomeFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-ink-900 pb-20 font-sans select-none">
      {/* Top Header Bar */}
      <header className="h-16 bg-white/85 backdrop-blur-md border-b border-borderMuted/70 px-6 md:px-10 flex items-center justify-between sticky top-0 z-30 select-none">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 group hover:opacity-85 transition cursor-pointer"
            title="Daybook Mail — Return to home"
          >
            <div className="h-8 w-8 rounded-xl bg-ink-900 text-white flex items-center justify-center font-serif font-bold text-sm shadow-soft group-hover:scale-105 transition-transform">
              D
            </div>
            <span className="font-serif font-bold text-base text-ink-900 tracking-tight hidden sm:inline group-hover:text-ink-700 transition-colors">
              Daybook Mail
            </span>
          </Link>
          <div className="h-4 w-px bg-borderMuted hidden sm:block" />
          <Link
            to="/assistant"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600 hover:text-ink-900 hover:bg-black/[0.04] px-3 py-1.5 rounded-full transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Assistant Workspace</span>
          </Link>
          <div className="h-4 w-px bg-borderMuted hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-base text-ink-900 tracking-tight">
              Agent Control Room
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              6 Autonomous Agents
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAgentsNow}
            disabled={runningAgents}
            className="px-4 py-2 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-2 shadow-soft transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Play className={`h-3.5 w-3.5 fill-white ${runningAgents ? 'animate-spin' : ''}`} />
            <span>{runningAgents ? 'Running agents...' : 'Run agents now'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* ================================================================= */}
        {/* 1. Funnel / Summary Strip                                         */}
        {/* ================================================================= */}
        {summary && (
          <div className="p-6 md:p-8 rounded-3xl bg-white border border-black/[0.06] shadow-card space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-accent uppercase tracking-wider block mb-1">
                  Daily Inbox Funnel
                </span>
                <h2 className="text-xl md:text-2xl font-serif font-bold text-ink-900 tracking-tight">
                  <span className="text-ink-900">{summary.totalEmailsIn} emails in</span>
                  <span className="text-ink-400"> · </span>
                  <span className="text-emerald-700">{summary.handledByAgents} handled by agents</span>
                  <span className="text-ink-400"> · </span>
                  <span className="text-label-assistant">{summary.needMaya} need Maya</span>
                  <span className="text-ink-400"> · </span>
                  <span className="text-label-client">{summary.needPriya} need Priya</span>
                </h2>
              </div>

              {/* Hours Saved Formula Chip */}
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/[0.05] text-right self-start md:self-auto">
                <div className="text-xs font-serif font-bold text-ink-900">
                  ~{summary.hoursSavedEstimate} hrs saved today
                </div>
                <div className="text-[10px] text-ink-400 tracking-tight">
                  Estimated: 40s per auto-handled routine email
                </div>
              </div>
            </div>

            {/* Segmented Horizontal Progress Bar */}
            <div className="space-y-2">
              <div className="h-3 w-full bg-ink-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{
                    width: `${summary.totalEmailsIn ? (summary.handledByAgents / summary.totalEmailsIn) * 100 : 0}%`,
                  }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title={`Handled by Agents: ${summary.handledByAgents}`}
                />
                <div
                  style={{
                    width: `${summary.totalEmailsIn ? (summary.needMaya / summary.totalEmailsIn) * 100 : 0}%`,
                  }}
                  className="bg-label-assistant h-full transition-all duration-500"
                  title={`Need Maya (Assistant): ${summary.needMaya}`}
                />
                <div
                  style={{
                    width: `${summary.totalEmailsIn ? (summary.needPriya / summary.totalEmailsIn) * 100 : 0}%`,
                  }}
                  className="bg-label-client h-full transition-all duration-500"
                  title={`Need Priya (Founder): ${summary.needPriya}`}
                />
              </div>

              {/* Clickable Filter Chips under Bar */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                <button
                  onClick={() => {
                    setOutcomeFilter('auto_handled');
                    setAgentFilter('all');
                  }}
                  className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-ink-600 font-medium">Handled by Agents</span>
                  <span className="font-bold text-ink-900 font-mono">({summary.handledByAgents})</span>
                </button>
                <button
                  onClick={() => navigate('/assistant?segment=assistant')}
                  className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-label-assistant" />
                  <span className="text-ink-600 font-medium">Maya Queue</span>
                  <span className="font-bold text-ink-900 font-mono">({summary.needMaya})</span>
                </button>
                <button
                  onClick={() => navigate('/assistant?segment=client')}
                  className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-label-client" />
                  <span className="text-ink-600 font-medium">Priya Queue</span>
                  <span className="font-bold text-ink-900 font-mono">({summary.needPriya})</span>
                </button>
                <button
                  onClick={() => navigate('/assistant?segment=proposals')}
                  className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer ml-auto"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-ink-600 font-medium">Proposals Pending Review</span>
                  <span className="font-bold text-ink-900 font-mono">({summary.proposalsPending || 0})</span>
                </button>
              </div>
            </div>

            {/* Quiet Folder Safety Proof Bar */}
            {summary.quietFolderAudit && (
              <div className="pt-3 border-t border-black/[0.05] flex items-center justify-between text-xs text-ink-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>
                    <strong>Quiet Folder Safety Proof:</strong>{' '}
                    {summary.quietFolderAudit.auditLine}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-ink-400">
                  {summary.reversalsToday} reversals today
                </span>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. Specialized Agent Cards (6 Total)                             */}
        {/* ================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-ink-900">
                Specialized Agents
              </h3>
              <p className="text-xs text-ink-500">
                Independent autonomous modules. Configure per-client autonomy (Off / Propose / Auto).
              </p>
            </div>
            <span className="text-xs text-ink-500 font-medium">
              Autonomy Guardrail: No agent transmits email without human action
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((agent) => {
              const Icon = AGENT_ICONS[agent.id] || Bot;
              const colorCls = AGENT_COLORS[agent.id] || 'bg-ink-100 text-ink-700';
              const isFiltered = agentFilter === agent.id;

              return (
                <div
                  key={agent.id}
                  className={`bg-white border rounded-3xl p-6 shadow-card space-y-4 flex flex-col justify-between transition-all duration-200 ${
                    isFiltered
                      ? 'border-accent ring-2 ring-accent/30 shadow-md'
                      : 'border-black/[0.06] hover:border-black/15'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Icon, Name (Click to filter feed), and Enable Toggle */}
                    <div className="flex items-start justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const next = isFiltered ? 'all' : agent.id;
                          setAgentFilter(next);
                          toast.info(
                            next === 'all'
                              ? 'Showing all agent activity'
                              : `Filtered activity feed to ${agent.name}`
                          );
                          document.getElementById('activity-feed')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex items-center gap-2.5 text-left group cursor-pointer"
                        title={`Click to filter live activity feed to ${agent.name}`}
                      >
                        <div
                          className={`h-9 w-9 rounded-2xl flex items-center justify-center border ${colorCls} group-hover:scale-105 transition-transform`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-serif font-bold text-ink-900 tracking-tight group-hover:text-accent transition-colors">
                              {agent.name}
                            </h4>
                            {isFiltered && (
                              <span className="text-[10px] bg-accent/10 text-accent font-semibold px-1.5 py-0.2 rounded-full font-mono">
                                active filter
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-ink-400 block font-mono group-hover:text-ink-600 transition-colors">
                            id: {agent.id} · click to filter feed
                          </span>
                        </div>
                      </button>

                      {/* Enable Switch */}
                      <button
                        type="button"
                        onClick={() =>
                          handleTogglePolicy(agent.id, { enabled: !agent.enabled })
                        }
                        className={`h-6 w-11 rounded-full p-0.5 transition-colors cursor-pointer ${
                          agent.enabled ? 'bg-ink-900' : 'bg-ink-200'
                        }`}
                        title={agent.enabled ? 'Disable agent' : 'Enable agent'}
                      >
                        <div
                          className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                            agent.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* One-Line Description */}
                    <p className="text-xs text-ink-600 leading-relaxed min-h-[36px]">
                      {agent.description}
                    </p>

                    {/* Autonomy Level Segmented Control */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-ink-400">
                        Autonomy Level
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-ink-100/70 p-1 rounded-xl">
                        {['off', 'propose', 'auto'].map((level) => {
                          const isActive = agent.autonomy === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() =>
                                handleTogglePolicy(agent.id, { autonomy: level })
                              }
                              className={`py-1 text-[11px] font-semibold rounded-lg capitalize transition cursor-pointer ${
                                isActive
                                  ? 'bg-white text-ink-900 shadow-xs'
                                  : 'text-ink-500 hover:text-ink-800'
                              }`}
                            >
                              {level}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 24h Stats Line */}
                    <div className="pt-2 border-t border-borderMuted/60 flex items-center justify-between text-[11px]">
                      <span className="text-ink-500">24h Activity:</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-emerald-700 font-bold" title="Handled">
                          {agent.stats?.handled || 0}h
                        </span>
                        <span className="text-blue-700 font-bold" title="Proposed">
                          {agent.stats?.proposed || 0}p
                        </span>
                        <span className="text-amber-700 font-bold" title="Escalated">
                          {agent.stats?.escalated || 0}e
                        </span>
                        {agent.id === 'guardian' && (
                          <span className="text-rose-700 font-bold" title="Reversed by Guardian">
                            {agent.stats?.reversed || 0} reversed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Can Do / Never Does Chips Drawer */}
                  <div className="pt-3 border-t border-borderMuted/60 space-y-1.5 text-[11px]">
                    <div className="text-ink-700">
                      <span className="font-semibold text-emerald-800">Can: </span>
                      {agent.canDo?.[0]}
                    </div>
                    <div className="text-ink-500">
                      <span className="font-semibold text-rose-800">Never: </span>
                      {agent.neverDoes?.[0]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. Live Activity Feed                                            */}
        {/* ================================================================= */}
        <div id="activity-feed" className="bg-white border border-black/[0.06] rounded-3xl p-6 md:p-8 shadow-card space-y-5 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderMuted/60">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-serif font-bold text-ink-900">
                  Live Agent Activity Feed
                </h3>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-ink-500">
                Auditable stream of autonomous actions, drafts, and guardrail validations (updates live every 5s).
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-ink-500">
                <Filter className="h-3.5 w-3.5" />
                <span>Filter:</span>
              </div>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-xl bg-ink-50 border border-borderMuted font-medium text-ink-700"
              >
                <option value="all">All Agents</option>
                <option value="triage">Triage</option>
                <option value="scheduling">Scheduling</option>
                <option value="followup">Follow-up</option>
                <option value="drafting">Drafting</option>
                <option value="digest">Digest</option>
                <option value="guardian">Guardian</option>
              </select>

              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-xl bg-ink-50 border border-borderMuted font-medium text-ink-700"
              >
                <option value="all">All Outcomes</option>
                <option value="auto_handled">Auto Handled</option>
                <option value="proposed">Proposed</option>
                <option value="escalated">Escalated</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
          </div>

          {/* Feed List */}
          {filteredRuns.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Bot className="h-8 w-8 text-ink-300 mx-auto" />
              <div className="text-sm font-serif font-bold text-ink-700">
                Agents have nothing to do right now
              </div>
              <p className="text-xs text-ink-400 max-w-sm mx-auto">
                No active actions match the current filter. Incoming messages or manual runs will stream here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRuns.map((run) => {
                const Icon = AGENT_ICONS[run.agentId] || Bot;
                const outcomeCls = OUTCOME_STYLES[run.outcome] || OUTCOME_STYLES.skipped;
                const isUndone = !!run.undoneAt;
                const canUndo = run.undo && !isUndone;

                return (
                  <div
                    key={run._id}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      run.outcome === 'reversed'
                        ? 'bg-rose-50/50 border-rose-200/80 shadow-xs'
                        : isUndone
                        ? 'bg-ink-50/50 border-borderMuted/60 opacity-60'
                        : 'bg-white hover:bg-ink-50/50 border-black/[0.05] shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-ink-100 flex items-center justify-center flex-shrink-0 text-ink-700">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-serif font-bold text-ink-900 capitalize">
                            {run.agentId} Agent
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize tracking-wider ${outcomeCls}`}
                          >
                            {run.outcome.replace('_', ' ')}
                          </span>
                          {run.trigger && (
                            <span className="text-[10px] font-mono text-ink-400">
                              via {run.trigger}
                            </span>
                          )}
                          {isUndone && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink-200 text-ink-700">
                              Undone
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-ink-700 leading-normal">
                          {run.summary}
                        </p>
                      </div>
                    </div>

                    {/* Right side: Thread link, Time, Undo button */}
                    <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                      {run.threadId && (
                        <button
                          onClick={() => navigate(`/assistant?threadId=${run.threadId}`)}
                          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open thread</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}

                      <span className="text-[11px] font-mono text-ink-400">
                        {new Date(run.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {canUndo && (
                        <button
                          type="button"
                          onClick={() => handleUndo(run._id)}
                          disabled={undoingRunId === run._id}
                          className="px-2.5 py-1 rounded-full border border-black/[0.08] hover:bg-ink-100 text-xs font-semibold text-ink-700 flex items-center gap-1 transition active:scale-95 cursor-pointer disabled:opacity-50"
                          title="Reverse this autonomous action"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Undo</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
