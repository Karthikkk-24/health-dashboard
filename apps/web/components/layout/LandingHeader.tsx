'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function LandingHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-2 font-semibold">
        <Activity className="h-5 w-5 text-accent" strokeWidth={1.5} />
        Health Dashboard
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link href="/sign-in" className="text-sm text-muted hover:text-text">
          Sign in
        </Link>
        <Link href="/sign-up">
          <Button className="px-4 py-2 text-sm">Get started</Button>
        </Link>
      </div>
    </header>
  );
}
