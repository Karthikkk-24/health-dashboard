import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DbUser } from '../common/dto/database.types';
import { enrichProfile } from '../pdf/health-insights';
import { UserHealthProfile } from '../pdf/pdf.types';

export type HealthProfileUpdate = {
  date_of_birth?: string | null;
  sex?: DbUser['sex'];
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: DbUser['activity_level'];
  notification_preferences?: { email?: boolean; report_ready?: boolean };
};

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

  toHealthProfile(user: DbUser): UserHealthProfile {
    return enrichProfile({
      date_of_birth: user.date_of_birth,
      sex: user.sex,
      height_cm: user.height_cm != null ? Number(user.height_cm) : null,
      weight_kg: user.weight_kg != null ? Number(user.weight_kg) : null,
      activity_level: user.activity_level,
    });
  }

  isProfileComplete(user: DbUser): boolean {
    return Boolean(
      user.date_of_birth &&
        user.sex &&
        user.height_cm &&
        user.weight_kg,
    );
  }

  async updateProfile(
    clerkId: string,
    update: HealthProfileUpdate,
  ): Promise<DbUser> {
    const user = await this.getMe(clerkId);
    const patch: Record<string, unknown> = {};

    if (update.date_of_birth !== undefined) {
      if (update.date_of_birth) {
        const dob = new Date(update.date_of_birth);
        if (Number.isNaN(dob.getTime()) || dob > new Date()) {
          throw new BadRequestException({
            code: 'INVALID_DOB',
            message: 'Date of birth must be a valid past date.',
          });
        }
      }
      patch.date_of_birth = update.date_of_birth;
    }

    if (update.sex !== undefined) {
      const allowed = ['male', 'female', 'other', 'prefer_not_to_say', null];
      if (!allowed.includes(update.sex)) {
        throw new BadRequestException({
          code: 'INVALID_SEX',
          message: 'Invalid sex value.',
        });
      }
      patch.sex = update.sex;
    }

    if (update.height_cm !== undefined) {
      if (
        update.height_cm != null &&
        (update.height_cm < 50 || update.height_cm > 250)
      ) {
        throw new BadRequestException({
          code: 'INVALID_HEIGHT',
          message: 'Height must be between 50 and 250 cm.',
        });
      }
      patch.height_cm = update.height_cm;
    }

    if (update.weight_kg !== undefined) {
      if (
        update.weight_kg != null &&
        (update.weight_kg < 20 || update.weight_kg > 400)
      ) {
        throw new BadRequestException({
          code: 'INVALID_WEIGHT',
          message: 'Weight must be between 20 and 400 kg.',
        });
      }
      patch.weight_kg = update.weight_kg;
    }

    if (update.activity_level !== undefined) {
      const allowed = ['sedentary', 'light', 'moderate', 'active', null];
      if (!allowed.includes(update.activity_level)) {
        throw new BadRequestException({
          code: 'INVALID_ACTIVITY',
          message: 'Invalid activity level.',
        });
      }
      patch.activity_level = update.activity_level;
    }

    if (update.notification_preferences) {
      patch.notification_preferences = {
        ...user.notification_preferences,
        ...update.notification_preferences,
      };
    }

    if (Object.keys(patch).length === 0) {
      return user;
    }

    const { data, error } = await this.supabase.db
      .from('users')
      .update(patch)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update profile: ${error?.message}`);
    }

    return data as DbUser;
  }

  async updatePreferences(
    clerkId: string,
    preferences: { email?: boolean; report_ready?: boolean },
  ): Promise<DbUser> {
    return this.updateProfile(clerkId, {
      notification_preferences: preferences,
    });
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
