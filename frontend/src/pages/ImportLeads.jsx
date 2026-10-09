import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  ArrowRight,
  RefreshCw,
  FileText,
  HelpCircle,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { MetricCard } from '../components/common/MetricCard';

export function ImportLeads() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  // Client-side quick preview
  const [previewRows, setPreviewRows] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a valid .csv file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setImportResult(null);

    // Read first few lines for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
        setPreviewHeaders(headers);

        const rows = lines.slice(1, 6).map((line) => {
          return line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        });
        setPreviewRows(rows);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const result = await api.importLeads(file);
      setImportResult(result);
    } catch (err) {
      setError(err.message || 'CSV Import failed');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Import Lead Dataset</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bulk upload CSV leads with automatic field mapping, validation, and domain-based deduplication
          </p>
        </div>
        <a
          href={api.getTemplateUrl()}
          download="sample_leads_template.csv"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
        >
          <Download className="w-4 h-4 text-blue-600" />
          <span>Download CSV Template</span>
        </a>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Import Error:</span> {error}
            </div>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Upload / Results Card */}
      {!importResult ? (
        <div className="space-y-6">
          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all bg-white ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              id="csv-upload-input"
            />

            <div className="max-w-md mx-auto">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                {file ? file.name : 'Upload CSV Prospect File'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Drag and drop your spreadsheet here, or{' '}
                <label
                  htmlFor="csv-upload-input"
                  className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline"
                >
                  browse files
                </label>
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                Supported: CSV format up to 10MB • Handles standard columns like company, email, website, industry, etc.
              </p>

              {file && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    onClick={resetForm}
                    className="ml-2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CSV Preview (if file selected) */}
          {previewRows.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>File Preview (First 5 Rows)</span>
                </div>
                <span className="text-[11px] text-slate-500 font-normal">
                  {previewHeaders.length} columns detected
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      {previewHeaders.map((header, idx) => (
                        <th key={idx} className="py-2.5 px-4 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-50/50">
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="py-2 px-4 text-slate-600">
                            {cell || <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
                <button
                  onClick={resetForm}
                  className="px-3.5 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Clear File
                </button>
                <button
                  onClick={handleImport}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validating, Deduplicating & Scoring...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Process & Import Leads</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Import Summary Results Card */
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">CSV Import Completed</h2>
                  <p className="text-xs text-slate-500">
                    Lead records have been processed, cleaned, scored, and stored in the database
                  </p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Upload Another File
              </button>
            </div>

            {/* Results KPI breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-6">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 font-medium">Total Rows</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{importResult.total_rows}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                <span className="text-[11px] text-emerald-700 font-medium">Imported Leads</span>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {importResult.imported_rows}
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
                <span className="text-[11px] text-blue-700 font-medium">Valid Records</span>
                <p className="text-xl font-bold text-blue-700 mt-1">{importResult.valid_rows}</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-200 text-center">
                <span className="text-[11px] text-rose-700 font-medium">Invalid Rows</span>
                <p className="text-xl font-bold text-rose-700 mt-1">{importResult.invalid_rows}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-center">
                <span className="text-[11px] text-amber-700 font-medium">Duplicates Filtered</span>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  {importResult.duplicate_rows}
                </p>
              </div>
            </div>

            {/* Duplicates detected list */}
            {importResult.duplicates?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5 text-amber-600" />
                  <span>Deduplication Details ({importResult.duplicates.length})</span>
                </h3>
                <div className="bg-amber-50/50 rounded-lg border border-amber-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-amber-200 bg-amber-100/50 text-amber-900 font-medium">
                        <th className="py-2 px-3">Row #</th>
                        <th className="py-2 px-3">Company</th>
                        <th className="py-2 px-3">Deduplication Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {importResult.duplicates.map((dup, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-amber-900">Row {dup.row}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{dup.company_name}</td>
                          <td className="py-2 px-3 text-amber-800">{dup.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Row validation errors list */}
            {importResult.errors?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Validation Errors ({importResult.errors.length})</span>
                </h3>
                <div className="bg-rose-50/50 rounded-lg border border-rose-200 overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-rose-200 bg-rose-100/50 text-rose-900 font-medium">
                        <th className="py-2 px-3">Row #</th>
                        <th className="py-2 px-3">Field</th>
                        <th className="py-2 px-3">Error Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                      {importResult.errors.map((err, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-rose-900">
                            {err.row > 0 ? `Row ${err.row}` : 'File header'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-700">
                            {err.field}
                          </td>
                          <td className="py-2 px-3 text-rose-800">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Next Step Action */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => navigate('/leads')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-xs"
              >
                <span>View All Leads in Management Table</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
