import { ArrowLeft, ArrowRight, FileDown, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { flaggedCount } from '../../lib/confidence';
import { Button } from '../ui/Button';
import { ProductCard } from './ProductCard';

export function ReviewStep() {
  const { products, setStep } = useAppStore();

  const totalFlagged = products.reduce((n, p) => n + flaggedCount(p), 0);
  const reviewedCount = products.filter((p) => p.reviewed).length;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-brand-500" />
          <span className="font-medium text-slate-700">
            {reviewedCount}/{products.length} reviewed
          </span>
        </div>
        <span className="text-sm text-slate-400">·</span>
        <span className="text-sm text-slate-600">
          {totalFlagged === 0 ? (
            'No fields flagged'
          ) : (
            <>
              <span className="font-medium text-amber-600">{totalFlagged}</span> field
              {totalFlagged !== 1 && 's'} flagged for review
            </>
          )}
        </span>

        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => setStep('upload')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => setStep('export')}>
            <FileDown className="h-4 w-4" />
            Continue to export
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Review the extracted attributes below. Fields highlighted in{' '}
        <span className="font-medium text-amber-600">amber</span> are low-confidence or
        expected-but-empty — edit them where needed. Leave a field blank if it can't be
        confidently determined from the images.
      </p>

      <div className="space-y-4">
        {products.map((product, idx) => (
          <ProductCard key={product.id} product={product} index={idx} />
        ))}
      </div>
    </div>
  );
}
