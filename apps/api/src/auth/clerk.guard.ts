import {
  CanActivate,
  ExecutionContext,
  Injectable,
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
  private readonly clerk;

  constructor(private readonly config: ConfigService) {
    this.clerk = createClerkClient({
      secretKey: this.config.getOrThrow<string>('CLERK_SECRET_KEY'),
    });
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

    try {
      const payload = await verifyToken(token, {
        secretKey: this.config.getOrThrow<string>('CLERK_SECRET_KEY'),
      });

      const clerkId = payload.sub;
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
          user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)
            ?.emailAddress ??
          user.emailAddresses[0]?.emailAddress ??
          '';
        fullName =
          [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
        avatarUrl = user.imageUrl ?? null;
      } catch {
        email = String(payload.email ?? '');
      }

      request.clerkUser = { clerkId, email, fullName, avatarUrl };
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token.',
      });
    }
  }
}
