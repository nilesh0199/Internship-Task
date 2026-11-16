import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  ShieldAlert,
  Inbox,
  AlertCircle,
  Eye,
  Check,
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

const AGENT_PROFILES = {
  triage: {
    id: 'triage',
    name: 'Triage Agent',
    tagline: 'Inbound Routing & Quiet Folder Auto-Filer',
    icon: Layers,
    iconColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    autonomyBadge: 'AUTO · Applies with 1-Click Undo',
    autonomyStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    trigger: 'Inbound message sync & provider webhook',
    overview:
      'Evaluates every inbound email against client playbook rules. Routinely auto-files bulk newsletters, marketing promotions, and receipts to the Quiet Folder, and routes actionable tasks to the proper workspace lane.',
    scenario: {
      inputSubject: 'Weekly Product Substack #42: Design Systems in 2026',
      inputSender: 'Substack Digest <digest@substack.com>',
      inputSnippet:
        'List-Unsubscribe header found. Your weekly digest of emerging typography, tokens, and spatial UI...',
      actionLabel: 'AUTO_FILE_QUIET_FOLDER',
      actionStyle: 'bg-slate-100 text-slate-700 border-slate-300',
      actionSummary: 'Auto-filed to Quiet Folder (0 tokens consumed via prefilter bypass).',
      reversibility: '1-Click Undo available for 30 days',
      previewHeadline: 'Quiet Folder Archive Proof',
      previewBody:
        'Identified List-Unsubscribe bulk header with 0.99 confidence. No conversational reply required.',
      interactiveButtonText: 'Preview 1-Click Undo',
      simulatedOutcome: 'Restored thread to ASSISTANT_TO_REPLY with one click.',
    },
    canDo: [
      'Evaluates multi-message thread context using 7-stage AI pipeline',
      'Auto-files bulk newsletters, shipping receipts, and marketing updates',
      'Routes executive signoffs to Priya and administrative logistics to Maya',
      'Flags low-confidence threads (< 0.70) for immediate human review',
    ],
    neverDoes: [
      'Never auto-files VIP contacts, board members, or family senders',
      'Never mutes emails containing financial, legal, or contract terms',
      'Never deletes emails or executes permanent destruction',
      'Never transmits outbound messages',
    ],
  },
  scheduling: {
    id: 'scheduling',
    name: 'Scheduling Agent',
    tagline: 'Calendar Intelligence & Double-Booking Resolver',
    icon: Calendar,
    iconColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    autonomyBadge: 'PROPOSE · Queued for Assistant Review',
    autonomyStyle: 'bg-blue-50 text-blue-800 border-blue-200',
    trigger: 'Inbound calendar invites & meeting inquiries',
    overview:
      'Parses meeting requests, cross-references Priya’s calendar for overlapping engagements, and drafts conflict-free alternate time proposals for Maya to approve with one click.',
    scenario: {
      inputSubject: 'Sync on Series A Extension — Thursday 3:00 PM',
      inputSender: 'Mark Suster <mark@upfront.com>',
      inputSnippet:
        'Priya, do you have 30 minutes this Thursday at 3 PM to review the updated bridge notes?',
      actionLabel: 'CONFLICT_DETECTED',
      actionStyle: 'bg-amber-50 text-amber-800 border-amber-300',
      actionSummary: 'Detected conflict with "Board Deck Prep". Formulated 2 alternate slots.',
      reversibility: 'Draft queued in Assistant Workspace for review',
      previewHeadline: 'Proposed Reschedule Notice',
      previewBody:
        'Thursday 3:00 PM conflicts with protected calendar block. Proposed: Friday 11:00 AM or Monday 2:00 PM.',
      interactiveButtonText: 'Review Proposed Slots',
      simulatedOutcome: 'Selected Friday 11:00 AM. Reschedule draft ready for dispatch.',
    },
    canDo: [
      'Extracts requested meeting times, durations, and agendas from conversational text',
      'Cross-references executive calendar for overlapping appointments',
      'Generates 2–3 alternate open time slots adhering to client working hours',
      'Prepares ready-to-send reschedule drafts in assistant draft lane',
    ],
    neverDoes: [
      'Never accepts or declines calendar invites without human sign-off',
      'Never books over executive protected focus blocks or family events',
      'Never sends messages directly to meeting participants',
    ],
  },
  followup: {
    id: 'followup',
    name: 'Follow-up Agent',
    tagline: 'Stale Thread Monitor & Nudge Generator',
    icon: Clock,
    iconColor: 'bg-amber-50 text-amber-700 border-amber-200',
    autonomyBadge: 'PROPOSE · Queued for Assistant Approval',
    autonomyStyle: 'bg-amber-50 text-amber-800 border-amber-200',
    trigger: 'Daily schedule tick (every 5 min / 9:00 AM)',
    overview:
      'Monitors outbound messages waiting on third parties. When an external partner goes silent past the client threshold (e.g., 3 days), it prepares a gentle follow-up draft for Maya to approve.',
    scenario: {
      inputSubject: 'Revised Commercial Services Agreement v2',
      inputSender: 'Sarah Jenkins <counsel@acmecorp.com>',
      inputSnippet:
        'Waiting 4 days for Acme legal team redlines. Initial draft sent Monday at 10:15 AM.',
      actionLabel: 'STALE_THREAD (4 DAYS)',
      actionStyle: 'bg-rose-50 text-rose-800 border-rose-300',
      actionSummary: 'Flagged aging threshold breach (>3d). Prepared check-in draft for Maya.',
      reversibility: 'Draft awaits assistant review in Maya’s follow-up lane',
      previewHeadline: 'Follow-Up Check-in Prepared',
      previewBody:
        '"Hi Sarah, following up on the redlined agreement sent Monday. Let us know if you need anything from Priya."',
      interactiveButtonText: 'Queue Gentle Nudge',
      simulatedOutcome: 'Nudge queued for Maya Lin’s morning review batch.',
    },
    canDo: [
      'Monitors "Waiting for Response" threads against client SLA (default: 3 days)',
      'Detects when an external party has stalled on a pending deliverable',
      'Drafts context-aware polite reminder email for assistant review',
      'Surfaces proactive nudge banners on Maya’s dashboard',
    ],
    neverDoes: [
      'Never auto-nudges high-priority investors without explicit instruction',
      'Never sends repetitive follow-ups or spam',
      'Never transmits emails autonomously',
    ],
  },
  drafting: {
    id: 'drafting',
    name: 'Drafting Agent',
    tagline: 'Executive Voice Mimic & Pre-Composer',
    icon: FileEdit,
    iconColor: 'bg-blue-50 text-blue-700 border-blue-200',
    autonomyBadge: 'PROPOSE · Zero-Send Human Gate',
    autonomyStyle: 'bg-purple-50 text-purple-800 border-purple-200',
    trigger: 'Ingest & thread reclassification',
    overview:
      'Drafts context-aware responses in Priya’s executive voice according to delegation playbook guidelines, placing the draft into the assistant queue for one-click approval or refinement.',
    scenario: {
      inputSubject: 'Vendor Inquiry: Form W-9 and Remittance Instructions',
      inputSender: 'Cloud Infrastructure Billing <accounts@datanode.io>',
      inputSnippet:
        'Please confirm updated billing entity details and remit to our new Delaware entity address before Friday.',
      actionLabel: 'PRE_DRAFTED_RESPONSE',
      actionStyle: 'bg-teal-50 text-teal-800 border-teal-300',
      actionSummary: 'Generated compliant response draft matching playbook tax entity.',
      reversibility: 'Requires Maya or Priya human approval before dispatch',
      previewHeadline: 'Draft Reply Ready for Approval',
      previewBody:
        '"Attached is the requested W-9 for Vortex Dynamics Inc. Remittance is scheduled for our next Friday cycle."',
      interactiveButtonText: 'Approve & Send to Queue',
      simulatedOutcome: 'Draft approved by Maya and staged for client dispatch.',
    },
    canDo: [
      'Analyzes historical client threads to match communication tone and brevity',
      'Synthesizes delegation playbook preferences for specific vendors & topics',
      'Pre-populates recipient fields, subject prefixes, and contextual attachments',
      'Places drafts into Maya’s approval lane with diff comparison',
    ],
    neverDoes: [
      'Never sends an email directly (Zero-Send safety gate)',
      'Never commits the executive to binding terms without approval',
      'Never hallucinates financial figures or signatures',
    ],
  },
  digest: {
    id: 'digest',
    name: 'Digest Agent',
    tagline: 'Morning Briefing & Operations Synthesizer',
    icon: Newspaper,
    iconColor: 'bg-rose-50 text-rose-700 border-rose-200',
    autonomyBadge: 'AUTO · Synthesized at 8:00 AM',
    autonomyStyle: 'bg-rose-50 text-rose-800 border-rose-200',
    trigger: 'Daily 8:00 AM tick & client queue boot',
    overview:
      'Distills incoming communications into a high-level briefing card for Priya, highlighting the exact count of decisions requiring her attention vs routine items handled by Maya.',
    scenario: {
      inputSubject: 'Daily Executive Inbox Summary — Monday Morning',
      inputSender: 'Daybook Digest Engine <internal@daybook.local>',
      inputSnippet:
        '40 emails received over past 24 hours across investment, legal, and operational channels.',
      actionLabel: 'EXECUTIVE_BRIEFING',
      actionStyle: 'bg-indigo-50 text-indigo-800 border-indigo-300',
      actionSummary: 'Synthesized 3 client decisions, 12 assistant actions, and 5 waiting threads.',
      reversibility: 'Read-only briefing card; updates in real time',
      previewHeadline: 'Good morning, Priya.',
      previewBody:
        'Today: 3 decisions require your signoff, 12 handled by Maya, and 5 threads waiting on external replies.',
      interactiveButtonText: 'Open Decision Queue',
      simulatedOutcome: 'Loaded 3 distilled decision cards for one-tap executive signoff.',
    },
    canDo: [
      'Scans all incoming threads and autonomous triage actions',
      'Summarizes decision queue into clean executive bullet points',
      'Calculates hours saved today (~40s per auto-handled routine email)',
      'Renders personalized morning greetings on Priya’s mobile queue',
    ],
    neverDoes: [
      'Never conceals high-stakes decisions or low-confidence threads',
      'Never communicates with external contacts',
      'Never modifies thread or draft states',
    ],
  },
  guardian: {
    id: 'guardian',
    name: 'Guardian Agent',
    tagline: 'Zero-Trust Safety Auditor & Auto-Undo',
    icon: ShieldCheck,
    iconColor: 'bg-violet-50 text-violet-700 border-violet-200',
    autonomyBadge: 'AUTO · Continuous Risk Oversight',
    autonomyStyle: 'bg-violet-50 text-violet-800 border-violet-200',
    trigger: 'Continuous audit on all agent executions',
    overview:
      'The zero-trust safety layer that protects your inbox. Guardian inspects every autonomous action against VIP lists, compliance rules, and legal keywords, instantly rescuing misclassified emails.',
    scenario: {
      inputSubject: 'Series A Term Sheet — Fenwick Counsel & Wire Escrow',
      inputSender: 'Roelof Botha <roelof@sequoia.com>',
      inputSnippet:
        'Priya, please review the revised $45,000 wire escrow amendment and provide your electronic signature before 4 PM.',
      actionLabel: 'REVERSED TO NEEDS_REVIEW',
      actionStyle: 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400',
      actionSummary: 'Detected VIP domain + wire + signature terms. Rescued from Quiet Folder.',
      reversibility: 'Automatically reversed to human decision lane',
      previewHeadline: 'Guardian Reversal Audit Proof',
      previewBody:
        'Rescued thread from Quiet Folder: Detected VIP domain (sequoia.com) and $45k wire escrow keywords. Restored to NEEDS_REVIEW.',
      interactiveButtonText: 'Verify Audit Proof',
      simulatedOutcome: 'Audit proof verified: Zero compliance or VIP violations permitted.',
    },
    canDo: [
      'Audits every auto-handled email against strict VIP and compliance lists',
      'Detects hidden financial, contract, wire, equity, or deadline terms ($500+)',
      'Identifies direct executive outreach ("Priya, can you confirm...")',
      'Instantly reverses bad auto-file actions and restores threads to NEEDS_REVIEW',
      'Produces daily audit proofs guaranteeing nothing slipped into Quiet Folder',
    ],
    neverDoes: [
      'Never allows a VIP sender to remain filed in Quiet Folder',
      'Never overrides an intentional human decision made by Maya or Priya',
      'Never deletes or alters audit logs',
    ],
  },
};

