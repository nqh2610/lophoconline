/**
 * In-memory LRU (Least Recently Used) cache for static/semi-static data
 * This reduces database queries for data that rarely changes
 *
 * Features:
 * - Automatic eviction when max size is reached (LRU policy)
 * - TTL (Time To Live) for each entry
 * - Memory-safe with configurable max size
 *
 * For production with multiple servers, consider using Redis instead
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  lastAccessed: number;
}

class LRUCache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

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

    // Update last accessed time (LRU tracking)
    entry.lastAccessed = now;
    this.store.set(key, entry);

    return entry.data as T;
  }

  /**
   * Set cache data with TTL
   * Automatically evicts LRU entries if max size is reached
   */
  set<T>(key: string, data: T, ttl: number): void {
    const now = Date.now();

    // If cache is full and key doesn't exist, evict LRU entry
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    this.store.set(key, {
      data,
      timestamp: now,
      ttl,
      lastAccessed: now
    });
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
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

// Export singleton instance with max 200 entries (reasonable for in-memory cache)
export const cache = new LRUCache(200);

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
