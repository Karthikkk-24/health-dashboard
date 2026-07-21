'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useAlerts, useMarkAllAlertsRead } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export function AlertsBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const alertsQuery = useAlerts();
  const markAll = useMarkAllAlertsRead();
  const markedOnOpen = useRef(false);

  const unread = alertsQuery.data?.unread_count ?? 0;
  const alerts = alertsQuery.data?.alerts ?? [];

  useEffect(() => {
    if (!open) {
      markedOnOpen.current = false;
      return;
    }
    const onDoc = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || markedOnOpen.current || unread === 0) return;
    markedOnOpen.current = true;
    void markAll.mutateAsync();
  }, [open, unread, markAll]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-muted transition-colors hover:bg-surface2 hover:text-text"
        aria-label="Lab alerts"
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-background p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Lab changes</p>
            <Link
              href="/alerts"
              className="text-xs text-muted hover:text-text"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted">No lab change alerts yet.</p>
            ) : (
              alerts.slice(0, 8).map((alert) => (
                <Link
                  key={alert.id}
                  href={`/reports/${alert.report_id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg border border-border p-2 text-left text-xs transition-colors hover:bg-surface2"
                >
                  <p className="font-medium text-text">{alert.metric_name}</p>
                  <p className="mt-1 text-muted">{alert.message}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {formatDate(alert.created_at)} · {alert.severity}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
