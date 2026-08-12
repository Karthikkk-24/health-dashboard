import { IsDateString, Matches } from 'class-validator';

export class UploadReportDto {
  /** Calendar date only (YYYY-MM-DD). */
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'reportDate must be YYYY-MM-DD',
  })
  reportDate!: string;
}
