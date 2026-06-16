import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { setToken, clearToken, apiPost, apiGet } from '@/api/client';

interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'member';
  qqNumber: string;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, password: string, qqNumber: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const token = localStorage.getItem('arkoverseer_token');
    if (token) {
      apiGet<AuthUser>('/auth/me')
        .then(u => setUser(u))
        .catch(() => { clearToken(); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await apiPost<{ token: string; user: AuthUser }>('/auth/login', { username, password });
      setToken(res.token);
      setUser(res.user);
      return { success: true, message: '登录成功' };
    } catch (e: any) {
      return { success: false, message: e.message || '登录失败' };
    }
  }, []);

  const register = useCallback(async (username: string, password: string, qqNumber: string) => {
    try {
      const res = await apiPost<{ token: string; user: AuthUser }>('/auth/register', { username, password, qqNumber });
      setToken(res.token);
      setUser(res.user);
      return { success: true, message: '注册成功' };
    } catch (e: any) {
      return { success: false, message: e.message || '注册失败' };
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, loading,
      login, register, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
