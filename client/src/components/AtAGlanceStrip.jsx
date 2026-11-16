import React from 'react';
import {
  Inbox,
  UserCheck,
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export function AtAGlanceStrip({ counts = {}, activeSegment, onSelectSegment, conflicts = [] }) {
  const items = [
    { id: 'all', label: 'All Inbox', count: counts.TOTAL || 0, icon: Inbox },
    { id: 'client', label: 'Needs Client', count: counts.CLIENT_TO_REPLY || 0, icon: UserCheck, color: 'text-label-client' },
    { id: 'assistant', label: 'Assistant Queue', count: counts.ASSISTANT_TO_REPLY || 0, icon: CheckSquare, color: 'text-label-assistant' },
    { id: 'waiting', label: 'Waiting', count: counts.WAITING || 0, icon: Clock, color: 'text-amber-600' },
    { id: 'needs_review', label: 'Needs Review', count: counts.NEEDS_REVIEW || 0, icon: AlertTriangle, color: 'text-label-review' },
    { id: 'meetings', label: 'Meetings', count: counts.MEETINGS || 0, icon: Calendar },
  ];

  return (
    <div className="bg-[#FAF8F5]/80 border-b border-borderMuted/60 px-3 py-2.5 select-none">
      {/* Metric Filter Pills Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSegment === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSegment(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-150 flex-shrink-0 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-ink-900 text-white font-semibold shadow-soft'
                  : 'bg-white hover:bg-white/90 text-ink-700 border border-black/[0.05] shadow-xs'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : item.color || 'text-ink-500'}`} />
              <span className="tracking-tight">{item.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-700'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Calendar Conflict Alert */}
      {conflicts.length > 0 && (
        <div className="mt-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="leading-snug">
            <strong>Schedule Conflict:</strong> {conflicts[0]?.title || 'Executive Session'} overlaps with another calendar event.
          </span>
        </div>
      )}
    </div>
  );
}
