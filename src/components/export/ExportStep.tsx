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
import { Button } from '../ui/Button';
import { DataTablePreview } from './DataTablePreview';

export function ExportStep() {
  const { products, setStep, reset } = useAppStore();
  const [exporting, setExporting] = useState<null | 'csv' | 'xlsx'>(null);

  const totalFlagged = products.reduce((n, p) => n + flaggedCount(p), 0);
  const unreviewed = products.filter((p) => !p.reviewed).length;

  async function handleCsv() {
    setExporting('csv');
    try {
      await downloadCsv(products);
    } finally {
      setExporting(null);
    }
  }

  async function handleXlsx() {
    setExporting('xlsx');
    try {
      await downloadXlsx(products);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Export IMDB records</h2>
        <p className="mt-1 text-sm text-slate-500">
          {products.length} product{products.length !== 1 && 's'} · {IMDB_COLUMNS.length}{' '}
          columns, in submission order. Empty cells are exported as empty strings.
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
                <>
                  {totalFlagged} field{totalFlagged !== 1 && 's'} still flagged
                </>
              )}
              . You can still export — review is optional.
            </span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="lg" onClick={handleXlsx} disabled={exporting !== null}>
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === 'xlsx' ? 'Preparing…' : 'Download predictions.xlsx'}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={handleCsv}
            disabled={exporting !== null}
          >
            <FileText className="h-4 w-4" />
            {exporting === 'csv' ? 'Preparing…' : 'Download predictions.csv'}
          </Button>
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
