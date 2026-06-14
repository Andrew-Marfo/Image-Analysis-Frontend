import { AlertTriangle, CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import type { Product } from '../../types/imdb';
import { IMDB_COLUMNS } from '../../lib/columns';
import { filledCount, flaggedCount } from '../../lib/confidence';
import { useAppStore } from '../../store/AppStore';
import { cn } from '../../lib/cn';
import { FieldEditor } from './FieldEditor';

interface Props {
  product: Product;
  index: number;
}

export function ProductCard({ product, index }: Props) {
  const { updateField, setReviewed } = useAppStore();
  const flagged = flaggedCount(product);
  const filled = filledCount(product);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-white shadow-sm',
        product.reviewed ? 'border-emerald-200' : 'border-slate-200',
      )}
    >
      {/* Card header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {index + 1}
        </span>
        <div className="mr-auto leading-tight">
          <p className="text-sm font-semibold text-slate-800">
            {product.fields.ITEM_NAME.value.trim() || `Product ${product.groupKey}`}
          </p>
          <p className="font-mono text-xs text-slate-400">{product.groupKey}</p>
        </div>

        {product.status === 'extracting' && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting…
          </span>
        )}
        {product.status === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-red-600">
            <CircleAlert className="h-3.5 w-3.5" /> {product.error ?? 'Failed'}
          </span>
        )}
        {product.status === 'done' && (
          <>
            <span className="text-xs text-slate-500">
              {filled}/{IMDB_COLUMNS.length} filled
            </span>
            {flagged > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                {flagged} to review
              </span>
            )}
            <button
              type="button"
              onClick={() => setReviewed(product.id, !product.reviewed)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                product.reviewed
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {product.reviewed ? 'Reviewed' : 'Mark reviewed'}
            </button>
          </>
        )}
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[180px_1fr]">
        {/* Image strip */}
        <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible thin-scroll">
          {product.images.map((img) => (
            <img
              key={img.id}
              src={img.previewUrl}
              alt={img.fileName}
              className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover md:h-auto md:w-full"
              loading="lazy"
            />
          ))}
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {IMDB_COLUMNS.map((column) => (
            <FieldEditor
              key={column.key}
              column={column}
              field={product.fields[column.key]}
              onChange={(key, value) => updateField(product.id, key, value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
