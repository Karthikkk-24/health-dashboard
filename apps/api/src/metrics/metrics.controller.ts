import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard, ClerkRequestUser } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MetricsService } from './metrics.service';

@Controller('metrics')
@UseGuards(ClerkAuthGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async list(
    @CurrentUser() user: ClerkRequestUser,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const metrics = await this.metricsService.listMetrics(user, {
      category,
      from,
      to,
    });
    return { metrics };
  }

  @Get('categories')
  async categories(@CurrentUser() user: ClerkRequestUser) {
    const categories = await this.metricsService.listCategories(user);
    return { categories };
  }
}
