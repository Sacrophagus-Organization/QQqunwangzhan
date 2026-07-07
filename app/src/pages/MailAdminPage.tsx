import { Component, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Loader2,
  Mail,
  MailOpen,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client';
import type { MailAdminAccount, MailAdminLog, MailAdminMessage, MailAdminStats } from '@/types';

type Tab = 'accounts' | 'messages' | 'broadcast' | 'logs';

const statusLabels: Record<string, string> = { active: '已激活', pending: '待审核', disabled: '已停用' };
const statusColors: Record<string, string> = { active: 'bg-green-500/20 text-green-400', pending: 'bg-yellow-500/20 text-yellow-400', disabled: 'bg-red-500/20 text-red-400' };

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: '' }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message }; }
  render() {
    if (this.state.hasError) return <div className="p-4 text-destructive text-sm">组件错误: {this.state.error}</div>;
    return this.props.children;
  }
}

export default function MailAdminPage() {
  const [tab, setTab] = useState<Tab>('accounts');
  const [stats, setStats] = useState<MailAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<MailAdminStats>('/mail/admin/stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'accounts', label: '账号管理' },
    { key: 'messages', label: '邮件监控' },
    { key: 'broadcast', label: '群发通知' },
    { key: 'logs', label: '操作日志' },
  ];

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-glow-cyan flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              邮件管理后台
            </h1>
            <p className="text-sm text-muted-foreground mt-1">管理员专用 - 邮箱系统全局管理</p>
          </div>
          <div className="flex gap-2">
            <Link to="/mail"><Button variant="outline"><Mail className="h-4 w-4 mr-2" />返回邮箱</Button></Link>
            
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <Card className="glass-card border-border/50"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-primary">{stats.totalAccounts}</div><div className="text-xs text-muted-foreground">总账号</div></CardContent></Card>
            <Card className="glass-card border-border/50"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-green-400">{stats.activeAccounts}</div><div className="text-xs text-muted-foreground">已激活</div></CardContent></Card>
            <Card className="glass-card border-border/50"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-yellow-400">{stats.pendingAccounts}</div><div className="text-xs text-muted-foreground">待审核</div></CardContent></Card>
            <Card className="glass-card border-border/50"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-muted-foreground">{stats.totalMessages}</div><div className="text-xs text-muted-foreground">总邮件</div></CardContent></Card>
            <Card className="glass-card border-border/50"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-cyan-400">{stats.todayReceived}</div><div className="text-xs text-muted-foreground">今日收</div></CardContent></Card>
            <Card className="glass-card border-border/50"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-amber-400">{stats.botCount}</div><div className="text-xs text-muted-foreground">Bot数</div></CardContent></Card>
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b border-border/50 pb-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t-md transition-colors ${
                tab === t.key ? 'bg-primary/20 text-primary border-b-2 border-primary -mb-[2px]' : 'text-muted-foreground hover:text-foreground'
              }`}
            >{t.label}</button>
          ))}
        </div>

        <ErrorBoundary>
          {tab === 'accounts' && <AccountsPanel />}
        </ErrorBoundary>
        <ErrorBoundary>
          {tab === 'messages' && <MessagesPanel />}
        </ErrorBoundary>
        <ErrorBoundary>
          {tab === 'broadcast' && <BroadcastPanel />}
        </ErrorBoundary>
        <ErrorBoundary>
          {tab === 'logs' && <LogsPanel />}
        </ErrorBoundary>
      </div>
    </div>
  );
}

function AccountsPanel() {
  const [accounts, setAccounts] = useState<MailAdminAccount[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set('page', String(page));
      p.set('pageSize', '20');
      if (status) p.set('status', status);
      if (roleFilter) p.set('role', roleFilter);
      if (query) p.set('q', query);
      const data = await apiGet<{ accounts: MailAdminAccount[]; total: number }>('/mail/admin/accounts?' + p.toString());
      setAccounts(data.accounts);
      setTotal(data.total);
    } finally { setLoading(false); }
  }, [page, status, roleFilter, query]);

  useEffect(() => { fetchAccounts().catch(console.error); }, [fetchAccounts]);

  const updateStatus = async (id: string, newStatus: string) => {
    await apiPatch(`/mail/admin/accounts/${id}/status`, { status: newStatus });
    fetchAccounts().catch(console.error);
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('确定要删除该账号及其全部邮件数据？此操作不可撤销。')) return;
    await apiDelete(`/mail/admin/accounts/${id}`);
    fetchAccounts().catch(console.error);
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input placeholder="搜索用户名或邮箱地址" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={status} onValueChange={v => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="全部状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="active">已激活</SelectItem>
            <SelectItem value="pending">待审核</SelectItem>
            <SelectItem value="disabled">已停用</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={v => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[110px]"><SelectValue placeholder="全部角色" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            <SelectItem value="admin">管理员</SelectItem>
            <SelectItem value="editor">编辑</SelectItem>
            <SelectItem value="member">成员</SelectItem>
            <SelectItem value="bot">Bot</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => fetchAccounts()}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left p-3">用户名</th><th className="text-left p-3">邮箱地址</th><th className="text-left p-3">用户角色</th><th className="text-left p-3">状态</th><th className="text-left p-3">创建时间</th><th className="text-right p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id} className="border-t border-border/30 hover:bg-secondary/30">
                <td className="p-3">{a.username}</td>
                <td className="p-3 font-mono text-xs">{a.address}</td>
                <td className="p-3"><Badge variant="outline" className="text-xs">{a.userRole}</Badge></td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${statusColors[a.status]}`}>{statusLabels[a.status]}</span></td>
                <td className="p-3 text-muted-foreground text-xs">{new Date(a.createdAt).toLocaleString()}</td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    {a.status === 'pending' && <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, 'active')}><CheckCircle2 className="h-4 w-4 text-green-400" /></Button>}
                    {a.status === 'active' && <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, 'disabled')}><XCircle className="h-4 w-4 text-yellow-400" /></Button>}
                    {a.status === 'disabled' && <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, 'active')}><CheckCircle2 className="h-4 w-4 text-green-400" /></Button>}
                    <Button variant="ghost" size="sm" onClick={() => deleteAccount(a.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">暂无数据</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>第 {page} 页 / 共 {totalPages} 页 ({total} 条)</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      </div>
    </div>
  );
}

