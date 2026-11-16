import React from 'react';

const LABEL_CONFIG = {
  CLIENT_TO_REPLY: {
    text: 'Client to Reply',
    bg: 'bg-[#FDF2E9]',
    color: 'text-[#C25E38]',
    border: 'border-[#C25E38]/25',
  },
  ASSISTANT_TO_REPLY: {
    text: 'Assistant to Reply',
    bg: 'bg-[#F0FDFA]',
    color: 'text-[#0F766E]',
    border: 'border-[#0F766E]/25',
  },
  NO_REPLY_NEEDED: {
    text: 'No Reply Needed',
    bg: 'bg-[#F1F5F9]',
    color: 'text-[#64748B]',
    border: 'border-[#64748B]/25',
  },
  NEEDS_REVIEW: {
    text: 'Needs Review',
    bg: 'bg-[#F5F3FF]',
    color: 'text-[#7C3AED]',
    border: 'border-[#7C3AED]/25',
  },
};

export function LabelBadge({ label, size = 'sm', className = '' }) {
  const config = LABEL_CONFIG[label] || {
    text: label ? label.replace(/_/g, ' ') : 'Unclassified',
    bg: 'bg-ink-100',
    color: 'text-ink-700',
    border: 'border-borderMuted',
  };

  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5'
      : size === 'lg'
      ? 'text-xs px-3 py-1 font-semibold'
      : 'text-[11px] px-2 py-0.5 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${config.bg} ${config.color} ${config.border} ${sizeClasses} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      <span>{config.text}</span>
    </span>
  );
}
