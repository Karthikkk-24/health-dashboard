import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ClerkAuthGuard, ClerkRequestUser } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(ClerkAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('upload')
  @Throttle({ default: { limit: 10, ttl: 3600_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser() user: ClerkRequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('reportDate') reportDate: string,
  ) {
    const report = await this.reportsService.uploadReport(
      user,
      file,
      reportDate,
    );
    return { report };
  }

  @Get()
  async list(
    @CurrentUser() user: ClerkRequestUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.reportsService.listReports(
      user,
      Math.max(1, Number(page) || 1),
      Math.min(100, Math.max(1, Number(limit) || 20)),
    );
  }

  @Get(':id/status')
  async status(
    @CurrentUser() user: ClerkRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportsService.getStatus(user, id);
  }

  @Get(':id/export.pdf')
  async exportPdf(
    @CurrentUser() user: ClerkRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.reportsService.exportClinicianPdf(
      user,
      id,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get(':id/chat')
  async getChat(
    @CurrentUser() user: ClerkRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportsService.getChat(user, id);
  }

  @Post(':id/chat')
  @Throttle({ default: { limit: 20, ttl: 3600_000 } })
  async postChat(
    @CurrentUser() user: ClerkRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message?: string },
  ) {
    return this.reportsService.postChat(user, id, body?.message ?? '');
  }

  @Get(':id')
  async getOne(
    @CurrentUser() user: ClerkRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportsService.getReport(user, id);
  }

  @Post(':id/retry')
  async retry(
    @CurrentUser() user: ClerkRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const report = await this.reportsService.retryReport(user, id);
    return { report };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: ClerkRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.reportsService.deleteReport(user, id);
    return { ok: true };
  }
}
