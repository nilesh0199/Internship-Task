import React, { useState, useEffect } from 'react';
import { LabelBadge } from './LabelBadge.jsx';
import { ConfidenceDots } from './ConfidenceDots.jsx';
import {
  Sparkles,
  Quote,
  RefreshCw,
  Sliders,
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  BookOpen,
  Bot,
  RotateCcw,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { toast } from 'sonner';

export function AIReasonPanel({ thread, timeline = [], onThreadUpdated, onOpenPlaybook }) {
  const [isOverriding, setIsOverriding] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(thread.currentLabel);
  const [overrideNote, setOverrideNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [showRulePrompt, setShowRulePrompt] = useState(false);
  const [agentRuns, setAgentRuns] = useState([]);
  const [undoingRunId, setUndoingRunId] = useState(null);

  const aiReason = thread.aiReason || {};

  useEffect(() => {
    if (!thread._id) return;
    loadAgentRuns();
  }, [thread._id]);

  async function loadAgentRuns() {
    try {
      const res = await api.get(`/agents/runs?threadId=${thread._id}&limit=15`);
      if (res.ok) setAgentRuns(res.data || []);
    } catch {
      // Background load
    }
  }

  async function handleUndoRun(runId) {
    setUndoingRunId(runId);
    try {
      const res = await api.post(`/agents/runs/${runId}/undo`, {});
      if (res.ok) {
        toast.success('Autonomous action reversed!');
        await loadAgentRuns();
        onThreadUpdated?.();
      }
    } catch (err) {
      toast.error('Undo failed: ' + err.message);
    } finally {
      setUndoingRunId(null);
    }
  }

  async function handleRerun() {
    setRerunning(true);
    try {
      const res = await api.post(`/ai/rerun/${thread._id}`, {});
      if (res.ok) {
        toast.success('Live AI pipeline re-evaluated thread');
        onThreadUpdated?.(res.data.thread);
      }
    } catch (err) {
      toast.error('AI Re-run failed: ' + err.message);
    } finally {
      setRerunning(false);
    }
  }

  async function handleApplyOverride() {
    setSubmitting(true);
    try {
      const res = await api.post(`/threads/${thread._id}/override`, {
        newLabel: selectedLabel,
        note: overrideNote,
      });
      if (res.ok) {
        toast.success(`Overridden to ${selectedLabel.replace(/_/g, ' ')}`);
        setIsOverriding(false);
        setShowRulePrompt(true);
        onThreadUpdated?.(res.data);
      }
    } catch (err) {
      toast.error('Override failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMakeRule() {
    try {
      const res = await api.post('/playbook/add-rule', {
        topic: thread.subject,
        disposition:
          selectedLabel === 'CLIENT_TO_REPLY'
            ? 'ALWAYS_CLIENT'
            : selectedLabel === 'ASSISTANT_TO_REPLY'
            ? 'ASSISTANT_CAN_HANDLE'
            : 'NEVER_BOTHER_CLIENT',
        description: `Rule learned from override: ${overrideNote || thread.subject}`,
      });
      if (res.ok) {
        toast.success('Rule appended to Priya\'s Playbook!');
        setShowRulePrompt(false);
      }
    } catch (err) {
      toast.error('Failed to add rule: ' + err.message);
    }
  }

  return (
    <div className="bg-[#FAF8F5]/60 border-l border-borderMuted/70 h-full overflow-y-auto app-pane-scroll p-4 space-y-4 text-ink-900 select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-borderMuted/60">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-accent/10 text-accent flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-700">
            Decision Model
          </span>
        </div>

        <button
          onClick={handleRerun}
          disabled={rerunning}
          className="text-xs font-medium text-ink-600 hover:text-ink-900 bg-white hover:bg-ink-100 border border-black/[0.05] px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          title="Re-run live AI pipeline on this thread"
        >
          <RefreshCw className={`h-3 w-3 ${rerunning ? 'animate-spin text-accent' : ''}`} />
          <span>{rerunning ? 'Analyzing...' : 'Re-run AI'}</span>
        </button>
      </div>

      {/* Primary Classification Card */}
      <div className="p-4 rounded-2xl bg-white border border-black/[0.05] shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <LabelBadge label={thread.currentLabel} size="lg" />
          <ConfidenceDots confidence={thread.confidence} showText />
        </div>

        {/* Engine Metadata Chip */}
        <div className="flex items-center gap-2 text-[10px] text-ink-400 font-mono">
          <span>Engine: {aiReason.model || 'Gemini 2.0 Flash'}</span>
          {aiReason.latencyMs > 0 && <span>• {aiReason.latencyMs}ms</span>}
        </div>

        {/* Crisp Executive Takeaway */}
        <p className="text-xs text-ink-800 font-medium leading-relaxed bg-ink-50/60 p-3 rounded-xl border border-black/[0.03]">
          {aiReason.summary || thread.snippet}
        </p>
      </div>

      {/* Quoted Evidence Highlight */}
      {aiReason.evidence && (
        <div className="p-4 rounded-2xl bg-[#FFFBF0] border border-amber-200/60 shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
            <Quote className="h-3.5 w-3.5 text-amber-600" />
            <span>Quoted Evidence</span>
          </div>
          <p className="text-xs italic text-amber-950 font-serif leading-relaxed">
            "{aiReason.evidence}"
          </p>
        </div>
      )}

      {/* Decision Reasoning */}
      <div className="p-4 rounded-2xl bg-white border border-black/[0.05] shadow-card space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400 block">
          Why this was assigned
        </span>
        <p className="text-xs text-ink-700 leading-relaxed">
          {aiReason.reason || 'Assigned based on sender authority and client delegation profile.'}
        </p>
      </div>

      {/* Structured Decision Preview (if Client to Reply) */}
      {aiReason.decision && (
        <div className="p-4 rounded-2xl bg-[#FDF7F3] border border-label-client/20 shadow-xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-label-client block">
            Executive Decision Question
          </span>
          <div className="text-xs font-serif font-bold text-ink-900 leading-snug">
            {aiReason.decision.question}
          </div>
          {aiReason.decision.deadline && (
            <div className="text-[11px] text-label-client font-semibold">
              Due: {aiReason.decision.deadline}
            </div>
          )}
          {aiReason.decision.consequence && (
            <div className="text-[11px] text-ink-600">
              Risk: {aiReason.decision.consequence}
            </div>
          )}
        </div>
      )}

      {/* Rule Synthesis Offer Prompt (Active upon override) */}
      {showRulePrompt && (
        <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 shadow-xs space-y-2.5 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Learned from your correction</span>
          </div>
          <p className="text-[11px] text-emerald-900 leading-relaxed">
            Would you like to append this rule to Priya's Playbook so AI remembers for future threads?
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleMakeRule}
              className="px-3.5 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium cursor-pointer shadow-xs transition"
            >
              Make this a rule
            </button>
            <button
              onClick={() => setShowRulePrompt(false)}
              className="px-2.5 py-1 text-xs text-ink-500 hover:text-ink-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Manual Override Accordion */}
      <div className="pt-2">
        {!isOverriding ? (
          <button
            onClick={() => setIsOverriding(true)}
            className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-ink-100/70 border border-black/[0.06] shadow-soft text-xs font-semibold text-ink-700 hover:text-ink-900 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Sliders className="h-3.5 w-3.5 text-ink-500" />
            <span>Manual Label Override</span>
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-card space-y-3">
            <span className="text-xs font-semibold text-ink-900 block">
              Override Label Assignment
            </span>

            <select
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-ink-50/70 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="ASSISTANT_TO_REPLY">Assistant to Reply</option>
              <option value="CLIENT_TO_REPLY">Client to Reply</option>
              <option value="NO_REPLY_NEEDED">No Reply Needed (Quiet Folder)</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
            </select>

            <input
              type="text"
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              placeholder="Reason / assistant note (optional)"
              className="w-full px-3 py-2 text-xs bg-ink-50/70 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20"
            />

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleApplyOverride}
                disabled={submitting}
                className="px-4 py-1.5 rounded-full bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 cursor-pointer shadow-xs transition"
              >
                {submitting ? 'Saving...' : 'Apply Override'}
              </button>
              <button
                onClick={() => setIsOverriding(false)}
                className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Handled by Agents & Audit Timeline */}
      <div className="pt-3 border-t border-borderMuted/60 space-y-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            <span>Handled by Agents & Timeline</span>
          </span>
          <span className="text-[10px] font-mono text-ink-500">
            {timeline.length + agentRuns.length} steps
          </span>
        </span>

        <div className="space-y-3 pl-2.5 border-l-2 border-borderMuted/80">
          {[
            ...agentRuns.map((r) => ({
              id: r._id,
              type: 'agent_run',
              date: new Date(r.createdAt),
              agentId: r.agentId,
              outcome: r.outcome,
              action: r.action,
              summary: r.summary,
              canUndo: r.undo && !r.undoneAt,
              isUndone: !!r.undoneAt,
            })),
            ...timeline.map((evt) => ({
              id: evt._id,
              type: 'event',
              date: new Date(evt.createdAt),
              actorName: evt.actorName || 'Daybook AI',
              newLabel: evt.newLabel,
              summary: evt.reason,
            })),
          ]
            .sort((a, b) => b.date - a.date)
            .map((item) => {
              if (item.type === 'agent_run') {
                return (
                  <div key={item.id} className="relative pl-3 text-xs space-y-1">
                    <div className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-accent ring-4 ring-[#FAF8F5]" />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-semibold text-ink-900">
                        <Bot className="h-3 w-3 text-accent" />
                        <span className="capitalize">{item.agentId} Agent</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-normal uppercase bg-ink-100 text-ink-600">
                          {item.outcome.replace('_', ' ')}
                        </span>
                      </div>
                      {item.canUndo && (
                        <button
                          type="button"
                          onClick={() => handleUndoRun(item.id)}
                          disabled={undoingRunId === item.id}
                          className="px-2 py-0.5 rounded-full border border-black/[0.08] text-[10px] font-semibold text-ink-700 hover:bg-ink-100 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          title="Undo this action"
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          <span>Undo</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-600 leading-normal">{item.summary}</p>
                    <span className="text-[10px] text-ink-400 block font-mono">
                      {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              }

              return (
                <div key={item.id} className="relative pl-3 text-xs space-y-0.5">
                  <div className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-ink-400 ring-4 ring-[#FAF8F5]" />
                  <div className="flex items-center gap-1 font-semibold text-ink-900">
                    <span className="capitalize">{item.actorName}</span>
                    <span className="text-ink-400 font-normal">assigned</span>
                    <LabelBadge label={item.newLabel} size="xs" />
                  </div>
                  <p className="text-[11px] text-ink-500 leading-normal">{item.summary}</p>
                  <span className="text-[10px] text-ink-400 block font-mono">
                    {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
