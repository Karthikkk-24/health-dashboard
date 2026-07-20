'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { api, ApiError } from '@/lib/api';
import type { HealthReport, ProcessingStatus } from '@/types/health';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { UploadZone } from '@/components/upload/UploadZone';
import { UploadProgress } from '@/components/upload/UploadProgress';
import { ReportDatePicker } from '@/components/upload/ReportDatePicker';
import { ProfileIncompleteBanner } from '@/components/layout/ProfileIncompleteBanner';
import { formatDate } from '@/lib/utils';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_COPY: Record<ProcessingStatus, string> = {
  pending: 'Queued for analysis…',
  processing: 'Reading your report…',
  completed: 'Analysis ready!',
  failed: 'Processing failed',
};

export default function UploadPage() {
  const { getToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState(todayIso());
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<ProcessingStatus | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [profileComplete, setProfileComplete] = useState(true);

  const loadReports = useCallback(async () => {
    const result = await api.getReports(() => getToken());
    setReports(result.items);
  }, [getToken]);

  useEffect(() => {
    void loadReports().catch(() => undefined);
    void api
      .getMe(() => getToken())
      .then((me) => setProfileComplete(me.profile_complete !== false))
      .catch(() => undefined);
  }, [getToken, loadReports]);

  useEffect(() => {
    if (!activeId || !activeStatus) return;
    if (activeStatus === 'completed' || activeStatus === 'failed') return;

    const timer = window.setInterval(() => {
      void api
        .getReportStatus(() => getToken(), activeId)
        .then((status) => {
          setActiveStatus(status.processing_status as ProcessingStatus);
          if (status.processing_status === 'completed') {
            setMessage('Analysis ready. Open Reports to view details.');
            void loadReports();
          } else if (status.processing_status === 'failed') {
            setMessage(
              status.error_message
                ? `Processing failed: ${status.error_message}`
                : 'Processing failed. Use Retry.',
            );
            void loadReports();
          }
        })
        .catch(() => undefined);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [activeId, activeStatus, getToken, loadReports]);

  const onUpload = async () => {
    if (!file) {
      setFileError('Select a PDF before uploading.');
      return;
    }
    if (!reportDate) {
      setMessage('Report date is required.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage(null);

    try {
      const result = await api.uploadReport(
        () => getToken(),
        file,
        reportDate,
        setProgress,
      );
      setActiveId(result.report.id);
      setActiveStatus(result.report.processing_status);
      setFile(null);
      await loadReports();
      setMessage(
        result.report.processing_status === 'failed'
          ? 'Upload saved, but analysis failed. Use Retry.'
          : 'Upload complete. Analysis is running…',
      );
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this report and its analysis?')) return;
    await api.deleteReport(() => getToken(), id);
    await loadReports();
  };

  const onRetry = async (id: string) => {
    await api.retryReport(() => getToken(), id);
    setActiveId(id);
    setActiveStatus('processing');
    await loadReports();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ProfileIncompleteBanner show={!profileComplete} />
      <Card className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Upload medical report</h2>
          <p className="mt-1 text-sm text-muted">
            PDFs only. We extract metrics, risks, and a clinical summary with AI.
          </p>
        </div>

        <UploadZone
          file={file}
          error={fileError}
          onFile={(next, error) => {
            setFile(next);
            setFileError(error ?? null);
          }}
        />

        <ReportDatePicker value={reportDate} onChange={setReportDate} />

        {uploading ? <UploadProgress percent={progress} /> : null}

        {activeStatus ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface2 px-4 py-3 text-sm">
            {activeStatus === 'processing' || activeStatus === 'pending' ? (
              <Spinner />
            ) : null}
            <span>{STATUS_COPY[activeStatus]}</span>
            {activeStatus === 'completed' && activeId ? (
              <Link
                href={`/reports/${activeId}`}
                className="ml-auto text-accent-glow hover:text-accent"
              >
                View analysis
              </Link>
            ) : null}
            {activeStatus === 'failed' && activeId ? (
              <button
                type="button"
                className="ml-auto text-danger"
                onClick={() => void onRetry(activeId)}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}

        {message ? <p className="text-sm text-muted">{message}</p> : null}

        <Button onClick={() => void onUpload()} disabled={uploading || !file}>
          {uploading ? 'Uploading…' : 'Upload & analyze'}
        </Button>
      </Card>

      <Card>
        <h3 className="mb-4 text-lg font-semibold">Past uploads</h3>
        <div className="space-y-3">
          {reports.length === 0 ? (
            <p className="text-sm text-muted">No uploads yet.</p>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface2/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{report.file_name}</p>
                  <p className="text-xs text-muted">
                    Report {formatDate(report.report_date)} · Uploaded{' '}
                    {formatDate(report.uploaded_at)}
                  </p>
                  {report.processing_status === 'failed' &&
                  report.error_message ? (
                    <p className="mt-1 text-xs text-danger">
                      {report.error_message}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      report.processing_status === 'completed'
                        ? 'bg-success/15 text-success'
                        : report.processing_status === 'failed'
                          ? 'bg-danger/15 text-danger'
                          : 'bg-accent/15 text-accent-glow'
                    }
                  >
                    {report.processing_status}
                  </Badge>
                  {report.processing_status === 'failed' ? (
                    <Button
                      variant="ghost"
                      className="px-3 py-1.5"
                      onClick={() => void onRetry(report.id)}
                    >
                      Retry
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="px-3 py-1.5 text-danger"
                    onClick={() => void onDelete(report.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
