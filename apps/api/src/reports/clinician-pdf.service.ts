import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { DbUser, RiskScores } from '../common/dto/database.types';
import { enrichProfile } from '../pdf/health-insights';
import type { MetricLike } from '../risk/metric-lookup';
import type { ActionPlanItem } from '../pdf/pdf.types';

type ExportInput = {
  user: DbUser;
  report: {
    file_name: string;
    report_date: string;
  };
  metrics: Array<
    MetricLike & {
      metric_unit: string | null;
      reference_min: number | null;
      reference_max: number | null;
      status: string | null;
      metric_category: string;
    }
  >;
  analysis: {
    overall_health_score: number | null;
    summary: string | null;
    action_plan: ActionPlanItem[];
    risk_scores: RiskScores;
  } | null;
};

@Injectable()
export class ClinicianPdfService {
  private readonly logger = new Logger(ClinicianPdfService.name);

  async build(input: ExportInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const profile = enrichProfile({
          date_of_birth: input.user.date_of_birth,
          sex: input.user.sex,
          height_cm:
            input.user.height_cm != null ? Number(input.user.height_cm) : null,
          weight_kg:
            input.user.weight_kg != null ? Number(input.user.weight_kg) : null,
          activity_level: input.user.activity_level,
        });

        doc
          .fontSize(18)
          .fillColor('#0f172a')
          .text('Clinician summary', { align: 'left' });
        doc.moveDown(0.3);
        doc
          .fontSize(10)
          .fillColor('#64748b')
          .text('Health Dashboard — for clinical discussion only');
        doc.moveDown(1);

        doc.fontSize(12).fillColor('#0f172a').text('Patient');
        doc
          .fontSize(10)
          .fillColor('#334155')
          .text(`Name: ${input.user.full_name ?? '—'}`)
          .text(`Age: ${profile.age_years ?? '—'} years`)
          .text(`Sex: ${input.user.sex ?? '—'}`)
          .text(
            `BMI: ${profile.bmi != null ? profile.bmi.toFixed(1) : '—'} (${profile.bmi_category ?? 'n/a'})`,
          )
          .text(`Report date: ${input.report.report_date}`)
          .text(`Source file: ${input.report.file_name}`);
        doc.moveDown(1);

        const score = input.analysis?.overall_health_score;
        doc
          .fontSize(12)
          .fillColor('#0f172a')
          .text(`Overall health score: ${score ?? '—'}`);
        doc.moveDown(0.8);

        this.writeRiskScores(doc, input.analysis?.risk_scores);
        doc.moveDown(0.8);

        doc.fontSize(12).fillColor('#0f172a').text('Lab metrics');
        doc.moveDown(0.4);
        doc.fontSize(9).fillColor('#334155');
        for (const m of input.metrics) {
          const ref =
            m.reference_min != null || m.reference_max != null
              ? `${m.reference_min ?? '—'}–${m.reference_max ?? '—'}`
              : '—';
          doc.text(
            `${m.metric_name}: ${m.metric_value ?? '—'} ${m.metric_unit ?? ''}  |  ref ${ref}  |  ${m.status ?? '—'}  |  ${m.metric_category}`,
          );
        }
        doc.moveDown(1);

        doc.fontSize(12).fillColor('#0f172a').text('Summary');
        doc
          .fontSize(10)
          .fillColor('#334155')
          .text(input.analysis?.summary ?? 'No summary available.', {
            align: 'left',
          });
        doc.moveDown(1);

        const plan = input.analysis?.action_plan ?? [];
        if (plan.length > 0) {
          doc.fontSize(12).fillColor('#0f172a').text('Improvement plan');
          doc.moveDown(0.3);
          const byPriority = {
            immediate_consult: plan.filter(
              (p) => p.priority === 'immediate_consult',
            ),
            discuss_soon: plan.filter((p) => p.priority === 'discuss_soon'),
            self_care: plan.filter((p) => p.priority === 'self_care'),
          };
          for (const [label, items] of [
            ['Immediate consult', byPriority.immediate_consult],
            ['Discuss soon', byPriority.discuss_soon],
            ['Self-care', byPriority.self_care],
          ] as const) {
            if (items.length === 0) continue;
            doc.fontSize(10).fillColor('#0f172a').text(label);
            for (const item of items) {
              doc
                .fontSize(9)
                .fillColor('#334155')
                .text(`• ${item.title} — ${item.detail} (${item.timeframe})`);
            }
            doc.moveDown(0.4);
          }
        }

        doc.moveDown(1.5);
        doc
          .fontSize(8)
          .fillColor('#94a3b8')
          .text(
            'Disclaimer: This summary is not a medical diagnosis. It is generated from uploaded lab reports and patient-entered profile data for discussion with a licensed clinician. Risk scores are estimates and may be incomplete when inputs are missing.',
            { align: 'left' },
          );

        doc.end();
      } catch (error) {
        this.logger.error(
          `PDF build failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
        reject(error);
      }
    });
  }

  private writeRiskScores(
    doc: PDFKit.PDFDocument,
    riskScores: RiskScores | undefined,
  ): void {
    doc.fontSize(12).fillColor('#0f172a').text('Risk scores');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#334155');

    if (!riskScores || Object.keys(riskScores).length === 0) {
      doc.text('Risk scores not available for this report.');
      return;
    }

    const ascvd = riskScores.ascvd;
    if (ascvd?.status === 'ok') {
      doc.text(
        `10-year ASCVD estimate: ${ascvd.ten_year_pct}% (${ascvd.risk_band})`,
      );
      doc.text(ascvd.note);
    } else if (ascvd?.status === 'incomplete') {
      doc.text(
        `ASCVD: incomplete — missing ${ascvd.missing.join(', ') || 'inputs'}`,
      );
    }

    const metabolic = riskScores.metabolic;
    if (metabolic) {
      doc.moveDown(0.3);
      if (metabolic.present === true) {
        doc.text(
          `Metabolic syndrome screen: criteria met (${metabolic.criteria_met}/${metabolic.criteria_needed})`,
        );
      } else if (metabolic.present === false) {
        doc.text(
          `Metabolic syndrome screen: not met (${metabolic.criteria_met}/${metabolic.criteria_needed})`,
        );
      } else {
        doc.text(
          `Metabolic syndrome screen: incomplete — missing ${metabolic.missing.join(', ')}`,
        );
      }
      doc.text(metabolic.note);
    }
  }
}
