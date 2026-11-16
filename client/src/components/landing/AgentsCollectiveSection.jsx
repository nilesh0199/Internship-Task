import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Bot,
  ShieldCheck,
  Calendar,
  Clock,
  FileEdit,
  Newspaper,
  Layers,
  ArrowRight,
  CheckCircle2,
  Lock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const AGENTS = [
  {
    id: 'triage',
    name: 'Triage Agent',
    icon: Layers,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    role: 'Routes lanes & auto-files noise',
  },
  {
    id: 'scheduling',
    name: 'Scheduling Agent',
    icon: Calendar,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    role: 'Detects double-bookings & proposes alternatives',
  },
  {
    id: 'followup',
    name: 'Follow-up Agent',
    icon: Clock,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    role: 'Nudges stale waiting threads after 3 days',
  },
  {
    id: 'drafting',
    name: 'Drafting Agent',
    icon: FileEdit,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    role: 'Pre-drafts context replies in client’s tone',
  },
  {
    id: 'digest',
    name: 'Digest Agent',
    icon: Newspaper,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    role: 'Synthesizes daily morning briefings',
  },
  {
    id: 'guardian',
    name: 'Guardian Agent',
    icon: ShieldCheck,
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    role: 'Zero-trust safety auditor & auto-undo',
  },
];

export default function AgentsCollectiveSection() {
  const shouldReduceMotion = useReducedMotion();
  const [activeAgent, setActiveAgent] = useState('guardian');

  return (
    <section id="agents" className="py-20 md:py-28 bg-[#FAF8F5] relative overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-black/[0.08] shadow-xs text-xs font-semibold text-ink-700">
            <Bot className="h-3.5 w-3.5 text-accent" />
            <span>Specialized Autonomous Collective</span>
          </div>

          <h2
            className="font-serif font-bold text-ink-900 tracking-tight leading-[1.12]"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }}
          >
            A small team of agents, one rule: a human approves what gets sent.
          </h2>

          <p className="text-sm md:text-base text-ink-600 leading-relaxed max-w-2xl mx-auto">
            Instead of a monolithic black box, Daybook deploys six specialized agents with strictly isolated responsibilities, verifiable audit trails, and zero-send autonomy.
          </p>
        </div>

        {/* 6 Agent Interactive Chips Row */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            const isSelected = activeAgent === agent.id;

            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => setActiveAgent(agent.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-ink-900 text-white border-ink-900 shadow-soft scale-105'
                    : 'bg-white hover:bg-ink-50 text-ink-700 border-black/[0.07] shadow-2xs'
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-accent'}`} />
                <span>{agent.name}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Funnel Animation Card: 40 emails in -> agents -> only 7 reach human */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-8 md:p-12 shadow-card max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-1">
            <span className="text-[11px] font-mono text-ink-400 uppercase tracking-wider">
              Autonomous Funnel Flow
            </span>
            <h3 className="text-xl md:text-2xl font-serif font-bold text-ink-900">
              How 40 raw emails distill into 7 human decisions
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative">
            {/* Stage 1 */}
            <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-black/[0.05] space-y-2 text-center">
              <span className="text-[10px] font-mono font-bold text-ink-400 block uppercase">
                Stage 1 · Ingestion
              </span>
              <div className="text-3xl font-serif font-bold text-ink-900">40</div>
              <p className="text-xs text-ink-500">Unfiltered inbound emails received</p>
            </div>

            {/* Stage 2 */}
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2 text-center">
              <span className="text-[10px] font-mono font-bold text-emerald-800 block uppercase">
                Stage 2 · Autonomous
              </span>
              <div className="text-3xl font-serif font-bold text-emerald-700">24</div>
              <p className="text-xs text-emerald-800">
                Auto-filed to Quiet Folder or resolved (1-click Undo)
              </p>
            </div>

            {/* Stage 3 */}
            <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-2 text-center">
              <span className="text-[10px] font-mono font-bold text-teal-800 block uppercase">
                Stage 3 · Assistant
              </span>
              <div className="text-3xl font-serif font-bold text-teal-700">9</div>
              <p className="text-xs text-teal-800">
                Routed to Maya Lin with pre-drafted responses
              </p>
            </div>

            {/* Stage 4 */}
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-center ring-2 ring-accent/30">
              <span className="text-[10px] font-mono font-bold text-accent block uppercase">
                Stage 4 · Executive
              </span>
              <div className="text-3xl font-serif font-bold text-accent">7</div>
              <p className="text-xs text-amber-900 font-semibold">
                Only 7 reach Priya Sharma for 1-tap signoff
              </p>
            </div>
          </div>

          {/* Core Guarantees Banner */}
          <div className="pt-6 border-t border-borderMuted/60 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-ink-700">
            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink-900 block font-serif">Zero-Send Autonomy Gate</strong>
                No agent ever transmits an outbound email. Sending strictly requires human confirmation.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink-900 block font-serif">Guardian Safety Net</strong>
                VIP senders, legal agreements, and financial terms can never be auto-filed.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <RotateCcw className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink-900 block font-serif">1-Click Instant Undo</strong>
                Every automated filing, schedule proposal, or routing change is completely reversible.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
