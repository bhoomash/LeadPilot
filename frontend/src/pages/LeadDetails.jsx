import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  User,
  MapPin,
  Users,
  Calendar,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Save,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { ScorePill } from '../components/common/ScorePill';
import { QualityBadge } from '../components/common/QualityBadge';
import { ScoreBreakdownList } from '../components/common/ScoreBreakdownList';

export function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchLead = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getLead(id);
      setLead(data);
      setEditForm({
        company_name: data.company_name || '',
        website: data.website || '',
        contact_name: data.contact_name || '',
        contact_email: data.contact_email || '',
        industry: data.industry || '',
        location: data.location || '',
        employee_count: data.employee_count ?? '',
      });
    } catch (err) {
      setError(err.message || 'Lead not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [id]);

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const updated = await api.recalculateLead(id);
      setLead(updated);
      setNotification({
        type: 'success',
        message: `Score recalculated: ${updated.qualification_score} points (${updated.priority} Priority)`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to recalculate score' });
    } finally {
      setRecalculating(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.updateLead(id, {
        ...editForm,
        employee_count: editForm.employee_count ? parseInt(editForm.employee_count, 10) : null,
      });
      setLead(updated);
      setIsEditing(false);
      setNotification({
        type: 'success',
        message: 'Lead updated and qualification score refreshed',
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete "${lead?.company_name}"?`)) return;
    try {
      await api.deleteLead(id);
      navigate('/leads');
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete lead' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="mt-3 text-xs text-slate-500">Loading lead intelligence details...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-rose-800 max-w-xl mx-auto">
        <h3 className="font-semibold text-sm">Lead Not Found</h3>
        <p className="text-xs mt-1 text-rose-600">{error || 'The requested lead does not exist.'}</p>
        <button
          onClick={() => navigate('/leads')}
          className="mt-4 px-3.5 py-1.5 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads</span>
        </button>
      </div>
    );
  }

  // Identify missing fields for alert box
  const missingFields = [];
  if (!lead.website) missingFields.push('Company Website (missing online presence)');
  if (!lead.contact_email) missingFields.push('Contact Email (no direct outreach channel)');
  if (!lead.contact_name) missingFields.push('Contact Person (unspecified stakeholder)');
  if (!lead.industry) missingFields.push('Industry Sector (industry relevance undetermined)');
  if (!lead.location) missingFields.push('Geographic Location');
  if (!lead.employee_count) missingFields.push('Employee Headcount (size tier unknown)');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
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

      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/leads')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads Management</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${recalculating ? 'animate-spin' : ''}`} />
            <span>Recalculate Score</span>
          </button>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Lead</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Edit</span>
            </button>
          )}

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shrink-0">
              {lead.company_name?.charAt(0) || 'C'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">{lead.company_name}</h1>
                <PriorityBadge priority={lead.priority} size="md" />
                <QualityBadge status={lead.data_quality_status} />
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                {lead.website && (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{lead.normalized_domain || lead.website}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {lead.industry && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lead.industry}</span>
                  </span>
                )}
                {lead.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lead.location}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Large Score Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-6 py-3 flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Qualification Score
              </span>
              <span className="text-xs text-slate-500">
                {lead.priority} Priority Tier
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {Math.round(lead.qualification_score)}
              <span className="text-xs text-slate-400 font-normal ml-0.5">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Left (Company Info / Edit Form) | Right (Explainable Scoring Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Details & Edit Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>{isEditing ? 'Edit Prospect Fields' : 'Prospect Information'}</span>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-blue-600 font-medium hover:underline"
                >
                  Edit
                </button>
              )}
            </h2>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.company_name}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Website URL</label>
                  <input
                    type="text"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={editForm.contact_name}
                      onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={editForm.contact_email}
                      onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Industry</label>
                    <input
                      type="text"
                      value={editForm.industry}
                      onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Employee Count</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.employee_count}
                      onChange={(e) => setEditForm({ ...editForm, employee_count: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save & Score'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Website</span>
                  </span>
                  <span className="font-medium text-slate-800">
                    {lead.website ? (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {lead.website}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact Name</span>
                  </span>
                  <span className="font-medium text-slate-800">
                    {lead.contact_name || <span className="text-slate-400 italic">Not provided</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact Email</span>
                  </span>
                  <span className="font-medium text-slate-800">
                    {lead.contact_email ? (
                      <a href={`mailto:${lead.contact_email}`} className="text-blue-600 hover:underline">
                        {lead.contact_email}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Industry</span>
                  </span>
                  <span className="font-medium text-slate-800">
                    {lead.industry || <span className="text-slate-400 italic">Not provided</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location</span>
                  </span>
                  <span className="font-medium text-slate-800">
                    {lead.location || <span className="text-slate-400 italic">Not provided</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Employee Count</span>
                  </span>
                  <span className="font-medium text-slate-800">
                    {lead.employee_count ? (
                      `${lead.employee_count.toLocaleString()} employees`
                    ) : (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 text-slate-400 text-[11px] pt-2">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>Created: {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}</span>
                  </span>
                  <span>ID #{lead.id}</span>
                </div>
              </div>
            )}
          </div>

          {/* Missing Information Alerts */}
          {missingFields.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 text-xs">
              <h3 className="font-semibold text-amber-900 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Missing Qualification Data ({missingFields.length})</span>
              </h3>
              <ul className="space-y-1 text-amber-800 list-disc list-inside">
                {missingFields.map((field, idx) => (
                  <li key={idx}>{field}</li>
                ))}
              </ul>
              <p className="mt-2.5 text-[11px] text-amber-700 italic">
                Note: Missing data is treated as unknown rather than penalizing the lead negatively.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Explainable Score Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Explainable Score Breakdown
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deterministic evaluation of all 8 scoring rules and weight allocations
                </p>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>

            {/* Factor by Factor List */}
            <ScoreBreakdownList breakdown={lead.score_breakdown} />
          </div>
        </div>
      </div>
    </div>
  );
}
