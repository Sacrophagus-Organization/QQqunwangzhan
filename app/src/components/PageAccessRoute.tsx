import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, usePageAccess } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import MaintenancePage from './MaintenancePage';

interface PageAccessRouteProps {
  routePath: string;
  children: ReactNode;
}

/**
 * 页面访问控制路由守卫
 *
 * public  → 所有人可访问
 * member  → 访客跳转登录页；已登录正常
 * admin   → 访客跳转登录页；非admin显示维护页；admin正常
 */
export default function PageAccessRoute({ routePath, children }: PageAccessRouteProps) {
  const { pageAccessConfig, configLoading } = usePageAccess();
  const { user, isAuthenticated, loading } = useAuth();

  // 认证 或 配置 加载中 → 等待
  if (loading || configLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-primary/40 animate-spin" />
      </div>
    );
  }

  const config = pageAccessConfig[routePath];
  const level: 'public' | 'member' | 'admin' = config?.access_level ?? 'member';

  // ═══ public — 所有人可访问 ═══
  if (level === 'public') return <>{children}</>;

  // ═══ 访客 → 跳转登录页 ═══
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // ═══ member — 已登录即可 ═══
  if (level === 'member') return <>{children}</>;

  // ═══ admin — 仅管理员 ═══
  if (level === 'admin') {
    if (user?.role === 'admin') return <>{children}</>;
    return <MaintenancePage redirectTo="/" delay={2500} />;
  }

  return <>{children}</>;
}
