import React from 'react';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Sliders,
  ShieldCheck,
  Eye,
  Archive,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export default function FeatureShowcase() {
  return (
    <section id="features" className="py-20 md:py-28 bg-[#FAF8F5] space-y-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        {/* Block 1: The Client Decision Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-label-clientBg text-label-client text-xs font-semibold uppercase tracking-wider border border-label-client/20">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Executive Experience</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-ink-900 tracking-tight leading-tight">
              The Client Decision Queue
            </h3>
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
              Executives do not want 200 unread emails. They want decisions. The Client Queue distills high-stakes emails into mobile-ready Decision Cards set in elegant Fraunces serif typography.
            </p>
            <ul className="space-y-2.5 text-xs text-ink-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>One-tap draft approval notifies the assistant instantly.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Instant delegation back to assistant with concise audio or text nuance.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Clear consequences & deadlines highlighted before commitments lapse.</span>
              </li>
            </ul>
          </div>

          {/* Realistic Decision Card Mockup */}
          <div className="p-7 rounded-3xl bg-white border border-black/[0.06] shadow-card space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-borderMuted/60 pb-3 text-xs text-ink-500">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center">
                  MS
                </div>
                <span className="font-bold text-ink-900">Mark Suster</span>
                <span className="text-ink-400 font-mono text-[10px]">• 9:15 AM</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-semibold border border-red-200">
                Due: Today 5:00 PM
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-label-client">
                Executive Decision Required
              </span>
              <h4 className="text-base font-serif font-bold text-ink-900">
                Approve \$15M Series B Term Sheet from Upfront Ventures?
              </h4>
              <p className="text-xs text-ink-600 leading-relaxed">
                Risk if delayed: Exclusivity period expires tomorrow morning.
              </p>
            </div>

            {/* Maya's Prepared Draft */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/60 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-teal-900">
                <span>Maya Lin's Prepared Draft</span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded shadow-2xs font-mono">
                  Pending Sign-off
                </span>
              </div>
              <p className="text-xs text-teal-950 font-serif italic">
                "Hi Mark, Priya and I have reviewed the liquidation preference with Fenwick. We are excited to proceed with the term sheet as agreed."
              </p>
            </div>

            {/* Decision Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button className="py-2.5 px-4 rounded-full bg-label-client text-white text-xs font-semibold shadow-soft hover:brightness-105 transition">
                Approve Maya's Draft
              </button>
              <button className="py-2.5 px-4 rounded-full border border-black/[0.08] text-ink-800 text-xs font-semibold hover:bg-ink-50 transition">
                Hand to Maya
              </button>
            </div>
          </div>
        </div>

        {/* Block 2: The Delegation Playbook */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Playbook Rules Preview */}
          <div className="order-2 lg:order-1 p-7 rounded-3xl bg-white border border-black/[0.06] shadow-card space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-borderMuted/60">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-accent" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-900">
                  Priya's Delegation Playbook
                </h4>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-ink-100 text-ink-700">
                Injected in LLM
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/[0.04] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink-900">Term Sheets & Equity</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-label-clientBg text-label-client">
                    ALWAYS CLIENT
                  </span>
                </div>
                <p className="text-[11px] text-ink-500">
                  All venture capital negotiations, stock options, and ESOP clauses.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/[0.04] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink-900">Meeting Logistics & Travel</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-label-assistantBg text-label-assistant">
                    ASSISTANT HANDLES
                  </span>
                </div>
                <p className="text-[11px] text-ink-500">
                  Calendar rescheduling, flights, catering, vendor follow-ups.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/[0.04] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink-900">Sister Anjali Sharma</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                    VIP OVERRIDE
                  </span>
                </div>
                <p className="text-[11px] text-ink-500">
                  Personal family messages can never be auto-muted. Route to Client.
                </p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-5 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider">
              <Sliders className="h-3.5 w-3.5" />
              <span>Few-Shot Learning</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-ink-900 tracking-tight leading-tight">
              The Delegation Playbook
            </h3>
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
              Every client has unique communication preferences. Instead of rigid rule-engines, Daybook Mail pairs a customizable Playbook with few-shot learning from assistant overrides.
            </p>
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
              When Maya corrects a label, the system offers an instant <strong className="text-ink-900">"Make this a rule?"</strong> button. Once added, the rule is synthesized directly into the prompt so the AI never makes the same mistake again.
            </p>
          </div>
        </div>

        {/* Block 3: The Quiet Folder Guarantee */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold uppercase tracking-wider">
              <Archive className="h-3.5 w-3.5" />
              <span>Full Auditability</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-ink-900 tracking-tight leading-tight">
              The Quiet Folder Guarantee
            </h3>
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
              Executive Assistants live with constant fear of missing an urgent email buried by an automated spam filter. Daybook Mail replaces black-box spam filters with an auditable Quiet Folder.
            </p>
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
              Every muted receipt, newsletter, and notification includes the explicit evidence and signal used (e.g. List-Unsubscribe header match or automated receipt pattern). Assistants can audit all muted traffic in 30 seconds every morning.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-black/[0.06] shadow-card space-y-4 text-left">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-600 pb-3 border-b border-borderMuted/60">
              <Eye className="h-4 w-4 text-accent" />
              <span>Quiet Folder Audit Record</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-black/[0.04] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink-900">Substack Syndicate Newsletter</span>
                <span className="text-[10px] font-mono text-ink-400">7:30 AM</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-borderMuted/80 text-[11px] text-ink-700 space-y-1 font-mono">
                <div>Prefilter: <span className="text-emerald-700">List-Unsubscribe Header Present</span></div>
                <div>Risk Guardrail: <span className="text-ink-600">VIP check: False (Not in Playbook)</span></div>
                <div>Verdict: <span className="text-slate-800 font-bold">NO_REPLY_NEEDED</span></div>
              </div>
              <p className="text-[11px] text-ink-500 italic">
                "Contains List-Unsubscribe header; marketing newsletter with conversational bait."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
