import { Injectable } from '@nestjs/common';

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

/**
 * Fast in-process cache. No Redis required for local/single-instance deploys.
 * Health data rarely changes — invalidate explicitly on writes.
 */
@Injectable()
export class AppCacheService {
  private readonly store = new Map<string, CacheEntry>();

  async getOrSet<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value as T;
    }

    const value = await loader();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  invalidateUser(userId: string): void {
    this.invalidatePrefix(`user:${userId}:`);
  }
}
