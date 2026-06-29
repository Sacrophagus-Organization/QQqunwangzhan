import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPost, apiDelete, apiPut } from '@/api/client';
import {
  Shield, Users, UserCheck, UserX, Trash2,
  Clock, CheckCircle2, XCircle, Loader2, AlertTriangle,
  MessageSquare, Terminal, Key, FileText,
  Upload, Plus, Globe, Lock,
} from 'lucide-react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { SarcophagusCode, PageAccessConfig } from '@/types';

interface UserItem {
  id: string;
  username: string;
  qq_number: string;
  avatar_url?: string;
  role: string;
  status: string;
  register_reason: string;
  requested_role?: string;
  requested_role_reason?: string;
  created_at: string;
}

const roleLabels: Record<string, { label: string; color: string }> = {
  admin: { label: '管理员', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  editor: { label: '编辑', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  member: { label: '成员', color: 'bg-secondary text-muted-foreground' },
};

export default function AdminPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'sarcophagus' | 'pages'>('users');
  // ── 石棺代码管理状态 ──
  const [codes, setCodes] = useState<SarcophagusCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesError, setCodesError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  // ── 页面访问控制状态 ──
  const [pageConfigs, setPageConfigs] = useState<PageAccessConfig[]>([]);
  const [pageConfigsLoading, setPageConfigsLoading] = useState(false);
  const [pageConfigsError, setPageConfigsError] = useState('');
  const [savingPageId, setSavingPageId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try { setUsers(await apiGet<UserItem[]>('/admin/users')); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (!authLoading && isAuthenticated) fetchUsers(); }, [authLoading, isAuthenticated, fetchUsers]);

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    setActingId(userId);
    try {
      await apiPost(`/admin/users/${userId}/${action}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: action === 'approve' ? 'active' : 'rejected' } : u));
    } catch (e: any) { alert(e.message); }
    setActingId(null);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('确定永久删除该用户？此操作不可撤销。')) return;
    setActingId(userId);
    try {
      await apiDelete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e: any) { alert(e.message); }
    setActingId(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActingId(userId);
    try {
      await apiPost(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e: any) { alert(e.message); }
    setActingId(null);
  };

  const handleRoleApprove = async (userId: string, newRole: string) => {
    setActingId(userId);
    try {
      await apiPost(`/admin/users/${userId}/approve-role`);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, role: newRole, requested_role: '', requested_role_reason: '' } : u
      ));
    } catch (e: any) { alert(e.message); }
    setActingId(null);
  };

  const handleRoleReject = async (userId: string) => {
    setActingId(userId);
    try {
      await apiPost(`/admin/users/${userId}/reject-role`);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, requested_role: '', requested_role_reason: '' } : u
      ));
    } catch (e: any) { alert(e.message); }
    setActingId(null);
  };

  // ═══ 石棺代码管理 ──────────────────────────────
  const loadCodes = useCallback(async () => {
    setCodesLoading(true);
    setCodesError('');
    try {
      setCodes(await apiGet<SarcophagusCode[]>('/sarcophagus/codes'));
    } catch (e: any) {
      setCodesError(e.message || '加载失败');
    }
    setCodesLoading(false);
  }, []);

  useEffect(() => { if (activeTab === 'sarcophagus') loadCodes(); }, [activeTab, loadCodes]);

  // ── 页面访问控制方法 ──
  const loadPageConfigs = useCallback(async () => {
    setPageConfigsLoading(true);
    setPageConfigsError('');
    try {
      setPageConfigs(await apiGet<PageAccessConfig[]>('/admin/page-access'));
    } catch (e: any) {
      setPageConfigsError(e.message || '加载失败');
    }
    setPageConfigsLoading(false);
  }, []);

  useEffect(() => { if (activeTab === 'pages') loadPageConfigs(); }, [activeTab, loadPageConfigs]);

  const handlePageAccessChange = async (id: string, _field: 'access_level', value: any) => {
    setSavingPageId(id);
    try {
      await apiPut(`/admin/page-access/${id}`, { access_level: value });
      setPageConfigs(prev => prev.map(c => c.id === id ? { ...c, access_level: value } : c));
    } catch (e: any) {
      alert(e.message || '保存失败');
    }
    setSavingPageId(null);
  };

  const handleAddCode = async () => {
    if (!newCode.trim() || !newFile) return;
    setSaving(true);
    setCodesError('');
    try {
      const formData = new FormData();
      formData.append('code', newCode.trim().toUpperCase());
      formData.append('file', newFile);
      const token = localStorage.getItem('arkoverseer_token');
      const res = await fetch('/api/sarcophagus/codes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || '创建失败'); }
      setShowAdd(false);
      setNewCode('');
      setNewFile(null);
      await loadCodes();
    } catch (e: any) { setCodesError(e.message); }
    setSaving(false);
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('确认删除该访问代码？')) return;
    try { await apiDelete(`/sarcophagus/codes/${id}`); await loadCodes(); }
    catch (e: any) { setCodesError(e.message); }
  };

  const handleEdit = (item: SarcophagusCode) => {
    setEditingId(item.id);
    setEditCode(item.code);
    setEditFile(null);
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    setCodesError('');
    try {
      const formData = new FormData();
      formData.append('code', editCode.trim().toUpperCase());
      if (editFile) formData.append('file', editFile);
      const token = localStorage.getItem('arkoverseer_token');
      const res = await fetch(`/api/sarcophagus/codes/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || '更新失败'); }
      setEditingId(null);
      setEditCode('');
      setEditFile(null);
      await loadCodes();
    } catch (e: any) { setCodesError(e.message); }
    setSaving(false);
  };

  if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center">
        <Card className="glass-card border-border/50 max-w-md anim-scale-in">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4 animate-breathe-glow" />
            <h2 className="text-xl font-bold mb-2 font-heading tracking-wide">访问被拒绝</h2>
            <p className="text-muted-foreground">你无权访问此页面</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = true; // 此页面已仅限admin访问

  const pendingCount = users.filter(u => u.status === 'pending' || !!u.requested_role).length;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/10 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />已通过</Badge>;
      case 'pending': return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />待审核</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />已拒绝</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin animate-breathe-glow" /></div>;

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between mb-6 anim-fade-up">
          <div>
            <h1 className="text-2xl font-bold text-glow-cyan font-display flex items-center gap-2">
              <Shield className="h-6 w-6 text-red-400 animate-breathe-glow" /> 管理员控制台
            </h1>
            <p className="text-sm text-muted-foreground mt-1 mono-text">
              &gt; 系统管理 // lynchpin-admin
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-secondary/20 border border-border/30 anim-fade-up" style={{ animationDelay: '0.1s' } as any}>
          {[
            { key: 'users' as const, icon: Users, label: '用户管理', count: pendingCount, alert: pendingCount > 0 },
            { key: 'sarcophagus' as const, icon: Terminal, label: '石棺代码', count: codes.length, alert: false },
            { key: 'pages' as const, icon: Globe, label: '页面访问', count: pageConfigs.length, alert: false },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-background border border-border/50 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground/70'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.alert && (
                <Badge className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/15 text-amber-400 border-amber-500/30">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
        <>
        {pendingCount > 0 && (
          <Card className="glass-card glass-card-hover border-amber-500/30 bg-amber-500/5 mb-6 anim-fade-up" style={{ animationDelay: '0.15s' } as any}>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 animate-breathe-glow" />
              <div>
                <p className="text-sm font-medium text-amber-400">{pendingCount} 个新注册用户等待审核</p>
                <p className="text-xs text-amber-400/70">请在下方审核列表中通过或拒绝</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {users.map((u, idx) => (
            <Card key={u.id} className={`glass-card glass-card-hover border-border/50 hover:border-primary/20 transition-all anim-fade-up ${u.status === 'pending' ? 'border-amber-500/30' : ''}`} style={{ animationDelay: `${0.2 + idx * 0.05}s` } as any}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <AvatarDisplay
                      avatarUrl={u.avatar_url ? '/' + u.avatar_url : ''}
                      username={u.username}
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium font-heading tracking-wide">{u.username}</span>
                        <Badge variant="outline" className={`text-xs ${roleLabels[u.role]?.color || ''}`}>{roleLabels[u.role]?.label || u.role}</Badge>
                        {statusBadge(u.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>QQ: {u.qq_number || '-'}</span>
                        <span>注册于 {u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-'}</span>
                        <span className="mono-text">ID: {u.id}</span>
                      </div>
                      {u.register_reason && (
                        <div className="flex items-start gap-1.5 mt-2 text-xs bg-secondary/30 rounded-md p-2">
                          <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-muted-foreground/90">{u.register_reason}</span>
                        </div>
                      )}
                      {/* 权限申请信息 */}
                      {u.requested_role && (
                        <div className="flex items-start gap-1.5 mt-2 text-xs bg-amber-500/5 border border-amber-500/20 rounded-md p-2">
                          <Shield className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-amber-400 font-medium">
                              申请 {u.requested_role === 'admin' ? '管理员' : '编辑'} 权限
                            </span>
                            {u.requested_role_reason && (
                              <p className="text-muted-foreground mt-0.5">{u.requested_role_reason}</p>
                            )}
                            {isAdmin && (
                              <div className="flex gap-1 mt-1.5">
                                <Button size="sm" variant="outline"
                                  className="h-6 text-[10px] border-green-500/30 text-green-400 hover:bg-green-500/10"
                                  onClick={() => handleRoleApprove(u.id, u.requested_role!)}
                                  disabled={actingId === u.id}>
                                  {actingId === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '通过'}
                                </Button>
                                <Button size="sm" variant="outline"
                                  className="h-6 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10"
                                  onClick={() => handleRoleReject(u.id)}
                                  disabled={actingId === u.id}>
                                  拒绝
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && u.role !== 'admin' && u.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline"
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                          onClick={() => handleAction(u.id, 'approve')}
                          disabled={actingId === u.id}>
                          {actingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1" />}通过
                        </Button>
                        <Button size="sm" variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleAction(u.id, 'reject')}
                          disabled={actingId === u.id}>
                          <UserX className="h-4 w-4 mr-1" />拒绝
                        </Button>
                      </>
                    )}
                    {isAdmin && u.role !== 'admin' && u.status === 'active' && (
                      <>
                        <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v)}>
                          <SelectTrigger className="w-24 h-8 text-xs bg-secondary/30 border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">成员</SelectItem>
                            <SelectItem value="editor">编辑</SelectItem>
                            <SelectItem value="admin">管理员</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(u.id)}
                          disabled={actingId === u.id}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {isAdmin && u.role !== 'admin' && u.status === 'rejected' && (
                      <Button size="sm" variant="ghost"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(u.id)}
                        disabled={actingId === u.id}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {users.length === 0 && (
          <Card className="glass-card border-border/50 anim-fade-in"><CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30 animate-float-soft" />
            <p className="text-muted-foreground/90">暂无用户数据</p>
          </CardContent></Card>
        )}
        </>
        )}

        {/* Sarcophagus Tab */}
        {/* Pages Tab */}
        {activeTab === 'pages' && (
          <div className="space-y-4 anim-fade-up" style={{ animationDelay: '0.2s' } as any}>
            {pageConfigsError && (
              <Card className="glass-card border-red-500/20 bg-red-500/5">
                <CardContent className="p-3">
                  <p className="text-xs text-red-400/90">{pageConfigsError}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground/90 flex items-center gap-2 font-heading tracking-wide">
                <Globe className="h-4 w-4 animate-breathe-glow" /> 页面访问控制
              </h3>
              <span className="text-[10px] text-muted-foreground/50 mono-text">修改即时生效</span>
            </div>

            {pageConfigsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              </div>
            ) : pageConfigs.length === 0 ? (
              <Card className="glass-card border-border/30 anim-fade-in">
                <CardContent className="p-12 text-center">
                  <Globe className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3 animate-float-soft" />
                  <p className="text-sm text-muted-foreground/90">暂无页面配置</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {pageConfigs.map((cfg, idx) => (
                  <Card key={cfg.id} className="glass-card glass-card-hover border-border/30 hover:border-primary/15 transition-all anim-fade-up" style={{ animationDelay: `${0.3 + idx * 0.05}s` } as any}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* 页面信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-heading font-semibold text-sm tracking-wide">{cfg.route_name}</span>
                            {cfg.access_level === 'admin' ? (
                              <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
                                <Shield className="h-3 w-3 mr-1" />管理
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="mono-text text-xs text-muted-foreground/60">{cfg.route_path}</code>
                            {cfg.description && (
                              <span className="text-xs text-muted-foreground/40 truncate hidden sm:inline">— {cfg.description}</span>
                            )}
                          </div>
                        </div>

                        {/* 控件区域 */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* 访问级别下拉 */}
                          <Select
                            value={cfg.access_level}
                            onValueChange={(v) => handlePageAccessChange(cfg.id, 'access_level', v)}
                            disabled={savingPageId === cfg.id}
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs bg-secondary/30 border-border/50">
                              {savingPageId === cfg.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">
                                <span className="flex items-center gap-1.5">
                                  <Globe className="h-3 w-3 text-green-400" />
                                  公开
                                </span>
                              </SelectItem>
                              <SelectItem value="member">
                                <span className="flex items-center gap-1.5">
                                  <Lock className="h-3 w-3 text-amber-400" />
                                  群友
                                </span>
                              </SelectItem>
                              <SelectItem value="admin">
                                <span className="flex items-center gap-1.5">
                                  <Shield className="h-3 w-3 text-red-400" />
                                  管理
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sarcophagus' && (
          <div className="space-y-4 anim-fade-up" style={{ animationDelay: '0.2s' } as any}>
            {codesError && (
              <Card className="glass-card border-red-500/20 bg-red-500/5">
                <CardContent className="p-3">
                  <p className="text-xs text-red-400/90">{codesError}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground/90 flex items-center gap-2 font-heading tracking-wide">
                <Key className="h-4 w-4 animate-breathe-glow" /> 访问代码 ({codes.length})
              </h3>
              <Button variant="outline" size="sm"
                onClick={() => setShowAdd(!showAdd)}
                className="text-xs border-border/40 text-muted-foreground hover:text-foreground">
                <Plus className="h-3.5 w-3.5 mr-1" />
                {showAdd ? '收起' : '新增代码'}
              </Button>
            </div>

            {showAdd && (
              <Card className="glass-card glass-card-hover border-primary/20 bg-primary/5 anim-scale-in">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-xs text-primary/60 mono-text tracking-wider font-heading">// 新增访问代码</h4>
                  <div>
                    <label className="text-[10px] text-muted-foreground/60 block mb-1">访问代码</label>
                    <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)}
                      placeholder="例: ARK-001"
                      className="w-full bg-background/80 border border-border/30 rounded-lg px-3 py-2 text-sm
                                 outline-none focus:border-primary/40 placeholder:text-muted-foreground/20 uppercase" />
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="file" ref={fileInputRef}
                      onChange={e => setNewFile(e.target.files?.[0] || null)} className="hidden" />
                    <Button variant="outline" size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs border-border/30 text-muted-foreground/60">
                      <Upload className="h-3 w-3 mr-1" />
                      {newFile ? newFile.name : '选择文件...'}
                    </Button>
                    <Button size="sm" onClick={handleAddCode}
                      disabled={saving || !newCode.trim() || !newFile}
                      className="text-xs bg-primary/10 border border-primary/30 text-primary/70
                                 hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed">
                      {saving ? 'SAVING...' : '添加'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {codesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              </div>
            ) : codes.length === 0 ? (
              <Card className="glass-card border-border/30 anim-fade-in">
                <CardContent className="p-12 text-center">
                  <Terminal className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3 animate-float-soft" />
                  <p className="text-sm text-muted-foreground/90">暂无访问代码</p>
                  <p className="text-xs text-muted-foreground/40 mt-1">点击「新增代码」创建第一个</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {codes.map((item, idx) => (
                  <Card key={item.id} className="glass-card glass-card-hover card-glow-border border-border/30 hover:border-primary/15 transition-all anim-fade-up" style={{ animationDelay: `${0.3 + idx * 0.05}s` } as any}>
                    <CardContent className="p-3">
                      {editingId === item.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-muted-foreground/60 block mb-1">访问代码</label>
                            <input type="text" value={editCode} onChange={e => setEditCode(e.target.value)}
                              className="w-full bg-background/80 border border-border/30 rounded-lg px-3 py-2 text-sm
                                         outline-none focus:border-primary/40 uppercase" />
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="file" ref={editFileInputRef}
                              onChange={e => setEditFile(e.target.files?.[0] || null)} className="hidden" />
                            <Button variant="outline" size="sm"
                              onClick={() => editFileInputRef.current?.click()}
                              className="text-[10px] border-border/30 text-muted-foreground/60">
                              <Upload className="h-3 w-3 mr-1" />
                              {editFile ? editFile.name : '保持现有文件'}
                            </Button>
                            <Button size="sm" onClick={() => handleSaveEdit(item.id)} disabled={saving}
                              className="text-[10px] bg-primary/10 border border-primary/30 text-primary/70">
                              {saving ? '...' : '保存'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}
                              className="text-[10px] text-muted-foreground/50 hover:text-foreground/60">
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Key className="h-3.5 w-3.5 text-primary/40 animate-breathe-glow" />
                              <span className="text-sm font-medium mono-text tracking-wider font-heading">{item.code}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                              <FileText className="h-3 w-3" />
                              <span className="truncate max-w-[180px]">{item.file_name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/40">
                              {item.created_at?.slice(0, 10)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button variant="ghost" size="sm"
                              onClick={() => handleEdit(item)}
                              className="text-[10px] text-muted-foreground/60 hover:text-primary/70 h-7">
                              编辑
                            </Button>
                            <Button variant="ghost" size="sm"
                              onClick={() => handleDeleteCode(item.id)}
                              className="text-[10px] text-muted-foreground/40 hover:text-red-400/60 h-7 px-2">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
