import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Columns } from 'lucide-react';

export interface ColumnOption {
  key: string;
  label: string;
}

interface Props {
  columns: ColumnOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function ColumnPicker({ columns, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function selectAll() { onChange(new Set(columns.map((c) => c.key))); }
  function clearAll()  { onChange(new Set()); }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <Columns className="h-4 w-4 text-slate-500" />
        Columns
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
          {selected.size}/{columns.length}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {selected.size} of {columns.length} columns
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                All
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-slate-500 hover:underline"
              >
                None
              </button>
            </div>
          </div>

          {/* Column list — 2-column grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {columns.map((col) => (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(col.key)}
                  onChange={() => toggle(col.key)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="truncate text-xs">{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
