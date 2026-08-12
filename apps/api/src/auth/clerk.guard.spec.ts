import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClerkAuthGuard } from './clerk.guard';

jest.mock('@clerk/backend', () => ({
  createClerkClient: jest.fn(() => ({
    users: {
      getUser: jest.fn(),
    },
  })),
  verifyToken: jest.fn(),
}));

import { createClerkClient, verifyToken } from '@clerk/backend';

function mockContext(authorization?: string) {
  const request: {
    headers: { authorization?: string };
    clerkUser?: unknown;
  } = {
    headers: { authorization },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    request,
  };
}

describe('ClerkAuthGuard', () => {
  const config = {
    getOrThrow: (key: string) => {
      if (key === 'CLERK_SECRET_KEY') return 'sk_test';
      throw new Error(key);
    },
    get: (key: string, fallback?: string) => {
      if (key === 'ALLOWED_ORIGINS') return 'http://localhost:3000';
      return fallback;
    },
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    (createClerkClient as jest.Mock).mockReturnValue({
      users: { getUser: jest.fn().mockResolvedValue({
        emailAddresses: [{ id: 'e1', emailAddress: 'a@example.com' }],
        primaryEmailAddressId: 'e1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        imageUrl: null,
      }) },
    });
  });

  it('rejects requests without a Bearer token', async () => {
    const guard = new ClerkAuthGuard(config);
    const ctx = mockContext(undefined);
    await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects invalid tokens', async () => {
    (verifyToken as jest.Mock).mockRejectedValue(new Error('bad token'));
    const guard = new ClerkAuthGuard(config);
    const ctx = mockContext('Bearer not-a-jwt');
    await expect(guard.canActivate(ctx as never)).rejects.toMatchObject({
      response: { code: 'INVALID_TOKEN' },
    });
  });

  it('attaches clerkUser on successful verification', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'user_123' });
    const guard = new ClerkAuthGuard(config);
    const ctx = mockContext('Bearer valid.jwt');
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    expect(ctx.request.clerkUser).toEqual({
      clerkId: 'user_123',
      email: 'a@example.com',
      fullName: 'Ada Lovelace',
      avatarUrl: null,
    });
    expect(verifyToken).toHaveBeenCalledWith(
      'valid.jwt',
      expect.objectContaining({
        authorizedParties: ['http://localhost:3000'],
      }),
    );
  });
});
