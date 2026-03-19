import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ count = 12, className }: LoadingSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-video animate-pulse rounded-lg bg-muted"
        >
          <div className="flex h-full flex-col justify-end p-3">
            <div className="h-3 w-24 rounded bg-muted-foreground/10 mb-1" />
            <div className="h-2 w-32 rounded bg-muted-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
