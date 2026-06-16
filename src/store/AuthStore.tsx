import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  apiGetMe,
  apiLogin,
  apiRegister,
  clearTokens,
  getAccessToken,
  USE_REAL_API,
  type UserOut,
} from '../api/client';

interface AuthState {
  user: UserOut | null;
  loading: boolean;
  transitioning: boolean;
  transitionMessage: string;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(USE_REAL_API);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('');

  useEffect(() => {
    if (!USE_REAL_API) return;
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    apiGetMe()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setTransitioning(true);
    setTransitionMessage('Signing in…');
    try {
      const u = await apiLogin(email, password);
      setUser(u);
      await new Promise<void>((r) => setTimeout(r, 900));
    } finally {
      setTransitioning(false);
      setTransitionMessage('');
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setTransitioning(true);
    setTransitionMessage('Creating your account…');
    try {
      await apiRegister(email, password);
      const u = await apiLogin(email, password);
      setUser(u);
      await new Promise<void>((r) => setTimeout(r, 900));
    } finally {
      setTransitioning(false);
      setTransitionMessage('');
    }
  }, []);

  const logout = useCallback(() => {
    setTransitioning(true);
    setTransitionMessage('Signing out…');
    setTimeout(() => {
      clearTokens();
      setUser(null);
      setTransitioning(false);
      setTransitionMessage('');
    }, 900);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, transitioning, transitionMessage, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
