import React, { useState } from 'react';
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

  const aiReason = thread.aiReason || {};

  async function handleRerun() {
    setRerunning(true);
    try {
      const res = await api.post(`/ai/rerun/${thread._id}`, {});
      if (res.ok) {
        toast.success('Live AI pipeline completed');
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
        toast.success('Rule appended to Client Playbook!');
        setShowRulePrompt(false);
      }
    } catch (err) {
      toast.error('Failed to add rule: ' + err.message);
    }
  }

  return (
    <div className="bg-white border-l border-borderMuted h-full overflow-y-auto p-4 space-y-5 text-ink-900">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-borderMuted">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-700">
          <Sparkles className="h-4 w-4 text-accent" />
          <span>AI Decision Inspector</span>
        </div>

        <button
          onClick={handleRerun}
          disabled={rerunning}
          className="text-xs text-ink-500 hover:text-ink-900 flex items-center gap-1 cursor-pointer transition"
          title="Re-run live AI pipeline"
        >
          <RefreshCw className={`h-3 w-3 ${rerunning ? 'animate-spin' : ''}`} />
          <span>{rerunning ? 'Analyzing...' : 'Re-run AI'}</span>
        </button>
      </div>

      {/* Primary Classification Card */}
      <div className="p-4 rounded-xl bg-ink-100/50 border border-borderMuted space-y-3">
        <div className="flex items-center justify-between">
          <LabelBadge label={thread.currentLabel} size="lg" />
          <ConfidenceDots confidence={thread.confidence} showText />
        </div>

        {/* Model & Latency badge */}
        <div className="flex items-center gap-2 text-[10px] text-ink-500 font-mono">
          <span>Engine: {aiReason.model || 'Gemini 2.0 Flash'}</span>
          {aiReason.latencyMs > 0 && <span>• {aiReason.latencyMs}ms</span>}
        </div>

        {/* Crisp Summary */}
        <p className="text-xs text-ink-700 font-medium leading-relaxed">
          {aiReason.summary || thread.snippet}
        </p>
      </div>

      {/* Quoted Evidence Highlight */}
      {aiReason.evidence && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 flex items-center gap-1">
            <Quote className="h-3 w-3 text-amber-600" />
            <span>Quoted Evidence Quote</span>
          </span>
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs italic text-amber-900 leading-normal">
            "{aiReason.evidence}"
          </div>
        </div>
      )}

      {/* Decision Reasoning */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Why this was assigned
        </span>
        <p className="text-xs text-ink-700 leading-relaxed bg-white p-3 rounded-lg border border-borderMuted">
          {aiReason.reason || 'Assigned based on sender metadata and client delegation profile.'}
        </p>
      </div>

      {/* Structured Decision Preview (if Client to Reply) */}
      {aiReason.decision && (
        <div className="space-y-2 p-3.5 rounded-xl bg-label-clientBg/60 border border-label-client/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-label-client block">
            Executive Decision Question
          </span>
          <div className="text-xs font-serif font-bold text-ink-900">
            {aiReason.decision.question}
          </div>
          {aiReason.decision.deadline && (
            <div className="text-[11px] text-label-client font-medium">
              Deadline: {aiReason.decision.deadline}
            </div>
          )}
          {aiReason.decision.consequence && (
            <div className="text-[11px] text-ink-600">
              Risk: {aiReason.decision.consequence}
            </div>
          )}
        </div>
      )}

      {/* Rule Synthesis Offer Prompt */}
      {showRulePrompt && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Learned from your correction</span>
          </div>
          <p className="text-[11px] text-emerald-800">
            Would you like to make this a permanent rule in Priya's Playbook so AI remembers next time?
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleMakeRule}
              className="px-3 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium cursor-pointer"
            >
              Make this a rule
            </button>
            <button
              onClick={() => setShowRulePrompt(false)}
              className="px-2 py-1 text-xs text-ink-500 hover:text-ink-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Manual Override Accordion */}
      <div className="pt-2 border-t border-borderMuted space-y-3">
        {!isOverriding ? (
          <button
            onClick={() => setIsOverriding(true)}
            className="w-full py-2 px-3 rounded-lg border border-borderMuted text-xs font-medium text-ink-700 hover:bg-ink-100 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Manual Label Override</span>
          </button>
        ) : (
          <div className="p-3.5 rounded-xl border border-borderMuted bg-ink-100/40 space-y-3">
            <span className="text-xs font-semibold text-ink-900 block">Override Label Assignment</span>

            <select
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-borderMuted rounded-lg"
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
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-borderMuted rounded-lg"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyOverride}
                disabled={submitting}
                className="px-3 py-1.5 rounded-md bg-ink-900 text-white text-xs font-medium hover:bg-ink-900/90 cursor-pointer"
              >
                {submitting ? 'Saving...' : 'Apply Override'}
              </button>
              <button
                onClick={() => setIsOverriding(false)}
                className="px-2.5 py-1.5 text-xs text-ink-500 hover:text-ink-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reclassification Timeline */}
      <div className="pt-3 border-t border-borderMuted space-y-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          <span>Reclassification Timeline ({timeline.length})</span>
        </span>

        <div className="space-y-3 pl-2 border-l border-borderMuted">
          {timeline.map((evt) => (
            <div key={evt._id} className="relative pl-3 text-xs space-y-0.5">
              <div className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-ink-400 ring-2 ring-white" />
              <div className="flex items-center gap-1 font-semibold text-ink-900">
                <span className="capitalize">{evt.actorName || 'ReplyRight AI'}</span>
                <span className="text-ink-400 font-normal">changed to</span>
                <LabelBadge label={evt.newLabel} size="xs" />
              </div>
              <p className="text-[11px] text-ink-500 leading-normal">{evt.reason}</p>
              <span className="text-[10px] text-ink-400 block">
                {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
