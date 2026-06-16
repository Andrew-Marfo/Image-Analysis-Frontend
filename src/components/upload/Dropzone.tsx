import { useRef, useState, type DragEvent } from 'react';
import { ImagePlus, UploadCloud } from 'lucide-react';
import { cn } from '../../lib/cn';
import { ANGLE_OPTIONS } from './ProductImageGroup';

interface Props {
  onFiles: (files: File[], angle?: string) => void;
}

const ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp';

function imagesOnly(list: FileList | null): File[] {
  if (!list) return [];
  return [...list].filter((f) => f.type.startsWith('image/'));
}

export function Dropzone({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [angle, setAngle] = useState('');

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = imagesOnly(e.dataTransfer.files);
    if (files.length) onFiles(files, angle || undefined);
  }

  function handleBrowse() {
    inputRef.current?.click();
  }

  return (
    <div className="space-y-3">
      {/* Step 1 — angle selector */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          1
        </span>
        <label htmlFor="dropzone-angle" className="shrink-0 text-sm font-medium text-slate-700">
          Select image angle
        </label>
        <select
          id="dropzone-angle"
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        >
          <option value="">— choose angle (optional) —</option>
          {ANGLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2 — drop zone */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          2
        </span>
        <span className="shrink-0 text-sm font-medium text-slate-700">Upload images</span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={handleBrowse}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleBrowse()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging
            ? 'border-brand-400 bg-brand-50'
            : 'border-slate-300 bg-white hover:border-brand-300 hover:bg-slate-50',
        )}
      >
        <div
          className={cn(
            'mb-3 flex h-14 w-14 items-center justify-center rounded-full transition-colors',
            dragging ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
          )}
        >
          {dragging ? <ImagePlus className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
        </div>

        {angle ? (
          <p className="text-sm font-semibold text-brand-700">
            Uploading as: <span className="rounded bg-brand-100 px-2 py-0.5">{angle}</span>
          </p>
        ) : (
          <p className="text-sm font-medium text-slate-700">Drag &amp; drop product images here</p>
        )}

        <p className="mt-1 text-sm text-slate-500">
          or <span className="font-medium text-brand-600">browse</span> to upload
        </p>
        <p className="mt-3 max-w-sm text-xs text-slate-400">
          Files sharing the same name prefix (e.g.{' '}
          <span className="font-mono">S1234_front.jpg</span>,{' '}
          <span className="font-mono">S1234_back.jpg</span>) are grouped into one product row.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            const files = imagesOnly(e.target.files);
            if (files.length) onFiles(files, angle || undefined);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
