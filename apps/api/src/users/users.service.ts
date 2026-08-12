import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';
import { SupabaseService } from '../supabase/supabase.service';
import { DbUser } from '../common/dto/database.types';
import { enrichProfile } from '../pdf/health-insights';
import { UserHealthProfile } from '../pdf/pdf.types';
import { AppCacheService } from '../common/cache/app-cache.service';
import { RiskService } from '../risk/risk.service';

export type HealthProfileUpdate = {
  date_of_birth?: string | null;
  sex?: DbUser['sex'];
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: DbUser['activity_level'];
  smoker?: boolean | null;
  has_diabetes?: boolean | null;
  on_bp_medication?: boolean | null;
  notification_preferences?: { email?: boolean; report_ready?: boolean };
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly clerk;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: AppCacheService,
    private readonly riskService: RiskService,
    private readonly config: ConfigService,
  ) {
    this.clerk = createClerkClient({
      secretKey: this.config.getOrThrow<string>('CLERK_SECRET_KEY'),
    });
  }

  async ensureUser(
    clerkId: string,
    email: string,
    fullName: string | null = null,
    avatarUrl: string | null = null,
  ): Promise<DbUser> {
    const existing = await this.findByClerkId(clerkId);
    if (existing) {
      // Never overwrite a real email with empty/synthetic when Clerk omits email (#29).
      const patch: Record<string, string> = {};
      if (email) {
        patch.email = email;
      }
      if (fullName) {
        patch.full_name = fullName;
      }
      if (avatarUrl) {
        patch.avatar_url = avatarUrl;
      }
      if (Object.keys(patch).length === 0) {
        return existing;
      }

      const { data: updated, error: updateError } = await this.supabase.db
        .from('users')
        .update(patch)
        .eq('clerk_id', clerkId)
        .select('*')
        .single();

      if (!updateError && updated) {
        return updated as DbUser;
      }

      this.logger.warn(
        `ensureUser update failed for ${clerkId}: ${updateError?.message ?? 'unknown'}`,
      );
      return existing;
    }

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
      .insert(payload)
      .select('*')
      .single();

    if (!error && data) {
      return data as DbUser;
    }

    // Concurrent first insert — load the winner.
    if (error?.code === '23505' || /duplicate key|unique constraint/i.test(error?.message ?? '')) {
      const raced = await this.findByClerkId(clerkId);
      if (raced) {
        return raced;
      }
    }

    this.logger.error(
      `Failed to create user ${clerkId}: ${error?.message ?? 'unknown'}`,
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

    if (update.smoker !== undefined) {
      if (update.smoker !== null && typeof update.smoker !== 'boolean') {
        throw new BadRequestException({
          code: 'INVALID_SMOKER',
          message: 'Smoker must be true, false, or null.',
        });
      }
      patch.smoker = update.smoker;
    }

    if (update.has_diabetes !== undefined) {
      if (
        update.has_diabetes !== null &&
        typeof update.has_diabetes !== 'boolean'
      ) {
        throw new BadRequestException({
          code: 'INVALID_DIABETES',
          message: 'Diabetes status must be true, false, or null.',
        });
      }
      patch.has_diabetes = update.has_diabetes;
    }

    if (update.on_bp_medication !== undefined) {
      if (
        update.on_bp_medication !== null &&
        typeof update.on_bp_medication !== 'boolean'
      ) {
        throw new BadRequestException({
          code: 'INVALID_BP_MEDS',
          message: 'BP medication status must be true, false, or null.',
        });
      }
      patch.on_bp_medication = update.on_bp_medication;
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

    const updated = data as DbUser;
    this.cache.invalidateUser(user.id);

    const riskAffecting =
      update.date_of_birth !== undefined ||
      update.sex !== undefined ||
      update.height_cm !== undefined ||
      update.weight_kg !== undefined ||
      update.smoker !== undefined ||
      update.has_diabetes !== undefined ||
      update.on_bp_medication !== undefined;

    if (riskAffecting) {
      try {
        await this.riskService.recomputeAllForUser(updated);
      } catch (err) {
        this.logger.warn(
          `Risk recompute after profile update failed: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      }
    }

    return updated;
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
        const { error: storageError } = await this.supabase.db.storage
          .from('health-reports')
          .remove(paths);
        if (storageError) {
          this.logger.error(
            `Storage cleanup failed for ${clerkId}: ${storageError.message}`,
          );
          throw new BadRequestException({
            code: 'DELETE_STORAGE_FAILED',
            message: 'Could not delete stored reports. Please try again.',
          });
        }
      }
    }

    const { error: comparisonsError } = await this.supabase.db
      .from('report_comparisons')
      .delete()
      .eq('user_id', user.id);
    if (comparisonsError) {
      throw new BadRequestException({
        code: 'DELETE_COMPARISONS_FAILED',
        message: 'Could not delete comparisons. Please try again.',
      });
    }

    const { error: reportsError } = await this.supabase.db
      .from('health_reports')
      .delete()
      .eq('user_id', user.id);
    if (reportsError) {
      throw new BadRequestException({
        code: 'DELETE_REPORTS_FAILED',
        message: 'Could not delete reports. Please try again.',
      });
    }

    // Wipe residual profile PHI then remove the users row (#10).
    const { error: wipeError } = await this.supabase.db
      .from('users')
      .update({
        email: `${clerkId}@deleted.local`,
        full_name: null,
        avatar_url: null,
        date_of_birth: null,
        sex: null,
        height_cm: null,
        weight_kg: null,
        activity_level: null,
        smoker: null,
        has_diabetes: null,
        on_bp_medication: null,
        notification_preferences: { email: false, report_ready: false },
      })
      .eq('id', user.id);
    if (wipeError) {
      this.logger.error(
        `Profile wipe failed for ${clerkId}: ${wipeError.message}`,
      );
      throw new BadRequestException({
        code: 'DELETE_PROFILE_FAILED',
        message: 'Could not erase profile data. Please try again.',
      });
    }

    const { error: userDeleteError } = await this.supabase.db
      .from('users')
      .delete()
      .eq('id', user.id);
    if (userDeleteError) {
      this.logger.error(
        `User row delete failed for ${clerkId}: ${userDeleteError.message}`,
      );
      throw new BadRequestException({
        code: 'DELETE_USER_FAILED',
        message: 'Could not erase account record. Please try again.',
      });
    }

    this.cache.invalidateUser(user.id);

    try {
      await this.clerk.users.deleteUser(clerkId);
    } catch (error) {
      this.logger.error(
        `Clerk account delete failed for ${clerkId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw new BadRequestException({
        code: 'DELETE_CLERK_FAILED',
        message:
          'Local health data was erased, but the sign-in account could not be deleted. Contact support.',
      });
    }
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
