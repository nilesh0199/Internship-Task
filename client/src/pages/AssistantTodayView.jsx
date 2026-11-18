import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import Avatar from '../components/Avatar.jsx';
import { LabelBadge } from '../components/LabelBadge.jsx';
import AgentTraceViewer from '../components/AgentTraceViewer.jsx';
import {
  Calendar,
  AlertTriangle,
  Sparkles,
  UserCheck,
  CheckSquare,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Bot,
  AlertCircle,
  FileText,
  ChevronRight,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';

export function AssistantTodayView({ onJumpToThread }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [undoingId, setUndoingId] = useState(null);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const name = user?.name || 'Maya Lin';
    if (currentHour < 12) return `Good morning, ${name}.`;
    if (currentHour < 17) return `Good afternoon, ${name}.`;
    return `Good evening, ${name}.`;
  }, [user, currentHour]);

  useEffect(() => {
    loadToday();
    const interval = setInterval(loadToday, 10000); // 10s auto refresh
    return () => clearInterval(interval);
  }, []);

  async function loadToday() {
    try {
      const res = await api.get('/assistant/today');
      if (res.ok && res.data) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load Today summary: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUndo(runId) {
    setUndoingId(runId);
    try {
      const res = await api.post(`/agents/runs/${runId}/undo`);
      if (res.ok) {
        toast.success(res.message || 'Action reversed');
        loadToday();
      }
    } catch (err) {
      toast.error('Undo failed: ' + err.message);
    } finally {
      setUndoingId(null);
    }
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatAge(dateStr) {
    if (!dateStr) return '';
    const diffHours = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }

  if (loading && !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-black/5 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-black/5 animate-pulse rounded-2xl" />
          <div className="h-44 bg-black/5 animate-pulse rounded-2xl" />
        </div>
        <div className="h-80 bg-black/5 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const clientCards = data?.clientCards || data?.clients || [];
  const needsYouNow = data?.needsYouNow || data?.priorityThreads || [];
  const meetings = data?.meetings || [];
  const overnightRuns = data?.overnightRuns || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* 1. Calm Header & Daily Summary */}
      <div className="space-y-1.5 border-b border-black/[0.06] pb-5">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-accent uppercase tracking-wider">
          <Calendar className="h-3.5 w-3.5" />
          <span>Cross-Client Command Center</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink-900 tracking-tight">
          {greeting}
        </h1>
        <p className="text-sm text-ink-600 font-medium">
          {data?.summarySentence || 'All client operations are synced and running.'}
        </p>
      </div>

      {/* 2. Executive Client Summary Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-ink-500 font-bold">
            Executive Clients Overview ({clientCards.length})
          </h2>
          <span className="text-xs text-ink-500">Click any client to open their full workspace</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clientCards.map((c, idx) => {
            return (
              <div
                key={c._id || c.id || c.clientId || idx}
                onClick={() => navigate(`/assistant/c/${c.clientId || c._id || c.id}/inbox`)}
                className="group p-5 rounded-2xl bg-white border border-black/[0.08] shadow-card hover:shadow-card-hover hover:border-black/20 transition-all cursor-pointer relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} email={c.email} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif font-bold text-base text-ink-900 group-hover:text-accent transition-colors">
                          {c.name}
                        </h3>
                        {c.inviteStatus === 'pending' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                            Invite pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-500">
                        {c.title} · <span className="font-semibold text-ink-700">{c.company}</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-xl bg-ink-50 group-hover:bg-ink-900 group-hover:text-white transition text-ink-600">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-black/[0.06] text-center">
                  <div className="p-2 rounded-xl bg-[#FAF8F5]">
                    <div className="text-lg font-bold font-mono text-amber-900">
                      {c.needsMaya}
                    </div>
                    <div className="text-[10px] text-ink-500 font-medium">Needs Maya</div>
                  </div>

                  <div className="p-2 rounded-xl bg-[#FAF8F5]">
                    <div className="text-lg font-bold font-mono text-ink-800">
                      {c.waitingOnClient}
                    </div>
                    <div className="text-[10px] text-ink-500 font-medium">In Queue</div>
                  </div>

                  <div className="p-2 rounded-xl bg-[#FAF8F5]">
                    <div className="text-lg font-bold font-mono text-emerald-800">
                      {c.handledToday}
                    </div>
                    <div className="text-[10px] text-ink-500 font-medium">Auto-Handled</div>
                  </div>

                  <div className="p-2 rounded-xl bg-[#FAF8F5]">
                    <div className={`text-lg font-bold font-mono ${c.conflicts > 0 ? 'text-red-600' : 'text-ink-800'}`}>
                      {c.meetingsToday}
                    </div>
                    <div className="text-[10px] text-ink-500 font-medium">
                      {c.conflicts > 0 ? 'Conflict!' : 'Meetings'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Today's Cross-Client Meetings Strip with Conflict Badges */}
      {meetings.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-black/[0.08] shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-mono uppercase tracking-wider text-ink-600 font-bold">
              <Calendar className="h-4 w-4 text-accent" />
              <span>Today’s Scheduled Meetings</span>
            </div>
            <span className="text-ink-500 font-mono text-[11px]">{meetings.length} events today</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {meetings.map((m, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (m.threadId && m.clientId) {
                    navigate(`/assistant/c/${m.clientId}/inbox?threadId=${m.threadId}`);
                  }
                }}
                className={`p-3 rounded-xl border text-xs transition cursor-pointer hover:border-black/20 ${
                  m.isConflict
                    ? 'bg-red-50/70 border-red-200 text-red-900'
                    : 'bg-[#FAF8F5] border-black/[0.06] text-ink-800'
                }`}
              >
                <div className="flex items-center justify-between font-mono font-bold mb-1">
                  <span>{m.time || '10:00 AM'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white font-serif border border-black/5 text-ink-700">
                    {m.clientName?.split(' ')[0]}
                  </span>
                </div>
                <div className="font-semibold text-ink-900 truncate">{m.title}</div>
                {m.isConflict && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-red-700 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Scheduling conflict flagged</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Single Prioritized "Needs You Now" Stack */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-600" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-ink-900 font-bold">
              Needs You Now ({needsYouNow.length})
            </h2>
          </div>
          <span className="text-xs text-ink-500 font-medium">
            Prioritized by deadlines, VIP status & risk flags
          </span>
        </div>

        {needsYouNow.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-black/[0.06] text-ink-500 text-sm">
            Inbox Zero for executive action. No urgent items require Maya right now.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-card overflow-hidden divide-y divide-black/[0.06]">
            {needsYouNow.map((t, idx) => (
              <div
                key={t.threadId || t._id || idx}
                onClick={() => {
                  navigate(`/assistant/c/${t.clientId}/inbox?threadId=${t.threadId}`);
                }}
                className="p-4 hover:bg-ink-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
              >
                {/* Left: Client chip + Urgency Reason + Subject */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-ink-900 text-white tracking-tight">
                      {t.clientName}
                    </span>
                    <span className="text-[11px] font-mono text-accent font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{t.urgencyReason}</span>
                    </span>
                    <span className="text-xs text-ink-400 font-mono">
                      · {formatAge(t.lastMessageAt)}
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm text-ink-900 group-hover:text-accent transition-colors truncate">
                    {t.subject}
                  </h4>
                  <p className="text-xs text-ink-500 line-clamp-1 truncate">
                    {t.snippet}
                  </p>

                  {/* Prominent Escalation Finding Box */}
                  {(t.currentLabel === 'NEEDS_REVIEW' ||
                    t.urgencyReason?.toLowerCase().includes('guardian') ||
                    t.urgencyReason?.toLowerCase().includes('review')) && (
                    <div className="mt-3 p-3.5 rounded-xl bg-amber-50/90 border border-amber-300/80 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 font-mono text-[11px]">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-700 flex-shrink-0" />
                        <span>Agent couldn't decide · Handed to Maya for human judgment</span>
                        {t.confidence !== undefined && (
                          <span className="text-[10px] text-amber-800 font-mono font-medium">
                            ({Math.round(t.confidence * 100)}% confidence)
                          </span>
                        )}
                      </div>
                      {t.aiReason?.reason ? (
                        <p className="text-ink-800 text-xs">
                          <span className="font-semibold text-ink-900">Why escalated: </span>
                          {t.aiReason.reason}
                        </p>
                      ) : (
                        <p className="text-ink-800 text-xs">
                          <span className="font-semibold text-ink-900">Findings: </span>
                          Investigation completed with ambiguous confidence or safety trigger (VIP / contract / financial terms). Requires assistant sign-off.
                        </p>
                      )}
                      {t.aiReason?.evidence && (
                        <blockquote className="pl-2.5 border-l-2 border-amber-500 text-ink-700 italic text-[11px] bg-white/70 py-1 px-2.5 rounded-r">
                          "{t.aiReason.evidence}"
                        </blockquote>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Label Badge + Action Button */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <LabelBadge label={t.currentLabel} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/assistant/c/${t.clientId}/inbox?threadId=${t.threadId}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 transition active:scale-95"
                  >
                    <span>Open in {t.clientName?.split(' ')[0]}</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Agents Overnight Activity Feed with 1-Click Undo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-600" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-ink-900 font-bold">
              Autonomous Overnight Feed (Last {overnightRuns.length} Actions)
            </h2>
          </div>
          <button
            onClick={() => navigate('/agents')}
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
          >
            <span>Open Control Room</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.08] shadow-card overflow-hidden divide-y divide-black/[0.05]">
          {overnightRuns.map((run, idx) => (
            <div
              key={run._id || run.id || idx}
              className="p-4 hover:bg-ink-50/50 transition-colors space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 truncate flex-wrap">
                  <span className="font-mono text-[10px] text-ink-400">
                    {formatTime(run.createdAt)}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-ink-100 text-ink-800 font-mono">
                    {run.clientName?.split(' ')[0]}
                  </span>
                  <span className="font-semibold text-ink-900 truncate">
                    {run.summary}
                  </span>
                  {run.kind && (
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                        run.kind === 'agent'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-ink-100 text-ink-600 border-ink-200'
                      }`}
                    >
                      {run.kind === 'agent' ? 'Closed-Loop' : 'Workflow'}
                    </span>
                  )}
                  {run.recordedSample && (
                    <span className="text-[9px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                      Sample
                    </span>
                  )}
                  {run.notesApplied && (
                    <span className="hidden md:inline text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-mono">
                      {run.notesApplied}
                    </span>
                  )}
                </div>

                {/* Undo action button */}
                {run.undo && (
                  <button
                    type="button"
                    disabled={undoingId === run._id}
                    onClick={() => handleUndo(run._id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-black/10 hover:border-black/30 bg-white text-ink-700 text-[11px] font-semibold transition active:scale-95 disabled:opacity-50 flex-shrink-0"
                    title="Reverse this autonomous action"
                  >
                    <RotateCcw className={`h-3 w-3 ${undoingId === run._id ? 'animate-spin' : ''}`} />
                    <span>Undo</span>
                  </button>
                )}
              </div>

              {/* Expandable Agent Trace Viewer if steps exist */}
              {run.steps && run.steps.length > 0 && (
                <div className="pt-1">
                  <AgentTraceViewer
                    run={run}
                    onRerunSuccess={() => loadToday()}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
