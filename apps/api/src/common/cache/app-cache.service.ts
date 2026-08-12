import { Injectable, Logger } from '@nestjs/common';

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

/**
 * In-process Map cache for single-node deploys only.
 *
 * Security / ops constraints (issue #16):
 * - Do NOT use across multiple API instances (no shared invalidation).
 * - Prefer short TTLs; never cache OCR `raw_text` or full report detail blobs.
 * - Disable with `APP_CACHE_DISABLED=true` when scaling out or for PHI hardening.
 * - For multi-instance, replace with Redis (encrypted at rest / short TTL) later.
 */
@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);
  private readonly store = new Map<string, CacheEntry>();
  private readonly disabled =
    process.env.APP_CACHE_DISABLED === '1' ||
    process.env.APP_CACHE_DISABLED === 'true';
  /** Soft cap to limit memory residency of cached PHI summaries. */
  private readonly maxEntries = 500;

  async getOrSet<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    if (this.disabled) {
      return loader();
    }

    const hit = this.store.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value as T;
    }

    const value = await loader();
    this.evictIfNeeded();
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

  private evictIfNeeded(): void {
    if (this.store.size < this.maxEntries) {
      return;
    }
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
    while (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value as string | undefined;
      if (!oldest) {
        break;
      }
      this.store.delete(oldest);
      this.logger.debug(`Evicted cache key ${oldest} (maxEntries)`);
    }
  }
}
