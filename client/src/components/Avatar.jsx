import React from 'react';

// Editorial color palette matching Daybook's warm, high-trust visual identity
const AVATAR_PALETTE = [
  { bg: 'bg-teal-100 text-teal-800 border-teal-200' },
  { bg: 'bg-amber-100 text-amber-800 border-amber-200' },
  { bg: 'bg-rose-100 text-rose-800 border-rose-200' },
  { bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { bg: 'bg-stone-100 text-stone-800 border-stone-200' },
  { bg: 'bg-violet-100 text-violet-800 border-violet-200' },
  { bg: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
];

/**
 * Deterministically pick color index based on string hash
 */
function hashString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Extract 1 or 2 uppercase initials
 */
export function getInitials(name = '', email = '') {
  const cleanName = (name || '').trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return cleanName.slice(0, 2).toUpperCase();
  }

  const cleanEmail = (email || '').split('@')[0] || '';
  if (cleanEmail) {
    const parts = cleanEmail.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return cleanEmail.slice(0, 2).toUpperCase();
  }

  return '??';
}

/**
 * Avatar Component - Reliable, offline-safe initials avatar with editorial color palettes
 */
export default function Avatar({
  name = '',
  email = '',
  size = 'md',
  className = '',
  title = '',
}) {
  const initials = getInitials(name, email);
  const colorIndex = hashString(name || email || 'avatar') % AVATAR_PALETTE.length;
  const colorTheme = AVATAR_PALETTE[colorIndex];

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base font-semibold',
  }[size] || 'w-9 h-9 text-xs';

  return (
    <div
      title={title || name || email}
      className={`inline-flex items-center justify-center rounded-full font-medium border select-none shrink-0 ${colorTheme.bg} ${sizeClasses} ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
}
