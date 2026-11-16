import React, { useState, useEffect } from 'react';
import Avatar from '../Avatar.jsx';
import { LabelBadge } from '../LabelBadge.jsx';
import { ConfidenceDots } from '../ConfidenceDots.jsx';
import { Clock, Star, CheckCheck, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export default function MiniEmailCard({
  sender = 'Mark Suster',
  senderEmail = 'mark.suster@upfront.com',
  isVip = false,
  subject = 'Series B Term Sheet Confirmation',
  snippet = 'Priya, please review the final liquidation preference clause before 5 PM today.',
  time = '9:42 AM',
  label = 'CLIENT_TO_REPLY',
  confidence = 0.96,
  isWaiting = false,
  isApproved = false,
  isSignatureCard = false,
  className = '',
}) {
  const shouldReduceMotion = useReducedMotion();
  const [isClassified, setIsClassified] = useState(!isSignatureCard);

  // Signature Motion cycle: swaps from analyzing to classified with a spring pop
  useEffect(() => {
    if (!isSignatureCard || shouldReduceMotion) {
      setIsClassified(true);
      return;
    }

    const interval = setInterval(() => {
      setIsClassified((prev) => !prev);
    }, 4500);

    return () => clearInterval(interval);
  }, [isSignatureCard, shouldReduceMotion]);

  return (
    <div
      className={`p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.04)] transition-all duration-300 text-left select-none relative ${
        isSignatureCard && !isClassified
          ? 'ring-1 ring-accent/30 bg-teal-50/[0.15]'
          : ''
      } ${className}`}
    >
      {/* Signature Card Live Indicator Tag */}
      {isSignatureCard && (
        <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-accent text-[9px] font-semibold text-white tracking-wide shadow-2xs flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          <span>{isClassified ? 'AI Classified' : 'Classifying...'}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-2 truncate max-w-[70%]">
          <Avatar name={sender} email={senderEmail} size="xs" />
          {isVip && (
            <Star
              className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0"
              strokeWidth={1.5}
            />
          )}
          <span className="font-semibold text-ink-900 truncate tracking-tight text-[11px]">
            {sender}
          </span>
        </div>
        <span className="text-[10px] text-ink-400 font-mono flex-shrink-0">{time}</span>
      </div>

      {/* Subject */}
      <h4 className="text-xs font-semibold text-ink-900 truncate tracking-tight mb-1">
        {subject}
      </h4>

      {/* Snippet */}
      <p className="text-[11px] text-ink-500 line-clamp-2 leading-relaxed mb-3">
        {snippet}
      </p>

      {/* Footer Badges */}
      <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] min-h-[26px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isSignatureCard && !isClassified ? (
            <motion.div
              initial={{ opacity: 0.6 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="px-2 py-0.5 rounded-full bg-ink-100 text-[10px] font-medium text-ink-500 flex items-center gap-1"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
              <span>Analyzing intent...</span>
            </motion.div>
          ) : (
            <motion.div
              key="classified-badge"
              initial={isSignatureCard ? { scale: 0.85, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="flex items-center gap-1.5"
            >
              <LabelBadge label={label} size="xs" />
              {isWaiting && (
                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/50 font-medium">
                  <Clock className="h-2 w-2" strokeWidth={1.5} />
                  Waiting
                </span>
              )}
              {isApproved && (
                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/50 font-medium">
                  <CheckCheck className="h-2 w-2" strokeWidth={1.5} />
                  Approved
                </span>
              )}
            </motion.div>
          )}
        </div>

        <div>
          {isSignatureCard && !isClassified ? (
            <div className="flex items-center gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-200" />
              <span className="h-1.5 w-1.5 rounded-full bg-ink-200" />
              <span className="h-1.5 w-1.5 rounded-full bg-ink-200" />
            </div>
          ) : (
            <motion.div
              initial={isSignatureCard ? { opacity: 0, x: 4 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ConfidenceDots confidence={confidence} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
