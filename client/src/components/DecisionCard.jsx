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
    <div className="bg-white border border-borderMuted rounded-2xl p-6 md:p-8 shadow-sm space-y-6 relative overflow-hidden transition-all">
      {/* Top Metadata: Sender, Date, Deadline Chip */}
      <div className="flex items-center justify-between text-xs text-ink-500 border-b border-borderMuted/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink-900">{sender}</span>
          <span>•</span>
          <span>{receivedDate}</span>
        </div>

        {decision.deadline && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold text-[11px] border border-red-200/60">
            <Clock className="h-3 w-3" />
            <span>Due: {decision.deadline}</span>
          </span>
        )}
      </div>

      {/* Decision Question Headline (Fraunces Serif) */}
      <div className="space-y-1">
        <h2 className="text-xl md:text-2xl font-serif font-bold text-ink-900 leading-snug">
          {decision.question}
        </h2>
        {decision.consequence && (
          <p className="text-xs text-ink-500 font-medium">
            Consequence of delay: <span className="text-ink-700">{decision.consequence}</span>
          </p>
        )}
      </div>

      {/* 2-3 Bullet Points Context */}
      <div className="p-4 rounded-xl bg-ink-100/40 border border-borderMuted/80 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 block">
          Key Context & Evidence
        </span>
        <ul className="text-xs text-ink-800 space-y-1.5 list-disc list-inside leading-relaxed">
          <li>{thread.aiReason?.summary || thread.snippet}</li>
          {thread.aiReason?.evidence && (
            <li className="italic text-ink-700">"{thread.aiReason.evidence}"</li>
          )}
          <li>
            <strong>Why escalated to you:</strong> {thread.aiReason?.reason || 'Requires CEO authority.'}
          </li>
        </ul>
      </div>

      {/* Prepared Assistant Draft Preview (if Maya drafted a response) */}
      {draft && (
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Maya Prepared This Draft For You:</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-700">1-Tap Approval Ready</span>
          </div>
          <div className="text-xs text-emerald-950 font-serif whitespace-pre-wrap bg-white/80 p-3 rounded-lg border border-emerald-200/60 leading-relaxed">
            {draft.bodyText}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 flex flex-wrap items-center gap-3">
        {draft ? (
          <button
            onClick={() => onAction('approve', { draftId: draft._id })}
            className="px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition"
          >
            <Check className="h-4 w-4" />
            <span>Approve Maya's Draft</span>
          </button>
        ) : (
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Reply Myself</span>
          </button>
        )}

        <button
          onClick={() => setIsHandingOver(!isHandingOver)}
          className="px-4 py-2.5 rounded-xl border border-borderMuted text-ink-700 hover:bg-ink-100 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>Hand to Maya</span>
        </button>

        <button
          onClick={() => onAction('snooze')}
          className="px-3 py-2 text-xs font-medium text-ink-500 hover:text-ink-900 transition"
        >
          Snooze 24h
        </button>

        <button
          onClick={() => onAction('handled')}
          className="px-3 py-2 text-xs font-medium text-ink-500 hover:text-ink-900 transition ml-auto"
        >
          Mark Handled
        </button>
      </div>

      {/* Handover to Assistant Note Input */}
      {isHandingOver && (
        <div className="p-3.5 rounded-xl bg-ink-100/60 border border-borderMuted space-y-2 animate-in fade-in">
          <label className="block text-xs font-medium text-ink-700">
            Note for Maya (e.g. "Decline politely and offer to reschedule in November")
          </label>
          <input
            type="text"
            value={handoverNote}
            onChange={(e) => setHandoverNote(e.target.value)}
            placeholder="Instructions for assistant..."
            className="w-full px-3 py-1.5 text-xs bg-white border border-borderMuted rounded-lg"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setIsHandingOver(false)}
              className="px-3 py-1 text-xs text-ink-500 hover:text-ink-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onAction('hand_to_assistant', { note: handoverNote });
                setIsHandingOver(false);
              }}
              className="px-3 py-1 rounded-md bg-ink-900 text-white text-xs font-medium"
            >
              Delegate to Maya
            </button>
          </div>
        </div>
      )}

      {/* Reply Myself Composer */}
      {isReplying && (
        <div className="p-4 rounded-xl bg-ink-100/60 border border-borderMuted space-y-3 animate-in fade-in">
          <label className="block text-xs font-medium text-ink-700">Your Direct Reply</label>
          <textarea
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your response..."
            className="w-full p-3 text-xs bg-white border border-borderMuted rounded-lg"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setIsReplying(false)}
              className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onAction('approve', { note: replyText });
                setIsReplying(false);
              }}
              className="px-4 py-1.5 rounded-lg bg-ink-900 text-white text-xs font-medium"
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
          className="text-xs text-ink-500 hover:text-ink-900 flex items-center gap-1 cursor-pointer transition select-none"
        >
          <span>{isExpanded ? 'Hide conversation history' : 'Read full conversation history'}</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-3 pl-2 border-l-2 border-borderMuted text-xs text-ink-800 leading-relaxed font-sans">
            <div className="p-3 rounded-lg bg-ink-100/30 whitespace-pre-wrap">
              {thread.snippet || 'No earlier history available.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
