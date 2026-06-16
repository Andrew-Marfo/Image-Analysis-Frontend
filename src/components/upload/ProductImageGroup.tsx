import { useRef, useState } from 'react';
import { ImagePlus, PlusCircle, Trash2, X } from 'lucide-react';
import type { Product } from '../../types/imdb';
import { useAppStore } from '../../store/AppStore';

interface Props {
  product: Product;
  index: number;
}

export const ANGLE_OPTIONS = [
  { value: 'Front',       label: 'Front' },
  { value: 'Back',        label: 'Back' },
  { value: 'Left Side',   label: 'Left Side' },
  { value: 'Right Side',  label: 'Right Side' },
  { value: 'Label',       label: 'Label / Tag' },
  { value: 'Top',         label: 'Top' },
  { value: 'Bottom',      label: 'Bottom' },
  { value: 'Other',       label: 'Other' },
];

const BADGE: Record<string, string> = {
  front:       'bg-brand-600 text-white',
  back:        'bg-slate-700 text-white',
  'left side': 'bg-indigo-500 text-white',
  'right side':'bg-purple-500 text-white',
  label:       'bg-amber-500 text-white',
  top:         'bg-teal-500 text-white',
  bottom:      'bg-teal-700 text-white',
  other:       'bg-slate-400 text-white',
};

function badgeClass(tag: string | undefined): string {
  if (!tag) return 'bg-slate-400 text-white';
  return BADGE[tag.toLowerCase()] ?? 'bg-slate-400 text-white';
}

export function ProductImageGroup({ product, index }: Props) {
  const { removeProduct, removeImage, addFilesToProduct, setImageAngle } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [addAngle, setAddAngle] = useState('');

  function handleBrowse() {
    inputRef.current?.click();
  }

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) addFilesToProduct(product.id, files, addAngle || undefined);
    e.target.value = '';
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600">
            {index + 1}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium text-slate-800">Product {index + 1}</p>
            <p className="font-mono text-xs text-slate-400">{product.groupKey}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {product.images.length} image{product.images.length !== 1 && 's'}
          </span>
          <button
            type="button"
            onClick={() => removeProduct(product.id)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Remove product"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Thumbnail grid — each cell: image + angle selector */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {product.images.map((img) => (
          <div key={img.id} className="flex flex-col gap-1">
            <div className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img
                src={img.previewUrl}
                alt={img.fileName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {img.tag && (
                <span
                  className={`pointer-events-none absolute bottom-0 left-0 right-0 truncate px-1 py-0.5 text-center text-[10px] font-bold ${badgeClass(img.tag)}`}
                >
                  {img.tag}
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(product.id, img.id)}
                className="absolute top-1 right-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:flex hover:bg-black/80"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            {/* Reassign angle dropdown */}
            <select
              value={img.tag ?? ''}
              onChange={(e) => setImageAngle(product.id, img.id, e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
              aria-label={`Angle for ${img.fileName}`}
            >
              <option value="">— angle —</option>
              {ANGLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Add another angle — dropdown first, then browse */}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
        <ImagePlus className="h-4 w-4 shrink-0 text-slate-400" />
        <select
          value={addAngle}
          onChange={(e) => setAddAngle(e.target.value)}
          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
        >
          <option value="">— select angle to add —</option>
          {ANGLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleBrowse}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Browse
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        multiple
        hidden
        onChange={handleAddFiles}
      />
    </div>
  );
}
