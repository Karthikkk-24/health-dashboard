'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useAuth, useUser } from '@clerk/nextjs';
import { api, ApiError } from '@/lib/api';
import type { UserProfile } from '@/types/health';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

function bmiPreview(heightCm: string, weightKg: string): string | null {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!h || !w || h < 50) return null;
  const bmi = w / ((h / 100) * (h / 100));
  let category = 'healthy range';
  if (bmi < 18.5) category = 'underweight';
  else if (bmi < 25) category = 'healthy range';
  else if (bmi < 30) category = 'overweight';
  else category = 'obesity range';
  return `${bmi.toFixed(1)} · ${category}`;
}

export default function SettingsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [emailPref, setEmailPref] = useState(true);
  const [reportReadyPref, setReportReadyPref] = useState(true);
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<UserProfile['sex']>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activity, setActivity] =
    useState<UserProfile['activity_level']>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const bmiLabel = useMemo(
    () => bmiPreview(heightCm, weightKg),
    [heightCm, weightKg],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getMe(() => getToken());
      setProfile(result.user);
      setEmailPref(result.user.notification_preferences?.email ?? true);
      setReportReadyPref(
        result.user.notification_preferences?.report_ready ?? true,
      );
      setDob(result.user.date_of_birth ?? '');
      setSex(result.user.sex ?? null);
      setHeightCm(
        result.user.height_cm != null ? String(result.user.height_cm) : '',
      );
      setWeightKg(
        result.user.weight_kg != null ? String(result.user.weight_kg) : '',
      );
      setActivity(result.user.activity_level ?? null);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveHealthProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.updateProfile(() => getToken(), {
        date_of_birth: dob || null,
        sex,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        activity_level: activity,
        notification_preferences: {
          email: emailPref,
          report_ready: reportReadyPref,
        },
      });
      setProfile(result.user);
      setMessage(
        result.profile_complete
          ? 'Health profile saved. Future reports will use this context.'
          : 'Saved. Add date of birth, sex, height, and weight for full personalization.',
      );
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

  const inputClass = 'field';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="flex items-center gap-4">
          {user?.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-full border border-border"
            />
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
        <div>
          <h2 className="text-lg font-semibold">Health profile</h2>
          <p className="mt-1 text-sm text-muted">
            Used to personalize insights (BMI, age context). Kept calm — never used to scare you.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-muted">Date of birth</span>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted">Sex</span>
            <select
              value={sex ?? ''}
              onChange={(e) =>
                setSex(
                  (e.target.value || null) as UserProfile['sex'],
                )
              }
              className={inputClass}
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted">Height (cm)</span>
            <input
              type="number"
              min={50}
              max={250}
              step="0.1"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted">Weight (kg)</span>
            <input
              type="number"
              min={20}
              max={400}
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-2 text-sm sm:col-span-2">
            <span className="text-muted">Activity level</span>
            <select
              value={activity ?? ''}
              onChange={(e) =>
                setActivity(
                  (e.target.value || null) as UserProfile['activity_level'],
                )
              }
              className={inputClass}
            >
              <option value="">Select</option>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
            </select>
          </label>
        </div>
        {bmiLabel ? (
          <p className="text-sm text-accent-glow">Estimated BMI: {bmiLabel}</p>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
          <span>Email updates</span>
          <input
            type="checkbox"
            checked={emailPref}
            onChange={(event) => setEmailPref(event.target.checked)}
            className="h-4 w-4 accent-accent"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
          <span>Notify when report analysis is ready</span>
          <input
            type="checkbox"
            checked={reportReadyPref}
            onChange={(event) => setReportReadyPref(event.target.checked)}
            className="h-4 w-4 accent-accent"
          />
        </label>
      </Card>

      <Button onClick={() => void saveHealthProfile()} disabled={saving}>
        {saving ? 'Saving…' : 'Save health profile'}
      </Button>

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
