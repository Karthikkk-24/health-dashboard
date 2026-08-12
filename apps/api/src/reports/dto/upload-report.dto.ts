import { IsDateString } from 'class-validator';

export class UploadReportDto {
  @IsDateString()
  reportDate!: string;
}
