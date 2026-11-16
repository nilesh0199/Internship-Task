import React from 'react';
import { LabelBadge } from './LabelBadge.jsx';
import { ConfidenceDots } from './ConfidenceDots.jsx';
import { Star, Clock, Calendar, CheckCheck, AlertCircle } from 'lucide-react';

export function ThreadRow({ thread, isSelected, onClick, onQuickReclassify }) {
  const isVip = thread.participants?.some((p) => p.isVip);
  const sender = thread.participants?.[0]?.name || thread.participants?.[0]?.email || 'Unknown';
  const lastDate = thread.lastMessageAt ? new Date(thread.lastMessageAt) : new Date();

  const formattedDate =
    lastDate.toDateString() === new Date().toDateString()
      ? lastDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : lastDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div
      onClick={onClick}
      className={`p-3.5 border-b border-borderMuted/80 cursor-pointer transition relative select-none ${
        isSelected
          ? 'bg-accent/5 border-l-4 border-l-accent'
          : 'hover:bg-ink-100/40 bg-white'
      } ${!thread.isRead ? 'font-medium' : ''}`}
    >
      {/* Top Line: Sender, VIP, Time, Unread */}
      <div className="flex items-center justify-between text-xs mb-1">
        <div className="flex items-center gap-1.5 truncate max-w-[70%]">
          {!thread.isRead && (
            <span className="h-2 w-2 rounded-full bg-accent flex-shrink-0" />
          )}
          {isVip && (
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}
          <span
            className={`truncate ${
              !thread.isRead ? 'font-bold text-ink-900' : 'text-ink-700'
            }`}
          >
            {sender}
          </span>
          {thread.messageCount > 1 && (
            <span className="text-[10px] text-ink-500 font-normal">
              ({thread.messageCount})
            </span>
          )}
        </div>

        <span className="text-[11px] text-ink-500 font-normal flex-shrink-0">
          {formattedDate}
        </span>
      </div>

      {/* Middle Line: Subject */}
      <div className="text-xs font-semibold text-ink-900 truncate mb-1">
        {thread.subject}
      </div>

      {/* Summary Snippet */}
      <div className="text-[11px] text-ink-500 line-clamp-1 mb-2 font-normal">
        {thread.aiReason?.summary || thread.snippet}
      </div>

      {/* Bottom Line: Badges & Chips */}
      <div className="flex items-center justify-between gap-1 pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <LabelBadge label={thread.currentLabel} size="xs" />

          {thread.isWaiting && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="h-2.5 w-2.5" />
              <span>Waiting</span>
            </span>
          )}

          {thread.dueDate && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
              <Calendar className="h-2.5 w-2.5" />
              <span>Due today</span>
            </span>
          )}

          {thread.clientStatus === 'handled' && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
              <CheckCheck className="h-2.5 w-2.5" />
              <span>Approved</span>
            </span>
          )}
        </div>

        <ConfidenceDots confidence={thread.confidence} />
      </div>
    </div>
  );
}
