import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MarkdownEditor from '@/components/MarkdownEditor';
import CommentSection from '@/components/CommentSection';
import { apiGet, apiPut, apiDelete, apiUpload, apiDownload } from '@/api/client';
import {
  ArrowLeft, Calendar, User, Tag, AlertTriangle, Paperclip, Download,
  Edit3, Clock, Save, Loader2, Trash2, Pin,
} from 'lucide-react';
import type { DecryptRecord, FileAttachment } from '@/types';
import { sanitizeHtml } from '@/lib/sanitize';
import { renderMarkdown } from '@/lib/markdown';

const importanceLabels: Record<string, { label: string; color: string }> = {
  normal: { label: '普通', color: 'bg-secondary text-muted-foreground' },
  important: { label: '重要', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  critical: { label: '关键', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [record, setRecord] = useState<DecryptRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [eTitle, setETitle] = useState('');
  const [eSummary, setESummary] = useState('');
  const [eContent, setEContent] = useState('');
  const [eTags, setETags] = useState('');
  const [eImportance, setEImportance] = useState<DecryptRecord['importance']>('normal');
  const [eFiles, setEFiles] = useState<File[]>([]);

  const load = async () => {
    try { const r = await apiGet<DecryptRecord>(`/records/${id}`); setRecord(r); } catch { setRecord(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  // 修复 Radix Dialog 关闭后 body 的 overflow: hidden 残留导致页面无法滚动
  useEffect(() => {
    if (!showEdit) {
      const t = setTimeout(() => {
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
        document.body.style.paddingRight = '';
      }, 150);
      return () => clearTimeout(t);
    }
  }, [showEdit]);

  const canEdit = user && record && (user.id === record.authorId || user.role === 'admin' || user.role === 'editor');

  const openEdit = () => {
    if (!record) return;
    setETitle(record.title); setESummary(record.summary); setEContent(record.content);
    setETags((record.tags || []).join(', ')); setEImportance(record.importance); setEFiles([]); setShowEdit(true);
  };

  const handleDelete = async () => {
    if (!record || !confirm('确定永久删除这条记录？此操作不可撤销。')) return;
    try {
      await apiDelete(`/records/${record.id}`);
      navigate('/records');
    } catch (e: any) { alert(e.message); }
  };

  const handleSave = async () => {
    if (!record || !eTitle.trim()) return;
    try {
      await apiPut(`/records/${record.id}`, {
        title: eTitle.trim(), summary: eSummary.trim(), content: eContent,
        tags: eTags.split(',').map(t => t.trim()).filter(Boolean), importance: eImportance,
      });
      if (eFiles.length > 0) await apiUpload('record', record.id, eFiles);
      setShowEdit(false); load();
    } catch (e: any) { alert(e.message); }
  };

  const downloadAtt = (att: FileAttachment) => {
    apiDownload(att.dataUrl, att.name).catch(e => alert(e.message));
  };

  if (loading) return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin animate-breathe-glow" /></div>;
  if (!record) return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Card className="glass-card border-border/50 max-w-md anim-scale-in"><CardContent className="p-8 text-center"><AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4 animate-breathe-glow" /><h2 className="text-xl font-bold mb-2 font-heading tracking-wide">记录未找到</h2><Button onClick={() => navigate('/records')} variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />返回</Button></CardContent></Card></div>;

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <button onClick={() => navigate('/records')} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6 group anim-fade-up"><ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /><span className="text-sm">返回记录列表</span></button>
        <Card className="card-elevated border-border/50 border-glow mb-6 relative overflow-hidden anim-blur-in">
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden z-10 pointer-events-none"><div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary/70 to-transparent animate-data-sweep" /></div>
          <CardHeader><div className="flex items-start gap-3">{record.importance === 'critical' ? <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5 animate-breathe-glow" /> : record.pinned ? <Pin className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-float-soft" /> : null}<div className="flex-1"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><CardTitle className="text-2xl font-bold text-glow-cyan font-heading tracking-wide">{record.title}</CardTitle>{record.pinned ? <Badge className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20"><Pin className="h-3 w-3 mr-0.5" />置顶</Badge> : null}</div>{canEdit && <div className="flex items-center gap-1 shrink-0 ml-4"><Button variant="outline" size="sm" onClick={openEdit} className="border-border/40 hover:border-primary/30 hover:text-primary"><Edit3 className="h-4 w-4 mr-1.5" />编辑</Button><Button variant="outline" size="sm" onClick={handleDelete} className="border-border/40 hover:border-destructive/30 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div>}</div><p className="text-muted-foreground mt-2">{record.summary}</p></div></div></CardHeader>
          <CardContent><div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-t border-border/30 pt-4"><span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary/60" />{record.date}</span><span className="flex items-center gap-1.5"><User className="h-4 w-4 text-primary/60" />{record.author}</span><span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary/60" />更新于 {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString('zh-CN') : record.date}</span><Badge variant="outline" className={`text-xs ${importanceLabels[record.importance]?.color || ''}`}>{importanceLabels[record.importance]?.label}</Badge></div></CardContent>
        </Card>
        <Card className="glass-card glass-card-hover border-border/50 mb-6 anim-fade-up" style={{ animationDelay: '0.1s' } as any}><CardContent className="p-8"><div className="markdown-content prose prose-invert prose-sm max-w-none text-sm leading-relaxed text-muted-foreground/90" dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdown(record.content)) || '<p class="text-muted-foreground">暂无内容</p>' }} /></CardContent></Card>
        <Card className="glass-card glass-card-hover border-border/50 mb-6 anim-fade-up" style={{ animationDelay: '0.2s' } as any}><CardContent className="p-6"><CommentSection entityType="record" entityId={record.id} /></CardContent></Card>
        {record.tags?.length > 0 && <div className="flex flex-wrap gap-2 mb-6 anim-fade-up" style={{ animationDelay: '0.3s' } as any}>{record.tags.map((tag: string) => <Badge key={tag} variant="secondary" className="text-xs px-3 py-1"><Tag className="h-3 w-3 mr-1.5" />{tag}</Badge>)}</div>}
        {record.attachments?.length > 0 && <Card className="glass-card glass-card-hover border-border/50 mb-6 anim-fade-up" style={{ animationDelay: '0.3s' } as any}><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2 font-heading tracking-wide"><Paperclip className="h-4 w-4 text-primary animate-breathe-glow" />附件 ({record.attachments.length})</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-3">{record.attachments.map(att => <Button key={att.id} variant="outline" size="sm" onClick={() => downloadAtt(att)} className="text-xs border-border/40 hover:border-primary/30"><Download className="h-3.5 w-3.5 mr-1.5" />{att.name}<span className="ml-2 text-muted-foreground">({(att.size / 1024).toFixed(0)} KB)</span></Button>)}</div></CardContent></Card>}
        <div className="flex items-center justify-between anim-fade-up" style={{ animationDelay: '0.4s' } as any}><Button variant="ghost" onClick={() => navigate('/records')} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-2" />返回列表</Button><p className="text-xs text-muted-foreground mono-text">ID: {record.id}</p></div>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="!w-[75vw] !max-w-[75vw] max-h-[92vh] overflow-y-auto">
          <div className="md:hidden mb-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400 flex items-start gap-2"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><span>本页面为桌面端设计，请使用电脑访问以获得最佳编辑体验。</span></div>
          <DialogHeader><DialogTitle className="flex items-center gap-2 font-heading tracking-wide"><Edit3 className="h-5 w-5 text-primary" />编辑解密记录</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>标题</Label><Input value={eTitle} onChange={e => setETitle(e.target.value)} className="bg-secondary/30 border-border/50" /></div><div className="space-y-2"><Label>重要程度</Label><Select value={eImportance} onValueChange={(v: DecryptRecord['importance']) => setEImportance(v)}><SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">普通</SelectItem><SelectItem value="important">重要</SelectItem><SelectItem value="critical">关键</SelectItem></SelectContent></Select></div></div>
            <div className="space-y-2"><Label>摘要</Label><Input value={eSummary} onChange={e => setESummary(e.target.value)} className="bg-secondary/30 border-border/50" /></div>
            <div className="space-y-2"><Label>正文（Markdown）</Label><MarkdownEditor value={eContent} onChange={setEContent} placeholder="支持 Markdown 语法：**加粗**、# 标题、\`\`\`代码块\`\`\`、![图片](url) 等" minHeight="60vh" /></div>
            <div className="space-y-2"><Label>新增附件</Label><Input type="file" multiple onChange={e => setEFiles(e.target.files ? Array.from(e.target.files) : [])} className="bg-secondary/30 border-border/50 text-sm" /></div>
            <div className="space-y-2"><Label>标签</Label><Input value={eTags} onChange={e => setETags(e.target.value)} className="bg-secondary/30 border-border/50" /></div>
            <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"><Save className="h-4 w-4 mr-2" />保存修改</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
