import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  Copy,
  TrendingUp,
  ArrowRight,
  UploadCloud,
  Sliders,
  Building2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { MetricCard } from '../components/common/MetricCard';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { ScorePill } from '../components/common/ScorePill';
import { QualityBadge } from '../components/common/QualityBadge';

const PRIORITY_COLORS = {
  High: '#10b981',   // emerald-500
  Medium: '#f59e0b', // amber-500
  Low: '#94a3b8',    // slate-400
};

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">Loading intelligence metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-rose-800">
        <h3 className="font-semibold text-sm">Failed to load dashboard</h3>
        <p className="text-xs mt-1 text-rose-600">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-3 py-1.5 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const priorityPieData = stats?.priority_distribution
    ? Object.entries(stats.priority_distribution).map(([name, value]) => ({
        name,
        value,
        color: PRIORITY_COLORS[name] || '#94a3b8',
      }))
    : [];

  const industryBarData = stats?.industry_distribution
    ? Object.entries(stats.industry_distribution).map(([name, count]) => ({
        industry: name,
        leads: count,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Lead Intelligence Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time prospect qualification, deduplication, and data quality metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            title="Refresh statistics"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/import')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Leads"
          value={stats?.total_leads ?? 0}
          subtitle="Persisted in SQLite"
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="High Priority"
          value={stats?.high_priority ?? 0}
          subtitle="Score ≥ 70 / 100"
          icon={Target}
          color="emerald"
        />
        <MetricCard
          title="Medium Priority"
          value={stats?.medium_priority ?? 0}
          subtitle="Score 40 - 69"
          icon={TrendingUp}
          color="amber"
        />
        <MetricCard
          title="Low Priority"
          value={stats?.low_priority ?? 0}
          subtitle="Score < 40"
          icon={Building2}
          color="slate"
        />
        <MetricCard
          title="Data Completeness"
          value={`${stats?.data_completeness ?? 0}%`}
          subtitle="Average field fill rate"
          icon={CheckCircle2}
          color="teal"
        />
        <MetricCard
          title="Duplicates Flagged"
          value={stats?.duplicates_detected ?? 0}
          subtitle="Domain & email matches"
          icon={Copy}
          color="rose"
        />
      </div>

      {/* Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Distribution Donut */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Priority Distribution</h2>
            <span className="text-[11px] text-slate-500">Tier Breakdown</span>
          </div>

          {stats?.total_leads === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
              <span>No leads available yet</span>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {priorityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} leads`, name]}
                    contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Industries Bar Chart */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Leads by Industry</h2>
            <span className="text-[11px] text-slate-500">Top Sectors</span>
          </div>

          {industryBarData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Building2 className="w-8 h-8 mb-2 opacity-50" />
              <span>No industry data available yet</span>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={industryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="industry"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val) => [`${val} leads`, 'Count']}
                    contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                  />
                  <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recently Added Leads Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recently Evaluated Leads</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest prospects processed through the scoring & deduplication engine
            </p>
          </div>
          <button
            onClick={() => navigate('/leads')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View all leads</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats?.recent_leads?.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No leads currently in the system</p>
            <p className="text-xs text-slate-400 mt-1">
              Upload the sample CSV dataset to explore lead qualification
            </p>
            <button
              onClick={() => navigate('/import')}
              className="mt-4 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 inline-flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Sample Leads</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-medium">
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Industry</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Quality</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recent_leads?.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{lead.company_name}</div>
                      {lead.website && (
                        <span className="text-[11px] text-slate-400 font-normal">
                          {lead.normalized_domain || lead.website}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{lead.contact_name || '—'}</div>
                      {lead.contact_email && (
                        <div className="text-[11px] text-slate-400">{lead.contact_email}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{lead.industry || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{lead.location || '—'}</td>
                    <td className="py-3 px-4">
                      <ScorePill score={lead.qualification_score} />
                    </td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={lead.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <QualityBadge status={lead.data_quality_status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/leads/${lead.id}`);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
