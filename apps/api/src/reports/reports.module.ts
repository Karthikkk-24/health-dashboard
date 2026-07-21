import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ClinicianPdfService } from './clinician-pdf.service';
import { PdfModule } from '../pdf/pdf.module';
import { UsersModule } from '../users/users.module';
import { RiskModule } from '../risk/risk.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [PdfModule, UsersModule, RiskModule, AlertsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ClinicianPdfService],
  exports: [ReportsService],
})
export class ReportsModule {}
