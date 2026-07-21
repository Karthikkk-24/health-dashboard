import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseModule } from './supabase/supabase.module';
import { UsersModule } from './users/users.module';
import { ReportsModule } from './reports/reports.module';
import { MetricsModule } from './metrics/metrics.module';
import { ComparisonsModule } from './comparisons/comparisons.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PdfModule } from './pdf/pdf.module';
import { AppCacheModule } from './common/cache/app-cache.module';
import { AlertsModule } from './alerts/alerts.module';
import { RiskModule } from './risk/risk.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    AppCacheModule,
    SupabaseModule,
    PdfModule,
    RiskModule,
    UsersModule,
    AlertsModule,
    ReportsModule,
    MetricsModule,
    ComparisonsModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
