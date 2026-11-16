import React, { useState } from 'react';
import {
  Clock,
  AlertCircle,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  Send,
  UserCheck,
  Quote,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export function DecisionCard({ thread, draft, onAction }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isHandingOver, setIsHandingOver] = useState(false);
  const [handoverNote, setHandoverNote] = useState('');

  const decision = thread.aiReason?.decision || {
    question: `Review and decide on ${thread.subject}?`,
    options: ['Approve', 'Decline'],
    deadline: thread.dueDate ? 'Today 5:00 PM' : null,
    consequence: 'Pending transaction on hold',
  };

  const sender = thread.participants?.[0]?.name || thread.participants?.[0]?.email || 'Sender';
  const receivedDate = new Date(thread.lastMessageAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border border-black/[0.06] rounded-3xl p-7 md:p-9 shadow-card hover:shadow-card-hover transition-all duration-300 space-y-6 relative overflow-hidden">
      {/* Top Metadata Strip: Sender, Date, Urgency Chip */}
      <div className="flex items-center justify-between text-xs text-ink-500 border-b border-borderMuted/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-ink-100 text-ink-800 font-bold text-xs flex items-center justify-center">
            {sender[0].toUpperCase()}
          </div>
          <span className="font-bold text-ink-900 tracking-tight">{sender}</span>
          <span>•</span>
          <span className="text-ink-400 font-mono text-[11px]">{receivedDate}</span>
        </div>

        {decision.deadline && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 font-semibold text-xs border border-red-200/70 shadow-2xs">
            <Clock className="h-3.5 w-3.5" />
            <span>Due: {decision.deadline}</span>
          </span>
        )}
      </div>

      {/* Decision Question Headline (Fraunces Serif) */}
      <div className="space-y-1.5">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink-900 leading-snug tracking-tight">
          {decision.question}
        </h2>
        {decision.consequence && (
          <p className="text-xs text-ink-500 font-medium tracking-tight">
            Consequence of delay: <span className="text-ink-700 font-semibold">{decision.consequence}</span>
          </p>
        )}
      </div>

      {/* Key Context & Evidence Card */}
      <div className="p-5 rounded-2xl bg-[#FAF8F5]/80 border border-black/[0.04] space-y-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400 block">
          Key Context & Reasoning
        </span>
        <ul className="text-xs text-ink-800 space-y-2 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-400 mt-1.5 flex-shrink-0" />
            <span>{thread.aiReason?.summary || thread.snippet}</span>
          </li>
          {thread.aiReason?.evidence && (
            <li className="flex items-start gap-2 italic text-amber-950 font-serif bg-[#FFFBF0] p-3 rounded-xl border border-amber-200/60">
              <Quote className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>"{thread.aiReason.evidence}"</span>
            </li>
          )}
          <li className="flex items-start gap-2 text-ink-600">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-400 mt-1.5 flex-shrink-0" />
            <span>
              <strong className="text-ink-900 font-semibold">Why this requires you:</strong> {thread.aiReason?.reason || 'Requires personal CEO decision.'}
            </span>
          </li>
        </ul>
      </div>

      {/* Prepared Assistant Draft Preview (if Maya prepared a draft) */}
      {draft && (
        <div className="p-5 rounded-2xl bg-[#F0FDFA] border border-teal-200/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-950 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span>Maya Prepared This Response For You</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-teal-800 bg-white/80 px-2.5 py-0.5 rounded-full border border-teal-200/60">
              1-Tap Approval Ready
            </span>
          </div>
          <div className="text-xs text-teal-950 font-serif whitespace-pre-wrap bg-white/90 p-4 rounded-xl border border-teal-100 leading-relaxed shadow-2xs">
            {draft.bodyText}
          </div>
        </div>
      )}

      {/* Action Button Strip */}
      <div className="pt-2 flex flex-wrap items-center gap-3">
        {draft ? (
          <button
            onClick={() => onAction('approve', { draftId: draft._id })}
            className="px-6 py-3 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-soft transition-all active:scale-95"
          >
            <Check className="h-4 w-4" />
            <span>Approve Maya's Draft</span>
          </button>
        ) : (
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="px-6 py-3 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-soft transition-all active:scale-95"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Reply Myself</span>
          </button>
        )}

        <button
          onClick={() => setIsHandingOver(!isHandingOver)}
          className="px-5 py-3 rounded-full border border-black/[0.08] bg-white hover:bg-ink-50 text-ink-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-soft active:scale-95"
        >
          <UserCheck className="h-3.5 w-3.5 text-accent" />
          <span>Hand to Maya</span>
        </button>

        <button
          onClick={() => onAction('snooze')}
          className="px-4 py-3 rounded-full text-xs font-medium text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition cursor-pointer"
        >
          Snooze 24h
        </button>

        <button
          onClick={() => onAction('handled')}
          className="px-4 py-3 rounded-full text-xs font-medium text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition ml-auto cursor-pointer"
        >
          Mark Handled
        </button>
      </div>

      {/* Handover to Assistant Note Input */}
      {isHandingOver && (
        <div className="p-4 rounded-2xl bg-ink-50/80 border border-borderMuted space-y-2.5 animate-in fade-in">
          <label className="block text-xs font-semibold text-ink-800 tracking-tight">
            Instructions for Maya (e.g. "Decline politely and propose early November instead")
          </label>
          <input
            type="text"
            value={handoverNote}
            onChange={(e) => setHandoverNote(e.target.value)}
            placeholder="Type your direction..."
            className="w-full px-3.5 py-2 text-xs bg-white border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
          />
          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              onClick={() => setIsHandingOver(false)}
              className="px-3.5 py-1.5 text-xs text-ink-500 hover:text-ink-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onAction('hand_to_assistant', { note: handoverNote });
                setIsHandingOver(false);
              }}
              className="px-4 py-1.5 rounded-full bg-ink-900 text-white text-xs font-semibold shadow-xs cursor-pointer hover:bg-ink-800 transition"
            >
              Delegate to Maya
            </button>
          </div>
        </div>
      )}

      {/* Reply Myself Composer */}
      {isReplying && (
        <div className="p-5 rounded-2xl bg-ink-50/80 border border-borderMuted space-y-3 animate-in fade-in">
          <label className="block text-xs font-semibold text-ink-800 tracking-tight">
            Your Direct Executive Reply
          </label>
          <textarea
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your response..."
            className="w-full p-3.5 text-xs bg-white border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 leading-relaxed font-sans"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setIsReplying(false)}
              className="px-3.5 py-1.5 text-xs text-ink-500 hover:text-ink-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onAction('approve', { note: replyText });
                setIsReplying(false);
              }}
              className="px-5 py-2 rounded-full bg-ink-900 text-white text-xs font-semibold shadow-xs cursor-pointer hover:bg-ink-800 transition"
            >
              Send Response
            </button>
          </div>
        </div>
      )}

      {/* Expandable Conversation History */}
      <div className="pt-2 border-t border-borderMuted/60">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-medium text-ink-400 hover:text-ink-900 flex items-center gap-1.5 cursor-pointer transition select-none"
        >
          <span>{isExpanded ? 'Hide conversation history' : 'Read original email context'}</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {isExpanded && (
          <div className="mt-4 p-4 rounded-2xl bg-ink-50/50 border border-borderMuted/60 text-xs text-ink-800 leading-relaxed font-sans whitespace-pre-wrap">
            {thread.snippet || 'No earlier history available.'}
          </div>
        )}
      </div>
    </div>
  );
}
