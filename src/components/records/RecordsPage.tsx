import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays, Download, RefreshCw, Search, SlidersHorizontal, Star, Trash2, X,
} from 'lucide-react';
import {
  apiDeleteRecord, apiExportBlob, apiGetRecords, type RecordOut,
} from '../../api/client';
import { useAuth } from '../../store/AuthStore';

type DateRange = 'today' | 'week' | 'month' | 'all';

function applyDateFilter(records: RecordOut[], range: DateRange): RecordOut[] {
  if (range === 'all') return records;
  const now = new Date();
  let cutoff: Date;
  if (range === 'today') {
    cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === 'week') {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return records.filter((r) => new Date(r.created_at) >= cutoff);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function todayFull(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function RecordsPage() {
  const { user } = useAuth();
  const [all, setAll] = useState<RecordOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<null | 'csv' | 'xlsx'>(null);

  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [needsReview, setNeedsReview] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { limit: 200 };
      if (brandFilter.trim()) params.brand = brandFilter.trim();
      if (categoryFilter.trim()) params.category_type = categoryFilter.trim();
      if (needsReview) params.needs_review = true;
      const { records } = await apiGetRecords(params as Parameters<typeof apiGetRecords>[0]);
      setAll(records);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [brandFilter, categoryFilter, needsReview]);

  useEffect(() => { void load(); }, [load]);

  const visible = applyDateFilter(all, dateRange);
  const latest = visible.length > 0
    ? visible.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b))
    : null;

  async function handleExport(fmt: 'csv' | 'xlsx') {
    setExporting(fmt);
    try {
      const blob = await apiExportBlob(fmt);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imdb-records.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed');
    } finally {
      setExporting(null);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      await apiDeleteRecord(id);
      setAll((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('Delete failed');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  function clearFilters() {
    setBrandFilter('');
    setCategoryFilter('');
    setDateRange('all');
    setNeedsReview(false);
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      {/* Summary header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarDays className="h-4 w-4" />
            <span className="text-sm font-medium">{todayFull()}</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Records{' '}
            <span className="text-base font-normal text-slate-400">
              ({visible.length} shown{all.length !== visible.length ? ` of ${all.length}` : ''})
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">All records across all users</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleExport('xlsx')}
            disabled={exporting !== null || visible.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-green-600" />
            {exporting === 'xlsx' ? 'Exporting…' : 'Export XLSX'}
          </button>
          <button
            type="button"
            onClick={() => void handleExport('csv')}
            disabled={exporting !== null || visible.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-blue-600" />
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Latest record highlight */}
      {latest && (
        <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
            <Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />
            Latest record
          </div>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {latest.item_name ?? latest.brand ?? '(unnamed)'}{' '}
            <span className="text-slate-500">— {latest.brand}</span>
          </p>
          <p className="text-xs text-slate-400">{fmtDate(latest.created_at)}</p>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Brand</label>
            <input
              type="text"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              placeholder="e.g. Ariel"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
            <input
              type="text"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="e.g. Detergent"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Date range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <input
              id="needs-review"
              type="checkbox"
              checked={needsReview}
              onChange={(e) => setNeedsReview(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="needs-review" className="text-sm text-slate-700">Needs review only</label>
          </div>
          <div className="flex gap-2 pb-0.5">
            <button
              type="button"
              onClick={() => void load()}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
          <div className="ml-auto flex items-center gap-1.5 pb-0.5 text-xs text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {visible.length} result{visible.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No records found. Adjust filters or upload images first.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 text-left">Item name</th>
                <th className="px-4 py-3 text-left">Brand</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Barcode</th>
                <th className="px-4 py-3 text-left">Weight</th>
                <th className="px-4 py-3 text-left">Country</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Review</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => (
                <tr
                  key={r.id}
                  className={`transition hover:bg-slate-50 ${
                    r.id === latest?.id ? 'bg-brand-50/60' : ''
                  }`}
                >
                  <td className="max-w-[180px] truncate px-4 py-3 font-medium text-slate-800">
                    {r.item_name ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.brand ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.category_type ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.barcode ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.weight ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.country_of_origin ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                    {fmtDate(r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {r.needs_review ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Needs review
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {confirmDelete === r.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => void handleDelete(r.id)}
                          className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(r.id)}
                        className="rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
