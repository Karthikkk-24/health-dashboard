'use client';

import { useChartTheme } from '@/lib/chart-theme';

type PayloadItem = {
  name?: string | number;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string | number;
};

/** Themed Recharts tooltip — no default white panels. */
export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  const theme = useChartTheme();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-lg"
      style={{
        background: theme.tooltipBg,
        borderColor: theme.border,
        color: theme.text,
      }}
    >
      {label != null && label !== '' ? (
        <p className="mb-1.5 font-medium" style={{ color: theme.text }}>
          {String(label)}
        </p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((item) => (
          <li
            key={String(item.dataKey ?? item.name)}
            className="flex items-center gap-2"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: item.color ?? theme.accent }}
            />
            <span style={{ color: theme.muted }}>
              {String(item.name ?? item.dataKey ?? 'value')}
            </span>
            <span
              className="font-mono font-medium"
              style={{ color: theme.text }}
            >
              {item.value ?? '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function barHoverCursor(fill: string) {
  return { fill, opacity: 0.12 };
}
