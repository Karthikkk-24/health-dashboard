import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DbUser } from '../common/dto/database.types';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async ensureUser(
    clerkId: string,
    email: string,
    fullName: string | null = null,
    avatarUrl: string | null = null,
  ): Promise<DbUser> {
    const payload: Record<string, string> = {
      clerk_id: clerkId,
      email: email || `${clerkId}@users.clerk`,
    };
    if (fullName) {
      payload.full_name = fullName;
    }
    if (avatarUrl) {
      payload.avatar_url = avatarUrl;
    }

    const { data, error } = await this.supabase.db
      .from('users')
      .upsert(payload, { onConflict: 'clerk_id' })
      .select('*')
      .single();

    if (!error && data) {
      return data as DbUser;
    }

    // Concurrent insert race or transient upsert error — fetch existing row
    const existing = await this.findByClerkId(clerkId);
    if (existing) {
      if (fullName || avatarUrl || email) {
        const { data: updated } = await this.supabase.db
          .from('users')
          .update({
            email: email || existing.email,
            ...(fullName ? { full_name: fullName } : {}),
            ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          })
          .eq('clerk_id', clerkId)
          .select('*')
          .single();
        if (updated) {
          return updated as DbUser;
        }
      }
      return existing;
    }

    this.logger.error(
      `Failed to upsert user ${clerkId}: ${error?.message ?? 'unknown'}`,
    );
    throw new Error(`Failed to create user: ${error?.message ?? 'unknown'}`);
  }

  async findByClerkId(clerkId: string): Promise<DbUser | null> {
    const { data, error } = await this.supabase.db
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .maybeSingle();

    if (error) {
      this.logger.error(`findByClerkId failed: ${error.message}`);
      return null;
    }

    return (data as DbUser | null) ?? null;
  }

  async getMe(clerkId: string): Promise<DbUser> {
    const user = await this.findByClerkId(clerkId);
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User profile not found.',
      });
    }
    return user;
  }

  async updatePreferences(
    clerkId: string,
    preferences: { email?: boolean; report_ready?: boolean },
  ): Promise<DbUser> {
    const user = await this.getMe(clerkId);
    const next = {
      ...user.notification_preferences,
      ...preferences,
    };

    const { data, error } = await this.supabase.db
      .from('users')
      .update({ notification_preferences: next })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update preferences: ${error?.message}`);
    }

    return data as DbUser;
  }

  async deleteAllData(clerkId: string): Promise<void> {
    const user = await this.getMe(clerkId);

    const { data: reports } = await this.supabase.db
      .from('health_reports')
      .select('id, file_url')
      .eq('user_id', user.id);

    if (reports && reports.length > 0) {
      const paths = reports
        .map((report: { file_url: string }) => {
          const marker = '/health-reports/';
          const index = report.file_url.indexOf(marker);
          if (index >= 0) {
            return report.file_url.slice(index + marker.length);
          }
          return `${clerkId}/${report.file_url.split('/').pop() ?? ''}`;
        })
        .filter(Boolean);

      if (paths.length > 0) {
        await this.supabase.db.storage.from('health-reports').remove(paths);
      }
    }

    await this.supabase.db.from('report_comparisons').delete().eq('user_id', user.id);
    await this.supabase.db.from('health_reports').delete().eq('user_id', user.id);
  }

  async upsertFromClerkWebhook(payload: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
  }): Promise<DbUser> {
    const email = payload.email_addresses?.[0]?.email_address ?? '';
    const fullName =
      [payload.first_name, payload.last_name].filter(Boolean).join(' ') || null;
    return this.ensureUser(payload.id, email, fullName, payload.image_url ?? null);
  }
}
