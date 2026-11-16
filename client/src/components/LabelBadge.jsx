import React from 'react';

const LABEL_CONFIG = {
  CLIENT_TO_REPLY: {
    text: 'Client to Reply',
    bg: 'bg-[#FDF2E9]',
    color: 'text-[#C25E38]',
    border: 'border-[#C25E38]/20',
    dot: 'bg-[#C25E38]',
  },
  ASSISTANT_TO_REPLY: {
    text: 'Assistant to Reply',
    bg: 'bg-[#F0FDFA]',
    color: 'text-[#0F766E]',
    border: 'border-[#0F766E]/20',
    dot: 'bg-[#0F766E]',
  },
  NO_REPLY_NEEDED: {
    text: 'No Reply Needed',
    bg: 'bg-[#F1F5F9]',
    color: 'text-[#64748B]',
    border: 'border-[#64748B]/20',
    dot: 'bg-[#64748B]',
  },
  NEEDS_REVIEW: {
    text: 'Needs Review',
    bg: 'bg-[#F5F3FF]',
    color: 'text-[#7C3AED]',
    border: 'border-[#7C3AED]/20',
    dot: 'bg-[#7C3AED]',
  },
};

export function LabelBadge({ label, size = 'sm', className = '' }) {
  const config = LABEL_CONFIG[label] || {
    text: label ? label.replace(/_/g, ' ') : 'Unclassified',
    bg: 'bg-ink-100/80',
    color: 'text-ink-700',
    border: 'border-borderMuted',
    dot: 'bg-ink-400',
  };

  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-2 py-0.5'
      : size === 'lg'
      ? 'text-xs px-3 py-1 font-semibold shadow-xs'
      : 'text-[11px] px-2.5 py-0.5 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.color} ${config.border} ${sizeClasses} tracking-tight select-none ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} flex-shrink-0`} />
      <span className="font-medium">{config.text}</span>
    </span>
  );
}