export default function AgentsCollectiveSection() {
  const shouldReduceMotion = useReducedMotion();
  const [activeAgent, setActiveAgent] = useState('drafting');
  const [interactiveFeedback, setInteractiveFeedback] = useState(null);

  const currentProfile = AGENT_PROFILES[activeAgent] || AGENT_PROFILES.drafting;
  const ActiveIcon = currentProfile.icon;

  function handleInteractiveAction() {
    setInteractiveFeedback(currentProfile.scenario.simulatedOutcome);
    setTimeout(() => {
      setInteractiveFeedback(null);
    }, 4000);
  }

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

        {/* 6 Agent Interactive Chips Row with Clear Active State */}
        <div className="space-y-3 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {AGENTS.map((agent) => {
              const Icon = agent.icon;
              const isSelected = activeAgent === agent.id;

              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => {
                    setActiveAgent(agent.id);
                    setInteractiveFeedback(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-ink-900 text-white border-ink-900 shadow-soft scale-105 ring-2 ring-ink-900/10'
                      : 'bg-white hover:bg-ink-50 text-ink-700 border-black/[0.07] shadow-2xs hover:border-black/20'
                  }`}
                  aria-pressed={isSelected}
                  title={`Click to inspect ${agent.name}`}
                >
                  <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-accent'}`} />
                  <span>{agent.name}</span>
                </button>
              );
            })}
          </div>
          <p className="text-center text-[11px] text-ink-400 font-mono">
            Click any agent to inspect live scenarios, autonomy gates, and strict safety guardrails
          </p>
        </div>

        {/* Dynamic Agent Showcase Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProfile.id}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
            transition={{ duration: 0.25 }}
            className="bg-white border border-black/[0.08] rounded-3xl p-6 sm:p-8 md:p-10 shadow-card max-w-4xl mx-auto space-y-8"
          >
            {/* Agent Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-borderMuted/60">
              <div className="flex items-start sm:items-center gap-3.5">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${currentProfile.iconColor} flex-shrink-0 shadow-2xs`}
                >
                  <ActiveIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg md:text-xl font-serif font-bold text-ink-900">
                      {currentProfile.name}
                    </h3>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${currentProfile.autonomyStyle}`}
                    >
                      {currentProfile.autonomyBadge}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 font-medium">{currentProfile.tagline}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-right">
                <span className="text-[11px] font-mono text-ink-400 bg-ink-50 px-3 py-1 rounded-xl border border-black/[0.04]">
                  {currentProfile.trigger}
                </span>
              </div>
            </div>

            {/* Overview Description */}
            <p className="text-sm text-ink-700 leading-relaxed font-sans">
              {currentProfile.overview}
            </p>

            {/* Live Interactive Scenario Simulation Box */}
            <div className="bg-[#FAF8F5] rounded-2xl p-5 md:p-6 border border-black/[0.06] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-mono font-bold text-ink-500 uppercase tracking-wider">
                    Live Seed Scenario Walkthrough
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${currentProfile.scenario.actionStyle}`}
                >
                  {currentProfile.scenario.actionLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inbound Email Received */}
                <div className="bg-white p-4 rounded-xl border border-black/[0.06] space-y-2 shadow-2xs">
                  <span className="text-[10px] font-mono font-bold text-ink-400 block uppercase">
                    1. Inbound Received
                  </span>
                  <div className="text-xs font-semibold text-ink-900 line-clamp-1">
                    {currentProfile.scenario.inputSubject}
                  </div>
                  <div className="text-[11px] text-ink-500 font-mono truncate">
                    {currentProfile.scenario.inputSender}
                  </div>
                  <p className="text-xs text-ink-600 line-clamp-2 italic pt-1 border-t border-borderMuted/40">
                    "{currentProfile.scenario.inputSnippet}"
                  </p>
                </div>

                {/* Autonomous Result */}
                <div className="bg-white p-4 rounded-xl border border-black/[0.06] space-y-2 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-ink-400 block uppercase">
                      2. Autonomous Result
                    </span>
                    <div className="text-xs font-serif font-bold text-ink-900">
                      {currentProfile.scenario.previewHeadline}
                    </div>
                    <p className="text-xs text-ink-600 leading-relaxed">
                      {currentProfile.scenario.previewBody}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-borderMuted/40 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                      {currentProfile.scenario.reversibility}
                    </span>
                    <button
                      type="button"
                      onClick={handleInteractiveAction}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-ink-900 text-white font-semibold hover:bg-ink-800 transition active:scale-95 cursor-pointer shadow-2xs"
                    >
                      {currentProfile.scenario.interactiveButtonText}
                    </button>
                  </div>
                </div>
              </div>

              {/* Feedback toast banner upon clicking scenario button */}
              {interactiveFeedback && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium"
                >
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{interactiveFeedback}</span>
                </motion.div>
              )}
            </div>

            {/* Can Do vs Never Does Boundaries Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Can Do */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-serif font-bold text-ink-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Superpowers & Responsibilities</span>
                </div>
                <ul className="space-y-2 text-xs text-ink-700">
                  {currentProfile.canDo.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Never Does */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-serif font-bold text-ink-900">
                  <Lock className="h-4 w-4 text-accent" />
                  <span>Strict Safety Guardrails</span>
                </div>
                <ul className="space-y-2 text-xs text-ink-700">
                  {currentProfile.neverDoes.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer Navigation Link to Control Room */}
            <div className="pt-6 border-t border-borderMuted/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-ink-500 font-mono">
                All 6 agents can be configured, audited, and toggled in the Assistant Control Room.
              </span>
              <Link
                to="/agents"
                className="inline-flex items-center gap-1.5 font-semibold text-accent hover:text-accent-hover transition-colors font-sans group"
              >
                <span>Open Agent Control Room</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Funnel Architecture Overview: 40 emails in -> agents -> only 7 reach human */}
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
                <strong className="text-ink-900 block font-serif">Guardian Safety Oversight</strong>
                Continuous zero-trust auditor detects risk terms and VIP senders, reversing bad decisions.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <RotateCcw className="h-4 w-4 text-teal-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink-900 block font-serif">1-Click State Undo</strong>
                Every automated state change stores complete reversal instructions for complete peace of mind.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
