import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-surface2/80 border border-border/50',
        className,
      )}
    />
  );
}
