import { Check } from 'lucide-react';
import type { WorkflowStep } from '../types/imdb';
import { cn } from '../lib/cn';

const STEPS: { key: WorkflowStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'review', label: 'Preview & Edit' },
  { key: 'export', label: 'Export' },
];

interface Props {
  current: WorkflowStep;
  /** Steps the user is allowed to jump back to. */
  reachable: WorkflowStep[];
  onNavigate: (step: WorkflowStep) => void;
}

export function Stepper({ current, reachable, onNavigate }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <nav aria-label="Progress" className="flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const canNavigate = reachable.includes(step.key) && !isCurrent;

        return (
          <div key={step.key} className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              disabled={!canNavigate}
              onClick={() => canNavigate && onNavigate(step.key)}
              className={cn(
                'group flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 transition-colors',
                canNavigate && 'hover:bg-slate-100',
                !canNavigate && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  isCurrent && 'bg-brand-600 text-white',
                  isDone && 'bg-brand-100 text-brand-700',
                  !isCurrent && !isDone && 'bg-slate-200 text-slate-500',
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : idx + 1}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  isCurrent ? 'text-slate-900' : 'text-slate-500',
                )}
              >
                {step.label}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <span
                className={cn(
                  'h-px w-6 sm:w-12',
                  idx < currentIdx ? 'bg-brand-300' : 'bg-slate-200',
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
