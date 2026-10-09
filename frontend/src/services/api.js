/**
 * API service for communicating with the FastAPI backend.
 * Uses fetch API and handles baseUrl gracefully via environment variables or relative proxy.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : JSON.stringify(errorData.detail);
      }
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorMessage);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

export const api = {
  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/api/health`);
    return handleResponse(res);
  },

  // Dashboard
  async getDashboardStats() {
    const res = await fetch(`${API_BASE}/api/dashboard/stats`);
    return handleResponse(res);
  },

  // Leads
  async getLeads({
    search = '',
    priority = '',
    industry = '',
    location = '',
    min_score = '',
    max_score = '',
    data_quality = '',
    sort_by = 'created_at',
    sort_dir = 'desc',
    page = 1,
    page_size = 20,
  } = {}) {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (priority) query.set('priority', priority);
    if (industry) query.set('industry', industry);
    if (location) query.set('location', location);
    if (min_score !== '' && min_score !== null && min_score !== undefined) query.set('min_score', min_score);
    if (max_score !== '' && max_score !== null && max_score !== undefined) query.set('max_score', max_score);
    if (data_quality) query.set('data_quality', data_quality);
    if (sort_by) query.set('sort_by', sort_by);
    if (sort_dir) query.set('sort_dir', sort_dir);
    if (page) query.set('page', page);
    if (page_size) query.set('page_size', page_size);

    const res = await fetch(`${API_BASE}/api/leads?${query.toString()}`);
    return handleResponse(res);
  },

  async getLead(id) {
    const res = await fetch(`${API_BASE}/api/leads/${id}`);
    return handleResponse(res);
  },

  async createLead(leadData) {
    const res = await fetch(`${API_BASE}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData),
    });
    return handleResponse(res);
  },

  async updateLead(id, leadData) {
    const res = await fetch(`${API_BASE}/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData),
    });
    return handleResponse(res);
  },

  async deleteLead(id) {
    const res = await fetch(`${API_BASE}/api/leads/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  async recalculateLead(id) {
    const res = await fetch(`${API_BASE}/api/leads/${id}/recalculate`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  // Import / Export
  async importLeads(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/api/leads/import`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  getExportUrl(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.priority) query.set('priority', params.priority);
    if (params.industry) query.set('industry', params.industry);
    if (params.location) query.set('location', params.location);
    if (params.min_score) query.set('min_score', params.min_score);
    if (params.max_score) query.set('max_score', params.max_score);
    return `${API_BASE}/api/leads/export?${query.toString()}`;
  },

  getTemplateUrl() {
    return `${API_BASE}/api/leads/template`;
  },

  // Settings
  async getScoringSettings() {
    const res = await fetch(`${API_BASE}/api/settings/scoring`);
    return handleResponse(res);
  },

  async updateScoringSettings(settingsData) {
    const res = await fetch(`${API_BASE}/api/settings/scoring`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsData),
    });
    return handleResponse(res);
  },

  async resetScoringSettings() {
    const res = await fetch(`${API_BASE}/api/settings/scoring/reset`, {
      method: 'POST',
    });
    return handleResponse(res);
  },
};
