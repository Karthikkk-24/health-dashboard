'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAlerts, useMarkAllAlertsRead } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export default function AlertsPage() {
  const alertsQuery = useAlerts();
  const markAll = useMarkAllAlertsRead();
  const alerts = alertsQuery.data?.alerts ?? [];
  const unread = alertsQuery.data?.unread_count ?? 0;

  if (alertsQuery.isPending && !alertsQuery.data) {
    return <Skeleton className="h-64" />;
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No lab alerts"
        description="When a new report shows meaningful changes versus your previous labs, they will show up here."
        action={
          <Link href="/dashboard">
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Lab trend alerts</h1>
          <p className="text-sm text-muted">
            {unread > 0 ? `${unread} unread` : 'All caught up'}
          </p>
        </div>
        {unread > 0 ? (
          <Button
            variant="secondary"
            onClick={() => void markAll.mutateAsync()}
            disabled={markAll.isPending}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      {alerts.map((alert) => (
        <Card key={alert.id} className={alert.read_at ? 'opacity-70' : ''}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{alert.metric_name}</p>
              <p className="mt-1 text-sm text-muted">{alert.message}</p>
              <p className="mt-2 text-xs text-muted">
                {formatDate(alert.created_at)} · {alert.severity}
              </p>
            </div>
            <Link
              href={`/reports/${alert.report_id}`}
              className="text-sm text-accent-glow hover:text-accent"
            >
              Open report
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
