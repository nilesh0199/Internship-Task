import React from 'react';
import { LabelBadge } from './LabelBadge.jsx';
import { ConfidenceDots } from './ConfidenceDots.jsx';
import { Star, Clock, Calendar, CheckCheck, Paperclip } from 'lucide-react';

export function ThreadRow({ thread, isSelected, onClick }) {
  const isVip = thread.participants?.some((p) => p.isVip);
  const sender = thread.participants?.[0]?.name || thread.participants?.[0]?.email || 'Unknown';
  const lastDate = thread.lastMessageAt ? new Date(thread.lastMessageAt) : new Date();

  const formattedDate =
    lastDate.toDateString() === new Date().toDateString()
      ? lastDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : lastDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  // Get sender initials for a clean visual avatar circle
  const initials = sender
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <div
      onClick={onClick}
      className={`mx-2 my-1 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 relative select-none ${
        isSelected
          ? 'bg-white shadow-soft ring-1 ring-ink-900/10 border-l-4 border-l-ink-900'
          : 'bg-transparent hover:bg-white/90 hover:shadow-soft border border-transparent hover:border-black/[0.04]'
      }`}
    >
      {/* Top Line: Sender, Initials, VIP, Time, Unread Dot */}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-2 truncate max-w-[72%]">
          {!thread.isRead ? (
            <span className="h-2 w-2 rounded-full bg-blue-600 ring-4 ring-blue-100 flex-shrink-0" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-ink-100/90 text-ink-600 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
          )}

          {isVip && (
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}

          <span
            className={`truncate tracking-tight ${
              !thread.isRead ? 'font-bold text-ink-900' : 'font-medium text-ink-700'
            }`}
          >
            {sender}
          </span>

          {thread.messageCount > 1 && (
            <span className="text-[10px] text-ink-400 font-mono">
              ({thread.messageCount})
            </span>
          )}
        </div>

        <span className="text-[11px] text-ink-400 font-normal flex-shrink-0">
          {formattedDate}
        </span>
      </div>

      {/* Middle Line: Subject & Attachment icon */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <h4
          className={`text-xs truncate tracking-tight ${
            !thread.isRead ? 'font-semibold text-ink-900' : 'font-medium text-ink-800'
          }`}
        >
          {thread.subject}
        </h4>
        {thread.hasAttachments && (
          <Paperclip className="h-3 w-3 text-ink-400 flex-shrink-0" />
        )}
      </div>

      {/* Summary Snippet */}
      <p className="text-[11px] text-ink-500 line-clamp-1 mb-2.5 font-normal leading-relaxed">
        {thread.aiReason?.summary || thread.snippet}
      </p>

      {/* Bottom Line: Semantic Badges & Chips */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <LabelBadge label={thread.currentLabel} size="xs" />

          {thread.isWaiting && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 font-medium">
              <Clock className="h-2.5 w-2.5" />
              <span>Waiting</span>
            </span>
          )}

          {thread.dueDate && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/60 font-semibold">
              <Calendar className="h-2.5 w-2.5" />
              <span>Due today</span>
            </span>
          )}

          {thread.clientStatus === 'handled' && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
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
