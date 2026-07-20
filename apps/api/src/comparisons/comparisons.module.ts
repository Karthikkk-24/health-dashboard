import { Module } from '@nestjs/common';
import { ComparisonsController } from './comparisons.controller';
import { ComparisonsService } from './comparisons.service';
import { UsersModule } from '../users/users.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [UsersModule, PdfModule],
  controllers: [ComparisonsController],
  providers: [ComparisonsService],
})
export class ComparisonsModule {}
