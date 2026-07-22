import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from '../users/users.service';
import { PdfService } from '../pdf/pdf.service';
import {
  DbHealthAnalysis,
  DbHealthMetric,
  DbHealthReport,
  DbReportChatMessage,
  DbUser,
} from '../common/dto/database.types';
import { ClerkRequestUser } from '../auth/clerk.guard';
import { AppCacheService } from '../common/cache/app-cache.service';
import { RiskService } from '../risk/risk.service';
import { ClinicianPdfService } from './clinician-pdf.service';
import { AlertsService } from '../alerts/alerts.service';

const MAX_UPLOADS_PER_HOUR = 10;
const MAX_CHAT_PER_HOUR = 20;
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const REPORTS_TTL_MS = 5 * 60_000;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
    private readonly pdfService: PdfService,
    private readonly riskService: RiskService,
    private readonly clinicianPdf: ClinicianPdfService,
    private readonly alertsService: AlertsService,
    private readonly cache: AppCacheService,
  ) {}

  private invalidateUserCaches(userId: string): void {
    this.cache.invalidateUser(userId);
  }

  private assertPdf(buffer: Buffer, mimeType: string): void {
    const looksPdf =
      buffer.subarray(0, 4).equals(PDF_MAGIC) ||
      mimeType === 'application/pdf';
    if (!looksPdf) {
      throw new BadRequestException({
        code: 'INVALID_FILE_TYPE',
        message: 'Only PDF files are accepted.',
      });
    }
  }

  private hashBuffer(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  async uploadReport(
    clerkUser: ClerkRequestUser,
    file: Express.Multer.File,
    reportDate: string,
  ): Promise<DbHealthReport> {
    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'A PDF file is required.',
      });
    }
    if (!reportDate) {
      throw new BadRequestException({
        code: 'REPORT_DATE_REQUIRED',
        message: 'Report date is required.',
      });
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: 'File exceeds the 20MB limit.',
      });
    }

    this.assertPdf(file.buffer, file.mimetype);
    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await this.supabase.db
      .from('health_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('uploaded_at', oneHourAgo);

    if ((count ?? 0) >= MAX_UPLOADS_PER_HOUR) {
      throw new BadRequestException({
        code: 'RATE_LIMITED',
        message: 'Upload limit of 10 reports per hour exceeded.',
      });
    }

    const fileHash = this.hashBuffer(file.buffer);
    const { data: duplicate } = await this.supabase.db
      .from('health_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('file_hash', fileHash)
      .eq('report_date', reportDate)
      .maybeSingle();

    if (duplicate) {
      throw new ConflictException({
        code: 'DUPLICATE_REPORT',
        message: 'This report was already uploaded for that date.',
      });
    }

    const reportId = randomUUID();
    const storagePath = `${clerkUser.clerkId}/${reportId}.pdf`;

    const { error: uploadError } = await this.supabase.db.storage
      .from('health-reports')
      .upload(storagePath, file.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException({
        code: 'STORAGE_UPLOAD_FAILED',
        message: uploadError.message,
      });
    }

    const { data: report, error } = await this.supabase.db
      .from('health_reports')
      .insert({
        id: reportId,
        user_id: user.id,
        file_name: file.originalname,
        file_url: storagePath,
        file_hash: fileHash,
        report_date: reportDate,
        processing_status: 'pending',
      })
      .select('*')
      .single();

    if (error || !report) {
      await this.supabase.db.storage.from('health-reports').remove([storagePath]);
      throw new BadRequestException({
        code: 'REPORT_CREATE_FAILED',
        message: error?.message ?? 'Could not create report.',
      });
    }

    void this.processReport(reportId, file.buffer);
    this.invalidateUserCaches(user.id);

    return report as DbHealthReport;
  }

  async processReport(reportId: string, buffer?: Buffer): Promise<void> {
    const { data: report } = await this.supabase.db
      .from('health_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (!report) {
      return;
    }

    await this.supabase.db
      .from('health_reports')
      .update({ processing_status: 'processing', error_message: null })
      .eq('id', reportId);

    try {
      let pdfBuffer = buffer;
      if (!pdfBuffer) {
        const { data, error } = await this.supabase.db.storage
          .from('health-reports')
          .download(report.file_url);
        if (error || !data) {
          throw new Error(error?.message ?? 'Failed to download PDF');
        }
        pdfBuffer = Buffer.from(await data.arrayBuffer());
      }

      const text = await this.pdfService.extractText(pdfBuffer);
      if (!text || text.length < 20) {
        throw new Error('Could not extract meaningful text from PDF');
      }

      const { data: owner } = await this.supabase.db
        .from('users')
        .select('*')
        .eq('id', report.user_id)
        .maybeSingle();

      const ownerUser = (owner as DbUser | null) ?? null;
      const profile = ownerUser
        ? this.usersService.toHealthProfile(ownerUser)
        : null;

      const analysis = await this.pdfService.analyzeWithGemini(text, profile);

      await this.supabase.db
        .from('health_metrics')
        .delete()
        .eq('report_id', reportId);
      await this.supabase.db
        .from('health_analyses')
        .delete()
        .eq('report_id', reportId);

      const metricRows =
        analysis.metrics.length > 0
          ? analysis.metrics.map((metric) => ({
              report_id: reportId,
              user_id: report.user_id,
              metric_name: metric.name,
              metric_value: metric.value ?? null,
              metric_unit: metric.unit ?? null,
              metric_category: metric.category,
              reference_min: metric.reference_min ?? null,
              reference_max: metric.reference_max ?? null,
              status: metric.status ?? null,
              recorded_at: report.report_date,
            }))
          : [];

      if (metricRows.length > 0) {
        const { error: metricsError } = await this.supabase.db
          .from('health_metrics')
          .insert(metricRows);
        if (metricsError) {
          throw new Error(metricsError.message);
        }
      }

      const riskScores = ownerUser
        ? this.riskService.compute(
            metricRows.map((m) => ({
              metric_name: m.metric_name,
              metric_value: m.metric_value,
              status: m.status,
            })),
            ownerUser,
          )
        : { computed_at: new Date().toISOString() };

      const { error: analysisError } = await this.supabase.db
        .from('health_analyses')
        .insert({
          report_id: reportId,
          user_id: report.user_id,
          overall_health_score: analysis.overall_health_score,
          summary: this.pdfService.sanitizeText(analysis.summary),
          risks: analysis.risks,
          current_issues: analysis.current_issues,
          potential_issues: analysis.potential_issues,
          recommendations: analysis.recommendations,
          positive_indicators: analysis.positive_indicators,
          action_plan: analysis.action_plan,
          risk_scores: riskScores,
        });

      if (analysisError) {
        throw new Error(analysisError.message);
      }

      await this.supabase.db
        .from('health_reports')
        .update({
          processing_status: 'completed',
          raw_text: text.slice(0, 50_000),
          error_message: null,
        })
        .eq('id', reportId);

      const insertedMetrics = metricRows.map((m, index) => ({
        id: `temp-${index}`,
        report_id: reportId,
        user_id: report.user_id,
        metric_name: m.metric_name,
        metric_value: m.metric_value,
        metric_unit: m.metric_unit,
        metric_category: m.metric_category,
        reference_min: m.reference_min,
        reference_max: m.reference_max,
        status: m.status,
        recorded_at: m.recorded_at,
        created_at: new Date().toISOString(),
      })) as DbHealthMetric[];

      await this.alertsService.evaluateAfterProcess(
        report.user_id,
        reportId,
        insertedMetrics,
        report.report_date,
      );

      this.invalidateUserCaches(report.user_id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'PDF processing failed';
      this.logger.error(`processReport ${reportId}: ${message}`);
      await this.supabase.db
        .from('health_reports')
        .update({
          processing_status: 'failed',
          error_message: message,
        })
        .eq('id', reportId);
      if (report?.user_id) {
        this.invalidateUserCaches(report.user_id);
      }
    }
  }

  async listReports(
    clerkUser: ClerkRequestUser,
    page = 1,
    limit = 20,
  ): Promise<{
    items: Array<DbHealthReport & { health_score: number | null }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    return this.cache.getOrSet(
      `user:${user.id}:reports:${page}:${limit}`,
      REPORTS_TTL_MS,
      async () => {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await this.supabase.db
          .from('health_reports')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .order('report_date', { ascending: false })
          .range(from, to);

        if (error) {
          throw new BadRequestException({
            code: 'LIST_FAILED',
            message: error.message,
          });
        }

        const reports = (data ?? []) as DbHealthReport[];
        const ids = reports.map((r) => r.id);
        let scoreMap = new Map<string, number | null>();

        if (ids.length > 0) {
          const { data: analyses } = await this.supabase.db
            .from('health_analyses')
            .select('report_id, overall_health_score')
            .in('report_id', ids);
          scoreMap = new Map(
            (analyses ?? []).map(
              (a: {
                report_id: string;
                overall_health_score: number | null;
              }) => [a.report_id, a.overall_health_score],
            ),
          );
        }

        return {
          items: reports.map((report) => ({
            ...report,
            health_score: scoreMap.get(report.id) ?? null,
          })),
          total: count ?? 0,
          page,
          limit,
        };
      },
    );
  }

  async getReport(
    clerkUser: ClerkRequestUser,
    reportId: string,
  ): Promise<{
    report: DbHealthReport;
    metrics: DbHealthMetric[];
    analysis: DbHealthAnalysis | null;
    downloadUrl: string | null;
  }> {
    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    return this.cache.getOrSet(
      `user:${user.id}:report:${reportId}`,
      REPORTS_TTL_MS,
      async () => {
        const { data: report, error } = await this.supabase.db
          .from('health_reports')
          .select('*')
          .eq('id', reportId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error || !report) {
          throw new NotFoundException({
            code: 'REPORT_NOT_FOUND',
            message: 'Report not found.',
          });
        }

        const [{ data: metrics }, { data: analysis }] = await Promise.all([
          this.supabase.db
            .from('health_metrics')
            .select('*')
            .eq('report_id', reportId)
            .order('metric_category'),
          this.supabase.db
            .from('health_analyses')
            .select('*')
            .eq('report_id', reportId)
            .maybeSingle(),
        ]);

        const { data: signed } = await this.supabase.db.storage
          .from('health-reports')
          .createSignedUrl(report.file_url, 3600);

        const typedMetrics = (metrics ?? []) as DbHealthMetric[];
        let typedAnalysis = (analysis as DbHealthAnalysis | null) ?? null;
        typedAnalysis = await this.riskService.ensureAnalysisRiskScores(
          user,
          typedAnalysis,
          typedMetrics,
        );

        return {
          report: report as DbHealthReport,
          metrics: typedMetrics,
          analysis: typedAnalysis,
          downloadUrl: signed?.signedUrl ?? null,
        };
      },
    );
  }

  async getStatus(
    clerkUser: ClerkRequestUser,
    reportId: string,
  ): Promise<{
    id: string;
    processing_status: string;
    error_message: string | null;
  }> {
    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    const { data: report, error } = await this.supabase.db
      .from('health_reports')
      .select('id, processing_status, error_message')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !report) {
      throw new NotFoundException({
        code: 'REPORT_NOT_FOUND',
        message: 'Report not found.',
      });
    }

    return {
      id: report.id,
      processing_status: report.processing_status,
      error_message: report.error_message,
    };
  }

  async deleteReport(
    clerkUser: ClerkRequestUser,
    reportId: string,
  ): Promise<void> {
    const detail = await this.getReport(clerkUser, reportId);
    await this.supabase.db.storage
      .from('health-reports')
      .remove([detail.report.file_url]);
    await this.supabase.db.from('health_reports').delete().eq('id', reportId);
    this.invalidateUserCaches(detail.report.user_id);
  }

  async retryReport(
    clerkUser: ClerkRequestUser,
    reportId: string,
  ): Promise<DbHealthReport> {
    const detail = await this.getReport(clerkUser, reportId);
    if (detail.report.processing_status !== 'failed') {
      throw new BadRequestException({
        code: 'RETRY_NOT_ALLOWED',
        message: 'Only failed reports can be retried.',
      });
    }
    void this.processReport(reportId);
    this.invalidateUserCaches(detail.report.user_id);
    return detail.report;
  }

  async exportClinicianPdf(
    clerkUser: ClerkRequestUser,
    reportId: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const detail = await this.getReport(clerkUser, reportId);
    const user = await this.usersService.getMe(clerkUser.clerkId);

    const buffer = await this.clinicianPdf.build({
      user,
      report: {
        file_name: detail.report.file_name,
        report_date: detail.report.report_date,
      },
      metrics: detail.metrics,
      analysis: detail.analysis
        ? {
            overall_health_score: detail.analysis.overall_health_score,
            summary: detail.analysis.summary,
            action_plan: detail.analysis.action_plan ?? [],
            risk_scores: detail.analysis.risk_scores ?? {},
          }
        : null,
    });

    const safeDate = detail.report.report_date.replace(/[^\d-]/g, '');
    return {
      buffer,
      fileName: `clinician-summary-${safeDate}.pdf`,
    };
  }

  async getChat(
    clerkUser: ClerkRequestUser,
    reportId: string,
  ): Promise<{ messages: DbReportChatMessage[] }> {
    const detail = await this.getReport(clerkUser, reportId);
    const { data, error } = await this.supabase.db
      .from('report_chat_messages')
      .select('*')
      .eq('report_id', detail.report.id)
      .eq('user_id', detail.report.user_id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      throw new BadRequestException({
        code: 'CHAT_LOAD_FAILED',
        message: error.message,
      });
    }

    return { messages: (data ?? []) as DbReportChatMessage[] };
  }

  async postChat(
    clerkUser: ClerkRequestUser,
    reportId: string,
    message: string,
  ): Promise<{ messages: DbReportChatMessage[] }> {
    const trimmed = (message ?? '').trim();
    if (!trimmed || trimmed.length > 2000) {
      throw new BadRequestException({
        code: 'INVALID_MESSAGE',
        message: 'Message must be 1–2000 characters.',
      });
    }

    const detail = await this.getReport(clerkUser, reportId);
    const userId = detail.report.user_id;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await this.supabase.db
      .from('report_chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', oneHourAgo);

    if ((count ?? 0) >= MAX_CHAT_PER_HOUR) {
      throw new BadRequestException({
        code: 'CHAT_RATE_LIMITED',
        message: 'Chat limit of 20 messages per hour exceeded.',
      });
    }

    const { error: userMsgError } = await this.supabase.db
      .from('report_chat_messages')
      .insert({
        report_id: reportId,
        user_id: userId,
        role: 'user',
        content: trimmed,
      });

    if (userMsgError) {
      throw new BadRequestException({
        code: 'CHAT_SAVE_FAILED',
        message: userMsgError.message,
      });
    }

    const { data: history } = await this.supabase.db
      .from('report_chat_messages')
      .select('role, content')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true })
      .limit(20);

    const reply = await this.pdfService.chatAboutReport({
      message: trimmed,
      history: (history ?? []) as Array<{
        role: 'user' | 'assistant';
        content: string;
      }>,
      metrics: detail.metrics,
      analysis: detail.analysis,
      rawTextSlice: detail.report.raw_text?.slice(0, 4000) ?? null,
    });

    const { error: assistantError } = await this.supabase.db
      .from('report_chat_messages')
      .insert({
        report_id: reportId,
        user_id: userId,
        role: 'assistant',
        content: this.pdfService.sanitizeText(reply),
      });

    if (assistantError) {
      throw new BadRequestException({
        code: 'CHAT_REPLY_SAVE_FAILED',
        message:
          'Your message was saved, but the assistant reply could not be stored. Please try again.',
      });
    }

    return this.getChat(clerkUser, reportId);
  }
}
