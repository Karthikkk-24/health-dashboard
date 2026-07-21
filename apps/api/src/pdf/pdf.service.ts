import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { finalizeAnalysis } from './health-insights';
import {
  GEMINI_EXTRACTION_PROMPT,
  GeminiAnalysis,
  GeminiAnalysisSchema,
  UserHealthProfile,
} from './pdf.types';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly config: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.config.getOrThrow<string>('GEMINI_API_KEY'),
    );
  }

  sanitizeText(input: string): string {
    return input
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 100_000);
  }

  async extractText(buffer: Buffer): Promise<string> {
    // pdf-parse v2 exports PDFParse class (not a callable function)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseModule = require('pdf-parse') as {
      PDFParse: new (options: { data: Buffer | Uint8Array }) => {
        getText: () => Promise<{ text?: string }>;
        destroy?: () => Promise<void>;
      };
    };

    if (!pdfParseModule?.PDFParse) {
      throw new Error('pdf-parse PDFParse class is unavailable');
    }

    const parser = new pdfParseModule.PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return this.sanitizeText(result.text ?? '');
    } finally {
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    }
  }

  private extractJson(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      return trimmed;
    }
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence?.[1]) {
      return fence[1].trim();
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return trimmed.slice(start, end + 1);
    }
    return trimmed;
  }

  private extractMetricsFromText(text: string): Array<{
    name: string;
    value: number;
    unit: string | null;
    category: string;
    reference_min: number | null;
    reference_max: number | null;
    status: 'normal' | 'borderline' | 'out_of_range' | 'needs_attention';
  }> {
    const catalog: Array<{
      name: string;
      category: string;
      aliases: string[];
      unit?: string;
      reference_min?: number;
      reference_max?: number;
    }> = [
      {
        name: 'Creatinine',
        category: 'Kidney',
        aliases: ['creatinine'],
        unit: 'mg/dL',
        reference_min: 0.62,
        reference_max: 1.17,
      },
      {
        name: 'Urea',
        category: 'Kidney',
        aliases: ['urea'],
        unit: 'mg/dL',
        reference_min: 13,
        reference_max: 43,
      },
      {
        name: 'AST (SGOT)',
        category: 'Liver',
        aliases: ['ast (sgot)', 'sgot'],
        unit: 'U/L',
        reference_min: 0,
        reference_max: 40,
      },
      {
        name: 'ALT (SGPT)',
        category: 'Liver',
        aliases: ['alt (sgpt)', 'sgpt'],
        unit: 'U/L',
        reference_min: 0,
        reference_max: 41,
      },
      {
        name: 'Bilirubin Total',
        category: 'Liver',
        aliases: ['bilirubin total', 'total bilirubin'],
        unit: 'mg/dL',
        reference_min: 0.3,
        reference_max: 1.2,
      },
      {
        name: 'Albumin',
        category: 'Liver',
        aliases: ['albumin'],
        unit: 'g/dL',
        reference_min: 3.5,
        reference_max: 5.2,
      },
      {
        name: 'Sodium',
        category: 'Electrolytes',
        aliases: ['sodium'],
        unit: 'mmol/L',
        reference_min: 136,
        reference_max: 145,
      },
      {
        name: 'Potassium',
        category: 'Electrolytes',
        aliases: ['potassium'],
        unit: 'mmol/L',
        reference_min: 3.5,
        reference_max: 5.1,
      },
      {
        name: 'Vitamin B12',
        category: 'Vitamins',
        aliases: ['vitamin b12', 'cyanocobalamin'],
        unit: 'pg/mL',
        reference_min: 211,
        reference_max: 946,
      },
      {
        name: 'Vitamin D 25-OH',
        category: 'Vitamins',
        aliases: ['vitamin d, 25 hydroxy', 'vitamin d 25', '25 hydroxy'],
        unit: 'nmol/L',
        reference_min: 75,
        reference_max: 250,
      },
      {
        name: 'HbA1c',
        category: 'Metabolic',
        aliases: ['hba1c'],
        unit: '%',
        reference_min: 4,
        reference_max: 5.6,
      },
      {
        name: 'Estimated Average Glucose',
        category: 'Metabolic',
        aliases: ['estimated average glucose', 'eag'],
        unit: 'mg/dL',
        reference_min: 70,
        reference_max: 126,
      },
      {
        name: 'TSH',
        category: 'Thyroid',
        aliases: ['tsh, ultrasensitive', 'tsh'],
        unit: 'μIU/mL',
        reference_min: 0.27,
        reference_max: 4.2,
      },
      {
        name: 'Hemoglobin',
        category: 'Blood',
        aliases: ['hemoglobin'],
        unit: 'g/dL',
        reference_min: 13,
        reference_max: 17,
      },
      {
        name: 'RBC Count',
        category: 'Blood',
        aliases: ['rbc count'],
        unit: 'mill/mm3',
        reference_min: 4.5,
        reference_max: 5.5,
      },
      {
        name: 'Platelet Count',
        category: 'Blood',
        aliases: ['platelet count'],
        unit: 'thou/mm3',
        reference_min: 150,
        reference_max: 410,
      },
      {
        name: 'Total Cholesterol',
        category: 'Cardiovascular',
        aliases: ['cholesterol total', 'total cholesterol'],
        unit: 'mg/dL',
        reference_min: 0,
        reference_max: 200,
      },
      {
        name: 'Triglycerides',
        category: 'Cardiovascular',
        aliases: ['triglycerides'],
        unit: 'mg/dL',
        reference_min: 0,
        reference_max: 150,
      },
      {
        name: 'HDL Cholesterol',
        category: 'Cardiovascular',
        aliases: ['hdl cholesterol'],
        unit: 'mg/dL',
        reference_min: 40,
        reference_max: 60,
      },
      {
        name: 'LDL Cholesterol',
        category: 'Cardiovascular',
        aliases: ['ldl cholesterol'],
        unit: 'mg/dL',
        reference_min: 0,
        reference_max: 100,
      },
      {
        name: 'Fasting Glucose',
        category: 'Metabolic',
        aliases: ['glucose fasting', 'fasting glucose'],
        unit: 'mg/dL',
        reference_min: 70,
        reference_max: 100,
      },
    ];

    const lines = text
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const found = new Map<
      string,
      {
        name: string;
        value: number;
        unit: string | null;
        category: string;
        reference_min: number | null;
        reference_max: number | null;
        status: 'normal' | 'borderline' | 'out_of_range' | 'needs_attention';
      }
    >();

    const tryParseValueNearAlias = (
      line: string,
      alias: string,
    ): number | null => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const aliasBoundary = `(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`;
      const hasRange = /[0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?/.test(line);

      // Pattern A: value first — "47.7 AST (SGOT)"
      const valueFirst = line.match(
        new RegExp(`^([0-9]+(?:\\.[0-9]+)?)\\s+${escaped}(?=$|[^a-z0-9])`, 'i'),
      );
      if (valueFirst?.[1]) {
        return Number(valueFirst[1]);
      }

      if (!new RegExp(aliasBoundary, 'i').test(` ${line} `)) {
        return null;
      }

      // Pattern B: when a reference range exists, take the last number on the line
      // e.g. "Hemoglobin 13.00 - 17.00 g/dL 15.20"
      // e.g. "mg/dL 70.00 - 100.00 99.94"
      if (hasRange) {
        const numbers = [...line.matchAll(/([0-9]+(?:\.[0-9]+)?)/g)].map((m) =>
          Number(m[1]),
        );
        if (numbers.length >= 3) {
          return numbers[numbers.length - 1] ?? null;
        }
      }

      // Pattern C: trailing value
      const trailing = line.match(
        /([0-9]+(?:\.[0-9]+)?)\s*(?:g\/dL|mg\/dL|nmol\/L|pg\/mL|μIU\/mL|uIU\/mL|%|U\/L|mmol\/L|mill\/mm3|thou\/mm3|fL)?\s*$/i,
      );
      if (trailing?.[1] && !hasRange) {
        return Number(trailing[1]);
      }

      return null;
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      const lower = line.toLowerCase();
      for (const item of catalog) {
        if (found.has(item.name)) {
          continue;
        }
        const matchedAlias = item.aliases.find((alias) =>
          lower.includes(alias),
        );
        if (!matchedAlias) {
          continue;
        }

        if (
          (item.name === 'AST (SGOT)' || item.name === 'ALT (SGPT)') &&
          /ratio/i.test(line)
        ) {
          continue;
        }

        let value = tryParseValueNearAlias(line, matchedAlias);

        // Header-only lines (e.g. "VITAMIN B12, SERUM") — peek ahead for result rows
        if (value == null && !/[0-9]/.test(line)) {
          for (let look = 1; look <= 4; look += 1) {
            const next = lines[index + look];
            if (!next) break;
            // Prefer a following value-first row that includes the alias
            const fromNext = tryParseValueNearAlias(next, matchedAlias);
            if (fromNext != null) {
              value = fromNext;
              break;
            }
            // Or "mg/dL 70.00 - 100.00 99.94" style under a section header
            if (
              /^(?:mg\/dL|g\/dL|nmol\/L|pg\/mL|μIU\/mL|U\/L|mmol\/L)/i.test(
                next,
              ) &&
              /[0-9]+\s*-\s*[0-9]+/.test(next)
            ) {
              const numbers = [...next.matchAll(/([0-9]+(?:\.[0-9]+)?)/g)].map(
                (m) => Number(m[1]),
              );
              if (numbers.length >= 3) {
                value = numbers[numbers.length - 1] ?? null;
                break;
              }
            }
          }
        }

        if (value == null) {
          continue;
        }
        found.set(item.name, {
          name: item.name,
          value,
          unit: item.unit ?? null,
          category: item.category,
          reference_min: item.reference_min ?? null,
          reference_max: item.reference_max ?? null,
          status: 'normal',
        });
      }
    }

    // Special case: HbA1c often appears as "HbA1c % 4.00 - 5.60  5.8"
    if (!found.has('HbA1c')) {
      const hba1cMatch = text.match(
        /HbA1c\s*%\s*[0-9.]+\s*-\s*[0-9.]+\s+([0-9]+(?:\.[0-9]+)?)/i,
      );
      if (hba1cMatch?.[1]) {
        const value = Number(hba1cMatch[1]);
        found.set('HbA1c', {
          name: 'HbA1c',
          value,
          unit: '%',
          category: 'Metabolic',
          reference_min: 4,
          reference_max: 5.6,
          status: 'normal',
        });
      }
    }

    // TSH often: "TSH, Ultrasensitive 0.27 - 4.20 μIU/mL 7.770"
    if (!found.has('TSH')) {
      const tshMatch = text.match(
        /TSH[^0-9]{0,40}[0-9.]+\s*-\s*[0-9.]+\s*[μu]?IU\/mL\s*([0-9]+(?:\.[0-9]+)?)/i,
      );
      if (tshMatch?.[1]) {
        const value = Number(tshMatch[1]);
        found.set('TSH', {
          name: 'TSH',
          value,
          unit: 'μIU/mL',
          category: 'Thyroid',
          reference_min: 0.27,
          reference_max: 4.2,
          status: 'normal',
        });
      }
    }

    return Array.from(found.values());
  }

  private heuristicExtraction(
    text: string,
    profile?: UserHealthProfile | null,
  ): GeminiAnalysis {
    return finalizeAnalysis(this.extractMetricsFromText(text), profile);
  }

  async analyzeWithGemini(
    text: string,
    profile?: UserHealthProfile | null,
  ): Promise<GeminiAnalysis> {
    const models = ['gemini-flash-latest', 'gemini-2.0-flash-lite'];
    const profileHint = profile
      ? `\nPatient context: age=${profile.age_years ?? 'unknown'}, sex=${profile.sex ?? 'unknown'}, BMI=${profile.bmi ?? 'unknown'} (${profile.bmi_category ?? 'n/a'}), activity=${profile.activity_level ?? 'unknown'}. Personalize the calm summary using this.`
      : '\nPatient profile incomplete — avoid assumptions about BMI/age.';
    const prompt = `${GEMINI_EXTRACTION_PROMPT}${profileHint}\n\nMedical report text:\n${text.slice(0, 40_000)}`;
    let lastError: Error | null = null;

    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });
        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error(`Gemini timeout for ${modelName}`)),
              12_000,
            );
          }),
        ]);
        const raw = result.response.text();
        const parsed = JSON.parse(this.extractJson(raw)) as {
          metrics?: GeminiAnalysis['metrics'];
          summary?: string;
          risks?: string[];
          current_issues?: string[];
          potential_issues?: string[];
          recommendations?: string[];
          positive_indicators?: string[];
          action_plan?: GeminiAnalysis['action_plan'];
          overall_health_score?: number;
        };
        return finalizeAnalysis(parsed.metrics ?? [], profile, parsed);
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error('Gemini analysis failed');
        this.logger.warn(`Gemini model ${modelName} failed: ${lastError.message}`);
      }
    }

    this.logger.warn(
      `All Gemini models failed${lastError ? `: ${lastError.message}` : ''}. Using heuristic extraction.`,
    );
    return this.heuristicExtraction(text, profile);
  }

  async generateComparisonNarrative(
    comparisonSummary: string,
  ): Promise<string> {
    const models = [
      'gemini-flash-latest',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash',
    ];
    const prompt = `You are a clinical health analyst. Given this comparison of two medical reports, write a clear 2-paragraph narrative describing progress, improvements, declines, and actionable next steps. Plain text only.\n\n${comparisonSummary}`;

    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.3 },
        });
        const result = await model.generateContent(prompt);
        return this.sanitizeText(result.response.text());
      } catch (error) {
        this.logger.warn(
          `Gemini narrative model ${modelName} failed: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    return 'Comparison completed. Review the metric changes above for improvements and declines between the two reports.';
  }

  async chatAboutReport(input: {
    message: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    metrics: Array<{
      metric_name: string;
      metric_value: number | null;
      metric_unit: string | null;
      status: string | null;
    }>;
    analysis: {
      summary: string | null;
      overall_health_score: number | null;
      risks: string[];
      action_plan?: Array<{ title: string; detail: string }>;
      risk_scores?: unknown;
    } | null;
    rawTextSlice: string | null;
  }): Promise<string> {
    const metricsBlock = input.metrics
      .map(
        (m) =>
          `- ${m.metric_name}: ${m.metric_value ?? '—'} ${m.metric_unit ?? ''} (${m.status ?? 'n/a'})`,
      )
      .join('\n');

    const context = [
      `Overall score: ${input.analysis?.overall_health_score ?? '—'}`,
      `Summary: ${input.analysis?.summary ?? '—'}`,
      `Risks: ${(input.analysis?.risks ?? []).join('; ') || 'none'}`,
      `Risk scores JSON: ${JSON.stringify(input.analysis?.risk_scores ?? {})}`,
      `Metrics:\n${metricsBlock || 'none'}`,
      `Report text excerpt:\n${(input.rawTextSlice ?? '').slice(0, 3000)}`,
    ].join('\n\n');

    const historyText = input.history
      .slice(-12)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const system = `You are a calm health report assistant. Answer ONLY using the provided report context (metrics, analysis, risk scores, excerpt). Cite metric names when relevant. Do not diagnose, prescribe, or invent values. If the answer is not in the context, say you can only discuss what is in this report. Keep tone calm and clinical. Plain text, short paragraphs.`;

    const prompt = `${system}\n\nCONTEXT:\n${context}\n\nRECENT CHAT:\n${historyText}\n\nuser: ${input.message}\nassistant:`;

    const models = ['gemini-flash-latest', 'gemini-2.0-flash-lite'];
    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.3 },
        });
        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error(`Gemini chat timeout for ${modelName}`)),
              12_000,
            );
          }),
        ]);
        return this.sanitizeText(result.response.text()).slice(0, 4000);
      } catch (error) {
        this.logger.warn(
          `Gemini chat model ${modelName} failed: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    return 'I can only discuss what is in this report’s stored metrics and analysis. Try asking about a specific lab name from the metrics table, or open Settings if risk scores need more profile details.';
  }
}
