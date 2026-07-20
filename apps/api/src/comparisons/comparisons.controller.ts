import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard, ClerkRequestUser } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ComparisonsService } from './comparisons.service';

@Controller('comparisons')
@UseGuards(ClerkAuthGuard)
export class ComparisonsController {
  constructor(private readonly comparisonsService: ComparisonsService) {}

  @Post()
  async create(
    @CurrentUser() user: ClerkRequestUser,
    @Body() body: { reportAId: string; reportBId: string },
  ) {
    const comparison = await this.comparisonsService.createComparison(
      user,
      body.reportAId,
      body.reportBId,
    );
    return { comparison };
  }

  @Get(':id')
  async getOne(
    @CurrentUser() user: ClerkRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const comparison = await this.comparisonsService.getComparison(user, id);
    return { comparison };
  }
}
