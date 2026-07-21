'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AlertsBell } from '@/components/layout/AlertsBell';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/upload': 'Upload Report',
  '/reports': 'Reports',
  '/stats': 'Health Stats',
  '/settings': 'Settings',
  '/alerts': 'Lab alerts',
};

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const title =
    pathname.startsWith('/reports/') && pathname !== '/reports'
      ? 'Report analysis'
      : (Object.entries(TITLES).find(([path]) =>
          pathname.startsWith(path),
        )?.[1] ?? 'Health Dashboard');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface2 hover:text-text lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-text">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <AlertsBell />
        <ThemeToggle />
        <ProfileDropdown />
      </div>
    </header>
  );
}
