import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string }>();
    const response = http.getResponse<Response>();
    const requestId =
      (request.headers['x-request-id'] as string | undefined) ?? randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      tap(() => {
        response.setHeader('x-request-id', requestId);
      }),
    );
  }
}
