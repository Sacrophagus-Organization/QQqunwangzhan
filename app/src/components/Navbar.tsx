import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  FileText,
  Puzzle,
  BookOpen,
  LogOut,
  Menu,
  User,
  Home,
  ChevronDown,
  Shield,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/records', label: '解密记录', icon: FileText },
  { path: '/puzzles', label: '自制谜题', icon: Puzzle },
  { path: '/wiki', label: '解密Wiki', icon: BookOpen },
];

export function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
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

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-7xl items-center px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-8">
          <div className="flex items-center gap-2">
            <DiamondLogo size={24} className="text-primary" />
            <span className="font-bold text-sm tracking-wider text-glow-cyan hidden sm:inline">
              石棺
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-primary/10 text-primary border border-primary/20 glow-cyan'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Side - User Menu */}
        <div className="flex items-center gap-3 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-secondary/50">
                <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm hidden sm:inline">{user.username}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2 border-b border-border/50">
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">QQ: {user.qqNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {user.role === 'admin' ? '管理员' : user.role === 'editor' ? '编辑' : '成员'}
                </p>
              </div>
              {(user.role === 'admin' || user.role === 'editor') && (
                <Link to="/lynchpin-admin">
                  <DropdownMenuItem className="cursor-pointer text-amber-400">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>控制台</span>
                    {user.role === 'admin' && pendingCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{pendingCount}</span>
                    )}
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
                    <span className="font-bold text-lg text-glow-cyan">石棺</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">明日方舟解谜群</p>
                </div>
                <nav className="flex-1 p-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 mb-1 ${
                          isActive(item.path)
                            ? 'bg-primary/10 text-primary border border-primary/20 glow-cyan'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
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
                    <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.role === 'admin' ? '管理员' : user.role === 'editor' ? '编辑' : '成员'}</p>
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
        </div>
      </div>
    </header>
  );
}
