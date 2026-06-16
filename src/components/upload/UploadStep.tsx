import { useState } from 'react';
import { ArrowRight, Layers, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { Button } from '../ui/Button';
import { Dropzone } from './Dropzone';
import { ProductImageGroup } from './ProductImageGroup';

export function UploadStep() {
  const { products, addFiles, runExtraction, setStep } = useAppStore();
  const [busy, setBusy] = useState(false);

  const totalImages = products.reduce((n, p) => n + p.images.length, 0);

  async function handleAnalyze() {
    setBusy(true);
    try {
      await runExtraction();
      setStep('review');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Dropzone onFiles={(files, angle) => addFiles(files, angle)} />

      {products.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Layers className="h-4 w-4 text-slate-400" />
              {products.length} product{products.length !== 1 && 's'} · {totalImages}{' '}
              image{totalImages !== 1 && 's'}
            </h2>
            <Button
              onClick={handleAnalyze}
              disabled={busy || totalImages === 0}
              size="lg"
            >
              {busy ? (
                <>
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze images
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {products.map((product, idx) => (
              <ProductImageGroup key={product.id} product={product} index={idx} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
