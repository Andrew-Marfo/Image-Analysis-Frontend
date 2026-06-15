import { useState } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { IMDB_COLUMNS } from '../../lib/columns';
import { flaggedCount } from '../../lib/confidence';
import { downloadCsv, downloadXlsx } from '../../lib/export';
import { apiExportBlob, BACKEND_EXPORT_COLUMNS, USE_REAL_API } from '../../api/client';
import { Button } from '../ui/Button';
import { ColumnPicker } from '../ui/ColumnPicker';
import { DataTablePreview } from './DataTablePreview';

const LOCAL_COLUMNS = IMDB_COLUMNS.map((c) => ({ key: c.header, label: c.label }));

export function ExportStep() {
  const { products, setStep, reset } = useAppStore();
  const [exporting, setExporting] = useState<null | 'csv' | 'xlsx'>(null);
  const useBackend = USE_REAL_API && products.some((p) => p.recordId != null);
  const sessionId = products.find((p) => p.sessionId != null)?.sessionId;

  const availableCols = useBackend ? BACKEND_EXPORT_COLUMNS : LOCAL_COLUMNS;
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    () => new Set(availableCols.map((c) => c.key)),
  );

  const totalFlagged = products.reduce((n, p) => n + flaggedCount(p), 0);
  const unreviewed = products.filter((p) => !p.reviewed).length;

  async function handleExport(fmt: 'csv' | 'xlsx') {
    setExporting(fmt);
    try {
      const cols = [...selectedCols];
      if (useBackend) {
        const blob = await apiExportBlob(fmt, sessionId, cols);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `imdb-export.${fmt}`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        if (fmt === 'csv') await downloadCsv(products, 'predictions.csv', cols);
        else await downloadXlsx(products, 'predictions.xlsx', cols);
      }
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Export IMDB records</h2>
        <p className="mt-1 text-sm text-slate-500">
          {products.length} product{products.length !== 1 && 's'} ·{' '}
          {selectedCols.size} of {availableCols.length} columns selected.
          Empty cells are exported as empty strings.
        </p>

        {(totalFlagged > 0 || unreviewed > 0) && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {unreviewed > 0 && (
                <>
                  {unreviewed} product{unreviewed !== 1 && 's'} not yet marked reviewed
                  {totalFlagged > 0 && ' · '}
                </>
              )}
              {totalFlagged > 0 && (
                <>{totalFlagged} field{totalFlagged !== 1 && 's'} still flagged</>
              )}
              . You can still export — review is optional.
            </span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => handleExport('xlsx')} disabled={exporting !== null || selectedCols.size === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === 'xlsx' ? 'Preparing…' : 'Download XLSX'}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => handleExport('csv')}
            disabled={exporting !== null || selectedCols.size === 0}
          >
            <FileText className="h-4 w-4" />
            {exporting === 'csv' ? 'Preparing…' : 'Download CSV'}
          </Button>
          <ColumnPicker
            columns={availableCols}
            selected={selectedCols}
            onChange={setSelectedCols}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Output preview</h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setStep('review')}>
            <ArrowLeft className="h-4 w-4" />
            Back to edit
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Start over
          </Button>
        </div>
      </div>

      <DataTablePreview products={products} />
    </div>
  );
}
