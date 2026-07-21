import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from '../users/users.service';
import { ClerkRequestUser } from '../auth/clerk.guard';
import {
  DbHealthAnalysis,
  DbHealthMetric,
  DbHealthReport,
  DbUser,
} from '../common/dto/database.types';
import { AppCacheService } from '../common/cache/app-cache.service';

function metricMatches(name: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(name));
}

const DASHBOARD_TTL_MS = 5 * 60_000;

@Injectable()
export class DashboardService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
    private readonly cache: AppCacheService,
  ) {}

  async getDashboard(clerkUser: ClerkRequestUser) {
    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    return this.cache.getOrSet(
      `user:${user.id}:dashboard`,
      DASHBOARD_TTL_MS,
      () => this.buildDashboard(user),
    );
  }

  private async buildDashboard(user: DbUser) {
    const { data: reports } = await this.supabase.db
      .from('health_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('report_date', { ascending: true });

    const typedReports = (reports ?? []) as DbHealthReport[];
    const completed = typedReports.filter(
      (r) => r.processing_status === 'completed',
    );

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const reportsThisMonth = typedReports.filter(
      (r) => new Date(r.uploaded_at) >= monthStart,
    ).length;

    const reportIds = completed.map((r) => r.id);
    let metrics: DbHealthMetric[] = [];
    let analyses: DbHealthAnalysis[] = [];

    if (reportIds.length > 0) {
      const [metricsRes, analysesRes] = await Promise.all([
        this.supabase.db
          .from('health_metrics')
          .select('*')
          .eq('user_id', user.id)
          .in('report_id', reportIds),
        this.supabase.db
          .from('health_analyses')
          .select('*')
          .eq('user_id', user.id)
          .in('report_id', reportIds),
      ]);
      metrics = (metricsRes.data ?? []) as DbHealthMetric[];
      analyses = (analysesRes.data ?? []) as DbHealthAnalysis[];
    }

    const analysisByReport = new Map(analyses.map((a) => [a.report_id, a]));

    const latestReport = [...completed].sort(
      (a, b) =>
        new Date(b.report_date).getTime() - new Date(a.report_date).getTime(),
    )[0];

    const latestAnalysis = latestReport
      ? (analysisByReport.get(latestReport.id) ?? null)
      : null;

    const healthScoreTrend = completed
      .map((report) => ({
        date: report.report_date,
        score: analysisByReport.get(report.id)?.overall_health_score ?? null,
      }))
      .filter((item) => item.score !== null);

    const bloodPressureTrend = completed.map((report) => {
      const reportMetrics = metrics.filter((m) => m.report_id === report.id);
      const systolic = reportMetrics.find((m) =>
        metricMatches(m.metric_name, [/systolic/i, /bp.?sys/i]),
      );
      const diastolic = reportMetrics.find((m) =>
        metricMatches(m.metric_name, [/diastolic/i, /bp.?dia/i]),
      );
      return {
        date: report.report_date,
        systolic: systolic?.metric_value ?? null,
        diastolic: diastolic?.metric_value ?? null,
      };
    });

    const glucoseTrend = completed.map((report) => {
      const glucose = metrics.find(
        (m) =>
          m.report_id === report.id &&
          metricMatches(m.metric_name, [
            /glucose/i,
            /fasting.?blood.?sugar/i,
            /fbs/i,
            /hba1c/i,
          ]),
      );
      return {
        date: report.report_date,
        value: glucose?.metric_value ?? null,
        unit: glucose?.metric_unit ?? null,
        name: glucose?.metric_name ?? 'Glucose',
      };
    });

    const latestMetrics = latestReport
      ? metrics.filter((m) => m.report_id === latestReport.id)
      : [];

    const findChol = (pattern: RegExp) =>
      latestMetrics.find((m) => pattern.test(m.metric_name))?.metric_value ??
      null;

    const cholesterolBreakdown = {
      ldl: findChol(/ldl/i),
      hdl: findChol(/hdl/i),
      total: findChol(/total.?cholesterol|cholesterol.?total|^cholesterol$/i),
      triglycerides: findChol(/triglyceride/i),
    };

    return {
      stats: {
        totalReports: typedReports.length,
        latestHealthScore: latestAnalysis?.overall_health_score ?? null,
        lastReportDate: latestReport?.report_date ?? null,
        reportsThisMonth,
      },
      bloodPressureTrend,
      cholesterolBreakdown,
      glucoseTrend,
      healthScoreTrend,
      latestAnalysis: latestAnalysis
        ? {
            summary: latestAnalysis.summary,
            risks: latestAnalysis.risks,
            overall_health_score: latestAnalysis.overall_health_score,
            report_id: latestAnalysis.report_id,
            report_date: latestReport?.report_date ?? null,
            action_plan: latestAnalysis.action_plan ?? [],
          }
        : null,
      profileComplete: this.usersService.isProfileComplete(user),
    };
  }
}
