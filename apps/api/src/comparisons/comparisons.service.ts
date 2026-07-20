import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from '../users/users.service';
import { PdfService } from '../pdf/pdf.service';
import { ClerkRequestUser } from '../auth/clerk.guard';
import {
  DbHealthMetric,
  DbHealthReport,
  DbReportComparison,
} from '../common/dto/database.types';

interface MetricDiff {
  metric_name: string;
  category: string;
  old_value: number | null;
  new_value: number | null;
  unit: string | null;
  change_percent: number | null;
  direction: 'improved' | 'worsened' | 'stable' | 'unknown';
}

@Injectable()
export class ComparisonsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
    private readonly pdfService: PdfService,
  ) {}

  private classifyDirection(
    name: string,
    oldValue: number | null,
    newValue: number | null,
  ): MetricDiff['direction'] {
    if (oldValue === null || newValue === null) {
      return 'unknown';
    }
    if (oldValue === newValue) {
      return 'stable';
    }

    const lowerIsBetter = /ldl|triglyceride|glucose|pressure|systolic|diastolic|creatinine|urea|bmi|weight|cholesterol total/i.test(
      name,
    );
    const higherIsBetter = /hdl|vitamin|hemoglobin|score/i.test(name);

    const increased = newValue > oldValue;
    if (lowerIsBetter) {
      return increased ? 'worsened' : 'improved';
    }
    if (higherIsBetter) {
      return increased ? 'improved' : 'worsened';
    }
    return 'stable';
  }

  async createComparison(
    clerkUser: ClerkRequestUser,
    reportAId: string,
    reportBId: string,
  ): Promise<DbReportComparison> {
    if (reportAId === reportBId) {
      throw new BadRequestException({
        code: 'SAME_REPORT',
        message: 'Select two different reports to compare.',
      });
    }

    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    const { data: reports, error } = await this.supabase.db
      .from('health_reports')
      .select('*')
      .eq('user_id', user.id)
      .in('id', [reportAId, reportBId]);

    if (error || !reports || reports.length !== 2) {
      throw new NotFoundException({
        code: 'REPORTS_NOT_FOUND',
        message: 'One or both reports were not found.',
      });
    }

    const typed = reports as DbHealthReport[];
    const older =
      typed[0].report_date <= typed[1].report_date ? typed[0] : typed[1];
    const newer = older.id === typed[0].id ? typed[1] : typed[0];

    const { data: metrics } = await this.supabase.db
      .from('health_metrics')
      .select('*')
      .in('report_id', [older.id, newer.id]);

    const allMetrics = (metrics ?? []) as DbHealthMetric[];
    const olderMap = new Map(
      allMetrics
        .filter((m) => m.report_id === older.id)
        .map((m) => [m.metric_name.toLowerCase(), m]),
    );
    const newerMap = new Map(
      allMetrics
        .filter((m) => m.report_id === newer.id)
        .map((m) => [m.metric_name.toLowerCase(), m]),
    );

    const names = new Set([...olderMap.keys(), ...newerMap.keys()]);
    const diffs: MetricDiff[] = [];

    for (const name of names) {
      const oldMetric = olderMap.get(name);
      const newMetric = newerMap.get(name);
      const oldValue = oldMetric?.metric_value ?? null;
      const newValue = newMetric?.metric_value ?? null;
      let changePercent: number | null = null;
      if (oldValue !== null && newValue !== null && oldValue !== 0) {
        changePercent = Number(
          (((newValue - oldValue) / Math.abs(oldValue)) * 100).toFixed(1),
        );
      }

      diffs.push({
        metric_name: newMetric?.metric_name ?? oldMetric?.metric_name ?? name,
        category:
          newMetric?.metric_category ?? oldMetric?.metric_category ?? 'Other',
        old_value: oldValue,
        new_value: newValue,
        unit: newMetric?.metric_unit ?? oldMetric?.metric_unit ?? null,
        change_percent: changePercent,
        direction: this.classifyDirection(
          newMetric?.metric_name ?? oldMetric?.metric_name ?? name,
          oldValue,
          newValue,
        ),
      });
    }

    const improved = diffs.filter((d) => d.direction === 'improved').length;
    const worsened = diffs.filter((d) => d.direction === 'worsened').length;
    let overallTrend: 'improved' | 'declined' | 'stable' = 'stable';
    if (improved > worsened) {
      overallTrend = 'improved';
    } else if (worsened > improved) {
      overallTrend = 'declined';
    }

    const comparisonData = {
      report_a: {
        id: older.id,
        report_date: older.report_date,
        file_name: older.file_name,
      },
      report_b: {
        id: newer.id,
        report_date: newer.report_date,
        file_name: newer.file_name,
      },
      metrics: diffs,
      improved_count: improved,
      worsened_count: worsened,
    };

    const narrative = await this.pdfService.generateComparisonNarrative(
      JSON.stringify(comparisonData, null, 2),
    );

    const { data: saved, error: saveError } = await this.supabase.db
      .from('report_comparisons')
      .insert({
        user_id: user.id,
        report_a_id: older.id,
        report_b_id: newer.id,
        comparison_data: comparisonData,
        overall_trend: overallTrend,
        narrative,
      })
      .select('*')
      .single();

    if (saveError || !saved) {
      throw new BadRequestException({
        code: 'COMPARISON_SAVE_FAILED',
        message: saveError?.message ?? 'Could not save comparison.',
      });
    }

    return saved as DbReportComparison;
  }

  async getComparison(
    clerkUser: ClerkRequestUser,
    id: string,
  ): Promise<DbReportComparison> {
    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    const { data, error } = await this.supabase.db
      .from('report_comparisons')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException({
        code: 'COMPARISON_NOT_FOUND',
        message: 'Comparison not found.',
      });
    }

    return data as DbReportComparison;
  }
}
