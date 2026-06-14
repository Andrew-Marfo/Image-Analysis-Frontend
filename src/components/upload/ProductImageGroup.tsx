import { Trash2, X } from 'lucide-react';
import type { Product } from '../../types/imdb';
import { useAppStore } from '../../store/AppStore';

interface Props {
  product: Product;
  index: number;
}

export function ProductImageGroup({ product, index }: Props) {
  const { removeProduct, removeImage } = useAppStore();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600">
            {index + 1}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium text-slate-800">Product</p>
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

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {product.images.map((img) => (
          <div
            key={img.id}
            className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
          >
            <img
              src={img.previewUrl}
              alt={img.fileName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => removeImage(product.id, img.id)}
              className="absolute top-1 right-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:block hover:bg-black/80"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
