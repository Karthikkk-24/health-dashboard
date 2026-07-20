'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth, useUser } from '@clerk/nextjs';
import { api, ApiError } from '@/lib/api';
import type { UserProfile } from '@/types/health';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

export default function SettingsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [emailPref, setEmailPref] = useState(true);
  const [reportReadyPref, setReportReadyPref] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getMe(() => getToken());
      setProfile(result.user);
      setEmailPref(result.user.notification_preferences?.email ?? true);
      setReportReadyPref(
        result.user.notification_preferences?.report_ready ?? true,
      );
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePrefs = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.updatePreferences(() => getToken(), {
        email: emailPref,
        report_ready: reportReadyPref,
      });
      setProfile(result.user);
      setMessage('Preferences saved.');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const deleteAll = async () => {
    setSaving(true);
    try {
      await api.deleteAllData(() => getToken());
      setConfirmOpen(false);
      setMessage('All health data deleted.');
      await load();
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : 'Failed to delete data.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-80" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="flex items-center gap-4">
          {user?.imageUrl ? (
            <Image src={user.imageUrl} alt="" width={64} height={64} className="h-16 w-16 rounded-full border border-border" />
          ) : (
            <div className="h-16 w-16 rounded-full border border-border bg-surface2" />
          )}
          <div>
            <p className="font-medium">{user?.fullName ?? profile?.full_name}</p>
            <p className="text-sm text-muted">
              {user?.primaryEmailAddress?.emailAddress ?? profile?.email}
            </p>
            <p className="mt-1 text-xs text-muted">Managed by Clerk (read-only)</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>Email updates</span>
          <input
            type="checkbox"
            checked={emailPref}
            onChange={(event) => setEmailPref(event.target.checked)}
            className="h-4 w-4 accent-accent"
          />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>Notify when report analysis is ready</span>
          <input
            type="checkbox"
            checked={reportReadyPref}
            onChange={(event) => setReportReadyPref(event.target.checked)}
            className="h-4 w-4 accent-accent"
          />
        </label>
        <Button onClick={() => void savePrefs()} disabled={saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
      </Card>

      <Card className="space-y-4 border-danger/40">
        <h2 className="text-lg font-semibold text-danger">Danger zone</h2>
        <p className="text-sm text-muted">
          Permanently delete all uploaded reports, metrics, analyses, and
          comparisons for your account. This cannot be undone.
        </p>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>
          Delete all health data
        </Button>
      </Card>

      {message ? <p className="text-sm text-muted">{message}</p> : null}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete all health data?"
      >
        <p className="text-sm text-muted">
          This removes every report and derived insight tied to your account.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={saving}
            onClick={() => void deleteAll()}
          >
            {saving ? 'Deleting…' : 'Yes, delete everything'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
