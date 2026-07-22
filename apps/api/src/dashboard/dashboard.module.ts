import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UsersModule } from '../users/users.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [UsersModule, RiskModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
