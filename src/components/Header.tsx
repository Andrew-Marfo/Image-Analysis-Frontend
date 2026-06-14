import { ScanLine } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <ScanLine className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <h1 className="text-base font-semibold text-slate-900">Image-to-IMDB</h1>
          <p className="text-xs text-slate-500">
            Auto-fill product master data from images
          </p>
        </div>
        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          GDSS-Maverick
        </span>
      </div>
    </header>
  );
}
