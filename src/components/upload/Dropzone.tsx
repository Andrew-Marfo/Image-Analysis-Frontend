import { useRef, useState, type DragEvent } from 'react';
import { ImagePlus, UploadCloud } from 'lucide-react';
import { cn } from '../../lib/cn';

interface Props {
  onFiles: (files: File[]) => void;
}

const ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp';

function imagesOnly(list: FileList | null): File[] {
  if (!list) return [];
  return [...list].filter((f) => f.type.startsWith('image/'));
}

export function Dropzone({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = imagesOnly(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
        dragging
          ? 'border-brand-400 bg-brand-50'
          : 'border-slate-300 bg-white hover:border-brand-300 hover:bg-slate-50',
      )}
    >
      <div
        className={cn(
          'mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-colors',
          dragging ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
        )}
      >
        {dragging ? <ImagePlus className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
      </div>
      <p className="text-sm font-medium text-slate-700">
        Drag &amp; drop product images here
      </p>
      <p className="mt-1 text-sm text-slate-500">
        or <span className="font-medium text-brand-600">browse</span> to upload
      </p>
      <p className="mt-3 max-w-sm text-xs text-slate-400">
        Add all 3–4 angles of a product together. Images are grouped into one
        product automatically by filename.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const files = imagesOnly(e.target.files);
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
