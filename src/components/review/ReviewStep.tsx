import { ArrowLeft, ArrowRight, Copy, FileDown, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store/AppStore';
import { apiGetRecords, apiMergeRecords } from '../../api/client';
import type { MergeCandidate, RecordOut } from '../../api/client';
import type { Product } from '../../types/imdb';
import { flaggedCount } from '../../lib/confidence';
import { useNav } from '../../store/NavStore';
import { Button } from '../ui/Button';
import { ProductCard } from './ProductCard';

function DuplicateWarning({ product, onDismiss }: { product: Product; onDismiss: () => void }) {
  const { setPage } = useNav();
  const [merging, setMerging] = useState(false);
  const [matchRecord, setMatchRecord] = useState<RecordOut | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);

  const candidates = product.dedupCandidates ?? [];
  if (!candidates.length) return null;

  // Highest-confidence candidate
  const top: MergeCandidate = candidates[0];
  const existingId = top.duplicate_of === product.recordId ? top.record_id : top.duplicate_of;

  async function loadMatch() {
    if (matchRecord || loadingMatch) return;
    setLoadingMatch(true);
    try {
      const { records } = await apiGetRecords({ limit: 200 });
      setMatchRecord(records.find((r) => r.id === existingId) ?? null);
    } finally {
      setLoadingMatch(false);
    }
  }

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

  const scoreLabel = top.score >= 1.0 ? 'Exact match' : top.score >= 0.92 ? 'Very likely duplicate' : 'Possible duplicate';
  const scorePct   = Math.round(top.score * 100);

  return (
    <div
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm"
      onMouseEnter={loadMatch}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Copy className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">
              {scoreLabel} ({scorePct}%) — {top.reason}
            </p>
            <p className="mt-0.5 text-amber-700">
              Matched fields: <span className="font-medium">{top.matched_fields.join(', ')}</span>
            </p>
            {matchRecord && (
              <p className="mt-1 text-amber-800">
                Existing record #{existingId}:&nbsp;
                <span className="font-medium">
                  {matchRecord.item_name ?? matchRecord.brand ?? '(unnamed)'}
                </span>
                {matchRecord.weight && ` · ${matchRecord.weight}`}
              </p>
            )}
          </div>
        </div>
        <button type="button" onClick={onDismiss} className="text-amber-500 hover:text-amber-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      {product.recordId && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleMerge}
            disabled={merging}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {merging ? 'Merging…' : 'Merge into existing'}
          </button>
          <button
            type="button"
            onClick={() => setPage('records')}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
          >
            View in Records
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
          >
            Keep as new record
          </button>
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
