import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from '../users/users.service';
import { ClerkRequestUser } from '../auth/clerk.guard';
import { DbHealthMetric } from '../common/dto/database.types';

@Injectable()
export class MetricsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  async listMetrics(
    clerkUser: ClerkRequestUser,
    filters: { category?: string; from?: string; to?: string },
  ): Promise<DbHealthMetric[]> {
    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    let query = this.supabase.db
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: true });

    if (filters.category) {
      query = query.eq('metric_category', filters.category);
    }
    if (filters.from) {
      query = query.gte('recorded_at', filters.from);
    }
    if (filters.to) {
      query = query.lte('recorded_at', filters.to);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as DbHealthMetric[];
  }

  async listCategories(clerkUser: ClerkRequestUser): Promise<string[]> {
    const user = await this.usersService.ensureUser(
      clerkUser.clerkId,
      clerkUser.email,
      clerkUser.fullName,
      clerkUser.avatarUrl,
    );

    const { data, error } = await this.supabase.db
      .from('health_metrics')
      .select('metric_category')
      .eq('user_id', user.id);

    if (error) {
      throw new Error(error.message);
    }

    const categories = new Set(
      (data ?? []).map(
        (row: { metric_category: string }) => row.metric_category,
      ),
    );
    return Array.from(categories).sort();
  }
}
