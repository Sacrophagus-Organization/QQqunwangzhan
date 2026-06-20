import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { apiGet, apiDelete } from '@/api/client';
import { Loader2, Plus, Trash2, Upload, ArrowLeft, Terminal, Key, FileText, Clock, Shield } from 'lucide-react';
import type { SarcophagusCode } from '@/types';

export default function SarcophagusAdmin() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<SarcophagusCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<SarcophagusCode[]>('/sarcophagus/codes');
      setCodes(data);
    } catch (e: any) {
      setError(e.message || '无法加载访问代码列表');
    }
    setLoading(false);
  };

  // ═══ 保护态：loading ──────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-primary/30 animate-spin" />
          <p className="mono-text text-[10px] text-muted-foreground/20 tracking-wider">
            ESTABLISHING_ROOT_CHANNEL...
          </p>
        </div>
      </div>
    );
  }

  // ═══ 保护态：非管理员 ────────────────────────
  if (user?.role !== 'admin') {
    return <Navigate to="/sarcophagus" replace />;
  }

  // ═══ 保护态：加载失败 ────────────────────────
  if (error && codes.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Shield className="h-10 w-10 text-red-400/30" />
        <h2 className="mono-text text-sm text-red-400/60 tracking-wider">ROOT_ACCESS_FAILED</h2>
        <p className="mono-text text-xs text-red-400/40 max-w-md text-center">{error}</p>
        <button
          onClick={loadCodes}
          className="mono-text text-xs px-4 py-2 rounded-lg border border-primary/20 text-primary/50
                     hover:text-primary/80 hover:border-primary/40 transition-all duration-300"
        >
          RETRY
        </button>
        <Link
          to="/sarcophagus"
          className="mono-text text-[10px] text-muted-foreground/20 hover:text-primary/40 transition-colors mt-2"
        >
          &lt; BACK_TO_TERMINAL
        </Link>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!newCode.trim() || !newFile) return;
    setSaving(true);
    setError('');
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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '创建失败');
      }
      setShowAdd(false);
      setNewCode('');
      setNewFile(null);
      await loadCodes();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该访问代码及关联文件？')) return;
    try {
      await apiDelete(`/sarcophagus/codes/${id}`);
      await loadCodes();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleEdit = (item: SarcophagusCode) => {
    setEditingId(item.id);
    setEditCode(item.code);
    setEditFile(null);
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('code', editCode.trim().toUpperCase());
      if (editFile) {
        formData.append('file', editFile);
      }
      const token = localStorage.getItem('arkoverseer_token');
      const res = await fetch(`/api/sarcophagus/codes/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '更新失败');
      }
      setEditingId(null);
      setEditCode('');
      setEditFile(null);
      await loadCodes();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Scanline */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-[0.02]">
        <div className="absolute inset-0 bg-repeat-y animate-scan-line"
          style={{ background: 'linear-gradient(to bottom, rgba(0,210,245,0.1) 1px, transparent 1px)', backgroundSize: '100% 4px' }} />
      </div>

      <div className="relative z-20 container mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/sarcophagus"
              className="text-muted-foreground/25 hover:text-primary/40 transition-colors duration-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="h-10 w-10 rounded-lg border border-amber-500/20 flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.06)' }}>
              <Shield className="h-5 w-5 text-amber-500/60" />
            </div>
            <div>
              <h1 className="mono-text text-sm tracking-[0.25em] text-amber-400/60">
                ROOT_ACCESS // SARCO_ID-07_ADMIN
              </h1>
              <p className="mono-text text-[10px] text-muted-foreground/25 mt-0.5">
                R.I. PROTOCOL ADMINISTRATION
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-2 mono-text text-xs px-4 py-2 rounded-lg border border-amber-500/20 text-amber-400/50
                       hover:bg-amber-500/5 hover:border-amber-500/30 hover:text-amber-400/80 transition-all duration-300"
          >
            <Plus className="h-3 w-3" />
            新增代码
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
            <p className="text-xs text-red-400/70 mono-text">{error}</p>
          </div>
        )}

        {/* Add Form */}
        {showAdd && (
          <div className="mb-6 p-5 rounded-xl border border-amber-500/15"
            style={{ background: 'rgba(10,15,25,0.8)', boxShadow: '0 0 30px rgba(245,158,11,0.03)' }}>
            <h3 className="mono-text text-xs text-amber-400/50 mb-4 tracking-wider">// NEW_ACCESS_CODE</h3>
            <div className="space-y-3">
              <div>
                <label className="mono-text text-[10px] text-muted-foreground/40 block mb-1">访问代码</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  placeholder="例: ARK-001"
                  className="w-full bg-black/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-primary/80
                             mono-text outline-none focus:border-amber-500/40 placeholder:text-muted-foreground/20 uppercase"
                />
              </div>
              <div>
                <label className="mono-text text-[10px] text-muted-foreground/40 block mb-1">关联文件</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => setNewFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 mono-text text-xs px-4 py-2 rounded-lg border border-border/30
                             text-muted-foreground/40 hover:text-amber-400/60 hover:border-amber-500/20 transition-all duration-300"
                >
                  <Upload className="h-3 w-3" />
                  {newFile ? newFile.name : '选择文件...'}
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={saving || !newCode.trim() || !newFile}
                className="mono-text text-xs px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400/80
                           hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
              >
                {saving ? 'SAVING...' : 'COMMIT'}
              </button>
            </div>
          </div>
        )}

        {/* Code List */}
        {codes.length === 0 ? (
          <div className="text-center py-20">
            <Terminal className="h-8 w-8 text-muted-foreground/15 mx-auto mb-3" />
            <p className="mono-text text-xs text-muted-foreground/20">NO_ACTIVE_CODES</p>
          </div>
        ) : (
          <div className="space-y-2">
            {codes.map(item => (
              <div
                key={item.id}
                className="rounded-lg border border-border/20 p-4 transition-all duration-300 hover:border-primary/15"
                style={{ background: 'rgba(10,15,25,0.6)' }}
              >
                {editingId === item.id ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <div>
                      <label className="mono-text text-[10px] text-muted-foreground/40 block mb-1">访问代码</label>
                      <input
                        type="text"
                        value={editCode}
                        onChange={e => setEditCode(e.target.value)}
                        className="w-full bg-black/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-primary/80
                                   mono-text outline-none focus:border-amber-500/40 uppercase"
                      />
                    </div>
                    <div>
                      <label className="mono-text text-[10px] text-muted-foreground/40 block mb-1">替换文件 (可选)</label>
                      <input
                        type="file"
                        ref={editFileInputRef}
                        onChange={e => setEditFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <button
                        onClick={() => editFileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 mono-text text-[10px] px-3 py-1.5 rounded-lg border border-border/30
                                   text-muted-foreground/40 hover:text-amber-400/60 hover:border-amber-500/20 transition-all"
                      >
                        <Upload className="h-3 w-3" />
                        {editFile ? editFile.name : '保持现有文件'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        disabled={saving}
                        className="mono-text text-[10px] px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400/80
                                   hover:bg-amber-500/20 disabled:opacity-30 transition-all"
                      >
                        {saving ? '...' : 'SAVE'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="mono-text text-[10px] px-4 py-2 rounded-lg border border-border/30 text-muted-foreground/40
                                   hover:text-foreground/60 hover:border-border/50 transition-all"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-primary/30" />
                        <span className="mono-text text-sm text-primary/70 tracking-wider">{item.code}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-muted-foreground/20" />
                        <span className="mono-text text-xs text-muted-foreground/30 truncate max-w-[200px]">
                          {item.file_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mono-text text-[10px] text-muted-foreground/15">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{item.created_at?.slice(0, 10)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="mono-text text-[10px] px-3 py-1.5 rounded-lg border border-border/20 text-muted-foreground/25
                                   hover:text-primary/50 hover:border-primary/20 transition-all"
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg border border-transparent text-muted-foreground/15
                                   hover:text-red-400/50 hover:border-red-500/10 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="mono-text text-[9px] text-muted-foreground/10 tracking-[0.3em]">
            // ROOT_DASHBOARD_v1.7.3 // SARCOPHAGUS_INTERNAL //
          </p>
        </div>
      </div>
    </div>
  );
}
