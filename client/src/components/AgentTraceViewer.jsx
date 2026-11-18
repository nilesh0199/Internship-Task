import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Terminal,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { toast } from 'sonner';

/**
 * Formats tool arguments into a clean, human-readable one-liner
 */
function formatToolArgs(tool, args = {}) {
  if (!args || Object.keys(args).length === 0) return '';
  const entries = Object.entries(args);
  if (entries.length === 1) {
    const [k, v] = entries[0];
    const valStr = typeof v === 'string' ? `"${v}"` : JSON.stringify(v);
    return `${k}: ${valStr}`;
  }
  return entries.map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`).join(', ');
}

/**
 * Maps stopReason to clear human-readable badge
 */
function getStopReasonBadge(reason) {
  switch (reason) {
    case 'goal_reached':
      return { text: 'Goal Reached', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'max_steps_reached':
      return { text: 'Step Limit Reached', style: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'timeout':
      return { text: 'Timeout Exceeded', style: 'bg-red-50 text-red-800 border-red-200' };
    case 'loop_detected':
      return { text: 'Loop Detected', style: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'invalid_output':
      return { text: 'Invalid Schema Output', style: 'bg-red-50 text-red-800 border-red-200' };
    case 'daily_cap_exceeded':
      return { text: 'Daily Cap Reached', style: 'bg-amber-50 text-amber-800 border-amber-200' };
    default:
      return { text: reason ? reason.replace(/_/g, ' ') : 'Concluded', style: 'bg-ink-100 text-ink-700 border-ink-200' };
  }
}

export function AgentTraceViewer({
  run,
  onRerunSuccess,
  compact = false,
  initiallyExpanded = false,
}) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [isRerunning, setIsRerunning] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  if (!run) return null;

  const steps = run.steps || [];
  const hasSteps = steps.length > 0;
  const isRecordedSample = Boolean(run.recordedSample);
  const isLive = !isRecordedSample && !run.fallbackUsed;
  const isFallback = Boolean(run.fallbackUsed);
  const toolCallsCount = steps.filter((s) => s.action === 'tool' || s.tool).length;
  const stopBadge = getStopReasonBadge(run.stopReason);

  async function handleRerunLive(e) {
    e?.stopPropagation();
    if (!run.threadId) {
      toast.error('No thread ID associated with this run');
      return;
    }
    setIsRerunning(true);
    try {
      const res = await api.post(`/agents/threads/${run.threadId}/rerun-live`);
      if (res.ok) {
        toast.success(`Live closed-loop agents re-executed successfully`);
        onRerunSuccess?.(res.data);
      } else {
        toast.error(res.error?.message || 'Failed to re-run live agents');
      }
    } catch (err) {
      toast.error('Live execution failed: ' + err.message);
    } finally {
      setIsRerunning(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/[0.08] bg-[#FAF8F5] overflow-hidden text-xs transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-2.5 sm:p-3 bg-white hover:bg-ink-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="p-1 rounded-md hover:bg-ink-100 text-ink-600 transition"
            aria-label={isExpanded ? 'Collapse trace' : 'Expand trace'}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-accent" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-ink-400" />
            )}
          </button>

          <span className="font-serif font-bold text-ink-900 tracking-tight">
            Agent Trace
          </span>

          {/* Sample vs Live Tag */}
          {isRecordedSample ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-50 text-purple-800 border border-purple-200">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              Recorded sample
            </span>
          ) : isFallback ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              ran as workflow (AI unavailable)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}

          {/* Stop Reason Badge */}
          {run.stopReason && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border capitalize ${stopBadge.style}`}
            >
              {stopBadge.text}
            </span>
          )}
        </div>

        {/* Right side: Usage Line & Re-run Live button */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
          {/* Tiny Usage Line */}
          <span className="text-[10px] font-mono text-ink-400">
            {steps.length} {steps.length === 1 ? 'step' : 'steps'} · {toolCallsCount} tools ·{' '}
            {run.durationMs || 0}ms
          </span>

          {/* Assistant-Only Re-run Live Button */}
          {run.threadId && (
            <button
              type="button"
              onClick={handleRerunLive}
              disabled={isRerunning}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-ink-100 border border-black/15 text-[11px] font-semibold text-accent transition shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Re-run live closed-loop agents on this thread"
            >
              <RefreshCw className={`h-3 w-3 ${isRerunning ? 'animate-spin' : ''}`} />
              <span>{isRerunning ? 'Running live...' : 'Re-run live'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Step Trace Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="p-3 sm:p-4 border-t border-black/[0.06] space-y-3 font-mono text-[11px]"
          >
            {/* Header info */}
            <div className="flex items-center justify-between text-[10px] text-ink-400 uppercase tracking-wider pb-1 border-b border-black/[0.04]">
              <span>Closed-Loop Reason → Act → Observe Execution Trace</span>
              <span>{run.agentId?.replace('_', ' ')} Agent</span>
            </div>

            {/* If no steps recorded (e.g. pure deterministic fallback) */}
            {!hasSteps ? (
              <div className="p-3 rounded-lg bg-white border border-black/[0.05] text-ink-500 italic font-sans text-xs">
                No tool steps executed. Executed via fast deterministic workflow path.
              </div>
            ) : (
              <div className="space-y-2.5">
                {steps.map((step, idx) => {
                  const isTool = step.action === 'tool' || Boolean(step.tool);
                  const isFinal = step.action === 'final' || !isTool;

                  return (
                    <motion.div
                      key={step.i || idx}
                      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: shouldReduceMotion ? 0 : idx * 0.05 }}
                      className="p-3 rounded-xl bg-white border border-black/[0.06] shadow-2xs space-y-1.5"
                    >
                      {/* Step Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-ink-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {step.i || idx + 1}
                          </span>
                          <span className="font-bold text-ink-900">
                            {isTool ? `Tool Call: ${step.tool}` : 'Final Decision Reached'}
                          </span>
                        </div>
                        {step.durationMs > 0 && (
                          <span className="text-[10px] text-ink-400">
                            {step.durationMs}ms
                          </span>
                        )}
                      </div>

                      {/* Rationale / Thought Summary */}
                      {step.thoughtSummary && (
                        <div className="text-ink-700 font-sans text-xs pl-7 leading-relaxed">
                          <span className="font-bold text-ink-400 font-mono text-[10px] uppercase">
                            Thought:{' '}
                          </span>
                          "{step.thoughtSummary}"
                        </div>
                      )}

                      {/* Tool Call Arguments */}
                      {isTool && step.args && Object.keys(step.args).length > 0 && (
                        <div className="ml-7 p-2 rounded-lg bg-ink-50 border border-black/[0.04] text-[10px] text-ink-600 break-all">
                          <span className="text-ink-400 font-bold uppercase">Args: </span>
                          <code>{formatToolArgs(step.tool, step.args)}</code>
                        </div>
                      )}

                      {/* Observation Summary */}
                      {step.observationSummary && (
                        <div className="ml-7 p-2 rounded-lg bg-[#FAF8F5] border border-black/[0.04] text-[10px] text-ink-600">
                          <span className="text-emerald-700 font-bold uppercase">
                            Observation:{' '}
                          </span>
                          <span className="font-sans text-xs text-ink-800">
                            {step.observationSummary}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Final Outcome Banner */}
            <div className="p-2.5 rounded-xl bg-white border border-black/[0.08] flex items-center justify-between text-xs font-sans">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-ink-900">Final Outcome:</span>
                <span className="font-mono text-[11px] capitalize text-ink-700">
                  {run.outcome?.replace('_', ' ')}
                </span>
              </div>
              <span className="text-[11px] text-ink-500 font-mono">
                Confidence: {Math.round((run.confidence || 0.95) * 100)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgentTraceViewer;
