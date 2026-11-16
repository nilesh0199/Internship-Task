import React from 'react';
import Avatar from '../Avatar.jsx';
import { LabelBadge } from '../LabelBadge.jsx';
import { ConfidenceDots } from '../ConfidenceDots.jsx';
import { Clock, Star, Paperclip, CheckCheck } from 'lucide-react';

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
  className = '',
}) {
  return (
    <div
      className={`p-4 rounded-2xl bg-white border border-black/[0.06] shadow-card hover:shadow-card-hover transition-all duration-300 text-left select-none ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-2 truncate max-w-[70%]">
          <Avatar name={sender} email={senderEmail} size="xs" />
          {isVip && <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
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
      <div className="flex items-center justify-between pt-1 border-t border-black/[0.04]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <LabelBadge label={label} size="xs" />
          {isWaiting && (
            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/50 font-medium">
              <Clock className="h-2 w-2" />
              Waiting
            </span>
          )}
          {isApproved && (
            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/50 font-medium">
              <CheckCheck className="h-2 w-2" />
              Approved
            </span>
          )}
        </div>
        <ConfidenceDots confidence={confidence} />
      </div>
    </div>
  );
}
