import { AuthProvider, useAuth } from './store/AuthStore';
import { NavProvider, useNav } from './store/NavStore';
import { AppStoreProvider, useAppStore } from './store/AppStore';
import type { WorkflowStep } from './types/imdb';
import { USE_REAL_API } from './api/client';
import { Header } from './components/Header';
import { Stepper } from './components/Stepper';
import { UploadStep } from './components/upload/UploadStep';
import { ReviewStep } from './components/review/ReviewStep';
import { ExportStep } from './components/export/ExportStep';
import { AuthPage } from './components/auth/AuthPage';
import { AuthTransition } from './components/auth/AuthTransition';
import { RecordsPage } from './components/records/RecordsPage';

function UploadWorkspace() {
  const { step, products, setStep } = useAppStore();
  const hasProducts = products.length > 0;

  const reachable: WorkflowStep[] = hasProducts
    ? ['upload', 'review', 'export']
    : ['upload'];

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-slate-200 bg-white py-4">
        <Stepper current={step} reachable={reachable} onNavigate={setStep} />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {step === 'upload' && <UploadStep />}
        {step === 'review' && (hasProducts ? <ReviewStep /> : <EmptyHint />)}
        {step === 'export' && (hasProducts ? <ExportStep /> : <EmptyHint />)}
      </main>
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

function Workspace() {
  const { page } = useNav();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      {page === 'upload' ? (
        <AppStoreProvider>
          <UploadWorkspace />
        </AppStoreProvider>
      ) : (
        <RecordsPage />
      )}
    </div>
  );
}

function AppRoot() {
  const { user, loading, transitioning, transitionMessage } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (transitioning) {
    return <AuthTransition message={transitionMessage} />;
  }

  if (USE_REAL_API && !user) {
    return <AuthPage />;
  }

  return (
    <NavProvider>
      <Workspace />
    </NavProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}
