import React, { useState } from 'react';
import { LabelBadge } from '../LabelBadge.jsx';
import { ConfidenceDots } from '../ConfidenceDots.jsx';
import Avatar from '../Avatar.jsx';
import { Sparkles, Quote, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';

const INTERACTIVE_EXAMPLES = [
  {
    id: 'term_sheet',
    tabTitle: 'Upfront Term Sheet',
    sender: 'Mark Suster',
    senderEmail: 'mark.suster@upfront.com',
    subject: 'Series B Term Sheet & Exclusivity Agreement',
    snippet: 'Priya, Upfront has finalized the $15M lead term sheet. Please review and sign before 4 PM today.',
    fullSnippet:
      'Priya, Upfront has finalized the $15M lead term sheet with Fenwick counsel. Attached is the revised agreement. Please review and provide your personal signature before 4 PM today so we can trigger wire escrow.',
    label: 'CLIENT_TO_REPLY',
    confidence: 0.98,
    model: 'Gemini 2.0 Flash',
    signalsUsed: ['PLAYBOOK_RULE', 'VIP_SENDER_MATCH', 'FINANCIAL_THRESHOLD_OVER_1000'],
    evidence: '"Please review and provide your personal signature before 4 PM today so we can trigger wire escrow."',
    reason:
      'Term sheet negotiation and binding legal signatures require personal executive authorization. Triggered VIP Playbook rule for lead investor Mark Suster.',
    decision: {
      question: 'Sign $15M Series B Term Sheet from Upfront Ventures?',
      options: ['Approve & Sign', 'Request Fenwick Review'],
      deadline: 'Today 4:00 PM',
      consequence: 'Term sheet exclusivity window expires',
    },
  },
  {
    id: 'hotel_booking',
    tabTitle: 'Offsite Hotel Booking',
    sender: 'Elena Vance (St. Regis Concierge)',
    senderEmail: 'reservations@stregis.com',
    subject: 'Confirmation: Executive Offsite Room Block',
    snippet: 'Maya, all 8 suites reserved for Priya and executive team. Confirmation #99482.',
    fullSnippet:
      'Hi Maya, following up on our call: all 8 executive suites are held for the offsite. Please send over the corporate credit card authorization form to finalize confirmation #99482.',
    label: 'ASSISTANT_TO_REPLY',
    confidence: 0.95,
    model: 'Gemini 2.0 Flash',
    signalsUsed: ['PLAYBOOK_RULE', 'ASSISTANT_AUTONOMY_MATCH'],
    evidence: '"Please send over the corporate credit card authorization form to finalize confirmation #99482."',
    reason:
      'Routine travel and room block logistics fall under assistant autonomy guidelines in Priya\'s Delegation Playbook. Handled by Maya Lin.',
    decision: null,
  },
  {
    id: 'cold_pitch',
    tabTitle: 'Marketing Solicitations',
    sender: 'Venture Growth Insights',
    senderEmail: 'newsletter@venturegrowth.io',
    subject: 'The State of Generative AI in 2026 — thoughts?',
    snippet: 'List-Unsubscribe header present. Conversational bait filtered into Quiet Folder.',
    fullSnippet:
      'Hey Priya, we loved your recent keynote at TechCrunch! We just published our comprehensive 80-page AI report. Hit reply and let us know what you think of page 12!',
    label: 'NO_REPLY_NEEDED',
    confidence: 0.99,
    model: 'Deterministic Prefilter',
    signalsUsed: ['PREFILTER_LIST_UNSUBSCRIBE', 'AUTOMATED_MARKETING_PATTERN'],
    evidence: 'Header: List-Unsubscribe: <mailto:unsubscribe@venturegrowth.io>',
    reason:
      'Detected RFC List-Unsubscribe header. Marketing solicitations using conversational question hooks are automatically routed to the Quiet Folder.',
    decision: null,
  },
];

export default function InteractiveReasoningWidget() {
  const [activeId, setActiveId] = useState('term_sheet');
  const activeEx =
    INTERACTIVE_EXAMPLES.find((e) => e.id === activeId) || INTERACTIVE_EXAMPLES[0];

  return (
    <section id="interactive-ai" className="py-20 md:py-28 bg-white border-y border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-accent uppercase tracking-widest">
            Live AI Inspection
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-ink-900 tracking-tight">
            See the 7-stage reasoning engine in action
          </h2>
          <p className="text-xs sm:text-sm text-ink-500 leading-relaxed">
            Click between real email scenarios from our seed dataset to inspect how Daybook Mail extracts decisions, validates guardrails, and assigns ownership.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {INTERACTIVE_EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setActiveId(ex.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 ${
                activeId === ex.id
                  ? 'bg-ink-900 text-white shadow-soft ring-2 ring-ink-900/10'
                  : 'bg-[#FAF8F5] text-ink-700 hover:bg-ink-100 hover:text-ink-900 border border-black/[0.04]'
              }`}
            >
              {ex.tabTitle}
            </button>
          ))}
        </div>

        {/* 2-Column Live Playground */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch text-left">
          {/* Left Column: Simulated Email Message */}
          <div className="p-7 rounded-3xl bg-[#FAF8F5]/80 border border-black/[0.06] shadow-card flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-borderMuted/60 text-xs">
                <div className="flex items-center gap-2.5">
                  <Avatar name={activeEx.sender} email={activeEx.senderEmail} size="sm" />
                  <div>
                    <div className="font-bold text-ink-900">{activeEx.sender}</div>
                    <div className="text-[11px] text-ink-400 font-mono">
                      {activeEx.senderEmail}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-ink-400">9:15 AM</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-serif font-bold text-ink-900">
                  {activeEx.subject}
                </h4>
                <div className="p-4 rounded-2xl bg-white border border-black/[0.04] text-xs text-ink-700 leading-relaxed">
                  {activeEx.fullSnippet}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-ink-400 border-t border-borderMuted/60">
              <span>RFC 5322 Ingestion</span>
              <span className="font-mono text-accent font-semibold">Normalized & Scanned</span>
            </div>
          </div>

          {/* Right Column: AI Triage Output */}
          <div className="p-7 rounded-3xl bg-white border border-black/[0.06] shadow-card flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {/* Top Result Banner */}
              <div className="flex items-center justify-between pb-3 border-b border-borderMuted/60">
                <div className="flex items-center gap-2">
                  <LabelBadge label={activeEx.label} size="sm" />
                  <span className="text-xs text-ink-400 font-mono">
                    {(activeEx.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                  {activeEx.model}
                </span>
              </div>

              {/* Reasoning Text */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  Synthesized Reasoning
                </div>
                <p className="text-xs text-ink-800 leading-relaxed font-medium">
                  {activeEx.reason}
                </p>
              </div>

              {/* Supporting Evidence Quote */}
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-black/[0.04] space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  <Quote className="h-3 w-3 text-ink-400" />
                  <span>Direct Quote Evidence</span>
                </div>
                <p className="text-xs text-ink-700 italic font-serif">
                  {activeEx.evidence}
                </p>
              </div>

              {/* Signals Triggered */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  Signals & Guardrails Applied
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeEx.signalsUsed.map((sig, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-ink-100 text-ink-700"
                    >
                      {sig}
                    </span>
                  ))}
                </div>
              </div>

              {/* Decision Structured Object (if any) */}
              {activeEx.decision && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 text-xs text-amber-950">
                  <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-800">
                    Decision Object Generated
                  </span>
                  <div className="font-serif font-bold text-xs">{activeEx.decision.question}</div>
                  <div className="text-[11px] text-amber-800">
                    Due: {activeEx.decision.deadline} • Risk: {activeEx.decision.consequence}
                  </div>
                </div>
              )}
            </div>

            <div className="text-[10px] text-ink-400 text-right pt-2 border-t border-borderMuted/60">
              Audit log recorded with zero email body exposure
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
