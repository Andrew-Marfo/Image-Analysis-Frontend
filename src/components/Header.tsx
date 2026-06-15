import { CalendarDays, LogOut, ScanLine, Upload, TableProperties } from 'lucide-react';
import { useAuth } from '../store/AuthStore';
import { useNav } from '../store/NavStore';
import { USE_REAL_API } from '../api/client';

function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function Header() {
  const { user, logout } = useAuth();
  const { page, setPage } = useNav();

  const displayName = user?.email
    ? user.email.split('@')[0].replace(/[._-]/g, ' ')
    : 'Guest';

  return (
    <header className="shadow-sm">
      {/* Top bar */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <ScanLine className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold tracking-wide text-white">Image-to-IMDB</h1>
              <p className="text-xs text-slate-400">Auto-fill product master data</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {/* Date pill */}
            <div className="hidden items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 sm:flex">
              <CalendarDays className="h-4 w-4 text-slate-300" />
              <span className="text-xs font-medium text-slate-200">{todayLabel()}</span>
            </div>

            {/* User + sign out */}
            {USE_REAL_API && user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white uppercase">
                    {displayName.charAt(0)}
                  </div>
                  <div className="hidden leading-tight sm:block">
                    <p className="text-xs text-slate-400">Welcome back,</p>
                    <p className="text-sm font-semibold text-white capitalize">{displayName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out"
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-red-600 hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-0 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setPage('upload')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition ${
              page === 'upload'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => setPage('records')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition ${
              page === 'records'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <TableProperties className="h-4 w-4" />
            Records
          </button>
        </div>
      </div>
    </header>
  );
}
