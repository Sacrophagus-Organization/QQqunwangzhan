import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor, htmlToSummary } from '@/components/RichTextEditor';
import { apiGet, apiPost, apiDelete, apiUpload } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileText, Plus, Search, User, Tag, Filter, ArrowUpDown,
  Calendar, AlertTriangle, Paperclip, Sparkles, ArrowRight, Loader2,
  Pin, Trash2,
} from 'lucide-react';
import type { DecryptRecord } from '@/types';

const importanceLabels: Record<string, { label: string; color: string }> = {
  normal: { label: '普通', color: 'bg-secondary text-muted-foreground' },
  important: { label: '重要', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  critical: { label: '关键', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

export default function DecryptRecords() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [records, setRecords] = useState<DecryptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterImportance, setFilterImportance] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newRecord, setNewRecord] = useState({ title: '', summary: '', tags: '', importance: 'normal' as DecryptRecord['importance'] });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const fetchRecords = useCallback(async () => {
    try {
      const data = await apiGet<DecryptRecord[]>('/records');
      setRecords(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = records
    .filter(r => {
      if (!r) return false;
      if (filterImportance !== 'all' && r.importance !== filterImportance) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (r.title || '').toLowerCase().includes(q) || (r.summary || '').toLowerCase().includes(q) || (r.tags || []).some((t: string) => (t || '').toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sorted = sortOrder === 'newest' ? filtered : [...filtered].reverse();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPendingFiles(Array.from(e.target.files));
  };

  const canEdit = (r: DecryptRecord) => user && (user.id === r.authorId || user.role === 'admin' || user.role === 'editor');

  const handleDelete = async (id: string) => {
    if (!confirm('确定永久删除这条记录？此操作不可撤销。')) return;
    try {
      await apiDelete(`/records/${id}`);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e: any) { alert(e.message); }
  };

  const handlePin = async (id: string) => {
    try {
      const res = await apiPost<{ pinned: boolean }>(`/records/${id}/pin`);
      setRecords(prev => prev.map(r => r.id === id ? { ...r, pinned: res.pinned ? 1 : 0 } : r));
    } catch (e: any) { alert(e.message); }
  };

  const handleCreate = async () => {
    if (!newRecord.title.trim() || !newContent.trim()) return;
    try {
      const created = await apiPost<DecryptRecord>('/records', {
        title: newRecord.title.trim(),
        content: newContent,
        summary: newRecord.summary.trim() || htmlToSummary(newContent, 120),
        tags: newRecord.tags.split(',').map(t => t.trim()).filter(Boolean),
        importance: newRecord.importance,
        date: new Date().toISOString().split('T')[0],
      });
      if (pendingFiles.length > 0) {
        await apiUpload('record', created.id, pendingFiles);
      }
      setRecords(prev => [created, ...prev]);
      setNewRecord({ title: '', summary: '', tags: '', importance: 'normal' });
      setNewContent(''); setPendingFiles([]); setShowCreateDialog(false);
      navigate(`/records/${created.id}`);
    } catch (e: any) { alert(e.message); }
  };

  if (loading) {
    return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div><h1 className="text-2xl font-bold text-glow-cyan flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />解密记录</h1><p className="text-sm text-muted-foreground mt-1 mono-text">&gt; 共 {records.length} 条记录</p></div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="h-4 w-4 mr-2" />新建记录</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />新建解密记录</DialogTitle><DialogDescription>创建后将自动跳转至独立记录页面</DialogDescription></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>标题</Label><Input value={newRecord.title} onChange={e => setNewRecord(p => ({ ...p, title: e.target.value }))} className="bg-secondary/30 border-border/50" /></div>
                  <div className="space-y-2"><Label>重要程度</Label><Select value={newRecord.importance} onValueChange={(v: DecryptRecord['importance']) => setNewRecord(p => ({ ...p, importance: v }))}><SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">普通</SelectItem><SelectItem value="important">重要</SelectItem><SelectItem value="critical">关键</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label>摘要</Label><Input value={newRecord.summary} onChange={e => setNewRecord(p => ({ ...p, summary: e.target.value }))} className="bg-secondary/30 border-border/50" /></div>
                <div className="space-y-2"><Label>正文（富文本）</Label><RichTextEditor value={newContent} onChange={setNewContent} placeholder="开始编写解密记录正文..." minHeight="250px" /></div>
                <div className="space-y-2"><Label>附件</Label><Input type="file" multiple onChange={handleFileChange} className="bg-secondary/30 border-border/50 text-sm" /></div>
                <div className="space-y-2"><Label>标签（逗号分隔）</Label><Input value={newRecord.tags} onChange={e => setNewRecord(p => ({ ...p, tags: e.target.value }))} className="bg-secondary/30 border-border/50" /></div>
                <Button onClick={handleCreate} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">提交并查看</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass-card border-border/50 mb-6"><CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索记录..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-secondary/30 border-border/50" /></div>
          <Select value={filterImportance} onValueChange={setFilterImportance}><SelectTrigger className="w-[140px] bg-secondary/30 border-border/50"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部</SelectItem><SelectItem value="normal">普通</SelectItem><SelectItem value="important">重要</SelectItem><SelectItem value="critical">关键</SelectItem></SelectContent></Select>
          <Button variant="ghost" size="sm" onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')} className="text-muted-foreground hover:text-foreground"><ArrowUpDown className="h-4 w-4 mr-1" />{sortOrder === 'newest' ? '最新优先' : '最早优先'}</Button>
          <span className="text-xs text-muted-foreground mono-text">{sorted.length} 条</span>
        </CardContent></Card>

        <div className="space-y-3">
          {sorted.length === 0 ? <Card className="glass-card border-border/50"><CardContent className="p-12 text-center"><FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" /><p className="text-muted-foreground">暂无解密记录</p></CardContent></Card>
            : sorted.map(record => (
            <Card key={record.id} className={`glass-card border-border/50 hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-200 group ${record.pinned ? 'border-amber-500/30 bg-amber-500/[0.02]' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">{record.importance === 'critical' ? <AlertTriangle className="h-5 w-5 text-red-400" /> : record.pinned ? <Pin className="h-5 w-5 text-amber-400" /> : <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />}</div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/records/${record.id}`)}>
                    <div className="flex items-center gap-2 mb-1"><h3 className="text-base font-semibold group-hover:text-primary transition-colors truncate">{record.title}</h3>{record.pinned ? <Badge className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20"><Pin className="h-3 w-3 mr-0.5" />置顶</Badge> : null}<Badge variant="outline" className={`text-xs shrink-0 ${importanceLabels[record.importance]?.color || ''}`}>{importanceLabels[record.importance]?.label || record.importance}</Badge></div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{record.summary}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{record.date}</span>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{record.author}</span>
                      {(record.tags || []).slice(0, 3).map((tag: string) => <span key={tag} className="flex items-center gap-1 text-primary/60"><Tag className="h-3 w-3" />{tag}</span>)}
                      {record.attachments?.length > 0 && <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{record.attachments.length}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {canEdit(record) && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-400" onClick={(e) => { e.stopPropagation(); handlePin(record.id); }} title={record.pinned ? '取消置顶' : '置顶'}>
                          <Pin className={`h-4 w-4 ${record.pinned ? 'text-amber-400 fill-amber-400' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }} title="删除">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all ml-1 cursor-pointer" onClick={() => navigate(`/records/${record.id}`)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
