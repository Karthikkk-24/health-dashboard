import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent hover:bg-accent-glow text-white font-semibold shadow-[0_0_20px_rgba(59,130,246,0.2)]',
  secondary:
    'bg-surface2 border border-border text-text hover:border-accent/50',
  danger: 'bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-surface2',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