function MessagesPanel() {
  const [messages, setMessages] = useState<MailAdminMessage[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  var debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = useCallback(async (fromQ: string, toQ: string, subjQ: string, pg: number) => {
    setLoading(true);
    try {
      var p = new URLSearchParams();
      p.set('page', String(pg));
      p.set('pageSize', '20');
      if (fromQ) p.set('from', fromQ);
      if (toQ) p.set('to', toQ);
      if (subjQ) p.set('subject', subjQ);
      const data = await apiGet<{ messages: MailAdminMessage[]; total: number }>('/mail/admin/messages?' + p.toString());
      setMessages(data.messages);
      setTotal(data.total);
    } finally { setLoading(false); }
  }, []);

  const triggerSearch = useCallback((fromV: string, toV: string, subjV: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchMessages(fromV, toV, subjV, 1).catch(console.error);
    }, 500);
  }, [fetchMessages]);

  useEffect(() => {
    fetchMessages(fromInput, toInput, subjectInput, page).catch(console.error);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [page]);

  const viewDetail = async (id: string) => {
    const detail = await apiGet<any>(`/mail/admin/messages/${id}`);
    setSelected(detail);
    setDetailOpen(true);
  };

  const forceDelete = async (id: string) => {
    if (!confirm('确定删除该邮件？')) return;
    await apiDelete(`/mail/admin/messages/${id}`);
    fetchMessages('', '', '', 1).catch(console.error);
  };

  const addressStr = (list?: { address: string; name?: string }[]) => !list ? '' : list.map(i => i.name ? i.name + ' <' + i.address + '>' : i.address).join(', ');
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">发件人</Label>
          <Input placeholder="发件人地址" value={fromInput} onChange={e => { setFromInput(e.target.value); triggerSearch(e.target.value, toInput, subjectInput); }} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">收件人</Label>
          <Input placeholder="收件人地址" value={toInput} onChange={e => { setToInput(e.target.value); triggerSearch(fromInput, e.target.value, subjectInput); }} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">主题</Label>
          <Input placeholder="邮件主题" value={subjectInput} onChange={e => { setSubjectInput(e.target.value); triggerSearch(fromInput, toInput, e.target.value); }} className="w-[160px]" />
        </div>
        <Button variant="outline" size="icon" onClick={() => { setPage(1); fetchMessages(fromInput, toInput, subjectInput, 1).catch(console.error); }} title="立即搜索">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr><th className="text-left p-3 w-8"></th><th className="text-left p-3">发件人</th><th className="text-left p-3">收件人</th><th className="text-left p-3">主题</th><th className="text-left p-3">时间</th><th className="text-right p-3">操作</th></tr>
          </thead>
          <tbody>
            {messages.map(m => (
              <tr key={m.id} className="border-t border-border/30 hover:bg-secondary/30 cursor-pointer" onClick={() => viewDetail(m.id)}>
                <td className="p-3">{m.isRead ? <MailOpen className="h-4 w-4 text-muted-foreground" /> : <Mail className="h-4 w-4 text-primary" />}</td>
                <td className="p-3 font-mono text-xs max-w-[160px] truncate">{m.from.address}</td>
                <td className="p-3 font-mono text-xs max-w-[160px] truncate">{addressStr(m.to)}</td>
                <td className="p-3 max-w-[200px] truncate font-medium">{m.subject}</td>
                
                <td className="p-3 text-muted-foreground text-xs">{new Date(m.receivedAt).toLocaleString()}</td>
                <td className="p-3 text-right" onClick={e => e.stopPropagation()}><Button variant="ghost" size="sm" onClick={() => forceDelete(m.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button></td>
              </tr>
            ))}
            {messages.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">暂无数据</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>第 {page} 页 / 共 {totalPages} 页 ({total} 条)</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      </div>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.subject}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>发件人：{selected.from?.name || selected.from?.address}</div>
                <div>文件夹：{selected.folder}</div>
                <div>收件人：{addressStr(selected.to)}</div>
                <div>时间：{new Date(selected.receivedAt).toLocaleString()}</div>
              </div>
              <div className="border-t border-border/50 pt-3 prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: selected.bodyHtml || selected.body_text || '' }} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BroadcastPanel() {
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'role' | 'selected'>('all');
  const [role, setRole] = useState('member');
  const [users, setUsers] = useState<{ id: string; username: string; role: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);

  useEffect(() => {
    apiGet<{ id: string; username: string; role: string }[]>('/mail/admin/users').then(setUsers).catch(console.error);
  }, []);

  const send = async () => {
    if (!subject.trim() || !bodyText.trim()) return;
    setSending(true);
    try {
      const data = await apiPost<{ sent: number; total: number }>('/mail/admin/broadcast', {
        subject, bodyText, recipientType, role: recipientType === 'role' ? role : undefined, recipientIds: recipientType === 'selected' ? selectedIds : undefined,
      });
      setResult(data);
      setSubject('');
      setBodyText('');
    } catch (e: any) { alert(e.message); }
    finally { setSending(false); }
  };

  const toggleUser = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border/50">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>收件人范围</Label>
            <div className="flex gap-3">
              {(['all', 'role', 'selected'] as const).map(t => (
                <button key={t} onClick={() => setRecipientType(t)}
                  className={`px-3 py-1.5 rounded text-sm border ${recipientType === t ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 text-muted-foreground'}`}
                >{{ all: '全部用户', role: '按角色', selected: '手动选择' }[t]}</button>
              ))}
            </div>
          </div>
          {recipientType === 'role' && (
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">普通成员</SelectItem>
                <SelectItem value="editor">编辑</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
          )}
          {recipientType === 'selected' && (
            <div className="max-h-[200px] overflow-y-auto border border-border/50 rounded-md p-2 space-y-1">
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/30 px-2 py-1 rounded">
                  <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="rounded" />
                  <span>{u.username}</span>
                  <Badge variant="outline" className="text-xs">{u.role}</Badge>
                </label>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <Label>主题</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="群发通知主题" />
          </div>
          <div className="space-y-2">
            <Label>正文</Label>
            <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} placeholder="群发通知正文内容" rows={8}
              className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y" />
          </div>
          <Button onClick={send} disabled={sending || !subject.trim() || !bodyText.trim()} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}发送群发通知
          </Button>
          {result && (
            <div className="rounded-md bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-400">
              已成功发送给 {result.sent} / {result.total} 位用户
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LogsPanel() {
  const [logs, setLogs] = useState<MailAdminLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      const data = await apiGet<{ logs: MailAdminLog[]; total: number }>(`/mail/admin/logs?${params}`);
      setLogs(data.logs);
      setTotal(data.total);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchLogs().catch(console.error); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr><th className="text-left p-3">操作人</th><th className="text-left p-3">操作类型</th><th className="text-left p-3">详情</th><th className="text-left p-3">时间</th></tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-t border-border/30 hover:bg-secondary/30">
                <td className="p-3 font-medium">{l.adminName}</td>
                <td className="p-3"><Badge variant="outline" className="text-xs">{l.action}</Badge></td>
                <td className="p-3 text-muted-foreground max-w-[400px] truncate">{l.detail}</td>
                <td className="p-3 text-muted-foreground text-xs">{new Date(l.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">暂无操作记录</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>第 {page} 页 / 共 {totalPages} 页 ({total} 条)</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      </div>
    </div>
  );
}
