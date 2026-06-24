import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/RichTextEditor';
import { PuzzleCardSkeleton } from '@/components/Skeleton';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload, apiDownload } from '@/api/client';
import { LikeButton } from '@/components/LikeButton';
import { Puzzle, Plus, Search, User, Tag, Lightbulb, Key, CheckCircle2, HelpCircle, Brain, Zap, Filter, Sparkles, Trophy, Paperclip, Download, Edit3, Save, Trash2 } from 'lucide-react';
import type { Puzzle as PuzzleType, FileAttachment } from '@/types';
import { sanitizeHtml } from '@/lib/sanitize';

const catLabels: Record<string, string> = { cipher: '密码学', logic: '逻辑推理', pattern: '模式识别', math: '数学', lore: '剧情考据', other: '其他' };
const diffColors: Record<string, string> = { easy: 'bg-green-500/10 text-green-400 border-green-500/30', medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', hard: 'bg-orange-500/10 text-orange-400 border-orange-500/30', extreme: 'bg-red-500/10 text-red-400 border-red-500/30' };
const diffLabels: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难', extreme: '极难' };

export default function CustomPuzzles() {
  const { user } = useAuth();
  const [puzzles, setPuzzles] = useState<PuzzleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [solveId, setSolveId] = useState<string | null>(null);
  const [solveAnswer, setSolveAnswer] = useState('');
  const [solveResult, setSolveResult] = useState<string | null>(null);
  const [nc, setNc] = useState('');
  const [np, setNp] = useState({ title: '', description: '', category: 'cipher', difficulty: 'medium', hint: '', solution: '', tags: '' });
  const [pfiles, setPfiles] = useState<File[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [et, setEt] = useState(''); const [ed, setEd] = useState(''); const [ec, setEc] = useState('');
  const [ecat, setEcat] = useState('cipher'); const [ediff, setEdiff] = useState('medium');
  const [eh, setEh] = useState(''); const [es, setEs] = useState(''); const [etags, setEtags] = useState('');
  const [efiles, setEfiles] = useState<File[]>([]);

  const load = useCallback(async () => { try { setPuzzles(await apiGet<PuzzleType[]>('/puzzles')); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = puzzles.filter(p => {
    if (activeTab === 'unsolved' && p.status !== 'unsolved') return false;
    if (activeTab === 'solved' && p.status !== 'solved') return false;
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (searchQuery) { const q = searchQuery.toLowerCase(); return p.title.toLowerCase().includes(q) || (p.tags || []).some((t: string) => t.toLowerCase().includes(q)); }
    return true;
  });

  const canEdit = (p: PuzzleType) => user && (user.id === p.authorId || user.role === 'admin' || user.role === 'editor');

  const handleDelete = async (id: string) => {
    if (!confirm('确定永久删除这个谜题？此操作不可撤销。')) return;
    try {
      await apiDelete(`/puzzles/${id}`);
      setPuzzles(prev => prev.filter(p => p.id !== id));
    } catch (e: any) { alert(e.message); }
  };

  const handleCreate = async () => {
    if (!np.title.trim() || !nc.trim()) return;
    try {
      const created = await apiPost<PuzzleType>('/puzzles', { title: np.title, description: np.description, content: nc, category: np.category, difficulty: np.difficulty, hint: np.hint, solution: np.solution, tags: np.tags.split(',').map(t => t.trim()).filter(Boolean) });
      if (pfiles.length > 0) await apiUpload('puzzle', created.id, pfiles);
      setPuzzles(prev => [created, ...prev]);
      setNp({ title: '', description: '', category: 'cipher', difficulty: 'medium', hint: '', solution: '', tags: '' }); setNc(''); setPfiles([]); setShowCreate(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleSolve = async (pid: string) => {
    try {
      const res = await apiPost<{ correct: boolean; puzzle: PuzzleType }>(`/puzzles/${pid}/solve`, { answer: solveAnswer });
      setSolveResult(res.correct ? 'correct' : 'wrong');
      if (res.correct) setPuzzles(prev => prev.map(p => p.id === pid ? res.puzzle : p));
      setTimeout(() => { setSolveId(null); setSolveAnswer(''); setSolveResult(null); }, 1500);
    } catch {}
  };

  const openEdit = (p: PuzzleType) => { setEditId(p.id); setEt(p.title); setEd(p.description); setEc(p.content); setEcat(p.category); setEdiff(p.difficulty); setEh(p.hint); setEs(p.solution); setEtags((p.tags || []).join(', ')); setEfiles([]); };
  const handleEditSave = async () => {
    if (!editId) return;
    try {
      await apiPut(`/puzzles/${editId}`, { title: et, description: ed, content: ec, category: ecat, difficulty: ediff, hint: eh, solution: es, tags: etags.split(',').map(t => t.trim()).filter(Boolean) });
      if (efiles.length > 0) await apiUpload('puzzle', editId, efiles);
      setEditId(null); load();
    } catch (e: any) { alert(e.message); }
  };

  const downloadAtt = (att: FileAttachment) => { apiDownload(att.dataUrl, att.name).catch(e => alert(e.message)); };

  if (loading) {
    return (
      <div className="min-h-screen bg-background grid-dot-bg">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="skeleton h-8 w-48 mb-6" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <PuzzleCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid-dot-bg">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 anim-blur-in">
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 h-px overflow-hidden z-10 pointer-events-none"><div className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent/70 to-transparent animate-data-sweep" /></div>
            <h1 className="text-2xl sm:text-3xl font-display text-gradient-flow flex items-center gap-2"><Puzzle className="h-6 w-6 text-accent animate-breathe-glow" />自制谜题</h1>
            <p className="text-sm text-muted-foreground/90 mt-1 mono-text">&gt; 总数: {puzzles.length} | 已解: {puzzles.filter(p => p.status === 'solved').length} | 未解: {puzzles.filter(p => p.status === 'unsolved').length}</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-2" />创建谜题</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-accent" />创建新谜题</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>标题</Label><Input value={np.title} onChange={e => setNp(p => ({ ...p, title: e.target.value }))} className="bg-secondary/30 border-border/50" /></div><div className="space-y-2"><Label>描述</Label><Input value={np.description} onChange={e => setNp(p => ({ ...p, description: e.target.value }))} className="bg-secondary/30 border-border/50" /></div></div>
                <div className="space-y-2"><Label>正文（富文本）</Label><RichTextEditor value={nc} onChange={setNc} minHeight="200px" /></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>分类</Label><Select value={np.category} onValueChange={v => setNp(p => ({ ...p, category: v }))}><SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(catLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>难度</Label><Select value={np.difficulty} onValueChange={v => setNp(p => ({ ...p, difficulty: v }))}><SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(diffLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div></div>
                <div className="space-y-2"><Label>提示</Label><Input value={np.hint} onChange={e => setNp(p => ({ ...p, hint: e.target.value }))} className="bg-secondary/30 border-border/50" /></div>
                <div className="space-y-2"><Label>正确答案</Label><Input value={np.solution} onChange={e => setNp(p => ({ ...p, solution: e.target.value }))} className="bg-secondary/30 border-border/50" /></div>
                <div className="space-y-2"><Label>附件</Label><Input type="file" multiple onChange={e => setPfiles(e.target.files ? Array.from(e.target.files) : [])} className="bg-secondary/30 border-border/50 text-sm" /></div>
                <div className="space-y-2"><Label>标签</Label><Input value={np.tags} onChange={e => setNp(p => ({ ...p, tags: e.target.value }))} className="bg-secondary/30 border-border/50" /></div>
                <Button onClick={handleCreate} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"><Sparkles className="h-4 w-4 mr-2" />发布谜题</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="card-elevated border-border/50 mb-6 anim-fade-up"><CardContent className="p-4 flex flex-wrap items-center gap-3"><div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索谜题..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-secondary/30 border-border/50" /></div><Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="w-[140px] bg-secondary/30 border-border/50"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="分类" /></SelectTrigger><SelectContent><SelectItem value="all">全部分类</SelectItem>{Object.entries(catLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></CardContent></Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6"><TabsList className="bg-secondary/30"><TabsTrigger value="all">全部 ({puzzles.length})</TabsTrigger><TabsTrigger value="unsolved">未解决</TabsTrigger><TabsTrigger value="solved">已解决</TabsTrigger></TabsList></Tabs>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? <div className="col-span-full"><Card className="glass-card border-border/50"><CardContent className="p-12 text-center"><Puzzle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" /><p className="text-muted-foreground">暂无谜题</p></CardContent></Card></div>
            : filtered.map((pz, i) => (
            <Card key={pz.id} className={`glass-card glass-card-hover border-border/50 hover:border-accent/30 transition-all duration-200 overflow-hidden group tilt-3d anim-scale-in ${
              pz.status === 'solved' ? 'opacity-75 hover:opacity-90' : ''
            } hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/5`} style={{ animationDelay: `${i * 0.06}s` }}>
              {/* Threat Level Bar */}
              <div className={`h-1 w-full ${
                pz.difficulty === 'easy' ? 'threat-bar-easy' :
                pz.difficulty === 'medium' ? 'threat-bar-medium' :
                pz.difficulty === 'hard' ? 'threat-bar-hard' :
                'threat-bar-extreme'
              }`} />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-heading tracking-wide flex items-center gap-2">
                      <span className="truncate group-hover:text-accent transition-colors">{pz.title}</span>
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs line-clamp-2">{pz.description}</CardDescription>
                  </div>
                  {/* Seal stamp status */}
                  <div className="shrink-0">
                    <span className={`seal-stamp ${pz.status === 'solved' ? 'seal-solved' : 'seal-unsolved'}`}>
                      {pz.status === 'solved' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <HelpCircle className="h-3 w-3 mr-1" />}
                      {pz.status === 'solved' ? 'SOLVED' : 'OPEN'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant="outline" className={`text-xs ${diffColors[pz.difficulty] || ''}`}>{diffLabels[pz.difficulty]}</Badge>
                  <Badge variant="secondary" className="text-xs">{catLabels[pz.category]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground/90"><span className="flex items-center gap-1"><User className="h-3 w-3" />{pz.author}</span><span className="flex items-center gap-1"><Brain className="h-3 w-3" />{pz.attempts}次</span></div>
                <LikeButton entityType="puzzle" entityId={pz.id} likeCount={pz.likeCount} size="sm" />
                {pz.status === 'solved' && pz.solvedBy && <div className="flex items-center gap-1.5 text-xs text-green-400"><Trophy className="h-3 w-3" />由 {pz.solvedBy} 破解</div>}
                {pz.hint && <div className="flex items-start gap-1.5 text-xs bg-amber-500/10 border border-amber-500/20 rounded-md p-2"><Lightbulb className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" /><span className="text-amber-400/80">{pz.hint}</span></div>}
                <div className="flex gap-2 pt-1">
                  <Dialog open={solveId === pz.id} onOpenChange={o => { if (!o) { setSolveId(null); setSolveAnswer(''); setSolveResult(null); } }}><DialogTrigger asChild><Button size="sm" className="flex-1" variant={pz.status === 'solved' ? 'outline' : 'default'} disabled={pz.status === 'solved'} onClick={() => setSolveId(pz.id)}>{pz.status === 'solved' ? <><CheckCircle2 className="h-4 w-4 mr-1" />已破解</> : <><Key className="h-4 w-4 mr-1" />提交答案</>}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><Key className="h-5 w-5 text-amber-400" />提交答案</DialogTitle></DialogHeader><div className="space-y-4 mt-4">{solveResult === null && <><div className="space-y-2"><Label>你的答案</Label><Input value={solveAnswer} onChange={e => setSolveAnswer(e.target.value)} className="bg-secondary/30 border-border/50 mono-text" /></div><Button onClick={() => handleSolve(pz.id)} className="w-full" disabled={!solveAnswer.trim()}><Zap className="h-4 w-4 mr-2" />提交</Button></>}{solveResult === 'correct' && <div className="text-center py-4"><CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-2" /><p className="text-lg font-bold text-green-400">回答正确！</p></div>}{solveResult === 'wrong' && <div className="text-center py-4"><HelpCircle className="h-12 w-12 text-red-400 mx-auto mb-2" /><p className="text-lg font-bold text-red-400">回答错误</p></div>}</div></DialogContent></Dialog>
                  <Dialog><DialogTrigger asChild><Button size="sm" variant="ghost">详情</Button></DialogTrigger><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto"><DialogHeader><div className="flex items-center justify-between"><DialogTitle className="flex items-center gap-2"><Puzzle className="h-5 w-5 text-accent" />{pz.title}</DialogTitle>{canEdit(pz) && <div className="flex items-center gap-1"><Button variant="outline" size="sm" onClick={() => openEdit(pz)} className="border-border/40 hover:border-accent/30 hover:text-accent"><Edit3 className="h-4 w-4 mr-1" />编辑</Button><Button variant="outline" size="sm" onClick={() => handleDelete(pz.id)} className="border-border/40 hover:border-destructive/30 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div>}</div></DialogHeader><div className="mt-4 space-y-4"><div className="text-sm bg-secondary/20 rounded-lg p-4 border border-border/20 rich-editor-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(pz.content) }} />{pz.hint && <div className="flex items-start gap-2 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg p-3"><Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /><span className="text-amber-400">{pz.hint}</span></div>}{pz.tags?.length > 0 && <div className="flex flex-wrap gap-1.5">{pz.tags.map((t: string) => <Badge key={t} variant="secondary" className="text-xs"><Tag className="h-3 w-3 mr-1" />{t}</Badge>)}</div>}{pz.attachments?.length > 0 && <div className="border-t border-border/20 pt-3"><p className="text-xs text-muted-foreground mb-2"><Paperclip className="h-3 w-3 inline mr-1" />附件</p><div className="flex flex-wrap gap-2">{pz.attachments.map((a: FileAttachment) => <Button key={a.id} variant="outline" size="sm" onClick={() => downloadAtt(a)} className="text-xs"><Download className="h-3 w-3 mr-1" />{a.name}</Button>)}</div></div>}</div></DialogContent></Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!editId} onOpenChange={o => { if (!o) setEditId(null); }}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle><Edit3 className="h-5 w-5 text-accent inline mr-1" />编辑谜题</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>标题</Label><Input value={et} onChange={e => setEt(e.target.value)} className="bg-secondary/30 border-border/50" /></div><div className="space-y-2"><Label>描述</Label><Input value={ed} onChange={e => setEd(e.target.value)} className="bg-secondary/30 border-border/50" /></div></div>
          <div className="space-y-2"><Label>正文</Label><RichTextEditor value={ec} onChange={setEc} minHeight="200px" /></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>分类</Label><Select value={ecat} onValueChange={setEcat}><SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(catLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>难度</Label><Select value={ediff} onValueChange={setEdiff}><SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(diffLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div></div>
          <div className="space-y-2"><Label>提示</Label><Input value={eh} onChange={e => setEh(e.target.value)} className="bg-secondary/30 border-border/50" /></div>
          <div className="space-y-2"><Label>正确答案</Label><Input value={es} onChange={e => setEs(e.target.value)} className="bg-secondary/30 border-border/50" /></div>
          <div className="space-y-2"><Label>新增附件</Label><Input type="file" multiple onChange={e => setEfiles(e.target.files ? Array.from(e.target.files) : [])} className="bg-secondary/30 border-border/50 text-sm" /></div>
          <div className="space-y-2"><Label>标签</Label><Input value={etags} onChange={e => setEtags(e.target.value)} className="bg-secondary/30 border-border/50" /></div>
          <Button onClick={handleEditSave} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"><Save className="h-4 w-4 mr-2" />保存修改</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
