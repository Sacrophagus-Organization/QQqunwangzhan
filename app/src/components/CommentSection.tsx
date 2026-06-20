import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/RichTextEditor';
import { apiGet, apiPost, apiDelete } from '@/api/client';
import {
  MessageCircle,
  User,
  Clock,
  Trash2,
  CornerDownRight,
  EyeOff,
  Eye,
  Loader2,
} from 'lucide-react';
import type { Comment } from '@/types';

interface CommentSectionProps {
  entityType: string;
  entityId: string;
}

interface CommentNode {
  comment: Comment;
  children: CommentNode[];
  depth: number;
}

function buildTree(flat: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const c of flat) {
    map.set(c.id, { comment: c, children: [], depth: 0 });
  }
  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      node.depth = map.get(c.parentId)!.depth + 1;
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// depth colors for left border (Reddit-style)
const DEPTH_COLORS = [
  'border-primary/50',
  'border-accent/50',
  'border-amber-400/50',
  'border-green-400/50',
  'border-purple-400/50',
  'border-pink-400/50',
  'border-cyan-400/50',
  'border-orange-400/50',
];

function CommentItem({
  node,
  entityType,
  entityId,
  onDelete,
  onReply,
  replyingTo,
  onStartReply,
  onCancelReply,
}: {
  node: CommentNode;
  entityType: string;
  entityId: string;
  onDelete: (id: string) => void;
  onReply: () => void;
  replyingTo: string | null;
  onStartReply: (id: string) => void;
  onCancelReply: () => void;
}) {
  const { user } = useAuth();
  const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor';
  const c = node.comment;
  const maxDepth = Math.min(node.depth, 7);
  const borderColor = DEPTH_COLORS[maxDepth];

  return (
    <div>
      <div className={`pl-3 ${node.depth > 0 ? `border-l-2 ${borderColor} ml-1` : ''}`}>
        {/* Author Row */}
        <div className="flex items-center gap-2 mb-1">
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
            c.isAnonymous
              ? 'bg-muted/50 border border-border/30 text-muted-foreground'
              : 'bg-primary/10 border border-primary/20 text-primary'
          }`}>
            {c.isAnonymous ? <EyeOff className="h-3 w-3" /> : <User className="h-3 w-3" />}
          </div>
          <span className="text-xs font-medium">
            {c.isAnonymous ? '匿名用户' : c.author}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {formatRelativeTime(c.createdAt)}
          </span>
          {c.isAnonymous && (
            <span className="text-[10px] text-muted-foreground">· 匿名</span>
          )}
        </div>

        {/* Content */}
        <div
          className="text-xs leading-relaxed text-foreground/90 mb-2 rich-editor-content"
          dangerouslySetInnerHTML={{ __html: c.content }}
        />

        {/* Actions */}
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => replyingTo === c.id ? onCancelReply() : onStartReply(c.id)}
            className={`text-[11px] flex items-center gap-1 transition-colors ${
              replyingTo === c.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <CornerDownRight className="h-3 w-3" />
            {replyingTo === c.id ? '取消回复' : '回复'}
          </button>
          {isAdminOrEditor && (
            <button
              onClick={() => onDelete(c.id)}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              删除
            </button>
          )}
        </div>
      </div>

      {/* Children (replies) */}
      {node.children.length > 0 && (
        <div className="mt-1">
          {node.children.map(child => (
            <div key={child.comment.id} className={child.depth <= 7 ? 'ml-4' : ''}>
              <CommentItem
                node={child}
                entityType={entityType}
                entityId={entityId}
                onDelete={onDelete}
                onReply={onReply}
                replyingTo={replyingTo}
                onStartReply={onStartReply}
                onCancelReply={onCancelReply}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ entityType, entityId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewComment, setShowNewComment] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newAnonymous, setNewAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyAnonymous, setReplyAnonymous] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Comment[]>(`/comments?entityType=${entityType}&entityId=${entityId}`);
      setComments(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除这条评论及其所有回复？')) return;
    try {
      await apiDelete(`/comments/${id}`);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const handleSubmit = async () => {
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      await apiPost('/comments', {
        entityType,
        entityId,
        content: newContent,
        isAnonymous: newAnonymous,
      });
      setNewContent('');
      setNewAnonymous(false);
      setShowNewComment(false);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !replyingTo) return;
    setSubmitting(true);
    try {
      await apiPost('/comments', {
        entityType,
        entityId,
        parentId: replyingTo,
        content: replyContent,
        isAnonymous: replyAnonymous,
      });
      setReplyContent('');
      setReplyAnonymous(false);
      setReplyingTo(null);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const tree = buildTree(comments);
  const totalCount = comments.length;

  if (loading) {
    return <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 text-muted-foreground animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
          <span>{totalCount > 0 ? `${totalCount} 条评论` : '暂无评论'}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-primary"
          onClick={() => setShowNewComment(!showNewComment)}
        >
          <MessageCircle className="h-3.5 w-3.5 mr-1" />
          {showNewComment ? '收起' : '发表评论'}
        </Button>
      </div>

      {/* New Comment Input */}
      {showNewComment && (
        <div className="border border-border/40 rounded-lg p-4 bg-secondary/10 space-y-3">
          <RichTextEditor
            value={newContent}
            onChange={setNewContent}
            placeholder="写下你的评论..."
            minHeight="100px"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={newAnonymous} onCheckedChange={setNewAnonymous} id="cmt-anon" />
              <Label htmlFor="cmt-anon" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                {newAnonymous ? <><EyeOff className="h-3 w-3" />匿名</> : <><Eye className="h-3 w-3" />公开</>}
              </Label>
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !newContent.trim()} className="text-xs">
              {submitting ? '发布中...' : '发布评论'}
            </Button>
          </div>
        </div>
      )}

      {/* Reply Editor (inline) */}
      {replyingTo && (
        <div className="ml-4 border-l-2 border-primary/30 pl-4 space-y-3">
          <div className="border border-border/40 rounded-lg p-3 bg-secondary/10 space-y-2">
            <p className="text-xs text-muted-foreground">回复评论</p>
            <RichTextEditor
              value={replyContent}
              onChange={setReplyContent}
              placeholder="写下你的回复..."
              minHeight="80px"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={replyAnonymous} onCheckedChange={setReplyAnonymous} id="reply-anon" />
                <Label htmlFor="reply-anon" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                  {replyAnonymous ? <><EyeOff className="h-3 w-3" />匿名</> : <><Eye className="h-3 w-3" />公开</>}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setReplyingTo(null)}>取消</Button>
                <Button size="sm" onClick={handleReply} disabled={submitting || !replyContent.trim()} className="text-xs">
                  {submitting ? '回复中...' : '回复'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment List */}
      {tree.length === 0 && !showNewComment ? (
        <p className="text-xs text-muted-foreground text-center py-6">还没有评论，来发表第一条吧</p>
      ) : (
        <div className="space-y-3">
          {tree.map(node => (
            <div key={node.comment.id} className="border border-border/30 rounded-lg p-3 bg-background/50">
              <CommentItem
                node={node}
                entityType={entityType}
                entityId={entityId}
                onDelete={handleDelete}
                onReply={load}
                replyingTo={replyingTo}
                onStartReply={(id) => setReplyingTo(id === replyingTo ? null : id)}
                onCancelReply={() => setReplyingTo(null)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
