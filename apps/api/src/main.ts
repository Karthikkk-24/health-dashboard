import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);
  const origins = config
    .get<string>('ALLOWED_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api/v1');

  // Behind Render/nginx, trust X-Forwarded-For so req.ip is the client (#22).
  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: unknown) => void;
  };
  const trustProxy = config.get<string>('TRUST_PROXY');
  if (trustProxy === undefined || trustProxy === '') {
    if (config.get<string>('NODE_ENV') === 'production') {
      expressApp.set('trust proxy', 1);
    }
  } else if (trustProxy === 'true' || trustProxy === '1') {
    expressApp.set('trust proxy', 1);
  } else if (trustProxy === 'false' || trustProxy === '0') {
    expressApp.set('trust proxy', false);
  } else {
    const asNumber = Number(trustProxy);
    expressApp.set('trust proxy', Number.isFinite(asNumber) ? asNumber : trustProxy);
  }

  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Baseline security headers (fixes #11).
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (config.get<string>('NODE_ENV') === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor());

  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
}

void bootstrap();
