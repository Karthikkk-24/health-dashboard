import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Webhook } from 'svix';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ClerkRequestUser } from '../auth/clerk.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Post('sync')
  async syncWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') svixId: string | undefined,
    @Headers('svix-timestamp') svixTimestamp: string | undefined,
    @Headers('svix-signature') svixSignature: string | undefined,
    @Body() body: Record<string, unknown>,
  ): Promise<{ ok: boolean }> {
    const secret = this.config.get<string>('CLERK_WEBHOOK_SECRET');

    if (secret) {
      if (!svixId || !svixTimestamp || !svixSignature) {
        throw new BadRequestException({
          code: 'MISSING_SVIX_HEADERS',
          message: 'Webhook signature headers are required.',
        });
      }

      const wh = new Webhook(secret);
      const payload = req.rawBody
        ? req.rawBody.toString('utf8')
        : JSON.stringify(body);

      try {
        wh.verify(payload, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch {
        throw new BadRequestException({
          code: 'INVALID_WEBHOOK_SIGNATURE',
          message: 'Webhook signature verification failed.',
        });
      }
    }

    const type = String(body.type ?? '');
    const data = body.data as {
      id: string;
      email_addresses?: Array<{ email_address: string }>;
      first_name?: string | null;
      last_name?: string | null;
      image_url?: string | null;
    };

    if (
      (type === 'user.created' || type === 'user.updated') &&
      data?.id
    ) {
      await this.usersService.upsertFromClerkWebhook(data);
    }

    return { ok: true };
  }

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async getMe(@CurrentUser() user: ClerkRequestUser) {
    const profile = await this.usersService.ensureUser(
      user.clerkId,
      user.email,
      user.fullName,
      user.avatarUrl,
    );
    return { user: profile };
  }

  @Patch('me')
  @UseGuards(ClerkAuthGuard)
  async updateMe(
    @CurrentUser() user: ClerkRequestUser,
    @Body()
    body: { notification_preferences?: { email?: boolean; report_ready?: boolean } },
  ) {
    await this.usersService.ensureUser(
      user.clerkId,
      user.email,
      user.fullName,
      user.avatarUrl,
    );
    const updated = await this.usersService.updatePreferences(
      user.clerkId,
      body.notification_preferences ?? {},
    );
    return { user: updated };
  }

  @Delete('me/data')
  @UseGuards(ClerkAuthGuard)
  async deleteData(@CurrentUser() user: ClerkRequestUser) {
    await this.usersService.ensureUser(
      user.clerkId,
      user.email,
      user.fullName,
      user.avatarUrl,
    );
    await this.usersService.deleteAllData(user.clerkId);
    return { ok: true };
  }
}
