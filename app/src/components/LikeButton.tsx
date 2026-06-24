import { useState, useEffect } from 'react';
import { apiPost } from '@/api/client';
import { Heart } from 'lucide-react';

interface LikeButtonProps {
  entityType: string;
  entityId: string;
  likeCount?: number;
  initialLiked?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function LikeButton({ entityType, entityId, likeCount = 0, initialLiked = false, size = 'sm', className = '' }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(likeCount);
  const [pending, setPending] = useState(false);

  // 同步外部 props 变化（列表刷新时）
  useEffect(() => {
    setCount(likeCount);
  }, [likeCount]);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked, entityId]);

  const handleToggle = async () => {
    if (pending) return;
    setPending(true);
    setLiked(!liked);
    setCount(c => c + (!liked ? 1 : -1));

    try {
      const res = await apiPost<{ liked: boolean; likeCount: number }>('/likes', { entityType, entityId });
      setLiked(res.liked);
      setCount(res.likeCount);
    } catch {
      // 回滚
      setLiked(liked);
      setCount(count);
    } finally {
      setPending(false);
    }
  };

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center gap-1 transition-colors ${textSize} ${className} ${
        liked ? 'text-red-400 hover:text-red-300' : 'text-muted-foreground hover:text-red-400'
      }`}
    >
      <Heart className={`${iconSize} transition-transform duration-200 ${liked ? 'fill-current scale-110' : 'scale-100'}`} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

/** 批量检查点赞状态 */
export async function checkLikes(entityType: string, entityIds: string[]): Promise<Set<string>> {
  if (entityIds.length === 0) return new Set();
  try {
    const res = await fetch(`/api/likes/check?entityType=${entityType}&entityIds=${entityIds.join(',')}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('arkoverseer_token')}` },
    });
    if (!res.ok) return new Set();
    const data: { entityId: string; liked: boolean }[] = await res.json();
    return new Set(data.filter(d => d.liked).map(d => d.entityId));
  } catch {
    return new Set();
  }
}
