import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { ClerkAuthGuard } from '../src/auth/clerk.guard';

/**
 * Lightweight e2e for security-critical webhook fail-closed behavior.
 * Avoids booting full AppModule (which needs live Clerk/Supabase env).
 */
describe('Webhook security (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const allowAll: CanActivate = { canActivate: () => true };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: { upsertFromClerkWebhook: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: () => undefined,
            getOrThrow: (key: string) => {
              throw new Error(`unexpected ${key}`);
            },
          },
        },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue(allowAll)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /users/sync without webhook secret returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/sync')
      .send({ type: 'user.created', data: { id: 'user_x' } });

    expect(res.status).toBe(401);
  });
});
