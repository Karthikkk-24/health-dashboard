import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController webhook', () => {
  const usersService = {
    upsertFromClerkWebhook: jest.fn(),
  } as unknown as UsersService;

  it('rejects when CLERK_WEBHOOK_SECRET is missing (fail closed)', async () => {
    const config = {
      get: () => undefined,
    } as unknown as ConfigService;
    const controller = new UsersController(usersService, config);

    await expect(
      controller.syncWebhook(
        { rawBody: Buffer.from('{}') } as never,
        'svix_id',
        '123',
        'v1,sig',
        { type: 'user.created', data: { id: 'user_1' } },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.upsertFromClerkWebhook).not.toHaveBeenCalled();
  });

  it('rejects when Svix headers are missing', async () => {
    const config = {
      get: () => 'whsec_test',
    } as unknown as ConfigService;
    const controller = new UsersController(usersService, config);

    await expect(
      controller.syncWebhook(
        { rawBody: Buffer.from('{}') } as never,
        undefined,
        undefined,
        undefined,
        { type: 'user.created' },
      ),
    ).rejects.toMatchObject({ response: { code: 'WEBHOOK_UNAUTHORIZED' } });
  });
});
