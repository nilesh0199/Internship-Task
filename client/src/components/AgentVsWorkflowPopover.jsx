import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, Bot, GitBranch, ShieldCheck } from 'lucide-react';

/**
 * Honest, clear popover explaining the concrete architectural difference
 * between a closed-loop Agent and a deterministic Workflow.
 */
export function AgentVsWorkflowPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-100/80 hover:bg-ink-200/80 text-ink-700 text-xs font-medium transition cursor-pointer"
        aria-expanded={isOpen}
      >
        <HelpCircle className="h-3.5 w-3.5 text-accent" />
        <span>What's the difference?</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-84 sm:w-96 p-5 bg-white border border-black/15 rounded-3xl shadow-xl text-xs space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between border-b border-black/[0.08] pb-3">
            <div>
              <h4 className="font-serif font-bold text-sm text-ink-900">
                Agent vs. Workflow
              </h4>
              <p className="text-[11px] text-ink-500">
                Honest architectural separation in Daybook Mail.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-50 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3.5">
            {/* Agent Definition */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider font-mono">
                  <Bot className="h-3 w-3" />
                  Agent
                </span>
                <span className="text-[11px] font-semibold text-emerald-900">
                  Closed-Loop System
                </span>
              </div>
              <p className="text-emerald-950 text-[11px] leading-relaxed">
                Runs an iterative <strong>reason → act (use tools) → observe → decide → repeat</strong> loop until a goal is reached or an explicit stop condition fires.
              </p>
              <div className="text-[10px] font-mono text-emerald-800 pt-1 border-t border-emerald-200/60">
                Enforces strict limits: max steps (4-5), timeouts (20s), tool allowlists, loop detection, and never sends email.
              </div>
            </div>

            {/* Workflow Definition */}
            <div className="p-3 rounded-2xl bg-ink-50 border border-black/[0.08] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-ink-800 text-white text-[10px] font-bold uppercase tracking-wider font-mono">
                  <GitBranch className="h-3 w-3" />
                  Workflow
                </span>
                <span className="text-[11px] font-semibold text-ink-900">
                  Fixed Deterministic Pipeline
                </span>
              </div>
              <p className="text-ink-700 text-[11px] leading-relaxed">
                Follows predefined, linear deterministic rules or a single LLM classification pass. No autonomous multi-turn tool loops.
              </p>
              <div className="text-[10px] font-mono text-ink-500 pt-1 border-t border-black/[0.06]">
                Examples: 7-stage prefilter triage, 3-day stale nudges, and daily briefing synthesis.
              </div>
            </div>

            {/* Safety Check Definition */}
            <div className="p-3 rounded-2xl bg-violet-50/70 border border-violet-200/70 space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-700 text-white text-[10px] font-bold uppercase tracking-wider font-mono">
                  <ShieldCheck className="h-3 w-3" />
                  Safety Check
                </span>
                <span className="text-[11px] font-semibold text-violet-900">
                  Guardian Safety Check
                </span>
              </div>
              <p className="text-violet-950 text-[11px] leading-relaxed">
                Deliberately deterministic rule engine. Inspects VIP contacts and financial terms. Zero LLM drift, zero hallucination risk.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
