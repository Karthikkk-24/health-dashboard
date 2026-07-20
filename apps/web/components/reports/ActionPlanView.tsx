'use client';

import type { ActionPlanItem } from '@/types/health';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const PRIORITY_META = {
  immediate_consult: {
    title: 'Talk to a doctor soon',
    className: 'bg-danger/15 text-danger',
  },
  discuss_soon: {
    title: 'Worth discussing at your next visit',
    className: 'bg-warning/15 text-warning',
  },
  self_care: {
    title: 'Practical steps you can start',
    className: 'bg-success/15 text-success',
  },
} as const;

export function ActionPlanView({ items }: { items: ActionPlanItem[] }) {
  if (!items?.length) {
    return null;
  }

  const groups = (
    ['immediate_consult', 'discuss_soon', 'self_care'] as const
  ).map((priority) => ({
    priority,
    ...PRIORITY_META[priority],
    items: items.filter((item) => item.priority === priority),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Improvement plan</h3>
        <p className="mt-1 text-sm text-muted">
          {items.length} calm, practical steps. Each one notes what it helps and roughly how long to give it.
        </p>
      </div>

      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <Card key={group.priority} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={group.className}>{group.title}</Badge>
              <span className="text-xs text-muted">{group.items.length}</span>
            </div>
            <ol className="space-y-4">
              {group.items.map((item, index) => (
                <li key={`${item.title}-${index}`} className="border-t border-border/60 pt-3 first:border-0 first:pt-0">
                  <p className="font-medium text-text">
                    {index + 1}. {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {item.detail}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-lg bg-surface2 px-2 py-1">
                      Helps: {item.addresses.join(', ') || 'overall health'}
                    </span>
                    <span className="rounded-lg bg-surface2 px-2 py-1">
                      Time: {item.timeframe}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        ),
      )}
    </div>
  );
}
