import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard, ClerkRequestUser } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(ClerkAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async list(
    @CurrentUser() user: ClerkRequestUser,
    @Query('unread') unread?: string,
  ) {
    return this.alertsService.list(user, unread === '1' || unread === 'true');
  }

  @Patch(':id/read')
  async markRead(
    @CurrentUser() user: ClerkRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const alert = await this.alertsService.markRead(user, id);
    return { alert };
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: ClerkRequestUser) {
    return this.alertsService.markAllRead(user);
  }
}
