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
        className="field"
      />
      <span className="block text-xs text-muted">
        Use the date the medical test was conducted, not today&apos;s upload date.
      </span>
    </label>
  );
}
