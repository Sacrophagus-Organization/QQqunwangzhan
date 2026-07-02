import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPost, apiPut, apiDelete, apiUploadImage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ExternalLink, Pencil, Copy, Save, Upload, Image as ImageIcon } from 'lucide-react';
import type { Story, StoryScene, StoryLine, StoryCharacter, StoryChoice } from '@/types';

/* ═══════════════════════════════════════
   图片上传小组件
   ═══════════════════════════════════════ */
function ImageUploader({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await apiUploadImage(file);
      onChange(result.url);
    } catch (err: any) {
      alert('上传失败: ' + (err.message || '未知错误'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <div className="flex gap-2 items-center">
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder="或直接粘贴URL" className="flex-1 h-8 text-sm" />
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <Button size="sm" variant="outline" type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="whitespace-nowrap text-xs h-8">
          {uploading ? '上传中...' : <><Upload className="w-3 h-3 mr-1" />选择文件</>}
        </Button>
      </div>
      {value && (
        <div className="mt-1 relative inline-block">
          <img src={value} alt="" className="h-16 object-contain rounded border border-border/30" />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   StoryEditorPage — 剧情编辑器
   admin/editor 专属
   ═══════════════════════════════════════ */
export default function StoryEditorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: editId } = useParams();

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(editId || null);
  const [activeTab, setActiveTab] = useState('meta');
  const [metaForm, setMetaForm] = useState({ title: '', description: '', status: 'draft' as string });
  const [scenes, setScenes] = useState<StoryScene[]>([]);
  const [lines, setLines] = useState<StoryLine[]>([]);
  const [characters, setCharacters] = useState<StoryCharacter[]>([]);
  const [choices, setChoices] = useState<StoryChoice[]>([]);

  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  useEffect(() => {
    if (!canEdit) { navigate('/'); return; }
    loadStories();
  }, [canEdit]);

  useEffect(() => {
    if (selectedStoryId) loadStoryData(selectedStoryId);
  }, [selectedStoryId]);

  const loadStories = async () => {
    try {
      const res = await apiGet<{ data: Story[] }>('/stories?limit=50&status=all');
      setStories(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const loadStoryData = async (storyId: string) => {
    try {
      const [detail, playData, charsData] = await Promise.all([
        apiGet<any>(`/stories/${storyId}`),
        apiGet<any>(`/stories/${storyId}/play`).catch(() => ({ scenes: [], lines: [], choices: [] })),
        apiGet<any>(`/stories/${storyId}`).then(d => d.characters).catch(() => []),
      ]);
      setMetaForm({ title: detail.title || '', description: detail.description || '', status: detail.status || 'draft' });
      setScenes(playData.scenes || []);
      setLines(playData.lines || []);
      setCharacters(charsData || []);
      setChoices(playData.choices || []);
    } catch (err) { console.error('加载失败:', err); }
  };

  const handleCreateStory = async () => {
    const title = prompt('请输入剧情标题：');
    if (!title?.trim()) return;
    try {
      const story = await apiPost<any>('/stories', { title: title.trim() });
      await loadStories();
      setSelectedStoryId(story.id);
    } catch (err: any) { alert('创建失败: ' + (err.message || '')); }
  };

  const handleSaveMeta = async () => {
    if (!selectedStoryId) return;
    try { await apiPut(`/stories/${selectedStoryId}`, metaForm); await loadStories(); alert('保存成功'); }
    catch (err: any) { alert('保存失败: ' + (err.message || '')); }
  };
  const handleSaveScenes = async () => {
    if (!selectedStoryId) return;
    try { await apiPut(`/stories/${selectedStoryId}/scenes`, { scenes }); alert('保存成功'); }
    catch (err: any) { alert('保存失败: ' + (err.message || '')); }
  };
  const handleSaveLines = async () => {
    if (!selectedStoryId) return;
    try { await apiPut(`/stories/${selectedStoryId}/lines`, { lines }); alert('保存成功'); }
    catch (err: any) { alert('保存失败: ' + (err.message || '')); }
  };
  const handleSaveChars = async () => {
    if (!selectedStoryId) return;
    try { await apiPut(`/stories/${selectedStoryId}/characters`, { characters }); alert('保存成功'); }
    catch (err: any) { alert('保存失败: ' + (err.message || '')); }
  };
  const handleSaveChoices = async () => {
    if (!selectedStoryId) return;
    try { await apiPut(`/stories/${selectedStoryId}/choices`, { choices }); alert('保存成功'); }
    catch (err: any) { alert('保存失败: ' + (err.message || '')); }
  };
  const handleDelete = async (storyId: string) => {
    if (!confirm('确定删除此剧情？场景/台词/角色将一并删除。')) return;
    try {
      await apiDelete(`/stories/${storyId}`);
      if (selectedStoryId === storyId) { setSelectedStoryId(null); setScenes([]); setLines([]); setCharacters([]); setChoices([]); }
      await loadStories();
    } catch (err: any) { alert('删除失败: ' + (err.message || '')); }
  };
  const handleCopyLink = (storyId: string) => {
    const linkText = prompt('请输入链接文本（将作为超链接显示文字）：', '观看剧情');
    if (!linkText) return;
    const url = `${window.location.origin}/juqing?story=${storyId}`;
    const html = `<a href="${url}" target="_blank">${linkText}</a>`;
    navigator.clipboard.writeText(html).then(() => alert('超链接 HTML 已复制到剪贴板！'));
  };

  if (!canEdit) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-heading font-bold mb-6">剧情编辑器</h1>

      {!selectedStoryId ? (
        /* ── 剧情列表 ── */
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted-foreground">共 {stories.length} 个剧情</p>
            <Button onClick={handleCreateStory} size="sm"><Plus className="w-4 h-4 mr-1" />新建剧情</Button>
          </div>
          <div className="grid gap-3">
            {stories.map(s => (
              <div key={s.id} className="card-elevated p-4 flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.status === 'published' ? '已发布' : '草稿'} · {s.author} · {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleCopyLink(s.id)}><Copy className="w-3.5 h-3.5 mr-1" />复制链接</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedStoryId(s.id)}><Pencil className="w-3.5 h-3.5 mr-1" />编辑</Button>
                  {s.status === 'published' && <Button size="sm" variant="outline" onClick={() => window.open(`/juqing?story=${s.id}`, '_blank')}><ExternalLink className="w-3.5 h-3.5" /></Button>}
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
            {stories.length === 0 && <div className="text-center py-12 text-muted-foreground"><p>暂无剧情，点击"新建剧情"开始创作</p></div>}
          </div>
        </div>
      ) : (
        /* ── 编辑器界面 ── */
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setSelectedStoryId(null)}>← 返回列表</Button>
            <h2 className="text-lg font-semibold">编辑: {metaForm.title}</h2>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="meta">元信息</TabsTrigger>
              <TabsTrigger value="scenes">场景 ({scenes.length})</TabsTrigger>
              <TabsTrigger value="characters">角色 ({characters.length})</TabsTrigger>
              <TabsTrigger value="lines">台词 ({lines.length})</TabsTrigger>
              <TabsTrigger value="choices">分支选项 ({choices.length})</TabsTrigger>
            </TabsList>

            {/* ═══ 元信息 ═══ */}
            <TabsContent value="meta" className="space-y-4">
              <div className="max-w-lg space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">标题</label>
                  <Input value={metaForm.title} onChange={e => setMetaForm({ ...metaForm, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">描述</label>
                  <Textarea value={metaForm.description} onChange={e => setMetaForm({ ...metaForm, description: e.target.value })} rows={3} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">状态</label>
                  <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={metaForm.status} onChange={e => setMetaForm({ ...metaForm, status: e.target.value })}>
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                  </select>
                </div>
                <Button onClick={handleSaveMeta}><Save className="w-4 h-4 mr-1" />保存元信息</Button>
              </div>
            </TabsContent>

            {/* ═══ 场景 ═══ */}
            <TabsContent value="scenes" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">场景背景使用"上传图片"按钮选择本地文件；BGM 在此处设置</p>
                <Button size="sm" onClick={() => setScenes([...scenes, { id: '', storyId: selectedStoryId, name: `场景 ${scenes.length + 1}`, background: '', bgm: '', bgmVolume: 0.3, order: scenes.length, transition: 'none' }])}>
                  <Plus className="w-3.5 h-3.5 mr-1" />添加场景
                </Button>
              </div>
              {scenes.map((sc, idx) => (
                <div key={idx} className="card-elevated p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div className="md:col-span-1">
                    <label className="text-xs text-muted-foreground mb-1 block">场景名</label>
                    <Input value={sc.name} onChange={e => { const ns = [...scenes]; ns[idx] = { ...sc, name: e.target.value }; setScenes(ns); }} className="h-8 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <ImageUploader label="场景背景" value={sc.background || ''} onChange={url => { const ns = [...scenes]; ns[idx] = { ...sc, background: url }; setScenes(ns); }} />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs text-muted-foreground mb-1 block">BGM URL</label>
                    <Input value={sc.bgm || ''} onChange={e => { const ns = [...scenes]; ns[idx] = { ...sc, bgm: e.target.value }; setScenes(ns); }} className="h-8 text-sm" placeholder="音频URL" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setScenes(scenes.filter((_, i) => i !== idx))}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              {scenes.length > 0 && <Button onClick={handleSaveScenes} size="sm"><Save className="w-3.5 h-3.5 mr-1" />保存场景</Button>}
            </TabsContent>

            {/* ═══ 角色 ═══ */}
            <TabsContent value="characters" className="space-y-4">
              <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                <ImageIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80">
                  重要：角色立绘请使用<strong>面朝右侧</strong>的图片。<br />
                  默认角色将显示在屏幕左侧（面朝右侧），放在右侧时网站会自动水平翻转。
                </p>
              </div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">管理角色名、名签颜色和立绘</p>
                <Button size="sm" onClick={() => setCharacters([...characters, { id: '', storyId: selectedStoryId, name: `角色 ${characters.length + 1}`, nameTagColor: '#c9a96e', sprites: {} }])}>
                  <Plus className="w-3.5 h-3.5 mr-1" />添加角色
                </Button>
              </div>
              {characters.map((ch, idx) => (
                <div key={idx} className="card-elevated p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">角色名</label>
                    <Input value={ch.name} onChange={e => { const ns = [...characters]; ns[idx] = { ...ch, name: e.target.value }; setCharacters(ns); }} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">名签颜色</label>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={ch.nameTagColor || '#c9a96e'} onChange={e => { const ns = [...characters]; ns[idx] = { ...ch, nameTagColor: e.target.value }; setCharacters(ns); }} className="w-12 h-8 p-0.5" />
                      <span className="text-xs text-muted-foreground">{ch.nameTagColor || '#c9a96e'}</span>
                    </div>
                  </div>
                  <div>
                    <Button size="sm" variant="ghost" className="self-end" onClick={() => setCharacters(characters.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="md:col-span-3">
                    <ImageUploader label="角色立绘（面朝右侧）" value={ch.defaultSprite || ''} onChange={url => { const ns = [...characters]; ns[idx] = { ...ch, defaultSprite: url }; setCharacters(ns); }} />
                  </div>
                </div>
              ))}
              {characters.length > 0 && <Button onClick={handleSaveChars} size="sm"><Save className="w-3.5 h-3.5 mr-1" />保存角色</Button>}
            </TabsContent>

            {/* ═══ 台词 ═══ */}
            <TabsContent value="lines" className="space-y-4">
              <div className="text-xs text-muted-foreground mb-2 p-2 rounded bg-muted/40">
                每句台词需指定<strong>所属场景</strong>和控制该角色在<strong>左侧/右侧</strong>说话。立绘自动从角色库中读取。
              </div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">order 决定播放顺序，同一场景内 order 连续即可</p>
                <Button size="sm" onClick={() => {
                  const newOrder = lines.length > 0 ? Math.max(...lines.map(l => l.order)) + 1 : 0;
                  setLines([...lines, { id: '', storyId: selectedStoryId, sceneId: scenes[0]?.id || '', speaker: 'narrator', characterName: '', text: '', order: newOrder }]);
                }}><Plus className="w-3.5 h-3.5 mr-1" />添加台词</Button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto space-y-3">
                {lines.sort((a, b) => a.order - b.order).map((ln) => {
                  const actualIdx = lines.findIndex(l => l.order === ln.order);
                  return (
                    <div key={actualIdx} className="card-elevated p-4 grid grid-cols-1 md:grid-cols-10 gap-2 text-sm">
                      {/* 场景选择 */}
                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">所属场景</label>
                        <select className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs h-9" value={ln.sceneId}
                          onChange={e => { const ns = [...lines]; ns[actualIdx] = { ...ln, sceneId: e.target.value }; setLines(ns); }}>
                          {scenes.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                          {scenes.length === 0 && <option value="">未创建场景</option>}
                        </select>
                      </div>
                      {/* 说话人 */}
                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">说话人 / 位置</label>
                        <select className="w-full rounded border border-border bg-background px-1 py-1.5 text-xs h-9" value={ln.speaker}
                          onChange={e => { const ns = [...lines]; ns[actualIdx] = { ...ln, speaker: e.target.value as any }; setLines(ns); }}>
                          <option value="narrator">旁白</option>
                          <option value="left">左侧角色</option>
                          <option value="right">右侧角色</option>
                        </select>
                      </div>
                      {/* 角色名 — 下拉选择 */}
                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">角色名</label>
                        <select className="w-full rounded border border-border bg-background px-1 py-1.5 text-xs h-9" value={ln.characterName}
                          onChange={e => { const ns = [...lines]; ns[actualIdx] = { ...ln, characterName: e.target.value }; setLines(ns); }}>
                          <option value="">（未选择）</option>
                          {characters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      {/* 台词文本 */}
                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">台词文本</label>
                        <Textarea value={ln.text} onChange={e => { const ns = [...lines]; ns[actualIdx] = { ...ln, text: e.target.value }; setLines(ns); }} rows={2} className="text-xs" />
                      </div>
                      {/* 顺序和删除 */}
                      <div className="md:col-span-2 flex items-end gap-1">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">顺序</label>
                          <Input type="number" value={ln.order} onChange={e => { const ns = [...lines]; ns[actualIdx] = { ...ln, order: parseInt(e.target.value) || 0 }; setLines(ns); }} className="w-full h-7 text-xs" />
                        </div>
                        <Button size="sm" variant="ghost" className="mb-0.5" onClick={() => setLines(lines.filter(l => l.order !== ln.order))}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {lines.length > 0 && <Button onClick={handleSaveLines} size="sm"><Save className="w-3.5 h-3.5 mr-1" />保存台词</Button>}
            </TabsContent>

            {/* ═══ 分支选项 ═══ */}
            <TabsContent value="choices" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">在某句台词后显示分支选项，跳转到指定 order 的台词</p>
                <Button size="sm" onClick={() => setChoices([...choices, { id: '', storyId: selectedStoryId, lineId: '', text: '', targetLineOrder: 0 }])}><Plus className="w-3.5 h-3.5 mr-1" />添加选项</Button>
              </div>
              {choices.map((ch, idx) => (
                <div key={idx} className="card-elevated p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">触发台词 order</label>
                    <Input type="number" value={ch.lineId ? String(lines.find(l => l.id === ch.lineId)?.order ?? '') : ''}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        const targetLine = !isNaN(val) ? lines.find(l => l.order === val) : undefined;
                        const ns = [...choices]; ns[idx] = { ...ch, lineId: targetLine?.id || '' }; setChoices(ns);
                      }}
                      placeholder="在第几句order后触发" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs text-muted-foreground mb-1 block">选项文本</label>
                    <Input value={ch.text} onChange={e => { const ns = [...choices]; ns[idx] = { ...ch, text: e.target.value }; setChoices(ns); }} />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs text-muted-foreground mb-1 block">跳转目标 order</label>
                    <Input type="number" value={String(ch.targetLineOrder)} onChange={e => { const ns = [...choices]; ns[idx] = { ...ch, targetLineOrder: parseInt(e.target.value) || 0 }; setChoices(ns); }} />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setChoices(choices.filter((_, i) => i !== idx))}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              ))}
              {choices.length > 0 && <Button onClick={handleSaveChoices} size="sm"><Save className="w-3.5 h-3.5 mr-1" />保存选项</Button>}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
