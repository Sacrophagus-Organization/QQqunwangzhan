import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Mail, CheckCircle2, Loader2, Settings, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiDelete, apiGet, apiPost } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MailAccount } from '@/types';

function defaultLocalPart(username: string) {
  return username.toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

export default function MailSettingsPage() {
  const { user } = useAuth();
  const [account, setAccount] = useState<MailAccount | null>(null);
  const [localPart, setLocalPart] = useState(defaultLocalPart(user?.username || ''));
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [destroying, setDestroying] = useState(false);

  useEffect(() => {
    apiGet<MailAccount | null>('/mail/account')
      .then(setAccount)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const apply = async () => {
    setSaving(true);
    setError('');
    try {
      const created = await apiPost<MailAccount>('/mail/account', { localPart, displayName });
      setAccount(created);
    } catch (e: any) {
      setError(e.message || '申请失败');
    } finally {
      setSaving(false);
    }
  };

  const destroyAccount = async () => {
    setDestroying(true);
    try {
      await apiDelete('/mail/account');
      setAccount(null);
      setDestroyOpen(false);
    } catch (e: any) { alert(e.message); }
    finally { setDestroying(false); }
  };

  if (loading) {
    return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-glow-cyan flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              邮箱设置
            </h1>
            <p className="text-sm text-muted-foreground mt-1">申请并管理你的企业邮箱账号</p>
          </div>
          {account && (
            <Link to="/mail">
              <Button><Mail className="h-4 w-4 mr-2" />进入邮箱</Button>
            </Link>
          )}
        </div>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              企业邮箱账号
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {account ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xl font-semibold">{account.address}</span>
                  <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                    {account.status === 'active' ? '已开通' : '待开通'}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground">
                  <div>显示名：{account.displayName || '-'}</div>
                  <div>服务商：{account.provider}</div>
                  <div>创建时间：{new Date(account.createdAt).toLocaleString()}</div>
                  <div>状态更新时间：{new Date(account.updatedAt).toLocaleString()}</div>
                </div>
                <p className="text-sm text-muted-foreground">
                  邮箱密码不会保存在本站数据库中。真实企业邮箱供应商接入后，凭据应由供应商或密钥管理服务托管。
                </p>
                <div className="pt-4 mt-4 border-t border-border/50">
                  <button
                    onClick={() => setDestroyOpen(true)}
                    className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    <AlertTriangle className="h-4 w-4" />销毁邮箱
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>邮箱前缀</Label>
                    <Input value={localPart} onChange={e => setLocalPart(e.target.value)} placeholder="username" />
                  </div>
                  <div className="space-y-2">
                    <Label>显示名</Label>
                    <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="你的名字" />
                  </div>
                </div>
                <div className="rounded-md border border-border/50 bg-secondary/20 p-4 text-sm text-muted-foreground">
                  默认会申请形如 <span className="text-foreground">{localPart || 'username'}@example.com</span> 的企业邮箱。域名由后端环境变量 <span className="mono-text">MAIL_DOMAIN</span> 控制。
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={apply} disabled={saving || !localPart.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  申请企业邮箱
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={destroyOpen} onOpenChange={setDestroyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" />确认销毁邮箱</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">销毁后：</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>邮箱账号将被停用，无法收发新邮件</li>
              <li>已有邮件将保留 90 天后自动清除</li>
              <li>其他用户将无法向你的邮箱地址发送邮件</li>
              <li>此操作不可撤销</li>
            </ul>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDestroyOpen(false)} className="flex-1">取消</Button>
              <Button variant="destructive" onClick={destroyAccount} disabled={destroying} className="flex-1">
                {destroying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}确认销毁
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
