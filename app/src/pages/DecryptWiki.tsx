import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/RichTextEditor';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '@/api/client';
import { BookOpen, Plus, Search, User, Tag, Clock, Bookmark, Sparkles, ChevronDown, Filter, Code2, Binary, Hash, Globe, FileCode, Paperclip, Download, Edit3, Save, Loader2, Trash2 } from 'lucide-react';
import type { WikiEntry, FileAttachment } from '@/types';

const wikiCategories = [
  { id: 'cipher-basics', name: '密码学基础', icon: Code2 }, { id: 'classic-ciphers', name: '经典密码', icon: FileCode },
  { id: 'modern-crypto', name: '现代加密', icon: Binary }, { id: 'game-lore', name: '游戏考据', icon: Globe },
  { id: 'tools', name: '解密工具', icon: Hash }, { id: 'symbols', name: '符号体系', icon: Bookmark },
] as const;

export default function DecryptWiki() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WikiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [nc, setNc] = useState('');
  const [ne, setNe] = useState({ title: '', category: '', tags: '' });
  const [pfiles, setPfiles] = useState<File[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [et, setEt] = useState(''); const [ec, setEc] = useState(''); const [ecat, setEcat] = useState('');
  const [etags, setEtags] = useState(''); const [efiles, setEfiles] = useState<File[]>([]);

  const load = useCallback(async () => { try { setEntries(await apiGet<WikiEntry[]>('/wiki')); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter(e => {
    if (activeCategory !== 'all' && e.category !== activeCategory) return false;
    if (searchQuery) { const q = searchQuery.toLowerCase(); return e.title.toLowerCase().includes(q) || (e.tags || []).some((t: string) => t.toLowerCase().includes(q)); }
    return true;
  });

  const canEdit = (e: WikiEntry) => user && (user.id === e.authorId || user.role === 'admin' || user.role === 'editor');

  const handleDelete = async (id: string) => {
    if (!confirm('确定永久删除这个词条？此操作不可撤销。')) return;
    try {
      await apiDelete(`/wiki/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e: any) { alert(e.message); }
  };

  const handleCreate = async () => {
    if (!ne.title.trim() || !nc.trim() || !ne.category.trim()) return;
    try {
      const created = await apiPost<WikiEntry>('/wiki', { title: ne.title, content: nc, category: ne.category, tags: ne.tags.split(',').map(t => t.trim()).filter(Boolean) });
      if (pfiles.length > 0) await apiUpload('wiki', created.id, pfiles);
      setEntries(prev => [created, ...prev]);
      setNe({ title: '', category: '', tags: '' }); setNc(''); setPfiles([]); setShowCreate(false);
    } catch (e: any) { alert(e.message); }
  };

  const openEdit = (e: WikiEntry) => { setEditId(e.id); setEt(e.title); setEc(e.content); setEcat(e.category); setEtags((e.tags || []).join(', ')); setEfiles([]); };
  const handleEditSave = async () => {
    if (!editId || !et.trim()) return;
    try {
      await apiPut(`/wiki/${editId}`, { title: et, content: ec, category: ecat, tags: etags.split(',').map(t => t.trim()).filter(Boolean) });
      if (efiles.length > 0) await apiUpload('wiki', editId, efiles);
      setEditId(null); load();
    } catch (e: any) { alert(e.message); }
  };

  const downloadAtt = (a: FileAttachment) => { const el = document.createElement('a'); el.href = a.dataUrl; el.download = a.name; el.click(); };

  if (loading) return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Loader2 className="h-8 w-8 text-amber-400 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div><h1 className="text-2xl font-bold text-glow-cyan flex items-center gap-2"><BookOpen className="h-6 w-6 text-amber-400" />解密Wiki</h1><p className="text-sm text-muted-foreground mt-1 mono-text">&gt; 词条总数: {entries.length}</p></div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button className="bg-amber-500 hover:bg-amber-600 text-amber-950"><Plus className="h-4 w-4 mr-2" />新建词条</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-400" />新建Wiki词条</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2"><Label>标题</Label><Input value={ne.title} onChange={e => setNe(p => ({ ...p, title: e.target.value }))} className="bg-secondary/30 border-border/50" /></div>
                <div className="space-y-2"><Label>分类</Label><Select value={ne.category} onValueChange={v => setNe(p => ({ ...p, category: v }))}><SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue placeholder="选择分类" /></SelectTrigger><SelectContent>{wikiCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>内容（富文本）</Label><RichTextEditor value={nc} onChange={setNc} minHeight="250px" /></div>
                <div className="space-y-2"><Label>附件</Label><Input type="file" multiple onChange={e => setPfiles(e.target.files ? Array.from(e.target.files) : [])} className="bg-secondary/30 border-border/50 text-sm" /></div>
                <div className="space-y-2"><Label>标签</Label><Input value={ne.tags} onChange={e => setNe(p => ({ ...p, tags: e.target.value }))} className="bg-secondary/30 border-border/50" /></div>
                <Button onClick={handleCreate} className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950">提交词条</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass-card border-border/50 mb-6"><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索Wiki词条..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-secondary/30 border-border/50" /></div></CardContent></Card>

        <div className="flex gap-6">
          <div className="hidden lg:block w-56 shrink-0"><Card className="glass-card border-border/50 sticky top-20"><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Bookmark className="h-4 w-4 text-primary" />词条分类</CardTitle></CardHeader><CardContent className="p-2"><div className="space-y-0.5"><button onClick={() => setActiveCategory('all')} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${activeCategory === 'all' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>全部 ({entries.length})</button>{wikiCategories.map(cat => { const cnt = entries.filter(e => e.category === cat.name).length; const Icon = cat.icon; return <button key={cat.id} onClick={() => setActiveCategory(cat.name)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center gap-2 ${activeCategory === cat.name ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}><Icon className="h-3.5 w-3.5" /><span>{cat.name}</span><span className="ml-auto text-xs">{cnt}</span></button>; })}</div></CardContent></Card></div>
          <div className="lg:hidden w-full mb-4"><Select value={activeCategory} onValueChange={setActiveCategory}><SelectTrigger className="w-full bg-secondary/30 border-border/50"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部</SelectItem>{wikiCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div>

          <div className="flex-1 space-y-4">
            {filtered.length === 0 ? <Card className="glass-card border-border/50"><CardContent className="p-12 text-center"><BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" /><p className="text-muted-foreground">暂无相关词条</p></CardContent></Card>
              : filtered.map(entry => (
              <Card key={entry.id} className="glass-card border-border/50 hover:border-amber-500/20 transition-all duration-200">
                <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                  <div className="flex items-start justify-between gap-4"><div className="flex-1"><CardTitle className="text-lg">{entry.title}</CardTitle><div className="flex flex-wrap items-center gap-3 mt-2"><Badge variant="secondary" className="text-xs"><Bookmark className="h-3 w-3 mr-1" />{entry.category}</Badge><span className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" />{entry.author}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{entry.lastUpdated?.split('T')[0]}</span>{entry.attachments?.length > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Paperclip className="h-3 w-3" />{entry.attachments.length}</span>}</div></div><ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expanded === entry.id ? 'rotate-180' : ''}`} /></div>
                </CardHeader>
                {expanded === entry.id && <CardContent className="pt-0 border-t border-border/30">
                  <div className="mt-4"><div className="text-sm bg-secondary/20 rounded-lg p-4 border border-border/20 rich-editor-content" dangerouslySetInnerHTML={{ __html: entry.content }} /></div>
                  {entry.tags?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-4">{entry.tags.map((t: string) => <Badge key={t} variant="outline" className="text-xs"><Tag className="h-3 w-3 mr-1" />{t}</Badge>)}</div>}
                  {entry.attachments?.length > 0 && <div className="mt-3 border-t border-border/20 pt-3"><p className="text-xs text-muted-foreground mb-2"><Paperclip className="h-3 w-3 inline mr-1" />附件</p><div className="flex flex-wrap gap-2">{entry.attachments.map((a: FileAttachment) => <Button key={a.id} variant="outline" size="sm" onClick={() => downloadAtt(a)} className="text-xs"><Download className="h-3 w-3 mr-1" />{a.name}</Button>)}</div></div>}
                  <div className="mt-4 flex justify-end gap-2">{canEdit(entry) && <><Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); openEdit(entry); }} className="border-border/40 hover:border-amber-500/30 hover:text-amber-400"><Edit3 className="h-4 w-4 mr-1" />编辑词条</Button><Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleDelete(entry.id); }} className="border-border/40 hover:border-destructive/30 hover:text-destructive"><Trash2 className="h-4 w-4 mr-1" />删除</Button></>}</div>
                </CardContent>}
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!editId} onOpenChange={o => { if (!o) setEditId(null); }}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle><Edit3 className="h-5 w-5 text-amber-400 inline mr-1" />编辑Wiki词条</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2"><Label>标题</Label><Input value={et} onChange={e => setEt(e.target.value)} className="bg-secondary/30 border-border/50" /></div>
          <div className="space-y-2"><Label>分类</Label><Select value={ecat} onValueChange={setEcat}><SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{wikiCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>内容</Label><RichTextEditor value={ec} onChange={setEc} minHeight="250px" /></div>
          <div className="space-y-2"><Label>新增附件</Label><Input type="file" multiple onChange={e => setEfiles(e.target.files ? Array.from(e.target.files) : [])} className="bg-secondary/30 border-border/50 text-sm" /></div>
          <div className="space-y-2"><Label>标签</Label><Input value={etags} onChange={e => setEtags(e.target.value)} className="bg-secondary/30 border-border/50" /></div>
          <Button onClick={handleEditSave} className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950"><Save className="h-4 w-4 mr-2" />保存修改</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
