import { ComplianceEvaluation } from '@katilim/shared-types';
import { config } from '../config/index.js';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  staleAfter: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<ComplianceEvaluation>>();
  private hits = 0;
  private misses = 0;
  private maxItems = config.cache.maxItems;

  public get(key: string): { data: ComplianceEvaluation | null; isStale: boolean } {
    const entry = this.cache.get(key.toUpperCase());
    const now = Date.now();

    if (!entry) {
      this.misses++;
      return { data: null, isStale: false };
    }

    if (now > entry.expiresAt) {
      this.cache.delete(key.toUpperCase());
      this.misses++;
      return { data: null, isStale: false };
    }

    this.hits++;
    const isStale = now > entry.staleAfter;

    return {
      data: {
        ...entry.data,
        isCached: true,
        cachedAt: new Date(entry.cachedAt).toISOString()
      },
      isStale
    };
  }

  public set(key: string, data: ComplianceEvaluation, ttlMs: number = config.cache.stockComplianceTtlMs): void {
    if (this.cache.size >= this.maxItems) {
      // LRU evict first entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const now = Date.now();
    this.cache.set(key.toUpperCase(), {
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
      staleAfter: now + Math.floor(ttlMs * 0.7) // Stale after 70% of TTL
    });
  }

  public invalidate(key: string): void {
    this.cache.delete(key.toUpperCase());
  }

  public getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: Number(hitRate.toFixed(1))
    };
  }
}
