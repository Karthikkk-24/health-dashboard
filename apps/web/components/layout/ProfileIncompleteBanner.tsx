'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function ProfileIncompleteBanner({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-text">Complete your health profile</p>
        <p className="mt-1 text-sm text-muted">
          Age, sex, height, and weight help us interpret labs calmly (BMI, better ranges) without overreacting to small changes.
        </p>
      </div>
      <Link href="/settings">
        <Button className="whitespace-nowrap">Add details</Button>
      </Link>
    </div>
  );
}
