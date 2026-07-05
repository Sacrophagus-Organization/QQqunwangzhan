import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Loader2, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiDelete, apiGet, apiPost } from '@/api/client';
import type { MailBot } from '@/types';

export default function MailBotListPage() {
  const [bots, setBots] = useState<MailBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ username: '', domain: 'example.com', displayName: '', note: '' });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchBots = useCallback(async () => {
    setLoading(true);
    try { setBots(await apiGet<MailBot[]>('/mail/admin/bots')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBots().catch(console.error); }, [fetchBots]);

  const createBot = async () => {
    if (!form.username.trim() || !form.domain.trim()) return;
    setCreating(true);
    try {
      const bot = await apiPost<MailBot>('/mail/admin/bots', form);
      setCreateOpen(false);
      setForm({ username: '', domain: 'example.com', displayName: '', note: '' });
      fetchBots().catch(console.error);
      navigate(`/mail/admin/bots/${bot.id}`);
    } catch (e: any) { alert(e.message); }
    finally { setCreating(false); }
  };

  const deleteBot = async (id: string) => {
    if (!confirm('确定要删除该Bot及其所有规则和提交记录？')) return;
    await apiDelete(`/mail/admin/bots/${id}`);
    fetchBots().catch(console.error);
  };

  if (loading) {
    return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/mail"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
              <h1 className="text-2xl font-bold text-glow-cyan flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />Bot 管理
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-11">管理自动回复机器人 - 用于答案提交与线索分发</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />创建 Bot</Button>
        </div>

        {bots.length === 0 ? (
          <Card className="glass-card border-border/50">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-3 opacity-40" />
              暂无 Bot，点击上方按钮创建第一个
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map(bot => (
              <Card key={bot.id} className="glass-card border-border/50 hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => navigate(`/mail/admin/bots/${bot.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{bot.displayName || bot.username}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{bot.address}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteBot(bot.id); }}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                    </div>
                  </div>
                  {bot.note && <p className="text-sm text-muted-foreground mb-2">{bot.note}</p>}
                  <div className="flex items-center gap-2">
                    <Badge variant={bot.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {bot.status === 'active' ? '运行中' : '已停用'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(bot.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>创建 Bot</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label>用户名</Label>
                  <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="bot用户名" />
                </div>
                <div className="space-y-2">
                  <Label>@域名</Label>
                  <Input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="example.com" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">邮箱地址：{form.username || '...'}@{form.domain || '...'}</div>
              <div className="space-y-2">
                <Label>显示名</Label>
                <Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="可选" />
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Bot用途说明（可选）" />
              </div>
              <Button onClick={createBot} disabled={creating || !form.username.trim() || !form.domain.trim()} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
