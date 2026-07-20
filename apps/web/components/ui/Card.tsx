import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'card-glow rounded-2xl border border-border bg-surface p-6',
        className,
      )}
      {...props}
    />
  );
}
