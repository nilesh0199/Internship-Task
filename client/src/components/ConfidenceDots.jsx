import React from 'react';

export function ConfidenceDots({ confidence = 0.9, showText = false }) {
  let level = 'high';
  let filled = 3;
  let activeColor = 'bg-emerald-500';
  let labelText = 'High confidence';

  if (confidence < 0.55) {
    level = 'low';
    filled = 1;
    activeColor = 'bg-violet-500';
    labelText = 'Low confidence (Review)';
  } else if (confidence < 0.8) {
    level = 'medium';
    filled = 2;
    activeColor = 'bg-amber-500';
    labelText = 'Medium confidence';
  }

  return (
    <div
      className="inline-flex items-center gap-1.5"
      title={`${labelText} (${Math.round(confidence * 100)}%)`}
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className={`h-1.5 w-1.5 rounded-full transition-all ${
              idx <= filled ? activeColor : 'bg-ink-300/40'
            }`}
          />
        ))}
      </div>
      {showText && <span className="text-[11px] text-ink-500">{labelText}</span>}
    </div>
  );
}
