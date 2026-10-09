import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Building2,
  SlidersHorizontal,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { ScorePill } from '../components/common/ScorePill';
import { QualityBadge } from '../components/common/QualityBadge';
import { Modal } from '../components/common/Modal';

export function LeadsManagement() {
  const navigate = useNavigate();

  // Filter state
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [dataQuality, setDataQuality] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [sortBy, setSortBy] = useState('qualification_score');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data state
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Lead Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    website: '',
    contact_name: '',
    contact_email: '',
    industry: '',
    location: '',
    employee_count: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Action status message
  const [notification, setNotification] = useState(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getLeads({
        search,
        priority,
        industry,
        location,
        data_quality: dataQuality,
        min_score: minScore,
        max_score: maxScore,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        page_size: pageSize,
      });
      setLeads(res.leads);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [search, priority, industry, location, dataQuality, minScore, maxScore, sortBy, sortDir, page, pageSize]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setPriority('');
    setIndustry('');
    setLocation('');
    setDataQuality('');
    setMinScore('');
    setMaxScore('');
    setSortBy('qualification_score');
    setSortDir('desc');
    setPage(1);
  };

  const handleDelete = async (id, companyName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${companyName}"?`)) return;
    try {
      await api.deleteLead(id);
      setNotification({ type: 'success', message: `Deleted ${companyName}` });
      fetchLeads();
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete lead' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleRecalculate = async (id, companyName, e) => {
    e.stopPropagation();
    try {
      const updated = await api.recalculateLead(id);
      setNotification({
        type: 'success',
        message: `Recalculated ${companyName}: Score is now ${updated.qualification_score} (${updated.priority})`,
      });
      fetchLeads();
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to recalculate score' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      await api.createLead({
        ...formData,
        employee_count: formData.employee_count ? parseInt(formData.employee_count, 10) : null,
      });
      setIsAddModalOpen(false);
      setFormData({
        company_name: '',
        website: '',
        contact_name: '',
        contact_email: '',
        industry: '',
        location: '',
        employee_count: '',
      });
      setNotification({ type: 'success', message: 'New prospect created & scored successfully' });
      fetchLeads();
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setFormError(err.message || 'Failed to create lead');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleExport = () => {
    const exportUrl = api.getExportUrl({
      search,
      priority,
      industry,
      location,
      min_score: minScore,
      max_score: maxScore,
    });
    window.location.href = exportUrl;
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  const activeFiltersCount = [
    search,
    priority,
    industry,
    location,
    dataQuality,
    minScore,
    maxScore,
  ].filter(Boolean).length;

  return (
    <div className="space-y-5">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leads Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Search, filter, prioritize, and inspect verified prospect intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search company, contact, email, industry..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Priority filter */}
          <div>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="">All Priorities</option>
              <option value="High">High Priority (≥ 70)</option>
              <option value="Medium">Medium Priority (40-69)</option>
              <option value="Low">Low Priority (&lt; 40)</option>
            </select>
          </div>

          {/* Data Quality filter */}
          <div>
            <select
              value={dataQuality}
              onChange={(e) => {
                setDataQuality(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="">All Quality Statuses</option>
              <option value="Good">Good (≥ 85% complete)</option>
              <option value="Partial">Partial (50-84%)</option>
              <option value="Poor">Poor (&lt; 50%)</option>
            </select>
          </div>

          {/* Industry text search */}
          <div>
            <input
              type="text"
              placeholder="Filter by industry..."
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Secondary filter row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Score Range:</span>
              <input
                type="number"
                placeholder="Min"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => {
                  setMinScore(e.target.value);
                  setPage(1);
                }}
                className="w-16 px-2 py-1 text-xs rounded border border-slate-200"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="number"
                placeholder="Max"
                min="0"
                max="100"
                value={maxScore}
                onChange={(e) => {
                  setMaxScore(e.target.value);
                  setPage(1);
                }}
                className="w-16 px-2 py-1 text-xs rounded border border-slate-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Location:</span>
              <input
                type="text"
                placeholder="City/State/Country"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setPage(1);
                }}
                className="w-36 px-2 py-1 text-xs rounded border border-slate-200"
              />
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear {activeFiltersCount} filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Data Table Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-xs">Loading prospects...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">
            <p className="text-sm font-semibold">Error loading leads</p>
            <p className="text-xs mt-1">{error}</p>
            <button
              onClick={fetchLeads}
              className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No leads match your current criteria</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query, priority filters, or upload more leads.
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-3 py-1.5 border border-slate-200 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-medium select-none">
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/70"
                    onClick={() => handleSort('company_name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Company</span>
                      {getSortIcon('company_name')}
                    </div>
                  </th>
                  <th className="py-3 px-4">Contact</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/70"
                    onClick={() => handleSort('industry')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Industry</span>
                      {getSortIcon('industry')}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/70"
                    onClick={() => handleSort('location')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Location</span>
                      {getSortIcon('location')}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/70"
                    onClick={() => handleSort('employee_count')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Size</span>
                      {getSortIcon('employee_count')}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/70"
                    onClick={() => handleSort('qualification_score')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Score</span>
                      {getSortIcon('qualification_score')}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/70"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Priority</span>
                      {getSortIcon('priority')}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/70"
                    onClick={() => handleSort('data_quality_status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Quality</span>
                      {getSortIcon('data_quality_status')}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{lead.company_name}</span>
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-blue-600 p-0.5"
                            title="Visit website"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {lead.normalized_domain && (
                        <div className="text-[11px] text-slate-400 font-normal">
                          {lead.normalized_domain}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{lead.contact_name || <span className="text-slate-300">—</span>}</div>
                      {lead.contact_email && (
                        <div className="text-[11px] text-slate-400">{lead.contact_email}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {lead.industry || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {lead.location || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {lead.employee_count ? (
                        <span>{lead.employee_count.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
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
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          title="Inspect score breakdown & lead details"
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleRecalculate(lead.id, lead.company_name, e)}
                          title="Recalculate score"
                          className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(lead.id, lead.company_name, e)}
                          title="Delete lead"
                          className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Summary Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{leads.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(page * pageSize, total)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{total}</span> leads
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Single Lead"
      >
        <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="e.g. Acme Technologies"
              className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Website URL</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://acme.com"
                className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g. SaaS, Fintech"
                className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="jane@acme.com"
                className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="San Francisco, CA"
                className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Employee Count</label>
              <input
                type="number"
                min="0"
                value={formData.employee_count}
                onChange={(e) => setFormData({ ...formData, employee_count: e.target.value })}
                placeholder="e.g. 150"
                className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3.5 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {formSubmitting ? 'Scoring & Saving...' : 'Save & Score Lead'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
