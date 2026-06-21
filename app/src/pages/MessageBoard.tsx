import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RichTextEditor, htmlToSummary } from '@/components/RichTextEditor';
import CommentSection from '@/components/CommentSection';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { apiGet, apiPost, apiPut, apiDelete } from '@/api/client';
import {
  MessagesSquare,
  Plus,
  Clock,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Edit3,
  Pin,
  Save,
  MessageCircle,
} from 'lucide-react';
import type { Message } from '@/types';

export default function MessageBoard() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const load = useCallback(async () => {
    try {
      setMessages(await apiGet<Message[]>('/messages'));
    } catch (e: any) {
      console.error('加载留言失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const canEdit = (msg: Message) =>
    user && (user.id === msg.authorId || user.role === 'admin');

  const handleCreate = async () => {
    if (!content.trim()) {
      alert('请输入留言内容');
      return;
    }
    setSubmitting(true);
    try {
      const created = await apiPost<Message>('/messages', { content, isAnonymous });
      setMessages(prev => [created, ...prev]);
      setContent('');
      setIsAnonymous(false);
      setShowCreate(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (msg: Message) => {
    setEditId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async () => {
    if (!editId || !editContent.trim()) return;
    setSubmitting(true);
    try {
      const updated = await apiPut<Message>(`/messages/${editId}`, { content: editContent });
      setMessages(prev => prev.map(m => (m.id === editId ? { ...m, ...updated } : m)));
      setEditId(null);
      setEditContent('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePin = async (msg: Message) => {
    try {
      const res = await apiPost<{ success: boolean; pinned: boolean }>(`/messages/${msg.id}/pin`);
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, pinned: res.pinned ? 1 : 0 } : m
      ));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除这条留言？此操作不可撤销。')) return;
    try {
      await apiDelete(`/messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-2xl blur-xl" />
          <div className="relative glass-card rounded-2xl p-6 border-glow">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <MessagesSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-glow-cyan">留言板</h1>
                  <p className="text-xs text-muted-foreground">
                    共 {messages.length} 条留言 · 畅所欲言，分享你的想法
                  </p>
                </div>
              </div>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-primary hover:bg-primary/80 text-primary-foreground">
                    <Plus className="h-4 w-4" />
                    发表留言
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      发表留言
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <RichTextEditor value={content} onChange={setContent} placeholder="写下你想说的话..." minHeight="180px" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} id="anonymous-switch" />
                        <Label htmlFor="anonymous-switch" className="flex items-center gap-1.5 text-sm cursor-pointer">
                          {isAnonymous ? (
                            <><EyeOff className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">匿名留言</span></>
                          ) : (
                            <><Eye className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">公开留言</span></>
                          )}
                        </Label>
                      </div>
                      <Button onClick={handleCreate} disabled={submitting || !content.trim()}>
                        {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />发布中...</> : '发布留言'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editId} onOpenChange={(open) => { if (!open) { setEditId(null); setEditContent(''); } }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                编辑留言
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <RichTextEditor value={editContent} onChange={setEditContent} placeholder="编辑留言..." minHeight="180px" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setEditId(null); setEditContent(''); }}>
                  取消
                </Button>
                <Button onClick={handleSaveEdit} disabled={submitting || !editContent.trim()}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />保存中...</> : <><Save className="h-4 w-4 mr-2" />保存修改</>}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Message List */}
        {messages.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 border-border/50 text-center">
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <MessagesSquare className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-medium mb-2">还没有留言</h3>
            <p className="text-sm text-muted-foreground mb-4">成为第一个留言的人吧！</p>
            <Button onClick={() => setShowCreate(true)} className="gap-2 bg-primary hover:bg-primary/80 text-primary-foreground">
              <Plus className="h-4 w-4" />发表留言
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isExpanded = expandedId === msg.id;
              const previewText = htmlToSummary(msg.content, 200);

              return (
                <Card
                  key={msg.id}
                  className={`glass-card border-border/50 hover:border-primary/20 transition-all duration-200 ${
                    msg.pinned ? 'border-amber-500/30 ring-1 ring-amber-500/10' : ''
                  } ${isExpanded ? 'border-primary/30' : ''}`}
                >
                  <CardContent className="p-5">
                    {/* Author Row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AvatarDisplay
                          avatarUrl={msg.authorAvatar}
                          username={msg.author}
                          size="md"
                          isAnonymous={!!msg.isAnonymous}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">
                              {msg.isAnonymous ? '匿名用户' : msg.author}
                            </span>
                            {msg.pinned ? (
                              <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20 py-0 h-4">
                                <Pin className="h-2.5 w-2.5 mr-0.5" />置顶
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(msg.createdAt)}</span>
                            {msg.updatedAt && msg.updatedAt !== msg.createdAt && (
                              <span className="text-muted-foreground/60">· 已编辑</span>
                            )}
                            {msg.isAnonymous && (
                              <><span className="mx-1">·</span><EyeOff className="h-3 w-3" /><span>匿名</span></>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {msg.isAnonymous && (
                          <Badge variant="outline" className="text-xs border-border/30 text-muted-foreground">
                            <EyeOff className="h-3 w-3 mr-1" />匿名
                          </Badge>
                        )}
                        {/* Pin toggle (admin only) */}
                        {user?.role === 'admin' && (
                          <Button
                            variant="ghost" size="sm"
                            className={`h-8 w-8 p-0 ${msg.pinned ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-amber-400'}`}
                            onClick={() => handlePin(msg)}
                            title={msg.pinned ? '取消置顶' : '置顶'}
                          >
                            <Pin className="h-4 w-4" fill={msg.pinned ? 'currentColor' : 'none'} />
                          </Button>
                        )}
                        {/* Edit (author or admin) */}
                        {canEdit(msg) && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                            onClick={() => handleEdit(msg)}
                            title="编辑"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Delete (admin only) */}
                        {user?.role === 'admin' && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(msg.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div
                      className={`rich-editor-content text-sm leading-relaxed ${!isExpanded ? 'line-clamp-4' : ''}`}
                      dangerouslySetInnerHTML={{ __html: msg.content }}
                    />

                    {/* Expand/Collapse */}
                    {previewText.length >= 200 && (
                      <Button
                        variant="ghost" size="sm"
                        className="mt-2 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                      >
                        {isExpanded ? '收起' : '展开全文'}
                      </Button>
                    )}

                    {/* Comments Section */}
                    <div className="mt-4 pt-4 border-t border-border/20">
                      <CommentSection entityType="message" entityId={msg.id} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
