import React from 'react';

export function QualityBadge({ status }) {
  const normalized = (status || 'Unknown').toLowerCase();

  const styles = {
    good: 'bg-blue-50 text-blue-700 border-blue-200',
    partial: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    poor: 'bg-rose-50 text-rose-700 border-rose-200',
    unknown: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  const style = styles[normalized] || styles.unknown;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}
    >
      {status || 'Unknown'}
    </span>
  );
}
