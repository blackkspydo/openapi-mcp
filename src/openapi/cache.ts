// Spec Cache - TTL-based caching for parsed specs

import type { ParsedSpec } from "../types/openapi";
import { logger } from "../utils";

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  spec: ParsedSpec;
  expiresAt: number;
}

class SpecCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = DEFAULT_TTL_MS) {
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Get a cached spec by key
   */
  get(key: string): ParsedSpec | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      logger.debug("Cache entry expired", { key });
      this.cache.delete(key);
      return null;
    }

    logger.debug("Cache hit", { key });
    return entry.spec;
  }

  /**
   * Store a spec in the cache
   */
  set(key: string, spec: ParsedSpec, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const entry: CacheEntry = {
      spec,
      expiresAt: Date.now() + ttl,
    };
    this.cache.set(key, entry);
    logger.debug("Cached spec", { key, ttlMs: ttl });
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug("Cache invalidated", { key });
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    logger.debug("Cache cleared");
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const specCache = new SpecCache();
