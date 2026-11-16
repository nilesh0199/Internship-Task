import React from 'react';
import {
  Inbox,
  UserCheck,
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  AlertCircle,
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
    <div className="bg-white border-b border-borderMuted px-4 py-2.5">
      {/* Metric Chips Row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSegment === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSegment(item.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition flex-shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-ink-900 text-white font-semibold'
                  : 'bg-ink-100/60 hover:bg-ink-100 text-ink-700'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : item.color || 'text-ink-500'}`} />
              <span>{item.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-white text-ink-900 font-semibold shadow-xs'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Calendar Conflict Alert (if any) */}
      {conflicts.length > 0 && (
        <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2 animate-pulse">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Schedule Conflict:</strong> {conflicts[0]?.title || 'Board Dry-Run'} overlaps on Thursday 3:00 PM with Investor Sync.
          </span>
        </div>
      )}
    </div>
  );
}
