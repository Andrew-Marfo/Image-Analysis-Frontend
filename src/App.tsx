import { AppStoreProvider, useAppStore } from './store/AppStore';
import type { WorkflowStep } from './types/imdb';
import { Header } from './components/Header';
import { Stepper } from './components/Stepper';
import { UploadStep } from './components/upload/UploadStep';
import { ReviewStep } from './components/review/ReviewStep';
import { ExportStep } from './components/export/ExportStep';

function Workspace() {
  const { step, products, setStep } = useAppStore();
  const hasProducts = products.length > 0;

  // Once images are uploaded, review/export become reachable.
  const reachable: WorkflowStep[] = hasProducts
    ? ['upload', 'review', 'export']
    : ['upload'];

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <div className="border-b border-slate-200 bg-white py-4">
        <Stepper current={step} reachable={reachable} onNavigate={setStep} />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {step === 'upload' && <UploadStep />}
        {step === 'review' && (hasProducts ? <ReviewStep /> : <EmptyHint />)}
        {step === 'export' && (hasProducts ? <ExportStep /> : <EmptyHint />)}
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Upload → Preview → Edit → Export · runs on a mock pipeline until the backend is
        connected
      </footer>
    </div>
  );
}

function EmptyHint() {
  const { setStep } = useAppStore();
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
      <p className="text-sm text-slate-500">No products yet — start by uploading images.</p>
      <button
        type="button"
        onClick={() => setStep('upload')}
        className="mt-3 text-sm font-medium text-brand-600 hover:underline"
      >
        Go to upload
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <Workspace />
    </AppStoreProvider>
  );
}
