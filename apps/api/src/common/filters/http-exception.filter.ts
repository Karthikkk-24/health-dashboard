import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId ?? randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        code = exception.name;
      } else if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        const nested =
          typeof record.message === 'object' && record.message !== null
            ? (record.message as Record<string, unknown>)
            : null;

        if (nested) {
          message = String(nested.message ?? exception.message);
          code = String(nested.code ?? record.error ?? exception.name);
        } else {
          message = Array.isArray(record.message)
            ? record.message.join(', ')
            : String(record.message ?? exception.message);
          code = String(record.code ?? record.error ?? exception.name);
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      error: { code, message, requestId },
    });
  }
}
