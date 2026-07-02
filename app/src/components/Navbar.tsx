import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, usePageAccess } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiGet } from '@/api/client';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DiamondLogo } from '@/components/DiamondLogo';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { AvatarUpload } from '@/components/AvatarUpload';
import { RoleApply } from '@/components/RoleApply';
import {
  FileText,
  Puzzle,
  BookOpen,
  LogOut,
  Menu,
  Home,
  ChevronDown,
  Shield,
  MessagesSquare,
  LogIn,
  Mail,
  Settings,
  Film,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/records', label: '解密记录', icon: FileText },
  { path: '/puzzles', label: '自制谜题', icon: Puzzle },
  { path: '/wiki', label: '解密Wiki', icon: BookOpen },
  { path: '/messages', label: '留言板', icon: MessagesSquare },
  { path: '/mail', label: '企业邮箱', icon: Mail },
];

export function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { pageAccessConfig } = usePageAccess();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user?.role === 'admin') {
      apiGet<{ count: number }>('/admin/pending-count')
        .then(r => setPendingCount(r.count))
        .catch(() => {});
    }
  }, [user]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  /** 导航项对当前用户是否可见 */
  const isNavVisible = (path: string) => {
    // 首页始终可见
    if (path === '/') return true;

    // 未登录访客：仅显示 public 且 enabled 的页面
    if (!isAuthenticated) {
      const config = pageAccessConfig[path];
      if (!config) return false;
      return config.access_level === 'public' && config.is_enabled === 1;
    }

    // 已登录用户：admin 页面仅 admin 可见
    const config = pageAccessConfig[path];
    if (config?.access_level === 'admin' && user?.role !== 'admin') return false;

    // 其余页面（member/public）对所有已登录用户可见
    return true;
  };

  const visibleNavItems = navItems.filter(item => isNavVisible(item.path));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-12 max-w-7xl items-center px-4">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2 mr-8">
          <div className="flex items-center gap-2">
            <DiamondLogo size={22} className="text-primary transition-transform duration-700 group-hover:rotate-[180deg]" />
            <span className="font-display font-bold text-base tracking-widest text-glow-cyan hidden sm:inline">
              石棺
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium font-heading transition-all duration-200 ${
                  isActive(item.path)
                    ? 'text-primary nav-active-bar'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:translate-x-0.5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3 ml-auto">
          {isAuthenticated ? (
            <>
              {/* 登录用户菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-secondary/50">
                    <AvatarDisplay avatarUrl={user?.avatarUrl || ''} username={user?.username || ''} size="sm" />
                    <span className="text-sm hidden sm:inline">{user?.username}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-3 border-b border-border/50 flex items-center gap-3">
                    <AvatarUpload />
                    <div>
                      <p className="text-sm font-medium">{user?.username}</p>
                      <p className="text-xs text-muted-foreground">QQ: {user?.qqNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.role === 'admin' ? '管理员' : user?.role === 'editor' ? '编辑' : '成员'}
                      </p>
                    </div>
                  </div>
                  <RoleApply />
                  <Link to="/settings/mail">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>邮箱设置</span>
                    </DropdownMenuItem>
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/lynchpin-admin">
                      <DropdownMenuItem className="cursor-pointer text-amber-400">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>控制台</span>
                        {pendingCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{pendingCount}</span>
                        )}
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {(user?.role === 'admin' || user?.role === 'editor') && (
                    <Link to="/juqing/editor">
                      <DropdownMenuItem className="cursor-pointer">
                        <Film className="mr-2 h-4 w-4" />
                        <span>剧情编辑器</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive mt-1">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <DiamondLogo size={20} className="text-primary" />
                        <span className="font-display font-bold text-lg text-glow-cyan">石棺</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">明日方舟解谜群</p>
                    </div>
                    <nav className="flex-1 p-2">
                      {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileOpen(false)}
                            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium font-heading transition-all duration-200 mb-1 ${
                              isActive(item.path)
                                ? 'text-primary nav-active-bar'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:translate-x-0.5'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </nav>
                    <div className="p-4 border-t border-border/50">
                      <div className="flex items-center gap-3 mb-3">
                        <AvatarDisplay avatarUrl={user?.avatarUrl || ''} username={user?.username || ''} size="md" />
                        <div>
                          <p className="text-sm font-medium">{user?.username}</p>
                          <p className="text-xs text-muted-foreground">{user?.role === 'admin' ? '管理员' : user?.role === 'editor' ? '编辑' : '成员'}</p>
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" className="w-full" onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        退出登录
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              {/* 访客导航：登录按钮 */}
              <Link to="/login">
                <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50">
                  <LogIn className="h-4 w-4" />
                  <span>登录</span>
                </Button>
              </Link>

              {/* 移动端菜单（访客版） */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <DiamondLogo size={20} className="text-primary" />
                        <span className="font-display font-bold text-lg text-glow-cyan">石棺</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">明日方舟解谜群</p>
                    </div>
                    <nav className="flex-1 p-2">
                      {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileOpen(false)}
                            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium font-heading transition-all duration-200 mb-1 ${
                              isActive(item.path)
                                ? 'text-primary nav-active-bar'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:translate-x-0.5'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </nav>
                    <div className="p-4 border-t border-border/50">
                      <Link to="/login" onClick={() => setMobileOpen(false)}>
                        <Button variant="default" size="sm" className="w-full gap-2">
                          <LogIn className="h-4 w-4" />
                          登录
                        </Button>
                      </Link>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
