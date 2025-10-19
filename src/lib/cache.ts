/**
 * In-memory cache for static/semi-static data
 * This reduces database queries for data that rarely changes
 *
 * For production, consider using Redis instead of in-memory cache
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get cached data if still valid
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data with TTL
   */
  set<T>(key: string, data: T, ttl: number): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }
}

// Export singleton instance
export const cache = new Cache();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SUBJECTS: 60 * 60 * 1000, // 1 hour - subjects don't change often
  GRADE_LEVELS: 60 * 60 * 1000, // 1 hour - grade levels don't change often
  TUTORS_LIST: 5 * 60 * 1000, // 5 minutes - tutor list can change
  TUTOR_DETAIL: 10 * 60 * 1000, // 10 minutes - tutor detail
  REVIEWS: 15 * 60 * 1000, // 15 minutes - reviews
  STATS: 5 * 60 * 1000, // 5 minutes - statistics
} as const;

/**
 * Helper function to wrap async functions with caching
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Store in cache
  cache.set(key, data, ttl);

  return data;
}
