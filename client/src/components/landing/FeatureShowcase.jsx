import React, { useState, useEffect } from 'react';
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
  Laptop,
  Smartphone,
  Check,
  CornerDownRight,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { LabelBadge } from '../LabelBadge.jsx';
import { ConfidenceDots } from '../ConfidenceDots.jsx';
import Avatar from '../Avatar.jsx';

export default function FeatureShowcase() {
  const shouldReduceMotion = useReducedMotion();

  // Looping interactive decision card simulation:
  // Step 0: Active Decision Card
  // Step 1: Simulate click on "Approve Maya's Draft"
  // Step 2: Card collapses, "You're all clear" state shows
  // Step 3: Resets
  const [decisionStage, setDecisionStage] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;

    const timer = setInterval(() => {
      setDecisionStage((prev) => (prev + 1) % 3);
    }, 3800);

    return () => clearInterval(timer);
  }, [shouldReduceMotion]);

  // Playbook rule chips staggered appearance
  const playbookRules = [
    {
      title: 'Term Sheets & Capital',
      rule: 'ALWAYS CLIENT',
      desc: 'All VC financing, SAFEs, ESOP pools, and equity grants.',
      badgeClass: 'bg-label-clientBg text-label-client border-label-client/20',
    },
    {
      title: 'Travel & Vendor Operations',
      rule: 'ASSISTANT AUTONOMY',
      desc: 'Flights, hotel room blocks, offsite venues, catering < $1,000.',
      badgeClass: 'bg-label-assistantBg text-label-assistant border-label-assistant/20',
    },
    {
      title: 'Sister Anjali Sharma',
      rule: 'VIP FAMILY OVERRIDE',
      desc: 'Personal family correspondence is never auto-muted. Escalate immediately.',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/60',
    },
  ];

  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="py-24 md:py-32 bg-[#FAF8F5] space-y-28 w-full max-w-full overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-28">
        {/* Block 1: The Client Decision Queue (Two Connected Experiences) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5 text-left"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-label-clientBg text-label-client text-xs font-semibold uppercase tracking-wider border border-label-client/20">
              <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Two Connected Experiences</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-ink-900 tracking-tight leading-tight">
              Your client sees decisions, not inboxes
            </h3>
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed max-w-[55ch]">
              Executives should not parse 200 unread email threads every morning. The Client Decision Queue transforms ambiguous message chains into structured Decision Cards in calming serif typography.
            </p>
            <ul className="space-y-3 text-xs text-ink-700 pt-1">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>
                  <strong>One-tap draft approval:</strong> Confirms the assistant's prepared response and logs approval into the audit trail.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>
                  <strong>Direct delegation:</strong> Hand conversations back to the assistant with an attached quick note.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>
                  <strong>Explicit deadlines & risk:</strong> Highlighting consequence if delayed before commitments lapse.
                </span>
              </li>
            </ul>
          </motion.div>

          {/* Right: Phone Frame Preview with Looping Decision Simulation */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center"
          >
            {/* Phone Chassis */}
            <div className="w-full max-w-[360px] rounded-[36px] bg-ink-900 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)] border border-ink-800">
              {/* Phone Screen Bezel */}
              <div className="rounded-[28px] bg-[#FAF8F5] overflow-hidden min-h-[460px] flex flex-col justify-between border border-black/[0.08]">
                {/* Phone Header / Dynamic Island */}
                <div className="bg-white/80 backdrop-blur-md px-5 py-2.5 border-b border-black/[0.04] flex items-center justify-between text-xs text-ink-500">
                  <span className="font-mono text-[10px] font-semibold text-ink-900">9:41</span>
                  <div className="h-3.5 w-16 bg-ink-900 rounded-full" />
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-accent">Priya</span>
                  </div>
                </div>

                {/* Queue Content Area */}
                <div className="p-4 flex-1 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {decisionStage === 0 || decisionStage === 1 ? (
                      <motion.div
                        key="active-decision"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ duration: 0.35 }}
                        className="rounded-2xl bg-white p-5 border border-black/[0.06] shadow-card space-y-3.5 text-left"
                      >
                        {/* Sender & Deadline */}
                        <div className="flex items-center justify-between text-xs pb-2 border-b border-black/[0.04]">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center">
                              MS
                            </div>
                            <span className="font-bold text-ink-900 text-xs">Mark Suster</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-semibold border border-red-200">
                            Due: Today 5 PM
                          </span>
                        </div>

                        {/* Question */}
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-label-client">
                            Decision Required
                          </span>
                          <h4 className="text-sm font-serif font-bold text-ink-900 leading-snug">
                            Sign $15M Series B Term Sheet from Upfront Ventures?
                          </h4>
                        </div>

                        {/* Prepared Draft */}
                        <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/60 text-[11px] space-y-1">
                          <div className="font-semibold text-teal-900 text-[10px] flex items-center justify-between">
                            <span>Maya Lin's Prepared Draft</span>
                            <span className="bg-white px-1.5 py-0.5 rounded shadow-2xs font-mono text-[9px]">
                              Ready
                            </span>
                          </div>
                          <p className="text-teal-950 font-serif italic line-clamp-2">
                            "Hi Mark, Priya and I have reviewed the liquidation preference with Fenwick. We are excited to proceed with the term sheet as agreed."
                          </p>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div
                            className={`py-2 px-3 rounded-full text-center text-[11px] font-semibold transition-all ${
                              decisionStage === 1
                                ? 'bg-emerald-600 text-white scale-95 ring-2 ring-emerald-500/30'
                                : 'bg-label-client text-white shadow-soft'
                            }`}
                          >
                            {decisionStage === 1 ? 'Approved ✓' : "Approve Maya's Draft"}
                          </div>
                          <div className="py-2 px-3 rounded-full border border-black/[0.08] text-center text-[11px] font-semibold text-ink-700">
                            Hand to Maya
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="all-clear"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl bg-white p-6 border border-black/[0.06] shadow-card text-center space-y-3"
                      >
                        <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                          <Check className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <h4 className="font-serif font-bold text-ink-900 text-sm">
                          You're all clear for the day
                        </h4>
                        <p className="text-[11px] text-ink-500">
                          12 conversations handled by Maya. Draft sent to Mark Suster.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Phone Bottom Pill */}
                <div className="p-3 text-center">
                  <div className="h-1 w-28 bg-ink-300 rounded-full mx-auto" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Block 2: The Delegation Playbook (Learns How Your Client Works) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Playbook Rules Preview in Browser-Style Frame */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="order-2 lg:order-1 rounded-3xl bg-white border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden text-left"
          >
            {/* Top Window Bar */}
            <div className="bg-[#FAF8F5] px-4 py-3 border-b border-black/[0.06] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 inline-block" />
              </div>
              <span className="text-[11px] font-mono text-ink-500">
                Priya's Delegation Playbook
              </span>
              <span className="px-2 py-0.5 rounded bg-teal-50 text-accent font-mono text-[10px] font-semibold border border-teal-200/50">
                Injected in LLM
              </span>
            </div>

            {/* Rules List */}
            <div className="p-6 space-y-3">
              {playbookRules.map((rule, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15 }}
                  className="p-3.5 rounded-2xl bg-[#FAF8F5]/80 border border-black/[0.04] space-y-1 hover:bg-[#FAF8F5] transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink-900">{rule.title}</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border ${rule.badgeClass}`}
                    >
                      {rule.rule}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-500 leading-relaxed">{rule.desc}</p>
                </motion.div>
              ))}

              {/* Pulsing "Learned from Corrections" Chip */}
              <div className="p-3 rounded-2xl bg-teal-50/50 border border-teal-200/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  <span className="font-semibold text-accent text-[11px]">
                    Learned from Maya's Corrections
                  </span>
                </div>
                <span className="text-[10px] font-mono text-ink-400">Auto-Synthesized</span>
              </div>
            </div>
          </motion.div>

          {/* Right Text */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 lg:order-2 space-y-5 text-left"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider">
              <Sliders className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Continuous Adaptation</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-ink-900 tracking-tight leading-tight">
              It learns how your client works
            </h3>
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed max-w-[55ch]">
              Every client communicates differently. Daybook Mail encodes their nuanced preferences into an active Delegation Playbook—tailoring VIP domains, financial approval thresholds, and sensitive topics.
            </p>
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed max-w-[55ch]">
              When an assistant manually corrects an AI label, Daybook prompts: <strong className="text-ink-900">"Make this a rule?"</strong>. Accepted corrections are synthesized straight into the prompt schema, ensuring the model never repeats an error.
            </p>
          </motion.div>
        </div>

        {/* Block 3: The Quiet Folder (Know Why, Not Just What) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5 text-left"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold uppercase tracking-wider">
              <Archive className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Full Audit Transparency</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-ink-900 tracking-tight leading-tight">
              Know why, not just what
            </h3>
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed max-w-[55ch]">
              Assistants live in constant dread of an aggressive spam filter burying an urgent email from a board member or investor. Daybook Mail replaces opaque spam bins with an auditable Quiet Folder.
            </p>
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed max-w-[55ch]">
              Every muted receipt, cold solicitation, and newsletter displays the exact RFC header matches and guardrail proofs that justified the verdict. Reviewers can audit 40 muted messages in under thirty seconds.
            </p>
          </motion.div>

          {/* Right: Quiet Folder Audit Card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="p-7 rounded-3xl bg-white border border-black/[0.06] shadow-card space-y-4 text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.04]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-700">
                <Eye className="h-4 w-4 text-accent" strokeWidth={1.5} />
                <span>Deterministic Audit Trail</span>
              </div>
              <span className="text-[10px] font-mono text-ink-400">Zero Token Cost</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-black/[0.04] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Avatar name="Substack Syndicate" size="xs" />
                  <span className="font-bold text-ink-900">Substack Syndicate Newsletter</span>
                </div>
                <span className="text-[10px] font-mono text-ink-400">7:30 AM</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-borderMuted/80 text-[11px] text-ink-700 space-y-1 font-mono">
                <div>Prefilter: <span className="text-emerald-700">List-Unsubscribe Header Present</span></div>
                <div>Risk Guardrail: <span className="text-ink-600">VIP Check: False (Safe)</span></div>
                <div>Verdict: <span className="text-slate-800 font-bold">NO_REPLY_NEEDED (Muted)</span></div>
              </div>

              <p className="text-[11px] text-ink-500 italic">
                "Contains RFC List-Unsubscribe header; marketing newsletter with conversational bait."
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
