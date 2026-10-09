import React from 'react';

export function ScorePill({ score }) {
  const val = typeof score === 'number' ? Math.round(score) : 0;
  
  let color = 'text-slate-700 bg-slate-100 border-slate-200';
  if (val >= 70) {
    color = 'text-emerald-700 bg-emerald-50 border-emerald-200 font-bold';
  } else if (val >= 40) {
    color = 'text-amber-700 bg-amber-50 border-amber-200 font-bold';
  } else {
    color = 'text-slate-600 bg-slate-50 border-slate-200 font-medium';
  }

  return (
    <span
      className={`inline-flex items-center justify-center min-w-10 px-2 py-1 rounded-md text-xs border ${color}`}
    >
      {val}<span className="text-[10px] opacity-70 ml-0.5">/100</span>
    </span>
  );
}
