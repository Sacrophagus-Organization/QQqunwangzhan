import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPost, apiDelete } from '@/api/client';
import {
  Shield, Users, UserCheck, UserX, Trash2,
  Clock, CheckCircle2, XCircle, Loader2, AlertTriangle,
  FileText, MessageSquare, Star,
} from 'lucide-react';

interface UserItem {
  id: string;
  username: string;
  qq_number: string;
  role: string;
  status: string;
  register_reason: string;
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

  if (!authLoading && (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'editor'))) {
    return (
      <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center">
        <Card className="glass-card border-border/50 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">访问被拒绝</h2>
            <p className="text-muted-foreground">你无权访问此页面</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  const pendingCount = users.filter(u => u.status === 'pending').length;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/10 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />已通过</Badge>;
      case 'pending': return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />待审核</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />已拒绝</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-glow-cyan flex items-center gap-2">
              <Shield className="h-6 w-6 text-red-400" /> 管理员控制台
            </h1>
            <p className="text-sm text-muted-foreground mt-1 mono-text">
              &gt; 用户管理 | 待审核: <span className="text-amber-400 font-bold">{pendingCount}</span>
            </p>
          </div>
        </div>

        {pendingCount > 0 && (
          <Card className="glass-card border-amber-500/30 bg-amber-500/5 mb-6">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">{pendingCount} 个新注册用户等待审核</p>
                <p className="text-xs text-amber-400/70">请在下方审核列表中通过或拒绝</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {users.map(u => (
            <Card key={u.id} className={`glass-card border-border/50 hover:border-primary/20 transition-all ${u.status === 'pending' ? 'border-amber-500/30' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      u.role === 'admin' ? 'bg-red-500/10 border border-red-500/30' :
                      u.role === 'editor' ? 'bg-blue-500/10 border border-blue-500/30' :
                      'bg-primary/10 border border-primary/20'
                    }`}>
                      {u.role === 'admin' ? <Shield className="h-5 w-5 text-red-400" /> :
                       u.role === 'editor' ? <Star className="h-5 w-5 text-blue-400" /> :
                       <Users className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.username}</span>
                        <Badge variant="outline" className={`text-xs ${roleLabels[u.role]?.color || ''}`}>{roleLabels[u.role]?.label || u.role}</Badge>
                        {statusBadge(u.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>QQ: {u.qq_number || '-'}</span>
                        <span>注册于 {u.created_at?.split('T')[0]}</span>
                        <span className="mono-text">ID: {u.id}</span>
                      </div>
                      {u.register_reason && (
                        <div className="flex items-start gap-1.5 mt-2 text-xs bg-secondary/30 rounded-md p-2">
                          <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{u.register_reason}</span>
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
          <Card className="glass-card border-border/50"><CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">暂无用户数据</p>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
