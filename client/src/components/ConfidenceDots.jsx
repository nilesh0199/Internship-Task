import React from 'react';

export function ConfidenceDots({ confidence = 0.9, showText = false }) {
  let level = 'high';
  let filled = 3;
  let activeColor = 'bg-emerald-500 ring-2 ring-emerald-500/20';
  let labelText = 'High confidence';

  if (confidence < 0.55) {
    level = 'low';
    filled = 1;
    activeColor = 'bg-violet-500 ring-2 ring-violet-500/20';
    labelText = 'Low confidence';
  } else if (confidence < 0.8) {
    level = 'medium';
    filled = 2;
    activeColor = 'bg-amber-500 ring-2 ring-amber-500/20';
    labelText = 'Medium confidence';
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 select-none"
      title={`${labelText} (${Math.round(confidence * 100)}%)`}
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
              idx <= filled ? activeColor : 'bg-ink-300/40'
            }`}
          />
        ))}
      </div>
      {showText && (
        <span className="text-[11px] font-medium text-ink-500 tracking-tight">
          {labelText}
        </span>
      )}
    </div>
  );
}
