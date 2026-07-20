'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useClerk, useUser } from '@clerk/nextjs';
import { ChevronDown, LogOut, Settings } from 'lucide-react';

export function ProfileDropdown() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface2 px-2 py-1.5 text-text transition-colors hover:border-accent/40"
      >
        {user?.imageUrl ? (
          <Image src={user.imageUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-surface" />
        )}
        <span className="hidden text-sm sm:inline">
          {user?.firstName ?? 'Account'}
        </span>
        <ChevronDown className="h-4 w-4 text-muted" strokeWidth={1.5} />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-3 text-sm text-text transition-colors hover:bg-surface2"
          >
            <Settings className="h-4 w-4" strokeWidth={1.5} />
            Settings
          </Link>
          <div className="border-t border-border" />
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: '/' })}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-danger transition-colors hover:bg-surface2"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
