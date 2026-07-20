'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  FileText,
  Home,
  Settings,
  Upload,
  X,
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface2 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Health Dashboard
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-muted hover:bg-surface lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-r-2 border-accent bg-accent/10 text-accent'
                    : 'text-muted hover:bg-surface hover:text-text',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-full border border-border"
              />
            ) : (
              <div className="h-10 w-10 rounded-full border border-border bg-surface" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user?.fullName ?? 'User'}
              </p>
              <p className="truncate text-xs text-muted">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
