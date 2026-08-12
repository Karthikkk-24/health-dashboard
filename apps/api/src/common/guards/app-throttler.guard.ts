import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'crypto';

/**
 * Prefer per-credential buckets for authenticated requests so shared reverse
 * proxy IPs cannot starve every user (#22). Falls back to Express `req.ip`
 * (requires trust proxy when behind a load balancer).
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = req.headers as Record<string, unknown> | undefined;
    const auth = headers?.authorization ?? headers?.Authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer ') && auth.length > 20) {
      const token = auth.slice('Bearer '.length);
      const digest = createHash('sha256').update(token).digest('hex').slice(0, 32);
      return `bearer:${digest}`;
    }

    const ip =
      (typeof req.ip === 'string' && req.ip) ||
      (Array.isArray(req.ips) && typeof req.ips[0] === 'string' && req.ips[0]) ||
      'unknown';
    return `ip:${ip}`;
  }
}
