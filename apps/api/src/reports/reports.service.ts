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
} from '../common/dto/database.types';
import { ClerkRequestUser } from '../auth/clerk.guard';

const MAX_UPLOADS_PER_HOUR = 10;
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
    private readonly pdfService: PdfService,
  ) {}

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

      const analysis = await this.pdfService.analyzeWithGemini(text);

      await this.supabase.db
        .from('health_metrics')
        .delete()
        .eq('report_id', reportId);
      await this.supabase.db
        .from('health_analyses')
        .delete()
        .eq('report_id', reportId);

      if (analysis.metrics.length > 0) {
        const rows = analysis.metrics.map((metric) => ({
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
        }));
        const { error: metricsError } = await this.supabase.db
          .from('health_metrics')
          .insert(rows);
        if (metricsError) {
          throw new Error(metricsError.message);
        }
      }

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
          (a: { report_id: string; overall_health_score: number | null }) => [
            a.report_id,
            a.overall_health_score,
          ],
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

    return {
      report: report as DbHealthReport,
      metrics: (metrics ?? []) as DbHealthMetric[],
      analysis: (analysis as DbHealthAnalysis | null) ?? null,
      downloadUrl: signed?.signedUrl ?? null,
    };
  }

  async getStatus(
    clerkUser: ClerkRequestUser,
    reportId: string,
  ): Promise<{
    id: string;
    processing_status: string;
    error_message: string | null;
  }> {
    const detail = await this.getReport(clerkUser, reportId);
    return {
      id: detail.report.id,
      processing_status: detail.report.processing_status,
      error_message: detail.report.error_message,
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
    return detail.report;
  }
}
