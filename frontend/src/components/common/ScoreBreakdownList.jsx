import React from 'react';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

const FACTOR_LABELS = {
  has_website: 'Company Website',
  has_email: 'Contact Email',
  has_contact_name: 'Contact Name',
  has_industry: 'Industry Stated',
  industry_relevance: 'Industry Relevance',
  company_size: 'Company Size (Employees)',
  has_location: 'Location Stated',
  data_completeness: 'Data Completeness',
};

export function ScoreBreakdownList({ breakdown = [] }) {
  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-3 text-center">
        No score breakdown available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {breakdown.map((item, idx) => {
        const factorName = FACTOR_LABELS[item.factor] || item.factor;
        const earned = item.score ?? 0;
        const max = item.max_score ?? 1;
        const pct = Math.min(Math.round((earned / (max || 1)) * 100), 100);
        
        const isFull = earned >= max && earned > 0;
        const isZero = earned === 0;

        return (
          <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 font-medium text-slate-800">
                {isFull ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : isZero ? (
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>{factorName}</span>
              </div>
              <span className="font-semibold text-slate-700">
                {earned} <span className="text-slate-400 font-normal">/ {max} pts</span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isFull ? 'bg-emerald-500' : isZero ? 'bg-transparent' : 'bg-amber-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Reason explanation */}
            {item.reason && (
              <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                {item.reason}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
