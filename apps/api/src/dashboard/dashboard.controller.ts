import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard, ClerkRequestUser } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(ClerkAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@CurrentUser() user: ClerkRequestUser) {
    return this.dashboardService.getDashboard(user);
  }
}
