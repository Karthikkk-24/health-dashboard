'use client';

import { DragEvent, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_BYTES = 20 * 1024 * 1024;

export function UploadZone({
  file,
  onFile,
  error,
}: {
  file: File | null;
  onFile: (file: File | null, error?: string) => void;
  error?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const validate = (next: File) => {
    if (next.type !== 'application/pdf' && !next.name.toLowerCase().endsWith('.pdf')) {
      onFile(null, 'Only PDF files are accepted.');
      return;
    }
    if (next.size > MAX_BYTES) {
      onFile(null, 'File exceeds the 20MB limit.');
      return;
    }
    onFile(next);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const next = event.dataTransfer.files?.[0];
    if (next) validate(next);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'cursor-pointer rounded-2xl border-2 border-dashed border-border bg-surface2/40 px-6 py-14 text-center transition-colors',
        dragging && 'border-accent bg-accent/5',
        error && 'border-danger/50',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          const next = event.target.files?.[0];
          if (next) validate(next);
        }}
      />
      <FileUp className="mx-auto h-10 w-10 text-accent" strokeWidth={1.5} />
      <p className="mt-4 text-base font-medium">
        Drag and drop a PDF report here
      </p>
      <p className="mt-2 text-sm text-muted">
        or click to browse · PDF only · max 20MB
      </p>
      {file ? (
        <p className="mt-4 text-sm text-accent-glow">
          {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
