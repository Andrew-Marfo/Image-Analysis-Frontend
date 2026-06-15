import { ArrowLeft, ArrowRight, FileDown, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/AppStore';
import { apiGetRecords, apiMergeRecords } from '../../api/client';
import type { RecordOut } from '../../api/client';
import type { Product } from '../../types/imdb';
import { flaggedCount } from '../../lib/confidence';
import { useNav } from '../../store/NavStore';
import { Button } from '../ui/Button';
import { ProductCard } from './ProductCard';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function DuplicateWarning({ product, onDismiss }: { product: Product; onDismiss: () => void }) {
  const { setPage } = useNav();
  const [merging, setMerging] = useState(false);
  const [match, setMatch] = useState<RecordOut | null>(null);
  const [loading, setLoading] = useState(true);

  const candidates = product.dedupCandidates ?? [];
  const top = candidates[0];
  if (!top) return null;

  const existingId = top.duplicate_of === product.recordId ? top.record_id : top.duplicate_of;
  const isExact = top.score >= 1.0;
  const confidence = Math.round(top.score * 100);

  // Load existing record details on mount
  useEffect(() => {
    apiGetRecords({ limit: 200 })
      .then(({ records }) => setMatch(records.find((r) => r.id === existingId) ?? null))
      .catch(() => setMatch(null))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingId]);

  const productLabel = match
    ? (match.item_name ?? match.brand ?? `Record #${existingId}`)
    : `Record #${existingId}`;
  const enteredOn = match ? fmtDate(match.created_at) : '—';

  async function handleMerge() {
    if (!product.recordId) return;
    setMerging(true);
    try {
      await apiMergeRecords(existingId, product.recordId);
      onDismiss();
    } catch {
      setMerging(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50">
      {/* Main message */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Checking existing records…
          </div>
        ) : (
          <>
            <p className="text-sm text-amber-900 leading-relaxed">
              <span className="font-semibold">"{productLabel}"</span> was already entered on{' '}
              <span className="font-semibold">{enteredOn}</span> with ID{' '}
              <span className="font-semibold">#{existingId}</span>
              {!isExact && (
                <span className="text-amber-600"> ({confidence}% match)</span>
              )}.
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Verify records to confirm, or continue with this extraction.
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-2 border-t border-amber-200 bg-amber-100/50 px-4 py-3">
          <button
            type="button"
            onClick={() => setPage('records')}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
          >
            Verify Records
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
          >
            Continue Extraction
          </button>
          {product.recordId && (
            <button
              type="button"
              onClick={handleMerge}
              disabled={merging}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
            >
              {merging && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {merging ? 'Merging…' : 'Merge into existing'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ReviewStep() {
  const { products, setStep } = useAppStore();
  const [dismissedDups, setDismissedDups] = useState<Set<string>>(new Set());

  const totalFlagged = products.reduce((n, p) => n + flaggedCount(p), 0);
  const reviewedCount = products.filter((p) => p.reviewed).length;
  const totalDups = products.filter((p) => !dismissedDups.has(p.id) && (p.dedupCandidates?.length ?? 0) > 0).length;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-brand-500" />
          <span className="font-medium text-slate-700">
            {reviewedCount}/{products.length} reviewed
          </span>
        </div>
        <span className="text-sm text-slate-400">·</span>
        <span className="text-sm text-slate-600">
          {totalFlagged === 0 ? (
            'No fields flagged'
          ) : (
            <>
              <span className="font-medium text-amber-600">{totalFlagged}</span> field
              {totalFlagged !== 1 && 's'} flagged for review
            </>
          )}
        </span>
        {totalDups > 0 && (
          <>
            <span className="text-sm text-slate-400">·</span>
            <span className="text-sm font-medium text-orange-600">
              {totalDups} possible duplicate{totalDups !== 1 && 's'} detected
            </span>
          </>
        )}

        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => setStep('upload')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => setStep('export')}>
            <FileDown className="h-4 w-4" />
            Continue to export
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Review the extracted attributes below. Fields highlighted in{' '}
        <span className="font-medium text-amber-600">amber</span> are low-confidence or
        expected-but-empty — edit them where needed. Leave a field blank if it can't be
        confidently determined from the images.
      </p>

      <div className="space-y-4">
        {products.map((product, idx) => (
          <div key={product.id} className="space-y-2">
            {!dismissedDups.has(product.id) && (product.dedupCandidates?.length ?? 0) > 0 && (
              <DuplicateWarning
                product={product}
                onDismiss={() => setDismissedDups((s) => new Set([...s, product.id]))}
              />
            )}
            <ProductCard product={product} index={idx} />
          </div>
        ))}
      </div>
    </div>
  );
}
