import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Bot, ChevronDown, ChevronUp, Clock, GripHorizontal, Search,
  Loader2, Pencil, Plus, Save, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiDelete, apiGet, apiPost, apiPut } from '@/api/client';
import type { MailBot } from '@/types';

interface BotRule { id: string; botId: string; title: string; triggerKeyword: string; replySubject: string; replyBody: string; delaySeconds: number; sortOrder: number; prerequisiteIds: string[]; createdAt: string; }
interface UserSummary { fromAddress: string; lastRuleId: string; lastTriggerKeyword: string; lastReplySubject: string; lastSubmittedAt: string; }
interface UserSubmission { id: string; botId: string; ruleId: string; fromAddress: string; triggerKeyword: string; replySubject: string; submittedAt: string; }

var NODE_W = 220;
var NODE_H = 72;

export default function MailBotDetailPage() {
  var { id } = useParams<{ id: string }>();
  var [bot, setBot] = useState<MailBot | null>(null);
  var [rules, setRules] = useState<BotRule[]>([]);
  var [users, setUsers] = useState<UserSummary[]>([]);
  var [loading, setLoading] = useState(true);
  var [ruleOpen, setRuleOpen] = useState(false);
  var [editingRule, setEditingRule] = useState<BotRule | null>(null);
  var [ruleForm, setRuleForm] = useState({ title: '', triggerKeyword: '', replySubject: '', replyBody: '', delaySeconds: 0, sortOrder: 0 });
  var [saving, setSaving] = useState(false);
  var [expandedUser, setExpandedUser] = useState<string | null>(null);
  var [submissionFilter, setSubmissionFilter] = useState("");
  var [userSubs, setUserSubs] = useState<UserSubmission[]>([]);
  var [loadingSubs, setLoadingSubs] = useState(false);
  var [selectedRule, setSelectedRule] = useState<string | null>(null);
  var [linkingMode, setLinkingMode] = useState(false);
  var [positions, setPositions] = useState<Record<string,{x:number;y:number}>>({});
  var [draggingNode, setDraggingNode] = useState<string | null>(null);
  var [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  var [canvasZoom, setCanvasZoom] = useState(1);
  var [panning, setPanning] = useState(false);
  var panStart = useRef({ x: 0, y: 0, cx: 0, cy: 0 });
  var dragOffset = useRef({ x: 0, y: 0 });
  var containerRef = useRef<HTMLDivElement>(null);

  var fetchData = useCallback(async function() {
    if (!id) return;
    setLoading(true);
    try {
      var b: MailBot | null = null;
      try { b = await apiGet<MailBot>('/mail/admin/bots/' + id); } catch(e) { b = null; }
      var rulesData = await apiGet<BotRule[]>('/mail/admin/bots/' + id + '/rules');
      var us = await apiGet<{ users: UserSummary[] }>('/mail/admin/bots/' + id + '/submissions');
      setBot(b);
      setRules(rulesData);
      setUsers(us.users);
      setPositions(function(prev) {
        var savedKey = 'bot-rule-pos-' + id;
        var saved: Record<string,{x:number;y:number}> = {};
        try { saved = JSON.parse(localStorage.getItem(savedKey) || '{}'); } catch(e) {}
        var np: Record<string,{x:number;y:number}> = { ...prev };
        rulesData.forEach(function(r, i) {
          if (!np[r.id]) np[r.id] = saved[r.id] || { x: 30, y: 30 + i * (NODE_H + 20) };
        });
        return np;
      });
    } finally { setLoading(false); }
  }, [id]);

  useEffect(function() { fetchData().catch(console.error); }, [fetchData]);

  var loadUserSubs = async function(addr: string) {
    if (expandedUser === addr) { setExpandedUser(null); return; }
    setExpandedUser(addr);
    setLoadingSubs(true);
    try {
      var data = await apiGet<{ submissions: UserSubmission[] }>('/mail/admin/bots/' + id + '/submissions?user=' + encodeURIComponent(addr));
      setUserSubs(data.submissions);
    } finally { setLoadingSubs(false); }
  };

  var openCreateRule = function() {
    setEditingRule(null);
    setRuleForm({ title: '', triggerKeyword: '', replySubject: '', replyBody: '', delaySeconds: 0, sortOrder: rules.length });
    setRuleOpen(true);
  };

  var openEditRule = function(rule: BotRule) {
    setEditingRule(rule);
    setRuleForm({ title: rule.title || '', triggerKeyword: rule.triggerKeyword, replySubject: rule.replySubject, replyBody: rule.replyBody, delaySeconds: rule.delaySeconds, sortOrder: rule.sortOrder });
    setRuleOpen(true);
  };

  var saveRule = async function() {
    if (!id || !ruleForm.triggerKeyword.trim()) return;
    setSaving(true);
    try {
      if (editingRule) await apiPut('/mail/admin/bots/' + id + '/rules/' + editingRule.id, ruleForm);
      else await apiPost('/mail/admin/bots/' + id + '/rules', ruleForm);
      setRuleOpen(false);
      fetchData().catch(console.error);
    } catch(e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  var deleteRule = async function(ruleId: string) {
    if (!id || !confirm('确定删除该规则？')) return;
    await apiDelete('/mail/admin/bots/' + id + '/rules/' + ruleId);
    fetchData().catch(console.error);
  };

  var handleRuleClick = function(ruleId: string) {
    if (linkingMode) {
      if (selectedRule && selectedRule !== ruleId) {
        var target = rules.find(function(r){return r.id===selectedRule;});
        var newPrereqs = target ? target.prerequisiteIds.filter(function(p){return p!==ruleId;}).concat([ruleId]) : [ruleId];
        apiPut('/mail/admin/bots/' + id + '/rules/' + selectedRule + '/prerequisites', { prerequisiteIds: newPrereqs })
          .then(function(){return fetchData();}).catch(console.error);
        setSelectedRule(null);
        setLinkingMode(false);
      } else setSelectedRule(ruleId);
    } else setSelectedRule(function(p){return p===ruleId?null:ruleId;});
  };

  var removePrerequisite = async function(ruleId: string, preId: string) {
    var rule = rules.find(function(r){return r.id===ruleId;});
    if (!rule) return;
    await apiPut('/mail/admin/bots/' + id + '/rules/' + ruleId + '/prerequisites', { prerequisiteIds: rule.prerequisiteIds.filter(function(p){return p!==preId;}) });
    fetchData().catch(console.error);
  };

  // Node drag
  var startNodeDrag = function(ruleId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDraggingNode(ruleId);
    var pos = positions[ruleId] || { x: 0, y: 0 };
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  // Canvas pan
  var startPan = function(e: React.MouseEvent) {
    if (draggingNode || (e.target as HTMLElement).closest('[data-node]')) return;
    setPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, cx: canvasPan.x, cy: canvasPan.y };
  };

  // Zoom
  var handleWheel = function(e: React.WheelEvent) {
    e.preventDefault();
    setCanvasZoom(function(z) { return Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)); });
  };

  useEffect(function() {
    if (!draggingNode && !panning) return;
    var move = function(e: MouseEvent) {
      if (draggingNode) {
        setPositions(function(prev) {
          var np = { ...prev };
          np[draggingNode!] = { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y };
          return np;
        });
      }
      if (panning) {
        setCanvasPan({ x: panStart.current.cx + (e.clientX - panStart.current.x), y: panStart.current.cy + (e.clientY - panStart.current.y) });
      }
    };
    var up = function() {
      setDraggingNode(null);
      setPanning(false);
      setPositions(function(current) {
        var saveKey = 'bot-rule-pos-' + id;
        try { localStorage.setItem(saveKey, JSON.stringify(current)); } catch(e) {}
        return current;
      });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return function() { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [draggingNode, panning, id]);

  var getArrowPoints = function(fromId: string, toId: string) {
    var fp = positions[fromId] || { x: 0, y: 0 };
    var tp = positions[toId] || { x: 0, y: 0 };
    var fcx = fp.x + NODE_W/2, fcy = fp.y + NODE_H/2;
    var tcx = tp.x + NODE_W/2, tcy = tp.y + NODE_H/2;
    var dx = tcx - fcx, dy = tcy - fcy;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0
        ? { x1: fp.x + NODE_W, y1: fcy, x2: tp.x, y2: tcy }
        : { x1: fp.x, y1: fcy, x2: tp.x + NODE_W, y2: tcy };
    }
    return dy > 0
      ? { x1: fcx, y1: fp.y + NODE_H, x2: tcx, y2: tp.y }
      : { x1: fcx, y1: fp.y, x2: tcx, y2: tp.y + NODE_H };
  };

  if (loading) return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (!bot) return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center text-muted-foreground">Bot 不存在</div>;

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <Link to="/mail/admin/bots"><Button variant="ghost" size="icon" className="mb-3"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center"><Bot className="h-7 w-7 text-primary" /></div>
            <div><h1 className="text-2xl font-bold text-glow-cyan">{bot.displayName || bot.username}</h1><p className="text-sm text-muted-foreground font-mono">{bot.address}</p></div>
            <Badge variant={bot.status === 'active' ? 'default' : 'secondary'}>{bot.status === 'active' ? '运行中' : '已停用'}</Badge>
          </div>
          {bot.note && <p className="mt-3 text-sm text-muted-foreground ml-[72px]">备注：{bot.note}</p>}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">触发规则</h2>
              <Button size="sm" variant="outline" onClick={openCreateRule}><Plus className="h-3 w-3 mr-1" />添加规则</Button>
              <Button size="sm" variant={linkingMode ? 'default' : 'outline'} onClick={function(){setLinkingMode(!linkingMode);setSelectedRule(null);}}>
                {linkingMode ? '取消连线' : '连线模式'}
              </Button>
              {linkingMode && selectedRule && <span className="text-xs text-primary">已选: {rules.find(function(r){return r.id===selectedRule;})?.title || rules.find(function(r){return r.id===selectedRule;})?.triggerKeyword} — 点击目标规则连线</span>}
              <span className="text-xs text-muted-foreground ml-2">滚轮缩放 · 拖拽空白平移</span>
            </div>

            <div ref={containerRef} className="relative border border-border/50 rounded-lg overflow-hidden select-none"
              style={{ height: Math.max(500, rules.length * (NODE_H + 24) + 100), backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px', cursor: panning ? 'grabbing' : 'grab' }}
              onMouseDown={startPan} onWheel={handleWheel}>

              <div style={{ transform: 'translate(' + canvasPan.x + 'px, ' + canvasPan.y + 'px) scale(' + canvasZoom + ')', transformOrigin: '0 0', position: 'relative', width: rules.length * (NODE_W + 40) + 200, height: rules.length * (NODE_H + 40) + 200 }}>

                <svg className="absolute inset-0" style={{ width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
                  {rules.map(function(rule) {
                    return rule.prerequisiteIds.map(function(preId) {
                      var pts = getArrowPoints(preId, rule.id);
                      return <g key={rule.id+'-'+preId} style={{pointerEvents:'auto',cursor:'pointer'}} onClick={function(e){e.stopPropagation();removePrerequisite(rule.id,preId);}}>
                        <line x1={pts.x1} y1={pts.y1} x2={pts.x2} y2={pts.y2} stroke="transparent" strokeWidth="16" />
                        <line className="arrow-line" x1={pts.x1} y1={pts.y1} x2={pts.x2} y2={pts.y2} stroke="rgba(99,102,241,0.5)" strokeWidth="2" markerEnd="url(#arrowhead)" />
                      </g>;
                    });
                  })}
                  <defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="rgba(99,102,241,0.8)" /></marker></defs>
                </svg>

                {rules.map(function(rule) {
                  var pos = positions[rule.id] || { x: 0, y: 0 };
                  var isSel = selectedRule === rule.id;
                  return (
                    <div key={rule.id} data-node="true"
                      className={'absolute rounded-lg border text-xs transition-shadow select-none ' + (isSel ? 'border-primary bg-primary/15 shadow-lg shadow-primary/20 z-30' : 'border-border/50 bg-card/95 hover:border-primary/40 z-20') + ' ' + (draggingNode === rule.id ? 'opacity-70' : '')}
                      style={{ left: pos.x, top: pos.y, width: NODE_W, cursor: 'move' }}
                      onClick={function(e){e.stopPropagation();handleRuleClick(rule.id);}}
                      onMouseDown={function(e){startNodeDrag(rule.id, e);}}>
                      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/30">
                        <GripHorizontal className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground truncate text-[11px]">{rule.title || '未命名规则'}</span>
                        <div className="flex gap-0.5 ml-auto shrink-0" onClick={function(e){e.stopPropagation();}}>
                          <button onClick={function(){openEditRule(rule);}} className="p-0.5 hover:text-primary"><Pencil className="h-3 w-3" /></button>
                          <button onClick={function(){deleteRule(rule.id);}} className="p-0.5 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                      <div className="px-2 py-1.5 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-[10px]">触发:</span>
                          <span className="font-mono text-primary text-[10px] truncate">{rule.triggerKeyword}</span>
                          {rule.delaySeconds > 0 && <span className="text-muted-foreground ml-auto text-[10px]"><Clock className="h-3 w-3 inline mr-0.5" />{rule.delaySeconds}s</span>}
                        </div>
                        {rule.replySubject && <div className="text-muted-foreground text-[10px] truncate">回复: {rule.replySubject}</div>}
                        {rule.prerequisiteIds.length > 0 && (
                          <div className="text-muted-foreground text-[10px] truncate">
                            前提: {rule.prerequisiteIds.map(function(p){var pre=rules.find(function(r){return r.id===p;});return pre?.title || pre?.triggerKeyword || p.slice(-4);}).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {rules.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">暂无规则，点击上方按钮添加</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">提交记录</h2>
            <div className="relative mb-2"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" /><Input value={submissionFilter} onChange={function(e){setSubmissionFilter(e.target.value);}} placeholder="筛选用户名..." className="pl-7 h-8 text-xs" /></div>
            {users.length === 0 ? (
              <Card className="glass-card border-border/50"><CardContent className="p-6 text-center text-sm text-muted-foreground">暂无提交记录</CardContent></Card>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {users.filter(function(u){return submissionFilter?u.fromAddress.toLowerCase().includes(submissionFilter.toLowerCase()):true;}).map(function(u) { return (
                  <div key={u.fromAddress}>
                    <button onClick={function(){loadUserSubs(u.fromAddress);}} className="w-full text-left px-3 py-2 rounded-md border border-border/50 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center justify-between"><span className="font-mono text-xs">{u.fromAddress}</span>{expandedUser===u.fromAddress?<ChevronUp className="h-3 w-3"/>:<ChevronDown className="h-3 w-3"/>}</div>
                      <p className="text-xs text-primary mt-1">最后触发：{u.lastTriggerKeyword}</p>
                      <p className="text-xs text-muted-foreground">{new Date(u.lastSubmittedAt).toLocaleString()}</p>
                    </button>
                    {expandedUser===u.fromAddress && (
                      <div className="ml-3 mt-1 mb-2 pl-3 border-l-2 border-primary/30 space-y-1">
                        {loadingSubs ? <Loader2 className="h-4 w-4 animate-spin mx-auto my-2" /> :
                          userSubs.map(function(s,i){ return (
                            <div key={s.id} className="text-xs py-1 px-2 rounded hover:bg-secondary/20">
                              <span className="text-muted-foreground">#{i+1}</span>{' '}<span className="text-primary">{s.triggerKeyword}</span>
                              {s.replySubject && <span className="text-muted-foreground"> → {s.replySubject}</span>}
                              <span className="text-muted-foreground ml-2">{new Date(s.submittedAt).toLocaleString()}</span>
                            </div>
                          );})}
                      </div>
                    )}
                  </div>
                );})}
              </div>
            )}
          </div>
        </div>

        <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editingRule ? '编辑规则' : '添加规则'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>标题</Label>
                <Input value={ruleForm.title} onChange={function(e){setRuleForm(function(f){return{...f,title:e.target.value};});}} placeholder="规则名称，用于卡片显示" /></div>
              <div className="space-y-2"><Label>触发词 <span className="text-destructive">*</span></Label>
                <Input value={ruleForm.triggerKeyword} onChange={function(e){setRuleForm(function(f){return{...f,triggerKeyword:e.target.value};});}} placeholder="收到包含此关键词的邮件时触发" /></div>
              <div className="space-y-2"><Label>回复标题</Label>
                <Input value={ruleForm.replySubject} onChange={function(e){setRuleForm(function(f){return{...f,replySubject:e.target.value};});}} placeholder="留空则使用 Re: 原标题" /></div>
              <div className="space-y-2"><Label>回复正文 (支持HTML)</Label>
                <Textarea value={ruleForm.replyBody} onChange={function(e){setRuleForm(function(f){return{...f,replyBody:e.target.value};});}} placeholder="自动回复的邮件内容" rows={6} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>延迟秒数</Label><Input type="number" min={0} value={ruleForm.delaySeconds} onChange={function(e){setRuleForm(function(f){return{...f,delaySeconds:Number(e.target.value)};});}} /></div>
                <div className="space-y-2"><Label>排序</Label><Input type="number" min={0} value={ruleForm.sortOrder} onChange={function(e){setRuleForm(function(f){return{...f,sortOrder:Number(e.target.value)};});}} /></div>
              </div>
              {editingRule && editingRule.prerequisiteIds.length > 0 && (
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground mb-2">前提规则（点击 × 移除）：</p>
                  <div className="flex flex-wrap gap-1">
                    {editingRule?.prerequisiteIds.map(function(preId){var pre=rules.find(function(r){return r.id===preId;});
                      return <Badge key={preId} variant="secondary" className="text-xs cursor-pointer" onClick={function(){removePrerequisite(editingRule!.id,preId);}}>{pre?.title || pre?.triggerKeyword || preId} <X className="h-3 w-3 ml-1" /></Badge>;
                    })}
                  </div>
                </div>
              )}
              <Button onClick={saveRule} disabled={saving || !ruleForm.triggerKeyword.trim()} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editingRule ? '保存修改' : '添加规则'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
