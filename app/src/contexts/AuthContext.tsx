import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { setToken, clearToken, apiPost, apiGet } from '@/api/client';
import type { PageAccessConfig } from '@/types';

interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'editor' | 'member';
  qqNumber: string;
  avatarUrl: string;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  configLoading: boolean;
  pageAccessConfig: Record<string, PageAccessConfig>;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, password: string, qqNumber: string, registerReason?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateAvatar: (avatarUrl: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageAccessConfig, setPageAccessConfig] = useState<Record<string, PageAccessConfig>>({});
  const [configLoading, setConfigLoading] = useState(true);

  // Fetch page access config (public API, no auth needed)
  useEffect(() => {
    fetch('/api/site/page-access')
      .then(res => res.json())
      .then((rows: PageAccessConfig[]) => {
        const map: Record<string, PageAccessConfig> = {};
        for (const r of rows) {
          map[r.route_path] = r;
        }
        setPageAccessConfig(map);
      })
      .catch(() => {
        console.warn('[AuthContext] 无法获取页面访问配置，使用默认策略');
      })
      .finally(() => setConfigLoading(false));
  }, []);

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

  const register = useCallback(async (username: string, password: string, qqNumber: string, registerReason?: string) => {
    try {
      const res = await apiPost<{ success: boolean; message: string }>('/auth/register', { username, password, qqNumber, registerReason: registerReason || '' });
      return { success: true, message: res.message || '注册成功，请等待管理员审核' };
    } catch (e: any) {
      return { success: false, message: e.message || '注册失败' };
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const updateAvatar = useCallback((avatarUrl: string) => {
    setUser(prev => prev ? { ...prev, avatarUrl } : null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, loading, configLoading, pageAccessConfig,
      login, register, logout, updateAvatar,
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

/** 获取页面访问配置的便捷 hook */
export function usePageAccess() {
  const { pageAccessConfig, configLoading } = useAuth();
  return { pageAccessConfig, configLoading };
}
