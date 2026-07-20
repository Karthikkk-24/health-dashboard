'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { api } from '@/lib/api';

export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    void api.getMe(() => getToken()).catch(() => undefined);
  }, [getToken, isSignedIn]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setOpen(true)} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
