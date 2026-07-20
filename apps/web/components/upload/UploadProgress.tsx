export function UploadProgress({ percent }: { percent: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Uploading…</span>
        <span className="font-mono text-accent-glow">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
