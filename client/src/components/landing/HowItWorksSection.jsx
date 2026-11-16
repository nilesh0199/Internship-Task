import React from 'react';
import { Filter, Sliders, Layers, ArrowRight } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      icon: Filter,
      title: 'Ingest & Prefilter',
      subtitle: 'Zero-token noise elimination',
      description:
        'Connect live Google Workspace or Outlook. Deterministic rules inspect RFC headers (List-Unsubscribe, Precedence) to instantly route newsletters and automated receipts into the Quiet Folder without consuming LLM tokens.',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
    },
    {
      step: '02',
      icon: Sliders,
      title: 'Playbook & AI Triage',
      subtitle: 'Executive nuances & hard guardrails',
      description:
        'Gemini 2.0 Flash synthesizes full conversational context against your executive’s customized Delegation Playbook. Hard in-code guardrails guarantee that VIP senders and contracts > $500 can never be muted.',
      color: 'bg-amber-50 text-amber-800 border-amber-200/60',
    },
    {
      step: '03',
      icon: Layers,
      title: 'Two Connected Queues',
      subtitle: 'Assistant workspace + Client queue',
      description:
        'The assistant manages a keyboard-first 3-pane command center with draft proposals. The executive opens an ultra-distilled serif decision stack with one-tap approvals, instant delegation, or quick notes.',
      color: 'bg-teal-50 text-teal-800 border-teal-200/60',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white border-y border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-accent uppercase tracking-widest">
            Streamlined Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-ink-900 tracking-tight">
            How Daybook Mail brings calm to delegated email
          </h2>
          <p className="text-xs sm:text-sm text-ink-500 leading-relaxed">
            Eliminating inbox ambiguity in three deterministic stages, designed for complete transparency.
          </p>
        </div>

        {/* 3-Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-[#FAF8F5]/80 border border-black/[0.05] hover:bg-white hover:shadow-card transition-all duration-300 space-y-5 relative"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`h-11 w-11 rounded-2xl flex items-center justify-center border shadow-xs ${s.color}`}
                  >
                    <Icon className="h-5 w-5" />
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
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
