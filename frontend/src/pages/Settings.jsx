import React, { useEffect, useState } from 'react';
import {
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';
import { api } from '../services/api';

const FACTOR_DESCRIPTIONS = {
  has_website: {
    label: 'Company Website Presence',
    desc: 'Awarded when a valid company URL is provided and domain can be extracted.',
  },
  has_email: {
    label: 'Contact Email Presence',
    desc: 'Awarded when a syntactically valid corporate email is provided.',
  },
  has_contact_name: {
    label: 'Contact Person Stated',
    desc: 'Awarded when a designated stakeholder name is included.',
  },
  has_industry: {
    label: 'Industry Specified',
    desc: 'Awarded for having any industry vertical specified.',
  },
  industry_relevance: {
    label: 'High-Value Industry Relevance',
    desc: 'Full points for target sectors (SaaS, Fintech, AI, etc.), 50% for general industries.',
  },
  company_size: {
    label: 'Company Headcount Tier',
    desc: 'Scaled points based on employee count tiers (1-10, 11-50, 51-200, 201-1000, 1000+).',
  },
  has_location: {
    label: 'Geographic Location Presence',
    desc: 'Awarded when city, state, or country is provided.',
  },
  data_completeness: {
    label: 'Overall Data Completeness',
    desc: 'Proportional score based on the percentage of all 7 key fields completed.',
  },
};

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const [weights, setWeights] = useState({
    has_website: 15,
    has_email: 15,
    has_contact_name: 10,
    has_industry: 5,
    industry_relevance: 15,
    company_size: 15,
    has_location: 5,
    data_completeness: 20,
  });

  const [thresholds, setThresholds] = useState({
    high: 70,
    medium: 40,
  });

  const [highValueIndustries, setHighValueIndustries] = useState([]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getScoringSettings();
      setWeights(data.weights);
      setThresholds(data.thresholds);
      setHighValueIndustries(data.high_value_industries || []);
    } catch (err) {
      setError(err.message || 'Failed to load scoring settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const totalWeight = Object.values(weights).reduce(
    (acc, val) => acc + (Number(val) || 0),
    0
  );

  const handleWeightChange = (key, value) => {
    const num = Math.max(0, Math.min(100, Number(value) || 0));
    setWeights((prev) => ({ ...prev, [key]: num }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await api.updateScoringSettings({
        weights,
        thresholds: {
          high: Number(thresholds.high),
          medium: Number(thresholds.medium),
        },
      });
      setNotification({
        type: 'success',
        message: 'Scoring settings updated and all database leads recalculated successfully!',
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all weights and thresholds to system defaults?')) return;
    try {
      setResetting(true);
      setError(null);
      const data = await api.resetScoringSettings();
      setWeights(data.weights);
      setThresholds(data.thresholds);
      setNotification({
        type: 'success',
        message: 'Settings reset to defaults and all leads recalculated.',
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to reset settings');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="mt-3 text-xs text-slate-500">Loading scoring parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Scoring Rules & Weight Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Adjust the deterministic qualification algorithm weights and priority thresholds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Recalculating Leads...' : 'Save & Recalculate Leads'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Weight Allocation Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Qualification Factor Weights</h2>
              <p className="text-xs text-slate-500">
                Define the maximum points (0–100 total) awarded to each prospect criterion
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-md text-xs font-semibold border ${
                Math.round(totalWeight) === 100
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              Total Weight: {totalWeight} / 100 pts
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(weights).map(([key, val]) => {
              const meta = FACTOR_DESCRIPTIONS[key] || { label: key, desc: '' };
              return (
                <div
                  key={key}
                  className="bg-slate-50/70 p-4 rounded-lg border border-slate-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{meta.label}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={val}
                        onChange={(e) => handleWeightChange(key, e.target.value)}
                        className="w-16 px-2 py-1 rounded border border-slate-200 bg-white text-xs font-semibold text-right"
                      />
                      <span className="text-slate-400 font-normal">pts</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={val}
                    onChange={(e) => handleWeightChange(key, e.target.value)}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />

                  <p className="text-[11px] text-slate-500 leading-tight">{meta.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Thresholds Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Priority Tier Thresholds</h2>
            <p className="text-xs text-slate-500">
              Set the minimum qualification score required for each lead priority classification
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-emerald-50/70 p-4 rounded-lg border border-emerald-200">
              <div className="font-semibold text-emerald-900 mb-1">High Priority Tier</div>
              <p className="text-[11px] text-emerald-700 mb-3">
                Immediate sales attention & verified ICP fit
              </p>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">Score ≥</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={thresholds.high}
                  onChange={(e) => setThresholds({ ...thresholds, high: e.target.value })}
                  className="w-16 px-2 py-1 rounded border border-emerald-300 bg-white font-bold text-emerald-900"
                />
              </div>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-lg border border-amber-200">
              <div className="font-semibold text-amber-900 mb-1">Medium Priority Tier</div>
              <p className="text-[11px] text-amber-700 mb-3">
                Promising prospects with partial data
              </p>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">Score ≥</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={thresholds.medium}
                  onChange={(e) => setThresholds({ ...thresholds, medium: e.target.value })}
                  className="w-16 px-2 py-1 rounded border border-amber-300 bg-white font-bold text-amber-900"
                />
              </div>
            </div>

            <div className="bg-slate-100/70 p-4 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-800 mb-1">Low Priority Tier</div>
              <p className="text-[11px] text-slate-600 mb-3">
                Nurture pipeline or missing essential data
              </p>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">Score &lt;</span>
                <span className="font-bold text-slate-800">{thresholds.medium || 40}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Target Industries Reference */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Recognized High-Value Industry Verticals
          </h2>
          <p className="text-xs text-slate-500">
            Leads matching these industry sectors receive full credit for the Industry Relevance factor
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {highValueIndustries.map((ind, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
              >
                {ind}
              </span>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
