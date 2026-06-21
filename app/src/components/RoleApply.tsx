import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiPost } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Star, Loader2 } from 'lucide-react';

export function RoleApply() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<'editor' | 'admin'>('editor');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!user || user.role === 'admin') return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; message: string }>('/auth/apply-role', { role, reason: reason.trim() });
      setResult(res);
    } catch (e: any) {
      setResult({ success: false, message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); setResult(null); setReason(''); }}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 rounded transition-colors"
      >
        <Shield className="h-4 w-4" />
        <span>申请权限</span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>申请更高权限</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="py-4 text-center space-y-3">
              <div className={`h-12 w-12 mx-auto rounded-full flex items-center justify-center ${
                result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
              }`}>
                {result.success
                  ? <Star className="h-6 w-6 text-green-400" />
                  : <Shield className="h-6 w-6 text-red-400" />}
              </div>
              <p className={`text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>{result.message}</p>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>关闭</Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* 角色选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">申请角色</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRole('editor')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      role === 'editor'
                        ? 'border-blue-400/50 bg-blue-500/10'
                        : 'border-border/40 hover:border-blue-400/30'
                    }`}
                  >
                    <Star className={`h-5 w-5 mb-1 ${role === 'editor' ? 'text-blue-400' : 'text-muted-foreground'}`} />
                    <p className="text-sm font-medium">编辑</p>
                    <p className="text-[10px] text-muted-foreground">可编辑/置顶内容</p>
                  </button>
                  <button
                    onClick={() => setRole('admin')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      role === 'admin'
                        ? 'border-amber-400/50 bg-amber-500/10'
                        : 'border-border/40 hover:border-amber-400/30'
                    }`}
                  >
                    <Shield className={`h-5 w-5 mb-1 ${role === 'admin' ? 'text-amber-400' : 'text-muted-foreground'}`} />
                    <p className="text-sm font-medium">管理员</p>
                    <p className="text-[10px] text-muted-foreground">完全管理权限</p>
                  </button>
                </div>
              </div>

              {/* 申请理由 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">申请理由</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="请说明申请权限的原因..."
                  rows={3}
                  className="w-full rounded-lg border border-border/40 bg-background/50 p-3 text-sm placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-primary/50"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !reason.trim()}
                className="w-full"
              >
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />提交中</> : '提交申请'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
