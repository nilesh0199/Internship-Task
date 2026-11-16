import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import MiniEmailCard from './MiniEmailCard.jsx';
import { Sparkles, ArrowRight, UserCheck, ShieldCheck, Mail } from 'lucide-react';
import { toast } from 'sonner';

const COLUMN_1_CARDS = [
  {
    sender: 'Mark Suster',
    senderEmail: 'mark.suster@upfront.com',
    isVip: true,
    subject: 'Series B Term Sheet & Valuation Terms',
    snippet: 'Priya, Upfront has finalized the $15M lead term sheet. Please review and sign before 4 PM today.',
    time: '9:12 AM',
    label: 'CLIENT_TO_REPLY',
    confidence: 0.98,
    isWaiting: false,
  },
  {
    sender: 'Sarah Jenkins',
    senderEmail: 's.jenkins@fenwick.com',
    isVip: true,
    subject: 'FW: Executive Stock Option Plan (ESOP)',
    snippet: 'Priya, Fenwick counsel has prepared the revised equity schedules for your signature.',
    time: 'Yesterday',
    label: 'CLIENT_TO_REPLY',
    confidence: 0.95,
    isWaiting: false,
  },
  {
    sender: 'Elena Rostova',
    senderEmail: 'elena@vortexdynamics.com',
    isVip: false,
    subject: 'Q3 Product Roadmap Review & Signoff',
    snippet: 'Priya, can you confirm if you want hardware v2 shipped in September or October?',
    time: 'Yesterday',
    label: 'CLIENT_TO_REPLY',
    confidence: 0.91,
    isWaiting: false,
  },
  {
    sender: 'Marcus Vance',
    senderEmail: 'marcus@acmecorp.com',
    isVip: false,
    subject: 'Enterprise Expansion Amendment Sign-off',
    snippet: 'We need Priya to personally sign off on the 20% discount amendment before 4 PM.',
    time: '8:45 AM',
    label: 'CLIENT_TO_REPLY',
    confidence: 0.94,
    isWaiting: false,
  },
];

const COLUMN_2_CARDS = [
  {
    sender: 'Alex Wilhelm',
    senderEmail: 'alex.wilhelm@techcrunch.com',
    isVip: false,
    subject: 'Speaker Agreement: TechCrunch Disrupt Mainstage',
    snippet: 'Hi Maya, Priya and I have confirmed the keynote terms with Fenwick. Ready for fireside!',
    time: '10:04 AM',
    label: 'ASSISTANT_TO_REPLY',
    confidence: 0.92,
    isApproved: true,
  },
  {
    sender: 'David Kim',
    senderEmail: 'david.kim@vortexdynamics.com',
    isVip: false,
    subject: 'Office Lease Escalation - Parking Allocation',
    snippet: 'Maya, please advise on which parking spots to keep for the executive suite.',
    time: 'Yesterday',
    label: 'ASSISTANT_TO_REPLY',
    confidence: 0.89,
    isWaiting: true,
  },
  {
    sender: 'Catering Concierge',
    senderEmail: 'orders@urbanpalate.com',
    isVip: false,
    subject: 'Confirmation: Board Dinner Menu for 12',
    snippet: 'Maya, dietary preferences noted. Total is $780 billed to company card on file.',
    time: 'Yesterday',
    label: 'ASSISTANT_TO_REPLY',
    confidence: 0.93,
    isWaiting: false,
  },
  {
    sender: 'St. Regis Hotel',
    senderEmail: 'reservations@stregis.com',
    isVip: false,
    subject: 'Executive Offsite Room Block Confirmation',
    snippet: 'Maya, all 8 suites reserved for Priya and executive team. Confirmation #99482.',
    time: '2 days ago',
    label: 'ASSISTANT_TO_REPLY',
    confidence: 0.96,
    isWaiting: false,
  },
];

