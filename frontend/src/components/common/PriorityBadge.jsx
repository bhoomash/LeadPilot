import React from 'react';

export function PriorityBadge({ priority, size = 'md' }) {
  const normalized = (priority || 'Low').toLowerCase();
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  const styleClasses = {
    high: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/20',
    medium: 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-600/20',
    low: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-600/10',
  };

  const dotClasses = {
    high: 'bg-emerald-500',
    medium: 'bg-amber-500',
    low: 'bg-slate-400',
  };

  const currentStyle = styleClasses[normalized] || styleClasses.low;
  const currentDot = dotClasses[normalized] || dotClasses.low;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${sizeClasses[size] || sizeClasses.md} ${currentStyle}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${currentDot}`} />
      {priority || 'Low'}
    </span>
  );
}
