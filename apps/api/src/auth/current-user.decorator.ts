import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  AuthenticatedRequest,
  ClerkRequestUser,
} from './clerk.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClerkRequestUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.clerkUser) {
      throw new Error('CurrentUser used without ClerkAuthGuard');
    }
    return request.clerkUser;
  },
);
