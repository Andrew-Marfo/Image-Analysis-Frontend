import { createContext, useContext, useState, type ReactNode } from 'react';

export type AppPage = 'upload' | 'records';

interface NavState {
  page: AppPage;
  setPage: (p: AppPage) => void;
}

const NavCtx = createContext<NavState | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<AppPage>('upload');
  return <NavCtx.Provider value={{ page, setPage }}>{children}</NavCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNav(): NavState {
  const ctx = useContext(NavCtx);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
