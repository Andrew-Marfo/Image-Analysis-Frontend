import { ScanLine } from 'lucide-react';

interface Props {
  message: string;
}

export function AuthTransition({ message }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-8">
        {/* Logo with spinning ring */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-brand-600/25 border-t-brand-500" />
          <div className="absolute inset-2 animate-spin rounded-full border-2 border-brand-400/15 border-b-brand-400 [animation-duration:1.5s]" />
          <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-brand-600">
            <ScanLine className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Brand + message */}
        <div className="text-center">
          <p className="text-xl font-bold tracking-tight text-white">Image-to-IMDB</p>
          <p className="mt-2 text-sm text-slate-400">{message}</p>
        </div>

        {/* Bouncing dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-2 w-2 animate-bounce rounded-full bg-brand-500"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
