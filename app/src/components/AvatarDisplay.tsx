import { User } from 'lucide-react';

interface AvatarDisplayProps {
  avatarUrl?: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isAnonymous?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function AvatarDisplay({
  avatarUrl,
  username,
  size = 'md',
  className = '',
  isAnonymous,
}: AvatarDisplayProps) {
  const sz = sizeClasses[size];

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${sz} ${className} ${
        avatarUrl
          ? 'border border-border/30'
          : 'bg-primary/10 border border-primary/20 text-primary'
      }`}
    >
      {isAnonymous ? (
        <User className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
      ) : avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username || 'avatar'}
          className="h-full w-full object-cover"
          onError={(e) => {
            // 图片加载失败时回退文字
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.classList.add('bg-primary/10', 'border', 'border-primary/20', 'text-primary');
            const fallback = document.createElement('span');
            fallback.className = 'font-medium';
            fallback.textContent = getInitials(username);
            (e.target as HTMLImageElement).parentElement!.appendChild(fallback);
          }}
        />
      ) : (
        <span className="font-medium">{getInitials(username)}</span>
      )}
    </div>
  );
}
