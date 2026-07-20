import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-muted';
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-accent-glow';
  if (score >= 40) return 'text-warning';
  return 'text-danger';
}
