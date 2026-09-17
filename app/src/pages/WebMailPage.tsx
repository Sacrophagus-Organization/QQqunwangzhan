import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  Bot,
  ChevronLeft,
  ChevronRight,
  Download,
  Forward,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Paperclip,
  Pencil,
  RefreshCw,
  Reply,
  Search,
  Send,
  Settings,
  Shield,
  Star,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MarkdownEditor from '@/components/MarkdownEditor';
import { apiDelete, apiDownload, apiGet, apiMultipart, apiPost, apiPut } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { previewEmailBody, quoteEmailBody } from '@/lib/mailBody';
import { MailNotification } from '@/components/MailNotification';
import EmailBody from '@/components/EmailBody';
import type { MailAccount, MailFolder, MailFolderInfo, MailListResult, MailMessage } from '@/types';

const folderLabels: Record<MailFolder, string> = {
  inbox: '收件箱',
  sent: '发件箱',
  drafts: '草稿箱',
  spam: '垃圾邮件',
  deleted: '垃圾箱',
};

const folderIcons: Record<MailFolder, typeof Inbox> = {
  inbox: Inbox,
  sent: Send,
  drafts: Pencil,
  spam: Archive,
  deleted: Trash2,
};

function addressList(list: { address: string; name?: string }[]) {
  return list.map(item => item.name ? `${item.name} <${item.address}>` : item.address).join(', ');
}

function appendCompose(form: FormData, key: string, value: string) {
  if (value.trim()) form.append(key, value.trim());
}

