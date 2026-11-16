import React from 'react';
import { Filter, Sliders, Layers } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export default function HowItWorksSection() {
  const shouldReduceMotion = useReducedMotion();

  const steps = [
    {
      step: '01',
      icon: Filter,
      title: 'Ingest & Prefilter',
      subtitle: 'Zero-token noise elimination',
      description:
        'Connects directly to Google Workspace or Outlook. Deterministic rules inspect RFC headers (List-Unsubscribe, Precedence) to instantly route newsletters and automated receipts into the Quiet Folder without consuming LLM tokens.',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
    },
    {
      step: '02',
      icon: Sliders,
      title: 'Playbook & AI Triage',
      subtitle: 'Executive nuances & hard guardrails',
      description:
        'Gemini 2.0 Flash classifies the entire conversational thread against your customized Delegation Playbook. Hard in-code guardrails ensure VIP senders and financial commitments > $500 can never be muted.',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200/60',
    },
    {
      step: '03',
      icon: Layers,
      title: 'Two Connected Queues',
      subtitle: 'Assistant workspace + Client queue',
      description:
        'The assistant manages a keyboard-driven 3-pane command center with draft proposals. The executive opens an ultra-distilled serif decision stack with one-tap approvals, instant delegation, or voice notes.',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200/60',
    },
  ];

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="py-24 md:py-32 bg-white border-y border-black/[0.05] w-full max-w-full overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-3 max-w-2xl mx-auto"
        >
          <span className="text-xs font-bold text-accent uppercase tracking-widest">
            Streamlined Workflow
          </span>
          <h2
            id="how-it-works-title"
            className="text-3xl sm:text-4xl font-serif font-bold text-ink-900 tracking-tight"
          >
            How Daybook Mail brings calm to delegated email
          </h2>
          <p className="text-xs sm:text-sm text-ink-500 leading-relaxed max-w-[55ch] mx-auto">
            Eliminating inbox ambiguity in three deterministic stages, engineered for speed and complete audit transparency.
          </p>
        </motion.div>

        {/* 3-Step Grid with Connecting Line */}
        <div className="relative">
          {/* Animated Connecting Line (Desktop) */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-[44px] left-[15%] right-[15%] h-[2px] bg-ink-200/70 z-0 overflow-hidden"
          >
            <motion.div
              initial={shouldReduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-full bg-accent origin-left"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={idx}
                  initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{
                    duration: 0.6,
                    delay: shouldReduceMotion ? 0 : idx * 0.18,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="p-8 rounded-3xl bg-[#FAF8F5]/80 border border-black/[0.05] hover:bg-white hover:shadow-card transition-all duration-300 space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center border shadow-xs ${s.badgeColor}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <span className="font-mono font-bold text-sm text-ink-300">
                      {s.step}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-serif font-bold text-ink-900 tracking-tight">
                      {s.title}
                    </h3>
                    <div className="text-xs font-semibold text-accent">
                      {s.subtitle}
                    </div>
                  </div>

                  <p className="text-xs text-ink-600 leading-relaxed">
                    {s.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
