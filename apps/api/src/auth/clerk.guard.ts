import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { Request } from 'express';

export class ClerkRequestUser {
  clerkId!: string;
  email!: string;
  fullName!: string | null;
  avatarUrl!: string | null;
}

export type AuthenticatedRequest = Request & {
  clerkUser?: ClerkRequestUser;
  requestId?: string;
};

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);
  private readonly clerk;
  private readonly secretKey: string;
  private readonly authorizedParties: string[];

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.getOrThrow<string>('CLERK_SECRET_KEY');
    this.clerk = createClerkClient({ secretKey: this.secretKey });
    this.authorizedParties = this.config
      .get<string>('ALLOWED_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'MISSING_TOKEN',
        message: 'Authorization bearer token is required.',
      });
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException({
        code: 'MISSING_TOKEN',
        message: 'Authorization bearer token is required.',
      });
    }

    let payload: { sub?: string; email?: unknown; azp?: string };
    try {
      // Always enforce authorizedParties when configured — never retry without
      // the check (that would accept tokens issued for another party). Fixes #2.
      const verifyOptions: {
        secretKey: string;
        clockSkewInMs: number;
        authorizedParties?: string[];
      } = {
        secretKey: this.secretKey,
        clockSkewInMs: 15_000,
      };

      if (this.authorizedParties.length > 0) {
        verifyOptions.authorizedParties = this.authorizedParties;
      }

      payload = await verifyToken(token, verifyOptions);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Token verification failed';
      this.logger.warn(`Clerk token verification failed: ${reason}`);
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token.',
      });
    }

    const clerkId = payload?.sub;
    if (!clerkId) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Token subject is missing.',
      });
    }

    let email = '';
    let fullName: string | null = null;
    let avatarUrl: string | null = null;

    try {
      const user = await this.clerk.users.getUser(clerkId);
      email =
        user.emailAddresses.find(
          (item) => item.id === user.primaryEmailAddressId,
        )?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        '';
      fullName =
        [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
      avatarUrl = user.imageUrl ?? null;
    } catch (error) {
      this.logger.warn(
        `Clerk getUser failed for ${clerkId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      email = typeof payload.email === 'string' ? payload.email : '';
    }

    request.clerkUser = { clerkId, email, fullName, avatarUrl };
    return true;
  }
}
