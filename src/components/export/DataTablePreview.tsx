import type { Product } from '../../types/imdb';
import { IMDB_COLUMNS } from '../../lib/columns';
import { isFlagged } from '../../lib/confidence';
import { cn } from '../../lib/cn';

interface Props {
  products: Product[];
}

/** Read-only preview of the exact tabular output that will be exported. */
export function DataTablePreview({ products }: Props) {
  return (
    <div className="thin-scroll overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-semibold text-slate-500">
              #
            </th>
            {IMDB_COLUMNS.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2 font-mono text-xs font-semibold whitespace-nowrap text-slate-600"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product, idx) => (
            <tr
              key={product.id}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
            >
              <td className="sticky left-0 z-10 bg-white px-3 py-2 text-slate-400">
                {idx + 1}
              </td>
              {IMDB_COLUMNS.map((col) => {
                const field = product.fields[col.key];
                const value = field.value.trim();
                const flagged = isFlagged(col.key, field);
                return (
                  <td
                    key={col.key}
                    className={cn(
                      'max-w-[220px] truncate px-3 py-2',
                      value ? 'text-slate-700' : 'text-slate-300 italic',
                      flagged && 'bg-amber-50',
                    )}
                    title={value}
                  >
                    {value || 'empty'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
