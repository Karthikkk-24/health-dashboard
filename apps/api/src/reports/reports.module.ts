import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfModule } from '../pdf/pdf.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PdfModule, UsersModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
