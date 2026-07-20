import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectHTMLAttributes } from 'react';

export function SelectField({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn('field appearance-none pr-10', className)}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        strokeWidth={1.5}
        aria-hidden
      />
    </div>
  );
}
