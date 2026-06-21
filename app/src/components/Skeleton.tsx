import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />;
}

export function RecordCardSkeleton() {
  return (
    <div className="glass-card border-border/50 p-5 space-y-3">
      <div className="flex items-start gap-4">
        <Skeleton className="h-5 w-5 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PuzzleCardSkeleton() {
  return (
    <div className="glass-card border-border/50 p-5 space-y-3">
      <Skeleton className="h-1 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass-card border-border/50 p-4 space-y-2">
      <Skeleton className="h-5 w-5" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}