const COLUMN_3_CARDS = [
  {
    sender: 'Substack Syndicate',
    senderEmail: 'newsletter@substacksyndicate.com',
    isVip: false,
    subject: 'The Future of Enterprise LLMs — let me know!',
    snippet: 'List-Unsubscribe detected. Filtered by deterministic rules engine into Quiet Folder.',
    time: '7:30 AM',
    label: 'NO_REPLY_NEEDED',
    confidence: 0.99,
    isWaiting: false,
  },
  {
    sender: 'AWS Billing',
    senderEmail: 'no-reply-aws@amazon.com',
    isVip: false,
    subject: 'Amazon Web Services Invoice #8849204',
    snippet: 'Automated receipt. Payment processed successfully via corporate card on file.',
    time: '3 days ago',
    label: 'NO_REPLY_NEEDED',
    confidence: 0.99,
    isWaiting: false,
  },
  {
    sender: 'Danielle Brooks',
    senderEmail: 'd.brooks@growthcapital.vc',
    isVip: false,
    subject: 'Tentative Investor Sync - Rescheduling needed',
    snippet: 'Conflict detected with Board Prep Session on Thursday 3:00 PM. Escalate to review.',
    time: '11:15 AM',
    label: 'NEEDS_REVIEW',
    confidence: 0.62,
    isWaiting: false,
  },
  {
    sender: 'Google Calendar',
    senderEmail: 'calendar-notification@google.com',
    isVip: false,
    subject: 'Accepted: All-Hands Product Sync with Elena',
    snippet: 'Elena Rostova has accepted your invitation. No action required.',
    time: 'Yesterday',
    label: 'NO_REPLY_NEEDED',
    confidence: 0.99,
    isWaiting: false,
  },
];

export default function HeroSection() {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState(null);

  async function handleDemoLaunch(role) {
    setLoadingRole(role);
    try {
      await loginDemo(role);
      toast.success(
        role === 'client'
          ? 'Welcome to Priya Sharma\'s Decision Queue'
          : 'Welcome to Assistant Maya Lin\'s Workspace'
      );
      navigate(role === 'client' ? '/client' : '/assistant');
    } catch (err) {
      toast.error('Demo login failed: ' + err.message);
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden text-center">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Pill Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/[0.08] shadow-xs text-xs font-semibold text-ink-700">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>A daybook for your inbox · Purpose-built for EAs & Founders</span>
        </div>

        {/* Editorial Fraunces Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-ink-900 tracking-tight leading-[1.08] max-w-4xl mx-auto">
          Every morning, know exactly who needs to reply.
        </h1>

        {/* Subhead */}
        <p className="text-base sm:text-lg text-ink-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Daybook Mail uses risk-aware AI to triage your executive's inbox into four unambiguous streams: Assistant, Client, Quiet, or Review. No unread badges. No paralyzed mornings.
        </p>

        {/* CTA Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => handleDemoLaunch('assistant')}
            disabled={!!loadingRole}
            className="px-6 py-3.5 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-card transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <span>{loadingRole === 'assistant' ? 'Loading Maya...' : 'Explore the live demo'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => handleDemoLaunch('client')}
            disabled={!!loadingRole}
            className="px-6 py-3.5 rounded-full bg-white hover:bg-ink-50 border border-black/[0.08] text-ink-800 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-soft transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <UserCheck className="h-4 w-4 text-label-client" />
            <span>{loadingRole === 'client' ? 'Loading Priya...' : 'See client view'}</span>
          </button>

          <button
            onClick={() => navigate('/login')}
            className="px-5 py-3.5 rounded-full text-ink-600 hover:text-ink-900 text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer"
          >
            Sign in & Connect
          </button>
        </div>

        {/* Hero Visual: Drifting Cards Collage */}
        <div className="pt-12 relative max-w-5xl mx-auto">
          {/* Top & Bottom Gradient Fade Masks */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#FAF8F5] to-transparent z-10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FAF8F5] to-transparent z-10" />

          {/* 3 Floating Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[460px] overflow-hidden group">
            {/* Column 1: Client to Reply */}
            <div className="space-y-4 hover:pause transition-all">
              {COLUMN_1_CARDS.map((card, idx) => (
                <MiniEmailCard key={idx} {...card} />
              ))}
            </div>

            {/* Column 2: Assistant to Reply */}
            <div className="space-y-4 pt-8 hover:pause transition-all">
              {COLUMN_2_CARDS.map((card, idx) => (
                <MiniEmailCard key={idx} {...card} />
              ))}
            </div>

            {/* Column 3: Quiet & Review */}
            <div className="space-y-4 pt-4 hover:pause transition-all hidden md:block">
              {COLUMN_3_CARDS.map((card, idx) => (
                <MiniEmailCard key={idx} {...card} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
