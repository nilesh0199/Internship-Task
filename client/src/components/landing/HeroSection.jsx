import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import MiniEmailCard from './MiniEmailCard.jsx';
import { Sparkles, ArrowRight, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

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
    isSignatureCard: true, // Signature rotating classification animation
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
  const { user, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState(null);
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Scroll-linked parallax & scale
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const visualScale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);
  const visualOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.4]);

  // Subtle pointer parallax (max ~8px, disabled on touch/reduced motion)
  const [pointerOffset, setPointerOffset] = useState({ x: 0, y: 0 });

  function handleMouseMove(e) {
    if (shouldReduceMotion || window.innerWidth < 1024) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = ((clientX / innerWidth) - 0.5) * 16; // -8px to +8px
    const y = ((clientY / innerHeight) - 0.5) * 16;
    setPointerOffset({ x, y });
  }

  async function handleDemoLaunch(role) {
    setLoadingRole(role);
    try {
      await demoLogin(role);
      toast.success(
        role === 'client'
          ? "Signed in as Founder Priya Sharma"
          : "Signed in as Assistant Maya Lin"
      );
      navigate(role === 'client' ? '/client' : '/assistant');
    } catch (err) {
      toast.error('Demo login failed: ' + (err.message || 'Error'));
    } finally {
      setLoadingRole(null);
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative pt-10 pb-20 md:pt-16 md:pb-28 overflow-hidden text-center w-full max-w-full"
    >
      {/* Subtle Warm Radial Glow Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[400px] bg-gradient-to-b from-amber-100/35 via-teal-100/20 to-transparent rounded-full blur-3xl -z-10"
      />

      <motion.div
        variants={containerVariants}
        initial={shouldReduceMotion ? 'visible' : 'hidden'}
        animate="visible"
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7"
      >
        {/* Pill Tag */}
        <motion.div variants={itemVariants} className="inline-flex justify-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-black/[0.08] shadow-xs text-xs font-semibold text-ink-700">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>AI Inbox Orchestration · For Assistants & Founders</span>
          </div>
        </motion.div>

        {/* H1 Display: Fraunces fluid optical sizing */}
        <motion.div variants={itemVariants} className="overflow-hidden">
          <h1
            className="font-serif font-bold text-ink-900 tracking-[-0.03em] leading-[1.08] [text-wrap:balance] max-w-4xl mx-auto"
            style={{ fontSize: 'clamp(2.5rem, 6.5vw, 4.75rem)' }}
          >
            A daybook for your inbox.
          </h1>
        </motion.div>

        {/* Subhead: Strict ~60ch line length */}
        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg text-ink-600 max-w-[60ch] mx-auto font-normal leading-relaxed"
        >
          Daybook Mail uses risk-aware AI to decide each morning who must reply—your assistant, you, or no one at all. No unread badges. No paralyzed mornings.
        </motion.p>

        {/* CTA Buttons with 44px min touch target */}
        <motion.div
          variants={itemVariants}
          className="pt-2 flex flex-wrap items-center justify-center gap-3"
        >
          {user ? (
            <button
              onClick={() => navigate(user.role === 'client' ? '/client' : '/assistant')}
              className="min-h-[44px] px-6 py-3 rounded-full bg-accent hover:bg-accent-hover text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-card hover:shadow-card-hover transition-all active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <span>
                Open {user.role === 'client' ? 'Decision Queue' : 'Workspace'} ({user.name || (user.role === 'client' ? 'Priya' : 'Maya')})
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}

          <button
            onClick={() => handleDemoLaunch('assistant')}
            disabled={!!loadingRole}
            className={`min-h-[44px] px-6 py-3 rounded-full ${
              user ? 'bg-white hover:bg-ink-50 border border-black/[0.09] text-ink-800' : 'bg-ink-900 hover:bg-ink-800 text-white shadow-card hover:shadow-card-hover'
            } text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40`}
          >
            <span>{loadingRole === 'assistant' ? 'Booting Maya...' : 'Try Demo as Assistant'}</span>
            {!user && <ArrowRight className="h-4 w-4" />}
          </button>

          {!user && (
            <button
              onClick={() => navigate('/login')}
              className="min-h-[44px] px-5 py-3 rounded-full bg-white hover:bg-ink-50 border border-black/[0.09] text-ink-800 text-xs sm:text-sm font-semibold transition active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Sign In
            </button>
          )}
        </motion.div>

        {/* Hero Visual: Drifting Cards Collage */}
        <motion.div
          variants={itemVariants}
          style={
            shouldReduceMotion
              ? {}
              : {
                  scale: visualScale,
                  opacity: visualOpacity,
                  transform: `translate3d(${pointerOffset.x}px, ${pointerOffset.y}px, 0)`,
                }
          }
          className="pt-8 relative max-w-5xl mx-auto w-full transition-transform duration-200 ease-out"
        >
          {/* Top & Bottom Gradient Fade Masks */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#FAF8F5] via-[#FAF8F5]/80 to-transparent z-10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/90 to-transparent z-10"
          />

          {/* Drifting Card Grid: 1 col mobile, 2 col tablet, 3 col desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[440px] overflow-hidden group pause-hover">
            {/* Column 1: Client to Reply (Always visible on all screens) */}
            <div className={`space-y-4 ${shouldReduceMotion ? '' : 'animate-drift-slow'}`}>
              {[...COLUMN_1_CARDS, ...COLUMN_1_CARDS].map((card, idx) => (
                <MiniEmailCard key={`col1-${idx}`} {...card} />
              ))}
            </div>

            {/* Column 2: Assistant to Reply (Visible sm+) */}
            <div
              className={`space-y-4 pt-6 hidden sm:block ${
                shouldReduceMotion ? '' : 'animate-drift-medium'
              }`}
            >
              {[...COLUMN_2_CARDS, ...COLUMN_2_CARDS].map((card, idx) => (
                <MiniEmailCard key={`col2-${idx}`} {...card} />
              ))}
            </div>

            {/* Column 3: Quiet & Review (Visible lg+) */}
            <div
              className={`space-y-4 pt-3 hidden lg:block ${
                shouldReduceMotion ? '' : 'animate-drift-fast'
              }`}
            >
              {[...COLUMN_3_CARDS, ...COLUMN_3_CARDS].map((card, idx) => (
                <MiniEmailCard key={`col3-${idx}`} {...card} />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
