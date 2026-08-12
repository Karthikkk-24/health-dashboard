import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase access for PHI.
 * Must use the service role key — never the anon/publishable key (#6).
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client!: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    this.assertServiceRoleKey(serviceRoleKey);

    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /**
   * Decode JWT payload (unverified) and require role === service_role.
   * Prevents accidentally wiring the anon key into the API process.
   */
  private assertServiceRoleKey(key: string): void {
    const trimmed = key.trim();
    if (!trimmed) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is empty');
    }

    const parts = trimmed.split('.');
    if (parts.length < 2) {
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY is not a JWT; skipping role claim check',
      );
      return;
    }

    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson) as { role?: string };
      if (payload.role && payload.role !== 'service_role') {
        throw new Error(
          `SUPABASE_SERVICE_ROLE_KEY must be the service_role key (got role=${payload.role})`,
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('must be the service_role')
      ) {
        throw error;
      }
      this.logger.warn(
        `Could not decode SUPABASE_SERVICE_ROLE_KEY JWT payload: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  get db(): SupabaseClient {
    return this.client;
  }
}
