import { useState } from 'react';
import { GitMerge, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiMergeRecords, type MergeCandidate, type RecordOut } from '../../api/client';

interface Props {
  candidates: MergeCandidate[];
  records: RecordOut[];
  onMerged: (kept: RecordOut, removedId: number) => void;
  onDismiss: (candidateRecordId: number) => void;
  onClose: () => void;
}

function scoreLabel(score: number): { label: string; cls: string } {
  if (score >= 1.0) return { label: 'Exact match', cls: 'bg-red-100 text-red-700' };
  if (score >= 0.92) return { label: 'Very likely', cls: 'bg-orange-100 text-orange-700' };
  return { label: 'Possible', cls: 'bg-yellow-100 text-yellow-700' };
}

function RecordSummary({ record, label }: { record: RecordOut; label: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate font-medium text-slate-800">
        {record.item_name ?? record.brand ?? <span className="text-slate-400 italic">Unnamed</span>}
      </p>
      <div className="mt-1.5 space-y-0.5 text-xs text-slate-500">
        {record.brand     && <p>Brand: <span className="font-medium text-slate-700">{record.brand}</span></p>}
        {record.barcode   && <p>Barcode: <span className="font-mono text-slate-700">{record.barcode}</span></p>}
        {record.weight    && <p>Weight: <span className="font-medium text-slate-700">{record.weight}</span></p>}
        {record.category_type && <p>Category: <span className="font-medium text-slate-700">{record.category_type}</span></p>}
      </div>
      <p className="mt-1.5 text-xs text-slate-400">ID #{record.id}</p>
    </div>
  );
}

function CandidateRow({
  candidate,
  records,
  onMerged,
  onDismiss,
}: {
  candidate: MergeCandidate;
  records: RecordOut[];
  onMerged: (kept: RecordOut, removedId: number) => void;
  onDismiss: (id: number) => void;
}) {
  const [merging, setMerging] = useState(false);
  const [done, setDone] = useState(false);

  const keepRecord = records.find((r) => r.id === candidate.duplicate_of);
  const mergeRecord = records.find((r) => r.id === candidate.record_id);
  if (!keepRecord || !mergeRecord) return null;

  const { label, cls } = scoreLabel(candidate.score);

  async function handleMerge() {
    setMerging(true);
    try {
      const kept = await apiMergeRecords(candidate.duplicate_of, candidate.record_id);
      setDone(true);
      onMerged(kept, candidate.record_id);
    } catch {
      setMerging(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Merged — record #{candidate.record_id} absorbed into #{candidate.duplicate_of}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Score + reason */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
          {label} — {Math.round(candidate.score * 100)}%
        </span>
        <span className="text-xs text-slate-500">{candidate.reason}</span>
        <span className="text-xs text-slate-400">
          · matched: {candidate.matched_fields.join(', ')}
        </span>
      </div>

      {/* Side-by-side records */}
      <div className="flex gap-3">
        <RecordSummary record={keepRecord}  label="Keep (older)" />
        <div className="flex shrink-0 items-center text-slate-300">
          <GitMerge className="h-5 w-5" />
        </div>
        <RecordSummary record={mergeRecord} label="Absorb (newer)" />
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleMerge}
          disabled={merging}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {merging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}
          {merging ? 'Merging…' : 'Merge'}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(candidate.record_id)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function DedupPanel({ candidates, records, onMerged, onDismiss, onClose }: Props) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-900">
            {candidates.length} potential duplicate{candidates.length !== 1 ? 's' : ''} found
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-amber-600 hover:bg-amber-100"
          title="Close dedup panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {candidates.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          All duplicates resolved — no remaining candidates.
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <CandidateRow
              key={`${c.duplicate_of}-${c.record_id}`}
              candidate={c}
              records={records}
              onMerged={onMerged}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
