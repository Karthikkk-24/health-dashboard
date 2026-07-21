import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from '../users/users.service';
import { ClerkRequestUser } from '../auth/clerk.guard';
import { DbHealthMetric, DbMetricAlert } from '../common/dto/database.types';
import { AppCacheService } from '../common/cache/app-cache.service';
import {
  METRIC_PATTERNS,
  metricMatches,
} from '../risk/metric-lookup';

const WATCHED: Array<{ label: string; patterns: RegExp[] }> = [
  { label: 'HbA1c', patterns: [...METRIC_PATTERNS.hba1c] },
  { label: 'LDL', patterns: [...METRIC_PATTERNS.ldl] },
  { label: 'Triglycerides', patterns: [...METRIC_PATTERNS.triglycerides] },
  { label: 'TSH', patterns: [...METRIC_PATTERNS.tsh] },
  { label: 'ALT', patterns: [...METRIC_PATTERNS.alt] },
  { label: 'AST', patterns: [...METRIC_PATTERNS.ast] },
  { label: 'Fasting glucose', patterns: [...METRIC_PATTERNS.fastingGlucose] },
  { label: 'Vitamin D', patterns: [...METRIC_PATTERNS.vitaminD] },
];

const STATUS_RANK: Record<string, number> = {
  normal: 0,
  borderline: 1,
  out_of_range: 2,
  needs_attention: 3,
};

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
    private readonly cache: AppCacheService,
  ) {}

  async evaluateAfterProcess(
    userId: string,
    newReportId: string,
    newMetrics: DbHealthMetric[],
  ): Promise<void> {
    const { data: priorReports } = await this.supabase.db
      .from('health_reports')
      .select('id, report_date')
      .eq('user_id', userId)
      .eq('processing_status', 'completed')
      .neq('id', newReportId)
      .order('report_date', { ascending: false })
      .limit(1);

    const prior = priorReports?.[0];
    if (!prior) {
      return;
    }

    const { data: oldMetricsData } = await this.supabase.db
      .from('health_metrics')
      .select('*')
      .eq('report_id', prior.id);

    const oldMetrics = (oldMetricsData ?? []) as DbHealthMetric[];
    const rows: Array<{
      user_id: string;
      report_id: string;
      metric_name: string;
      severity: 'info' | 'warning' | 'high';
      old_value: number | null;
      new_value: number | null;
      delta_pct: number | null;
      message: string;
    }> = [];

    for (const watch of WATCHED) {
      const oldM = oldMetrics.find((m) =>
        metricMatches(m.metric_name, watch.patterns),
      );
      const newM = newMetrics.find((m) =>
        metricMatches(m.metric_name, watch.patterns),
      );
      if (!oldM || !newM) continue;
      if (oldM.metric_value == null || newM.metric_value == null) continue;

      const oldVal = Number(oldM.metric_value);
      const newVal = Number(newM.metric_value);
      if (oldVal === 0) continue;

      const deltaPct = ((newVal - oldVal) / Math.abs(oldVal)) * 100;
      const oldRank = STATUS_RANK[oldM.status ?? 'normal'] ?? 0;
      const newRank = STATUS_RANK[newM.status ?? 'normal'] ?? 0;
      const statusWorsened = newRank > oldRank;
      const largeMove =
        Math.abs(deltaPct) >= 15 &&
        !(oldM.status === 'normal' && newM.status === 'normal');
      const newNeedsAttention =
        newM.status === 'needs_attention' &&
        oldM.status !== 'needs_attention';

      if (!statusWorsened && !largeMove && !newNeedsAttention) {
        continue;
      }

      let severity: 'info' | 'warning' | 'high' = 'info';
      if (newNeedsAttention || newRank >= 3) severity = 'high';
      else if (statusWorsened || Math.abs(deltaPct) >= 25) severity = 'warning';

      const direction = newVal > oldVal ? 'up' : 'down';
      rows.push({
        user_id: userId,
        report_id: newReportId,
        metric_name: newM.metric_name,
        severity,
        old_value: oldVal,
        new_value: newVal,
        delta_pct: Math.round(deltaPct * 10) / 10,
        message: `${watch.label} moved ${direction} from ${oldVal} to ${newVal} (${deltaPct >= 0 ? '+' : ''}${Math.round(deltaPct)}%). Status: ${oldM.status ?? '—'} → ${newM.status ?? '—'}.`,
      });
    }

    if (rows.length === 0) return;

    const { error } = await this.supabase.db.from('metric_alerts').insert(rows);
    if (error) {
      this.logger.warn(`Failed to insert metric alerts: ${error.message}`);
      return;
    }
    this.cache.invalidateUser(userId);
  }

  async list(
    clerkUser: ClerkRequestUser,
    unreadOnly = false,
  ): Promise<{ alerts: DbMetricAlert[]; unread_count: number }> {
    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    let query = this.supabase.db
      .from('metric_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    const { count } = await this.supabase.db
      .from('metric_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    return {
      alerts: (data ?? []) as DbMetricAlert[],
      unread_count: count ?? 0,
    };
  }

  async markRead(
    clerkUser: ClerkRequestUser,
    alertId: string,
  ): Promise<DbMetricAlert> {
    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    const { data, error } = await this.supabase.db
      .from('metric_alerts')
      .update({ read_at: new Date().toISOString() })
      .eq('id', alertId)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException({
        code: 'ALERT_NOT_FOUND',
        message: 'Alert not found.',
      });
    }

    this.cache.invalidateUser(user.id);
    return data as DbMetricAlert;
  }

  async markAllRead(clerkUser: ClerkRequestUser): Promise<{ ok: boolean }> {
    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    await this.supabase.db
      .from('metric_alerts')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    this.cache.invalidateUser(user.id);
    return { ok: true };
  }
}
