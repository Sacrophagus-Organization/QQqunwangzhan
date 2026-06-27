import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiamondLogo } from '@/components/DiamondLogo';
import { Footer } from '@/components/Footer';
import { Key, User, Hash, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated, login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [qqNumber, setQqNumber] = useState('');
  const [registerReason, setRegisterReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // ═══ Force login page via ?force=1 (crash overlay redirect) ═══
  const [searchParams] = useSearchParams();
  const forceShow = searchParams.get('force') === '1';

  if (isAuthenticated && !forceShow) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('请填写所有必填字段');
      return;
    }
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!username.trim() || !password.trim() || !qqNumber.trim()) {
      setError('请填写所有必填字段');
      return;
    }
    if (password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }
    setLoading(true);
    const result = await register(username.trim(), password, qqNumber.trim(), registerReason.trim());
    setLoading(false);
    if (result.success) {
      setSuccessMsg(result.message);
      // Reset form
      setUsername(''); setPassword(''); setQqNumber(''); setRegisterReason('');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div className="flex-1 flex items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 hex-grid-bg" />
      <div className="absolute inset-0 diagonal-lines" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />

      {/* Decorative Lines */}
      <div className="absolute top-10 left-10 w-32 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute top-10 right-10 w-32 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-10 left-10 w-32 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-10 right-10 w-32 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* 闪烁装饰点 */}
      <div className="absolute top-12 left-24 w-1 h-1 rounded-full bg-primary/70 animate-twinkle" style={{ animationDelay: '0.4s' }} />
      <div className="absolute top-20 right-32 w-1 h-1 rounded-full bg-accent/70 animate-twinkle" style={{ animationDelay: '1.2s' }} />
      <div className="absolute bottom-24 left-40 w-1 h-1 rounded-full bg-primary/70 animate-twinkle" style={{ animationDelay: '0.8s' }} />
      <div className="absolute bottom-16 right-20 w-1 h-1 rounded-full bg-accent/70 animate-twinkle" style={{ animationDelay: '1.6s' }} />
      <div className="absolute top-1/3 left-8 w-1 h-1 rounded-full bg-primary/70 animate-twinkle" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo Area */}
        <div className="text-center mb-8 anim-blur-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/30 originium-pulse mb-4 relative">
            <DiamondLogo size={40} className="text-primary animate-breathe-glow" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display text-glow-cyan mb-2 text-gradient-flow">石棺</h1>
          <p className="text-muted-foreground/90 text-sm">sarcophagus.org.cn · 非公开博客</p>
        </div>

        <Card className="card-elevated border-glow anim-scale-in relative overflow-hidden">
          {/* Hero 扫描线 */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden z-10 pointer-events-none">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary/70 to-transparent animate-data-sweep" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl text-center font-heading tracking-wide">身份验证</CardTitle>
            <CardDescription className="text-center text-muted-foreground/90">
              本网站仅对群成员开放，请输入您的凭据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-secondary/50 anim-fade-up" style={{ animationDelay: '0.05s' }}>
                <TabsTrigger value="login" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <Key className="h-4 w-4 mr-2" />
                  登录
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <User className="h-4 w-4 mr-2" />
                  注册
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4 anim-fade-up" style={{ animationDelay: '0.15s' }}>
                  <div className="space-y-2">
                    <Label htmlFor="login-username">用户名</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-username"
                        placeholder="请输入用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 bg-secondary/30 border-border/50 focus:border-primary/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 bg-secondary/30 border-border/50 focus:border-primary/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={loading}>
                    {loading ? (
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Key className="h-4 w-4 mr-2" />
                    )}
                    {loading ? '验证中...' : '进入石棺'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4 anim-fade-up" style={{ animationDelay: '0.15s' }}>
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">用户名</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-username"
                        placeholder="请输入用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 bg-secondary/30 border-border/50 focus:border-primary/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">密码</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="至少6位密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 bg-secondary/30 border-border/50 focus:border-primary/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-qq">QQ号</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-qq"
                        placeholder="请输入QQ号用于验证"
                        value={qqNumber}
                        onChange={(e) => setQqNumber(e.target.value)}
                        className="pl-10 bg-secondary/30 border-border/50 focus:border-primary/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-reason">注册理由（选填）</Label>
                    <Input
                      id="reg-reason"
                      placeholder="请简要说明申请注册的原因"
                      value={registerReason}
                      onChange={(e) => setRegisterReason(e.target.value)}
                      className="bg-secondary/30 border-border/50 focus:border-primary/50"
                    />
                  </div>
                  {successMsg && (
                    <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2">
                      {successMsg}
                    </p>
                  )}
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" disabled={loading}>
                    {loading ? (
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <User className="h-4 w-4 mr-2" />
                    )}
                    {loading ? '注册中...' : '注册并进入'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground/90 text-center mt-4 mono-text">
              &gt; SYSTEM: Restricted Area. Group Members Only.
            </p>
          </CardContent>
        </Card>
      </div>
      </div>
      <Footer />
    </div>
  );
}
