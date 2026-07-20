'use client';

export function ReportDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-text">Report date</span>
      <input
        type="date"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-surface2 px-4 py-3 text-text outline-none focus:border-transparent focus:ring-2 focus:ring-accent"
      />
      <span className="block text-xs text-muted">
        Use the date the medical test was conducted, not today&apos;s upload date.
      </span>
    </label>
  );
}