export default function WebMailPage() {
  const [account, setAccount] = useState<MailAccount | null>(null);
  const [folders, setFolders] = useState<MailFolderInfo[]>([]);
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ to: '', cc: '', bcc: '', subject: '', bodyHtml: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [recentRecipients, setRecentRecipients] = useState<{address:string;name:string}[]>([]);
  const { user } = useAuth();
  const pageSize = 15;
  const [notifications, setNotifications] = useState<{id:string;fromAddress:string;fromName:string;subject:string}[]>([]);
  const lastPollRef = useRef(new Date().toISOString());
  const dismissedRef = useRef<Set<string>>(new Set());

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const refreshFolders = useCallback(async () => {
    const data = await apiGet<MailFolderInfo[]>('/mail/folders');
    setFolders(data);
  }, []);

  const fetchMessages = useCallback(async () => {
    setRefreshing(true);
    try {
      const qs = new URLSearchParams({ folder, page: String(page), pageSize: String(pageSize), q: query });
      const data = await apiGet<MailListResult>(`/mail/messages?${qs.toString()}`);
      setMessages(data.messages);
      setTotal(data.total);
      if (selected && !data.messages.some(m => m.id === selected.id)) setSelected(null);
      await refreshFolders();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [folder, page, query, refreshFolders, selected]);

  useEffect(() => {
    apiGet<MailAccount | null>('/mail/account')
      .then(setAccount)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!account) return;
    fetchMessages().catch(console.error);
    const timer = window.setInterval(() => fetchMessages().catch(console.error), 30000);
    return () => window.clearInterval(timer);
  }, [account, fetchMessages]);

  // Poll for new mail notifications
  useEffect(function() {
    if (!account) return;
    var poll = async function() {
      try {
        var since = lastPollRef.current;
        var data = await apiGet<{newCount:number;unreadCounts:Record<string,number>;latest:{id:string;fromAddress:string;fromName:string;subject:string;receivedAt:string}[]}>("/mail/poll?since=" + encodeURIComponent(since));
        lastPollRef.current = new Date().toISOString();
        if (data.newCount > 0 && data.latest.length > 0) {
          var fresh = data.latest.filter(function(m:any) { return !dismissedRef.current.has(m.id); });
          if (fresh.length > 0) {
            setNotifications(function(prev) {
              var existing = new Set(prev.map(function(p:any){return p.id;}));
              var merged = prev.slice();
              fresh.forEach(function(m:any) {
                if (!existing.has(m.id)) merged.push(m);
              });
              return merged.slice(-5);
            });
            // Desktop notification
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              fresh.slice(0, 3).forEach(function(m:any) {
                try { new Notification(m.fromName || m.fromAddress, { body: m.subject || "", icon: "/favicon.ico" }); } catch(e) {}
              });
            }
          }
        }
      } catch(e) { /* silent */ }
    };
    poll();
    var timer = setInterval(poll, 15000);
    return function() { clearInterval(timer); };
  }, [account]);

  // Request notification permission
  useEffect(function() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(function(){});
    }
  }, []);

  var dismissNotification = function(id: string) {
    dismissedRef.current.add(id);
    setNotifications(function(prev) { return prev.filter(function(n) { return n.id !== id; }); });
  };

  const selectMessage = async (message: MailMessage) => {
    const detail = await apiGet<MailMessage>(`/mail/messages/${message.id}`);
    setSelected(detail);
    setMessages(prev => prev.map(item => item.id === detail.id ? detail : item));
    refreshFolders().catch(console.error);
  };

  const fetchRecentRecipients = async function() {
    try {
      var data = await apiGet<{address:string;name:string}[]>("/mail/recipients");
      setRecentRecipients(data);
    } catch(e) {}
  };

  const submitCompose = async (draft = false) => {
    const form = new FormData();
    appendCompose(form, 'to', compose.to);
    appendCompose(form, 'cc', compose.cc);
    appendCompose(form, 'bcc', compose.bcc);
    appendCompose(form, 'subject', compose.subject);
    form.append('bodyHtml', compose.bodyHtml);
    files.forEach(file => form.append('attachments', file));
    await apiMultipart<MailMessage>(draft ? '/mail/drafts' : '/mail/messages', form);
    setCompose({ to: '', cc: '', bcc: '', subject: '', bodyHtml: '' });
    setFiles([]);
    setComposeOpen(false);
    setFolder(draft ? 'drafts' : 'sent');
    setPage(1);
    fetchMessages().catch(console.error);
  };

  const reply = () => {
    if (!selected) return;
    setCompose({
      to: selected.from.address,
      cc: '',
      bcc: '',
      subject: selected.subject.startsWith('Re:') ? selected.subject : `Re: ${selected.subject}`,
      bodyHtml: `\n\n${quoteEmailBody(selected.bodyHtml)}`,
    });
    setComposeOpen(true);
  };

  const forward = () => {
    if (!selected) return;
    setCompose({
      to: '',
      cc: '',
      bcc: '',
      subject: selected.subject.startsWith('Fwd:') ? selected.subject : `Fwd: ${selected.subject}`,
      bodyHtml: `\n\n${quoteEmailBody(selected.bodyHtml)}`,
    });
    setComposeOpen(true);
  };

  const moveSelected = async (target: MailFolder) => {
    if (!selected) return;
    await apiPut(`/mail/messages/${selected.id}/move`, { folder: target });
    setSelected(null);
    fetchMessages().catch(console.error);
  };

  const deleteSelected = async () => {
    if (!selected) return;
    await apiDelete(`/mail/messages/${selected.id}`);
    setSelected(null);
    fetchMessages().catch(console.error);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (messages.length === 0) return;
    const allSelected = messages.every(m => selectedIds.has(m.id));
    setSelectedIds(allSelected ? new Set() : new Set(messages.map(m => m.id)));
  };

  const batchDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 封邮件？`)) return;
    await apiPost(`/mail/messages/batch-delete`, { ids: Array.from(selectedIds) });
    setSelectedIds(new Set());
    setSelected(null);
    fetchMessages().catch(console.error);
  };

  const batchMoveSelected = async (target: MailFolder) => {
    if (selectedIds.size === 0) return;
    await apiPost(`/mail/messages/batch-move`, { ids: Array.from(selectedIds), folder: target });
    setSelectedIds(new Set());
    setSelected(null);
    fetchMessages().catch(console.error);
  };

  const emptyTrash = async () => {
    if (!confirm('确定清空垃圾箱？此操作不可恢复。')) return;
    await apiDelete(`/mail/trash`);
    setSelectedIds(new Set());
    setSelected(null);
    fetchMessages().catch(console.error);
  };

  

  
  useEffect(function() {
    if (composeOpen) fetchRecentRecipients().catch(function(){});
  }, [composeOpen]);

  const folderUnread = useMemo(() => folders.reduce<Record<string, number>>((acc, item) => {
    acc[item.folder] = item.unread;
    return acc;
  }, {}), [folders]);

  if (loading) {
    return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center px-4">
        <Card className="glass-card border-border/50 max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Mail className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-semibold">尚未开通企业邮箱</h1>
            <p className="text-sm text-muted-foreground">请先在设置页申请邮箱账号，然后回到这里收发邮件。</p>
            <Link to="/settings/mail"><Button>去申请邮箱</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-glow-cyan flex items-center gap-2 mr-auto">
            <Mail className="h-5 w-5 text-primary" />
            企业邮箱
          </h1>
          <Link to="/settings/mail"><Button variant="ghost" size="sm"><Settings className="h-4 w-4" /></Button></Link>
          <Badge variant="outline">{account.address}</Badge>
          <Button variant="outline" size="sm" onClick={() => fetchMessages().catch(console.error)}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button><Pencil className="h-4 w-4 mr-2" />写信</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl sm:max-w-4xl w-[min(96vw,56rem)] max-h-[92vh] overflow-y-auto">
              <DialogHeader><DialogTitle>写邮件</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1 sm:col-span-3"><Label>收件人</Label><Input value={compose.to} onChange={function(e){setCompose(function(p){return{...p,to:e.target.value};});}} onFocus={function(){fetchRecentRecipients().catch(function(){});}} placeholder="已开通的站内邮箱，例如 user@example.com" list="recent-recipients" autoComplete="off" /><datalist id="recent-recipients">{recentRecipients.map(function(r,i){return <option key={i} value={r.address}>{r.name?r.name+' <'+r.address+'>':r.address}</option>;})}</datalist></div>
                  <div className="space-y-1"><Label>抄送</Label><Input value={compose.cc} onChange={e => setCompose(p => ({ ...p, cc: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>密送</Label><Input value={compose.bcc} onChange={e => setCompose(p => ({ ...p, bcc: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>主题</Label><Input value={compose.subject} onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))} /></div>
                </div>
                <MarkdownEditor value={compose.bodyHtml} onChange={bodyHtml => setCompose(p => ({ ...p, bodyHtml }))} minHeight="260px" placeholder="支持 Markdown 语法：**加粗**、# 标题、> 引用等" />
                <div className="space-y-1">
                  <Label>附件</Label>
                  <Input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => submitCompose(true)}>保存草稿</Button>
                  <Button onClick={() => submitCompose(false)}><Send className="h-4 w-4 mr-2" />发送</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 lg:grid-cols-[190px_380px_1fr]">
          <aside className="space-y-2">
            {(Object.keys(folderLabels) as MailFolder[]).map(key => {
              const Icon = folderIcons[key];
              return (
                <Button
                  key={key}
                  variant={folder === key ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => { setFolder(key); setPage(1); setSelected(null); }}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  <span className="truncate">{folderLabels[key]}</span>
                  {folderUnread[key] ? <Badge className="ml-auto">{folderUnread[key]}</Badge> : null}
                </Button>
              );
            })}
            {user?.role === 'admin' && (
              <div className="pt-3 mt-3 border-t border-border/50">
                <Link to="/mail/admin">
                  <Button variant="ghost" className="w-full justify-start text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                    <Shield className="h-4 w-4 mr-2" />
                    邮件管理
                  </Button>
                </Link>
                <Link to="/mail/admin/bots">
                  <Button variant="ghost" className="w-full justify-start text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                    <Bot className="h-4 w-4 mr-2" />
                    Bot管理
                  </Button>
                </Link>
              </div>
            )}
          </aside>

          <section className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="搜索邮件" className="pl-10" />
            </div>
            <div className="space-y-2">
              {messages.length === 0 ? (
                <Card className="glass-card border-border/50"><CardContent className="p-8 text-center text-sm text-muted-foreground">没有邮件</CardContent></Card>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" className="rounded" checked={messages.every(m => selectedIds.has(m.id))} onChange={toggleSelectAll} />
                      <span>全选</span>
                    </label>
                    {selectedIds.size > 0 && <span className="text-primary">{selectedIds.size} 封已选</span>}
                    <div className="ml-auto flex items-center gap-1.5">
                      {selectedIds.size > 0 && (
                        <>
                          <Select onValueChange={(value: MailFolder) => batchMoveSelected(value)}>
                            <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue placeholder="移动" /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(folderLabels) as MailFolder[]).map(key => <SelectItem key={key} value={key}>{folderLabels[key]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" className="h-8 text-xs text-destructive" onClick={batchDeleteSelected}>
                            {folder === 'deleted' ? '彻底删除' : '批量删除'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {messages.map(message => (
                    <div key={message.id} className="flex items-start gap-2">
                      <input type="checkbox" className="rounded mt-3" checked={selectedIds.has(message.id)} onChange={() => toggleSelect(message.id)} />
                      <button
                        onClick={() => selectMessage(message)}
                        className={`flex-1 min-w-0 text-left rounded-md border p-3 transition ${selected?.id === message.id ? 'border-primary bg-primary/10' : 'border-border/50 bg-card/80 hover:border-primary/30'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {message.isRead ? <MailOpen className="h-4 w-4 text-muted-foreground" /> : <Mail className="h-4 w-4 text-primary" />}
                          <span className={`truncate text-sm ${message.isRead ? 'font-medium' : 'font-bold'}`}>{message.subject}</span>
                          {message.isStarred ? <Star className="h-4 w-4 text-amber-400 fill-amber-400 ml-auto" /> : null}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{message.folder === 'sent' ? addressList(message.to) : message.from.address}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 break-words mt-1">{message.bodyText || previewEmailBody(message.bodyHtml)}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{new Date(message.receivedAt).toLocaleString()}</span>
                          {message.hasAttachments ? <Paperclip className="h-3.5 w-3.5 ml-auto" /> : null}
                        </div>
                      </button>
                    </div>
                  ))}
                  {folder === 'deleted' && (
                    <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={emptyTrash}>
                      <Trash2 className="h-4 w-4 mr-2" />清空垃圾箱
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{page} / {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </section>

          <section>
            {!selected ? (
              <Card className="glass-card border-border/50 h-[640px] flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground"><MailOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />选择一封邮件查看详情</CardContent>
              </Card>
            ) : (
              <Card className="glass-card border-border/50 min-h-[640px]">
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="mr-auto">
                      <h2 className="text-xl font-semibold">{selected.subject}</h2>
                      <p className="text-sm text-muted-foreground mt-1">发件人：{selected.from.name || selected.from.address}</p>
                      <p className="text-sm text-muted-foreground">收件人：{addressList(selected.to)}</p>
                    </div>
                    {selected.folder === 'drafts' && (
                      <Button variant="ghost" size="sm" onClick={() => {
                        setCompose({
                          to: selected.to.map((a: any) => a.address).join(','),
                          cc: selected.cc.map((a: any) => a.address).join(','),
                          bcc: selected.bcc.map((a: any) => a.address).join(','),
                          subject: selected.subject,
                          bodyHtml: selected.bodyHtml,
                        });
                        setTimeout(() => submitCompose(false), 100);
                      }} className="text-green-400 hover:text-green-300">
                        <Send className="h-4 w-4 mr-1" />发送
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => apiPut(`/mail/messages/${selected.id}/star`, { starred: !selected.isStarred }).then(() => selectMessage(selected))}>
                      <Star className={`h-4 w-4 ${selected.isStarred ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={reply}><Reply className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={forward}><Forward className="h-4 w-4" /></Button>
                    <Select onValueChange={(value: MailFolder) => moveSelected(value)}>
                      <SelectTrigger className="w-[120px]"><SelectValue placeholder="移动" /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(folderLabels) as MailFolder[]).map(key => <SelectItem key={key} value={key}>{folderLabels[key]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={deleteSelected}><Trash2 className="h-4 w-4" /></Button>
                  </div>

                  {selected.attachments.length > 0 && (
                    <div className="rounded-md border border-border/50 p-3 space-y-2">
                      {selected.attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-2 text-sm">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate mr-auto">{att.name}</span>
                          <Button variant="outline" size="sm" onClick={() => apiDownload(att.dataUrl, att.name)}>
                            <Download className="h-4 w-4 mr-1" />下载
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <EmailBody value={selected.bodyHtml} className="border-t border-border/50 pt-4 leading-7" />
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
      <MailNotification notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

