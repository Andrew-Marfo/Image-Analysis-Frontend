import { AlertTriangle } from 'lucide-react';
import type { FieldValue, ImdbFieldKey } from '../../types/imdb';
import type { ColumnDef } from '../../lib/columns';
import { confidenceTone, isFlagged } from '../../lib/confidence';
import { cn } from '../../lib/cn';

interface Props {
  column: ColumnDef;
  field: FieldValue;
  onChange: (key: ImdbFieldKey, value: string) => void;
}

export function FieldEditor({ column, field, onChange }: Props) {
  const flagged = isFlagged(column.key, field);
  const tone = confidenceTone(field);

  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          {column.label}
          {flagged && (
            <AlertTriangle className="h-3 w-3 text-amber-500" aria-label="Needs review" />
          )}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-400">
          <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
          {field.value.trim() && !field.edited
            ? `${Math.round(field.confidence * 100)}%`
            : tone.label}
        </span>
      </span>
      <input
        type="text"
        value={field.value}
        placeholder={`e.g. ${column.example}`}
        onChange={(e) => onChange(column.key, e.target.value)}
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
          'focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none',
          'placeholder:text-slate-300',
          flagged
            ? 'border-amber-300 bg-amber-50/60'
            : 'border-slate-200 bg-white',
        )}
      />
    </label>
  );
}
